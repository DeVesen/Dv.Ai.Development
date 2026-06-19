// analyze_component_test_coverage — single-call Angular component test coverage report.
// Uses three indexed sources for fast, accurate results:
//   P1  Angular project index (componentImportsMap from @Component.imports edges)
//   P2  Angular spec index    (per-spec: imported classes, selector usages, it-blocks)
//   P3  Template extractor    (structured binding analysis — no @angular/compiler dep needed)

import { Project, ClassDeclaration } from "ts-morph";
import { readFileSync, existsSync } from "fs";
import { resolve, relative, dirname, basename } from "path";
import { indexAngularProjectCached } from "../indexers/angular-indexer-runner.js";
import { indexAngularSpecsCached, SpecEntry } from "../indexers/angular-spec-indexer.js";
import {
  extractAngularSelector,
  findAngularProjectRoot,
} from "./ts-advanced-features.js";
import {
  extractTemplateBindings,
  buildCoverageScenarios,
  TemplateCoverageScenario,
} from "./angular-template-extractor.js";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ComponentCoverageReport {
  componentClass: string;
  selector: string | null;
  filePath: string;
  coverageLevel: "A" | "B-asserted" | "B-rendered" | "C";
  coverageLevelLabel: string;
  dedicatedSpec: string | null;
  consumers: ConsumerInfo[];
  indirectSpecMatrix: IndirectSpecRow[];
  templateScenarios: TemplateCoverageScenario[];
  summary: string;
  markdown: string;
}

export interface ConsumerInfo {
  className: string;
  file: string;
}

