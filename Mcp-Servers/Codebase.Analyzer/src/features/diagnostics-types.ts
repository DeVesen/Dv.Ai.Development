// ─── Shared Compiler Diagnostics Contract ─────────────────────────────────────
// Single source of truth for analyze_compiler_diagnostics.
// Imported by ts-compiler-diagnostics.ts, dotnet-diagnostics-runner.ts, index.ts.
//
// CSX contract (roslyn-diagnostics.csx) — keep both sides in sync:
//   CLI args:  dotnet script roslyn-diagnostics.csx -- <path> <severity>
//              severity: "error" | "warning" | "all" (default "error")
//   stdout JSON (PascalCase): { "Diagnostics": [{ "Code", "Message", "File", "Line",
//                                                   "Column", "Severity" }],
//                              "Error"?: string }
//   File uses forward-slashes; Line/Column are 1-based. On error:
//   { "Diagnostics": [], "Error": "..." } and Exit 0.
//   PascalCase → camelCase is normalized in dotnet-diagnostics-runner.ts.
//
// Sorting: severity rank (error → warning → info → hint), then file, then line.

export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";
export type SeverityFilter = "error" | "warning" | "all";

export interface CompilerDiagnostic {
  code: string;
  message: string;
  file: string;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
}

export interface CompilerDiagnosticsResult {
  diagnostics: CompilerDiagnostic[];
  capReached?: boolean;
  error?: string;
}

const SEVERITY_RANK: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
  hint: 3,
};

export function mapRoslynSeverity(severity: string): DiagnosticSeverity {
  switch (severity.toLowerCase()) {
    case "error": return "error";
    case "warning": return "warning";
    case "info": return "info";
    case "hidden":
    case "hint": return "hint";
    default: return "warning";
  }
}

export function mapTsSeverity(category: number): DiagnosticSeverity {
  // ts-morph DiagnosticCategory: 0=Warning, 1=Error, 2=Suggestion, 3=Message
  switch (category) {
    case 1: return "error";
    case 0: return "warning";
    case 3: return "info";
    case 2: return "hint";
    default: return "warning";
  }
}

export function passesSeverityFilter(
  severity: DiagnosticSeverity,
  filter: SeverityFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "error") return severity === "error";
  if (filter === "warning") return severity === "error" || severity === "warning";
  return true;
}

export function filterBySeverity(
  diagnostics: CompilerDiagnostic[],
  filter: SeverityFilter,
): CompilerDiagnostic[] {
  return diagnostics.filter((d) => passesSeverityFilter(d.severity, filter));
}

export function sortDiagnostics(diagnostics: CompilerDiagnostic[]): CompilerDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });
}
