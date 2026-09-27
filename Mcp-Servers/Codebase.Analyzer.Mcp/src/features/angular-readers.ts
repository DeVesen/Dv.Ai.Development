// angular-readers.ts — Angular helpers that save reads:
//   read_component_bundle   (component + template + styles + spec in one call)
//   analyze_angular_architecture (placement and injection rules for core/api and feature services)

import { existsSync, readdirSync, readFileSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { Node, ObjectLiteralExpression } from "ts-morph";
import { parseTypeScript, readSignaturesOnly, SignatureEntry } from "./code-reader.js";

// ─── read_component_bundle ─────────────────────────────────────────────────────

export interface ComponentBundle {
  componentPath: string;
  selector: string | null;
  standalone: boolean | null;
  imports: string[] | null;
  typescript: SignatureEntry[];
  template?: { filePath: string | null; content?: string; bindings?: string[] };
  styles?: { filePath: string | null; hasStyles: boolean };
  spec?: { filePath: string | null; signatures?: SignatureEntry[] };
}

const MAX_BINDINGS = 50;
const MAX_CONDITION = 120;

function componentMetadata(filePath: string, code: string): ObjectLiteralExpression | undefined {
  const file = parseTypeScript(filePath, code);
  for (const cls of file.getClasses()) {
    const argument = cls.getDecorator("Component")?.getArguments()[0];
    if (argument && Node.isObjectLiteralExpression(argument)) return argument;
  }
  return undefined;
}

function property(metadata: ObjectLiteralExpression | undefined, name: string): Node | undefined {
  const prop = metadata?.getProperty(name);
  return prop && Node.isPropertyAssignment(prop) ? prop.getInitializer() : undefined;
}

function stringValue(node: Node | undefined): string | null {
  return node && (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) ? node.getLiteralValue() : null;
}

function firstExisting(candidates: string[]): string | null {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

// @if (...), @for (...): the condition may contain calls, so count parentheses.
function controlFlow(html: string): string[] {
  return [...html.matchAll(/@(if|for|switch|defer)\s*\(/g)].map((m) => {
    const start = m.index! + m[0].length;
    let depth = 1;
    let end = start;
    for (; end < html.length && depth > 0; end += 1) {
      if (html[end] === "(") depth += 1;
      else if (html[end] === ")") depth -= 1;
    }
    const condition = html.slice(start, end - 1).replace(/\s+/g, " ").trim();
    return `@${m[1]} (${condition.length > MAX_CONDITION ? `${condition.slice(0, MAX_CONDITION - 3)}...` : condition})`;
  });
}

function templateBindings(html: string): string[] {
  const bindings = [
    ...[...html.matchAll(/\[([^\]]+)\]="([^"]*)"/g)].map((m) => `[${m[1]}]="${m[2]}"`),
    ...[...html.matchAll(/\(([^)]+)\)="([^"]*)"/g)].map((m) => `(${m[1]})="${m[2]}"`),
    ...[...html.matchAll(/\*ng(?:For|If)="([^"]*)"/g)].map((m) => `*ng...="${m[1]}"`),
    ...controlFlow(html),
  ];
  return [...new Set(bindings)].slice(0, MAX_BINDINGS);
}

interface ComponentMetadata {
  selector: string | null;
  standalone: boolean | null;
  imports: string[] | null;
  template: string | null;
  templateUrl: string | null;
  styleUrl: string | null;
}

// Plain values only: later ts-morph calls on the same file invalidate these nodes.
function readMetadata(filePath: string, code: string): ComponentMetadata {
  const metadata = componentMetadata(filePath, code);
  const standalone = property(metadata, "standalone")?.getText();
  const importsNode = property(metadata, "imports");
  const styleNode = property(metadata, "styleUrl") ?? property(metadata, "styleUrls");
  return {
    selector: stringValue(property(metadata, "selector")),
    standalone: standalone === "true" ? true : standalone === "false" ? false : null,
    imports: importsNode && Node.isArrayLiteralExpression(importsNode) ? importsNode.getElements().map((e) => e.getText()) : null,
    template: stringValue(property(metadata, "template")),
    templateUrl: stringValue(property(metadata, "templateUrl")),
    styleUrl: stringValue(styleNode) ?? (styleNode && Node.isArrayLiteralExpression(styleNode) ? stringValue(styleNode.getElements()[0]) : null),
  };
}

export async function readComponentBundle(
  componentTsPath: string,
  options: { includeTemplate: boolean; templateMode: "full" | "summary"; includeStyles: boolean; includeSpec: boolean },
): Promise<ComponentBundle> {
  const dir = dirname(componentTsPath);
  const stem = basename(componentTsPath).replace(/\.tsx?$/, "");
  const meta = readMetadata(componentTsPath, readFileSync(componentTsPath, "utf-8"));
  const bundle: ComponentBundle = {
    componentPath: componentTsPath,
    selector: meta.selector,
    standalone: meta.standalone,
    imports: meta.imports,
    typescript: await readSignaturesOnly(componentTsPath, false),
  };

  if (options.includeTemplate) {
    const htmlPath = meta.templateUrl ? resolve(dir, meta.templateUrl) : meta.template === null ? firstExisting([join(dir, `${stem}.html`)]) : null;
    const html = meta.template ?? (htmlPath && existsSync(htmlPath) ? readFileSync(htmlPath, "utf-8") : null);
    bundle.template = html === null
      ? { filePath: htmlPath }
      : options.templateMode === "full" ? { filePath: htmlPath, content: html } : { filePath: htmlPath, bindings: templateBindings(html) };
  }

  if (options.includeStyles) {
    const stylePath = meta.styleUrl ? resolve(dir, meta.styleUrl) : firstExisting([".scss", ".css", ".less"].map((ext) => join(dir, `${stem}${ext}`)));
    bundle.styles = { filePath: stylePath, hasStyles: stylePath !== null && existsSync(stylePath) };
  }

  if (options.includeSpec) {
    const specPath = firstExisting([join(dir, `${stem}.spec.ts`), join(dir, `${stem.replace(/\.component$/, "")}.spec.ts`)]);
    bundle.spec = specPath ? { filePath: specPath, signatures: await readSignaturesOnly(specPath, true) } : { filePath: null };
  }
  return bundle;
}

// ─── analyze_angular_architecture ──────────────────────────────────────────────
// Rules: (1) *ApiService classes live under core/api/, (2) classes under core/api/ inject only HttpClient,
// (3) classes under features/<name>/services/ do not inject HttpClient directly.

export interface AngularArchitectureResult {
  summary: { filesScanned: number; violations: number };
  misplaced: { class: string; path: string; expectedZone: string }[];
  httpInFeatureService: { class: string; path: string }[];
  namingViolations: { file: string; issue: string }[];
}

const EXCLUDED_DIRS = new Set(["node_modules", "dist", ".angular", ".git"]);

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return EXCLUDED_DIRS.has(entry.name) ? [] : tsFiles(join(dir, entry.name));
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts") ? [join(dir, entry.name)] : [];
  });
}

