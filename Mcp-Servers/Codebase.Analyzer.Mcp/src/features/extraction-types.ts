// ─── Shared Method Extraction Contract ───────────────────────────────────────
// Single source of truth for the analyze_method_extraction_candidates tool.
// Imported by the Angular analyzer (ts-method-extraction.ts), the .NET runner
// (dotnet-extraction-runner.ts) and the tool registration (index.ts).
//
// CSX contract (roslyn-extraction.csx) — keep both sides in sync:
//   CLI args:  dotnet script roslyn-extraction.csx -- <filePath> <minLines> <minCC>
//   stdout JSON (PascalCase): { "Reports": [{ "Method": string, "Lines": number,
//                                              "CyclomaticComplexity": number,
//                                              "Candidates": [{ "SuggestedName": string,
//                                                                "StartLine": number,
//                                                                "EndLine": number,
//                                                                "Parameters": string[] }] }],
//                              "Error"?: string }
//   On error: { "Reports": [], "Error": "..." } and Exit 0.
//   PascalCase → camelCase is normalized in dotnet-extraction-runner.ts.

export const DEFAULT_MIN_LINES = 20;
export const DEFAULT_MIN_CC = 8;
export const MIN_CANDIDATE_BLOCK_LINES = 5;

export interface ExtractionThresholds {
  minLines?: number;
  minCC?: number;
}

export interface ExtractionCandidate {
  suggestedName: string;
  startLine: number;
  endLine: number;
  parameters: string[];
}

export interface MethodExtractionReport {
  method: string;
  lines: number;
  cyclomaticComplexity: number;
  candidates: ExtractionCandidate[];
}