export interface IndirectSpecRow {
  specFile: string;
  parentComponent: string;
  renders: boolean;
  asserts: boolean;
  detectChanges: boolean;
  assertingItBlocks: string[];
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function analyzeComponentTestCoverage(componentPath: string): ComponentCoverageReport {
  const abs = resolve(componentPath);
  const projectRoot = findAngularProjectRoot(abs);

  // ── Load indexed data (P1 + P2) ───────────────────────────────────────────
  const projectIndex = indexAngularProjectCached(projectRoot);
  const specIndex = indexAngularSpecsCached(projectRoot);

  // Build componentImportsMap from the P1 index (O(n) once, then O(1) lookup)
  // className → [imported component class names from @Component.imports]
  const componentImportsMap = new Map<string, string[]>(
    projectIndex.components.map((c) => [c.name, c.angularImports]),
  );

  // Build selectorMap: selector → className (for template-to-class resolution)
  const selectorToClass = new Map<string, string>(
    projectIndex.components
      .filter((c) => c.selector)
      .map((c) => [c.selector!, c.name]),
  );

  // ── Parse target component (ts-morph) ─────────────────────────────────────
  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  let targetSf = project.addSourceFileAtPath(abs);

  const targetClass = targetSf.getClasses()[0];
  if (!targetClass) throw new Error(`No class found in: ${abs}`);

  const clsName = targetClass.getName() ?? basename(abs, ".ts");
  const selector = extractAngularSelector(targetClass) ??
    projectIndex.components.find((c) => c.name === clsName)?.selector ?? null;
  const relFile = relative(projectRoot, abs).replace(/\\/g, "/");

  // ── 1. Dedicated spec ─────────────────────────────────────────────────────
  const dedicatedSpecEntry = specIndex.specs.find((s) => s.importedClasses.includes(clsName));
  const dedicatedSpec = dedicatedSpecEntry?.file ?? null;

  // ── 2. Consumers (production code using this component) ───────────────────
  const consumers: ConsumerInfo[] = projectIndex.components
    .filter((c) => c.name !== clsName && c.angularImports.includes(clsName))
    .map((c) => ({ className: c.name, file: c.file }));

  // ── 3. Indirect spec matrix ───────────────────────────────────────────────
  // A spec renders this component if it imports any parent component that has our
  // class in @Component.imports. Source: P1 index (componentImportsMap) + P2 spec index.
  const indirectSpecMatrix: IndirectSpecRow[] = [];

  for (const spec of specIndex.specs) {
    if (spec.importedClasses.includes(clsName)) continue; // dedicated spec, already covered

    // Find which parent (from the spec's imports) has clsName in its @Component.imports
    const parentCls = spec.importedClasses.find(
      (p) => componentImportsMap.get(p)?.includes(clsName),
    );

    // Also check direct selector usage in the spec (querySelector / By.css)
    const directSelectorHit = selector
      ? spec.selectorUsages.some((s) => s === selector || s.includes(selector))
      : false;

    if (!parentCls && !directSelectorHit) continue;

    const renders = true; // if we got here, it renders
    const asserts = selector
      ? spec.selectorUsages.some((s) => s === selector || s.includes(selector))
      : false;

    // Which it-blocks assert on this selector?
    const assertingItBlocks = selector
      ? spec.itBlocks
          .filter((b) => b.selectorRefs.some((s) => s === selector || s.includes(selector)))
          .map((b) => `"${b.name}" (line ${b.line})`)
      : [];

    indirectSpecMatrix.push({
      specFile: spec.file,
      parentComponent: parentCls ?? "(direct selector usage)",
      renders,
      asserts,
      detectChanges: spec.hasDetectChanges,
      assertingItBlocks,
    });
  }

  // ── 4. Template scenarios (P3) ────────────────────────────────────────────
  const templateText = resolveTemplate(targetClass, abs, projectIndex.components.find((c) => c.name === clsName)?.templateFile ?? null, projectRoot);
  const bindings = templateText ? extractTemplateBindings(templateText) : [];
  const testedSelectors = indirectSpecMatrix.flatMap((r) => r.asserts && selector ? [selector] : []);
  const allTestedSelectors = [
    ...testedSelectors,
    ...specIndex.specs.flatMap((s) => s.selectorUsages),
  ];
  const templateScenarios = buildCoverageScenarios(bindings, allTestedSelectors);

  // ── 5. Coverage level ─────────────────────────────────────────────────────
  let coverageLevel: ComponentCoverageReport["coverageLevel"];
  let coverageLevelLabel: string;
  if (dedicatedSpec) {
    coverageLevel = "A";
    coverageLevelLabel = "A — Dedizierte Spec vorhanden";
  } else if (indirectSpecMatrix.some((r) => r.asserts)) {
    coverageLevel = "B-asserted";
    coverageLevelLabel = "B (assertiert) — gerendert und DOM-Assertions in Eltern-Spec";
  } else if (indirectSpecMatrix.length > 0) {
    coverageLevel = "B-rendered";
    coverageLevelLabel = "B (nur gerendert) — mitgerendert, keine DOM-Assertions";
  } else {
    coverageLevel = "C";
    coverageLevelLabel = "C — vollständig ungetestet";
  }

  // ── 6. Summary + Markdown ─────────────────────────────────────────────────
  const summary = buildSummary(clsName, selector, coverageLevel, dedicatedSpec, indirectSpecMatrix, templateScenarios);
  const markdown = buildMarkdown(
    clsName, selector, relFile, coverageLevelLabel, dedicatedSpec,
    consumers, indirectSpecMatrix, templateScenarios, summary,
  );

  return {
    componentClass: clsName,
    selector,
    filePath: relFile,
    coverageLevel,
    coverageLevelLabel,
    dedicatedSpec,
    consumers,
    indirectSpecMatrix,
    templateScenarios,
    summary,
    markdown,
  };
}

// ─── Template resolution ──────────────────────────────────────────────────────

function resolveTemplate(
  cls: ClassDeclaration,
  srcPath: string,
  templateFileHint: string | null,
  projectRoot: string,
): string | null {
  // Try inline template from decorator
  for (const dec of cls.getDecorators()) {
    if (dec.getName() !== "Component") continue;
    const args = dec.getArguments();
    if (!args.length) continue;
    const text = args[0].getText();

    const inlineM = text.match(/\btemplate\s*:\s*`([\s\S]*?)`/);
    if (inlineM) return inlineM[1];

    const urlM = text.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
    if (urlM) {
      const htmlPath = resolve(dirname(srcPath), urlM[1]);
      if (existsSync(htmlPath)) return safeRead(htmlPath);
    }
  }

  // Fallback: use templateFile from index hint
  if (templateFileHint) {
    const htmlPath = resolve(projectRoot, templateFileHint);
    if (existsSync(htmlPath)) return safeRead(htmlPath);
  }

  return null;
}

// ─── Markdown builder ─────────────────────────────────────────────────────────

function buildMarkdown(
  clsName: string,
  selector: string | null,
  filePath: string,
  coverageLevelLabel: string,
  dedicatedSpec: string | null,
  consumers: ConsumerInfo[],
  matrix: IndirectSpecRow[],
  scenarios: TemplateCoverageScenario[],
  summary: string,
): string {
  const lines: string[] = [];

  lines.push(`## Testabdeckung: ${clsName}`);
  lines.push("");
  lines.push(`**Datei:** \`${filePath}\``);
  if (selector) lines.push(`**Selector:** \`${selector}\``);
  lines.push(`**Abdeckungsstufe:** ${coverageLevelLabel}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Dedicated spec
  lines.push("### Dedizierte Tests (Stufe A)");
  lines.push(dedicatedSpec ? `✅ \`${dedicatedSpec}\`` : "❌ Keine eigene `.spec.ts` gefunden.");
  lines.push("");

  // Consumers
  lines.push("### Konsumenten (Produktionscode via @Component.imports)");
  if (consumers.length === 0) {
    lines.push("_Keine Konsumenten via @Component.imports gefunden._");
  } else {
    lines.push("| Klasse | Datei |");
    lines.push("|--------|-------|");
    for (const c of consumers) lines.push(`| \`${c.className}\` | \`${c.file}\` |`);
  }
  lines.push("");

  // Indirect spec matrix
  lines.push("### Indirekte Abdeckung durch Eltern-Specs (Stufe B)");
  if (matrix.length === 0) {
    lines.push("_Keine Eltern-Spec rendert diese Komponente._");
  } else {
    lines.push("| Eltern-Spec | Eltern-Komponente | rendert? | assertiert Selector? | detectChanges? | assertierende it-Blöcke |");
    lines.push("|-------------|-------------------|----------|----------------------|----------------|------------------------|");
    for (const row of matrix) {
      const itCol = row.assertingItBlocks.length > 0 ? row.assertingItBlocks.join(", ") : "—";
      lines.push(`| \`${row.specFile}\` | \`${row.parentComponent}\` | ${row.renders ? "✅" : "❌"} | ${row.asserts ? "✅" : "❌"} | ${row.detectChanges ? "✅" : "❌"} | ${itCol} |`);
    }
  }
  lines.push("");

  // Template scenarios
  lines.push("### Template-Szenarien (Checkliste)");
  if (scenarios.length === 0) {
    lines.push("_Kein Template geladen oder keine interaktiven Bindings._");
  } else {
    lines.push("| Binding | Szenario | Status |");
    lines.push("|---------|----------|--------|");
    for (const s of scenarios) {
      const icon = s.status === "tested" ? "✅" : s.status === "unclear" ? "❓" : "⬜";
      lines.push(`| \`${s.binding}\` | ${s.scenario} | ${icon} ${s.status} |`);
    }
  }
  lines.push("");

  lines.push("---");
  lines.push(`**Fazit:** ${summary}`);

  return lines.join("\n");
}

function buildSummary(
  clsName: string,
  selector: string | null,
  level: ComponentCoverageReport["coverageLevel"],
  dedicatedSpec: string | null,
  matrix: IndirectSpecRow[],
  scenarios: TemplateCoverageScenario[],
): string {
  const untestedCount = scenarios.filter((s) => s.status === "untested").length;
  const sel = selector ? `\`${selector}\`` : clsName;

  if (level === "A") return `Stufe A — eigene Spec \`${dedicatedSpec}\` vorhanden.`;
  if (level === "B-asserted") {
    const names = matrix.filter((r) => r.asserts).map((r) => `\`${r.specFile}\``).join(", ");
    const itDetail = matrix.filter((r) => r.assertingItBlocks.length > 0)
      .flatMap((r) => r.assertingItBlocks).slice(0, 3).join(", ");
    return `Stufe B (assertiert) — ${sel} DOM-getestet in ${names}${itDetail ? ` (${itDetail})` : ""}, keine dedizierte Spec.${untestedCount > 0 ? ` ${untestedCount} Template-Szenario(en) noch unklar/ungetestet.` : ""}`;
  }
  if (level === "B-rendered") {
    const names = matrix.map((r) => `\`${r.specFile}\``).join(", ");
    return `Stufe B — ${sel} mitgerendert in ${names}, aber keine DOM-Assertions auf den Selector.${untestedCount > 0 ? ` ${untestedCount} Template-Szenario(en) vollständig ungetestet.` : ""}`;
  }
  return `Stufe C — ${sel} wird in keiner Spec getestet. Eigene Spec empfohlen.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRead(file: string): string {
  try { return readFileSync(file, "utf-8"); } catch { return ""; }
}
