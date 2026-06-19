// Angular Spec-Index — cached index of all *.spec.ts files in an Angular project.
// Stores per-spec: imported classes, selector usages, detectChanges calls, it-block details.
// Used by detect_untested_public_api and analyze_component_test_coverage as a fast lookup
// instead of re-scanning all spec files on every call.

import { Project, Node, SyntaxKind } from "ts-morph";
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, extname, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AngularSpecIndex {
  generatedAt: string;
  projectRoot: string;
  specs: SpecEntry[];
}

export interface SpecEntry {
  /** Path relative to projectRoot, forward-slashes */
  file: string;
  /** Class names found in TS import statements */
  importedClasses: string[];
  /** Selectors found in querySelector / By.css / debugElement.query calls */
  selectorUsages: string[];
  /** Whether fixture.detectChanges() or autoDetectChanges appears */
  hasDetectChanges: boolean;
  /** it(...) / test(...) blocks */
  itBlocks: ItBlockEntry[];
}

export interface ItBlockEntry {
  /** Literal string name of the it/test block */
  name: string;
  line: number;
  /** Matcher names used: e.g. toEqual, toBeTruthy, toContain */
  assertionMatchers: string[];
  /** Selectors referenced inside this block */
  selectorRefs: string[];
  /** Whether this block calls detectChanges */
  detectChanges: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_FILENAME = ".codebase-analyzer-index-angular-specs.json";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SPEC_FILES = 300;
const IGNORED = ["node_modules", ".git", "dist", "coverage", ".angular", "e2e"];

// ─── Cache wrapper ────────────────────────────────────────────────────────────

export function indexAngularSpecsCached(rootPath: string, useCache = true): AngularSpecIndex {
  const cacheFile = join(rootPath, CACHE_FILENAME);

  if (useCache && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf-8")) as AngularSpecIndex;
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < CACHE_TTL_MS) return cached;
    } catch {}
  }

  const index = buildSpecIndex(rootPath);

  try { writeFileSync(cacheFile, JSON.stringify(index, null, 2)); } catch {}

  return index;
}

// ─── Index builder ────────────────────────────────────────────────────────────

export function buildSpecIndex(rootPath: string): AngularSpecIndex {
  const specPaths = collectSpecFiles(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of specPaths) { try { project.addSourceFileAtPath(f); } catch {} }

  const specs: SpecEntry[] = [];

  for (const specPath of specPaths) {
    const sf = project.getSourceFile(specPath);
    const text = sf?.getFullText() ?? safeRead(specPath);
    if (!text) continue;

    const relFile = relative(rootPath, specPath).replace(/\\/g, "/");

    // ── Imported classes ──────────────────────────────────────────────────────
    const importedClasses = extractImportedClasses(text);

    // ── Selector usages in the whole file ─────────────────────────────────────
    const selectorUsages = extractSelectorUsages(text);

    // ── detectChanges ─────────────────────────────────────────────────────────
    const hasDetectChanges = /detectChanges\s*\(|autoDetectChanges/.test(text);

    // ── it/test blocks ────────────────────────────────────────────────────────
    const itBlocks: ItBlockEntry[] = sf ? extractItBlocks(sf, rootPath, text) : [];

    specs.push({ file: relFile, importedClasses, selectorUsages, hasDetectChanges, itBlocks });
  }

  return { generatedAt: new Date().toISOString(), projectRoot: rootPath, specs };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectSpecFiles(rootPath: string): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    if (files.length >= MAX_SPEC_FILES) return;
    try {
      for (const entry of readdirSync(dir)) {
        if (IGNORED.includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (extname(full) === ".ts" && (full.endsWith(".spec.ts") || full.endsWith(".test.ts")))
          files.push(full);
      }
    } catch {}
  }
  walk(rootPath);
  return files;
}

function extractImportedClasses(text: string): string[] {
  const names: string[] = [];
  const rx = /import\s*\{([^}]+)\}\s*from/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    m[1].split(",")
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter((n) => /^[A-Z]/.test(n))
      .forEach((n) => names.push(n));
  }
  return [...new Set(names)];
}

function extractSelectorUsages(text: string): string[] {
  const selectors: string[] = [];
  // querySelector('app-foo'), By.css('app-foo'), .query('app-foo'), nativeElement.querySelector(...)
  const rx = /(?:querySelector(?:All)?|By\.css|\.query(?:All)?)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    if (!selectors.includes(m[1])) selectors.push(m[1]);
  }
  return selectors;
}

function extractItBlocks(
  sf: ReturnType<Project["getSourceFile"]>,
  _rootPath: string,
  fullText: string,
): ItBlockEntry[] {
  if (!sf) return [];
  const blocks: ItBlockEntry[] = [];
  const lines = fullText.split("\n");

  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    const name = Node.isIdentifier(expr) ? expr.getText() : null;
    if (name !== "it" && name !== "test") return;

    const args = node.getArguments();
    if (args.length === 0) return;

    // Block name: first argument must be a string literal
    const nameArg = args[0];
    if (!Node.isStringLiteral(nameArg) && !Node.isNoSubstitutionTemplateLiteral(nameArg)) return;
    const blockName = nameArg.getLiteralValue?.() ?? nameArg.getText().replace(/['"` ]/g, "");

    const line = node.getStartLineNumber();

    // Extract text of the block body
    const blockText = args.length > 1 ? args[args.length - 1].getText() : "";

    // Assertion matchers inside this block
    const matchers: string[] = [];
    const matcherRx = /\.to(?:Be|Equal|Contain|HaveBeenCalled|Match|Throw|Resolve|Reject|BeTruthy|BeFalsy|HaveLength|Include)\w*/g;
    let mm: RegExpExecArray | null;
    while ((mm = matcherRx.exec(blockText)) !== null) {
      const m2 = mm[0].slice(1); // strip leading .
      if (!matchers.includes(m2)) matchers.push(m2);
    }

    // Selector refs inside this block
    const selectorRefs = extractSelectorUsages(blockText);

    // detectChanges in this block
    const detectChanges = /detectChanges\s*\(|autoDetectChanges/.test(blockText);

    blocks.push({ name: blockName, line, assertionMatchers: matchers, selectorRefs, detectChanges });
  });

  return blocks;
}

function safeRead(file: string): string {
  try { return readFileSync(file, "utf-8"); } catch { return ""; }
}
