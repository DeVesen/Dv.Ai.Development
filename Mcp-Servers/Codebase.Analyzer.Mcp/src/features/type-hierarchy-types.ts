// ─── Shared Type Hierarchy Contract ───────────────────────────────────────────
// Single source of truth for the find_type_hierarchy tool.
// Imported by the Angular analyzer (ts-advanced-features.ts), the .NET runner
// (dotnet-hierarchy-runner.ts) and the tool registration (index.ts).
//
// CSX contract (roslyn-hierarchy.csx) — keep both sides in sync:
//   CLI args:  dotnet script roslyn-hierarchy.csx -- <rootPath> <typeName> <filePath??""> <direction>
//              direction: "up" | "down" | "both" (default "both")
//   stdout JSON (PascalCase): { "Up": [{ "Name": string, "File": string, "Line": number,
//                                        "Kind": "class"|"interface"|"abstract"|"record"|"struct" }],
//                              "Down": [{ "Name": string, "File": string, "Line": number,
//                                         "Kind": "class"|"interface"|"abstract"|"record"|"struct" }],
//                              "CapReached": bool,
//                              "Error"?: string }
//   File uses forward-slashes relative to rootPath; Line is 1-based. External/unresolvable
//   bases may use File="" and Line=0. On error:
//   { "Up": [], "Down": [], "CapReached": false, "Error": "..." } and Exit 0.
//   PascalCase → camelCase is normalized in dotnet-hierarchy-runner.ts.
//
// Sorting: up = base chain root→leaf (farthest ancestor first); down = file→line.

export interface TypeHierarchyInfo {
  name: string;
  file: string; // relative to projectPath, forward-slashes (.replace(/\\/g, "/"))
  line: number; // 1-based; 0 when declaration is outside the scan (e.g. external .NET base)
  kind: "class" | "interface" | "abstract" | "record" | "struct";
}

export interface TypeHierarchyResult {
  up: TypeHierarchyInfo[];
  down: TypeHierarchyInfo[];
  capReached?: boolean;
  error?: string;
}

export type HierarchyDirection = "up" | "down" | "both";
export type TypeHierarchyKind = TypeHierarchyInfo["kind"];
