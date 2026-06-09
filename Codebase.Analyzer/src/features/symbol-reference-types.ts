// ─── Shared Symbol Reference Contract ───────────────────────────────────────
// Single source of truth for the find_symbol_references tool.
// Imported by the Angular analyzer (ts-advanced-features.ts), the .NET runner
// (dotnet-references-runner.ts) and the tool registration (index.ts).
//
// CSX contract (roslyn-references.csx) — keep both sides in sync:
//   CLI args:  dotnet script roslyn-references.csx -- <rootPath> <symbolName> <filePath??"">
//   stdout JSON (PascalCase): { "References": [{ "File": string, "Line": number,
//                                                 "SurroundingMethod": string|null,
//                                                 "Snippet": string }],
//                              "CapReached": bool,
//                              "Error"?: string }
//   SurroundingMethod is always present (explicit null when unknown). CapReached
//   is true when the 400-file cap truncated the scan. On error:
//   { "References": [], "CapReached": false, "Error": "..." } and Exit 0.
//   PascalCase → camelCase is normalized in dotnet-references-runner.ts.

export interface SymbolReference {
  file: string; // relative to projectPath, forward-slashes (.replace(/\\/g,"/"))
  line: number; // 1-based
  surroundingMethod: string | null;
  snippet: string; // trimmed, max ~80 chars
}