function injectedTypes(code: string): Set<string> {
  const types = new Set([...code.matchAll(/\binject\s*\(\s*([A-Z]\w+)\s*[,)]/g)].map((m) => m[1]));
  const ctor = code.search(/\bconstructor\s*\(/);
  if (ctor >= 0) {
    let depth = 0;
    const open = code.indexOf("(", ctor);
    let end = open;
    for (; end < code.length; end += 1) {
      if (code[end] === "(") depth += 1;
      else if (code[end] === ")" && --depth === 0) break;
    }
    for (const m of code.slice(open + 1, end).matchAll(/:\s*([A-Z]\w+)/g)) types.add(m[1]);
  }
  return types;
}

export function analyzeAngularArchitecture(projectPath: string): AngularArchitectureResult {
  const files = tsFiles(projectPath);
  const result: AngularArchitectureResult = { summary: { filesScanned: files.length, violations: 0 }, misplaced: [], httpInFeatureService: [], namingViolations: [] };
  for (const file of files) {
    const path = file.replace(/\\/g, "/");
    const code = readFileSync(file, "utf-8");
    const classes = [...code.matchAll(/\bclass\s+(\w+)/g)].map((m) => m[1]);
    const owner = classes[0] ?? basename(file, ".ts");
    const inCoreApi = path.includes("/core/api/");
    for (const cls of classes.filter((c) => c.endsWith("ApiService") && !inCoreApi)) {
      result.misplaced.push({ class: cls, path, expectedZone: "core/api/" });
    }
    const injected = injectedTypes(code);
    if (inCoreApi) {
      for (const type of [...injected].filter((t) => t !== "HttpClient")) {
        result.namingViolations.push({ file: path, issue: `${owner} injects ${type} — violates HTTP-only contract` });
      }
    }
    if (/\/features\/[^/]+\/services\//.test(path) && injected.has("HttpClient")) {
      result.httpInFeatureService.push({ class: owner, path });
    }
  }
  result.summary.violations = result.misplaced.length + result.httpInFeatureService.length + result.namingViolations.length;
  return result;
}
