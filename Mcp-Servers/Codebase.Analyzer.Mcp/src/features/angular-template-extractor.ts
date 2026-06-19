// Structured Angular template binding extractor.
// Replaces the coarse SCENARIO_PATTERNS regex with a proper token pass that recognises
// all Angular binding forms and produces named, typed findings.
//
// Zero new dependencies — purely structural regex on well-defined Angular syntax.
// Covers Angular 14–18+: both legacy (*ngIf/*ngFor) and modern (@if/@for/@switch/@defer).

// ─── Types ────────────────────────────────────────────────────────────────────

export type BindingKind =
  | "property"        // [prop]="expr"
  | "event"           // (event)="handler()"
  | "two-way"         // [(ngModel)]="expr"
  | "class"           // [class.name]="expr"
  | "style"           // [style.prop]="expr"
  | "attr"            // [attr.name]="expr"
  | "structural"      // *ngIf / *ngFor / *ngSwitch
  | "block-if"        // @if (...)
  | "block-for"       // @for (...)
  | "block-switch"    // @switch (...)
  | "block-defer"     // @defer (...)
  | "template-ref"    // #refName
  | "custom-element"; // <app-xxx> / <lib-xxx>

export interface TemplateBinding {
  kind: BindingKind;
  /** Binding name or element name (e.g. "disabled", "click", "class.active", "app-btn") */
  name: string;
  /** The raw expression / attribute value if available */
  expression: string | null;
  /** Surrounding element tag, if detectable */
  element: string | null;
  /** Approximate line number (1-based), -1 if not computed */
  line: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract all Angular template bindings from a template string.
 * Deduplicates by (kind, name) — caller receives one entry per unique binding type.
 */
export function extractTemplateBindings(templateText: string): TemplateBinding[] {
  const all: TemplateBinding[] = [];
  const lines = templateText.split("\n");

  const getLine = (offset: number): number => {
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      pos += lines[i].length + 1;
      if (offset < pos) return i + 1;
    }
    return lines.length;
  };

  // ── Two-way bindings: [(prop)]="expr"  ─────────────────────────────────────
  for (const m of matchAll(templateText, /\[\(([^\)]+)\)\]\s*=\s*["'`]([^"'`]*)["'`]/g)) {
    all.push({ kind: "two-way", name: m[1], expression: m[2] ?? null, element: nearestElement(templateText, m.index!), line: getLine(m.index!) });
  }

  // ── Property bindings: [prop]="expr"  ──────────────────────────────────────
  for (const m of matchAll(templateText, /\[([^\]()]+)\]\s*=\s*["'`]([^"'`]*)["'`]/g)) {
    const name = m[1].trim();
    if (!name || name.startsWith("(")) continue; // skip two-way already captured
    const kind: BindingKind =
      name.startsWith("class.") ? "class" :
      name.startsWith("style.") ? "style" :
      name.startsWith("attr.")  ? "attr"  : "property";
    all.push({ kind, name, expression: m[2] ?? null, element: nearestElement(templateText, m.index!), line: getLine(m.index!) });
  }

  // ── Event bindings: (event)="handler()"  ───────────────────────────────────
  for (const m of matchAll(templateText, /\(([^)]+)\)\s*=\s*["'`]([^"'`]*)["'`]/g)) {
    const name = m[1].trim();
    if (!name) continue;
    all.push({ kind: "event", name, expression: m[2] ?? null, element: nearestElement(templateText, m.index!), line: getLine(m.index!) });
  }

  // ── Legacy structural: *ngIf, *ngFor, *ngSwitch  ───────────────────────────
  for (const m of matchAll(templateText, /\*(ng(?:If|For|ForOf|Switch|SwitchCase|SwitchDefault))\s*=\s*["'`]([^"'`]*)["'`]/g)) {
    all.push({ kind: "structural", name: m[1], expression: m[2] ?? null, element: nearestElement(templateText, m.index!), line: getLine(m.index!) });
  }

  // ── Modern control flow: @if / @for / @switch / @defer  ────────────────────
  for (const m of matchAll(templateText, /@(if|for|switch|defer)\s*\(([^)]*)\)/g)) {
    const kind = `block-${m[1]}` as BindingKind;
    all.push({ kind, name: m[1], expression: m[2]?.trim() ?? null, element: null, line: getLine(m.index!) });
  }

  // ── Template refs: #ref  ───────────────────────────────────────────────────
  for (const m of matchAll(templateText, /#(\w+)/g)) {
    all.push({ kind: "template-ref", name: m[1], expression: null, element: nearestElement(templateText, m.index!), line: getLine(m.index!) });
  }

  // ── Custom elements: <app-xxx> / <lib-xxx> / <mat-xxx>  ────────────────────
  for (const m of matchAll(templateText, /<([a-z][\w]*-[\w-]+)/g)) {
    const name = m[1];
    if (name.startsWith("!--")) continue; // skip comments
    all.push({ kind: "custom-element", name, expression: null, element: name, line: getLine(m.index!) });
  }

  // Deduplicate by (kind, name) — keep first occurrence
  const seen = new Set<string>();
  const unique: TemplateBinding[] = [];
  for (const b of all) {
    const key = `${b.kind}::${b.name}`;
    if (!seen.has(key)) { seen.add(key); unique.push(b); }
  }

  return unique;
}

// ─── Coverage scenario builder ────────────────────────────────────────────────

export interface TemplateCoverageScenario {
  /** Human-readable description of what should be tested */
  scenario: string;
  /** The binding string as it appears in the template, e.g. "[disabled]", "(click)" */
  binding: string;
  kind: BindingKind;
  element: string | null;
  line: number;
  status: "tested" | "untested" | "unclear";
}

/**
 * Convert raw bindings into test-scenario recommendations.
 * `testedSelectors` = selectors from the spec that have DOM assertions on them.
 */
export function buildCoverageScenarios(
  bindings: TemplateBinding[],
  testedSelectors: string[],
): TemplateCoverageScenario[] {
  const scenarios: TemplateCoverageScenario[] = [];

  for (const b of bindings) {
    const scenario = describeScenario(b);
    if (!scenario) continue;

    // A scenario is "tested" when the element it belongs to is queried in a spec.
    const status: TemplateCoverageScenario["status"] =
      b.element && testedSelectors.some((s) => s.includes(b.element!))
        ? "tested"
        : testedSelectors.length > 0
        ? "unclear"
        : "untested";

    scenarios.push({
      scenario,
      binding: formatBinding(b),
      kind: b.kind,
      element: b.element,
      line: b.line,
      status,
    });
  }

  return scenarios;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function describeScenario(b: TemplateBinding): string | null {
  switch (b.kind) {
    case "property":
      return `Input [${b.name}] gesetzt (${b.expression ?? "..."})`;
    case "class":
      return `CSS-Klasse "${b.name.replace("class.", "")}" aktiv/inaktiv`;
    case "style":
      return `Style [${b.name}] gesetzt`;
    case "attr":
      return `Attribut [${b.name}] gesetzt`;
    case "event":
      return `Event (${b.name}) ausgelöst`;
    case "two-way":
      return `Two-way [(${b.name})] lesen + schreiben`;
    case "structural":
      if (b.name === "ngIf") return `Conditional rendering (*ngIf) — true/false Zweig`;
      if (b.name.startsWith("ngFor")) return `List rendering (*ngFor) — leer / ein Element / mehrere`;
      return `Structural directive *${b.name}`;
    case "block-if":
      return `Conditional rendering (@if) — true/false Zweig`;
    case "block-for":
      return `List rendering (@for) — leer / ein Element / mehrere`;
    case "block-switch":
      return `Switch rendering (@switch) — alle Cases`;
    case "block-defer":
      return `Deferred rendering (@defer) — trigger + loaded state`;
    case "template-ref":
      return null; // template refs are rarely direct test scenarios
    case "custom-element":
      return `Child-Komponente <${b.name}> gerendert`;
    default:
      return null;
  }
}

function formatBinding(b: TemplateBinding): string {
  switch (b.kind) {
    case "property":  return `[${b.name}]`;
    case "class":     return `[${b.name}]`;
    case "style":     return `[${b.name}]`;
    case "attr":      return `[${b.name}]`;
    case "event":     return `(${b.name})`;
    case "two-way":   return `[(${b.name})]`;
    case "structural": return `*${b.name}`;
    case "block-if":  return `@if`;
    case "block-for": return `@for`;
    case "block-switch": return `@switch`;
    case "block-defer":  return `@defer`;
    case "template-ref": return `#${b.name}`;
    case "custom-element": return `<${b.name}>`;
    default:          return b.name;
  }
}

/** Find the nearest opening tag before a given offset (heuristic). */
function nearestElement(text: string, offset: number): string | null {
  const before = text.slice(Math.max(0, offset - 200), offset);
  const m = before.match(/<([\w-]+)[^>]*$/);
  return m ? m[1] : null;
}

/** matchAll polyfill returning array of exec results. */
function matchAll(text: string, rx: RegExp): RegExpExecArray[] {
  const results: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(rx.source, rx.flags.includes("g") ? rx.flags : rx.flags + "g");
  while ((m = r.exec(text)) !== null) {
    results.push(m);
    if (m.index === r.lastIndex) r.lastIndex++;
  }
  return results;
}
