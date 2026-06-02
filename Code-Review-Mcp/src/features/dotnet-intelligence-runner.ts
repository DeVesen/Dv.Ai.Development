import { spawnSync } from "child_process";

const SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-intelligence.csx";

export type IntelligenceFeature = "maintainability" | "typegraph" | "cfg" | "all";

export interface DotnetIntelligenceResult {
  projectRoot: string;
  generatedAt: string;
  maintainabilityIndex?: DotnetMaintainabilityEntry[];
  typeGraph?: DotnetTypeGraph;
  controlFlow?: DotnetCfgEntry[];
  error?: string;
}

export interface DotnetMaintainabilityEntry {
  file: string; className: string; methodName: string; line: number;
  maintainabilityIndexScore: number; grade: string;
  cyclomaticComplexity: number; halsteadVolume: number; linesOfCode: number;
  lcom: number; interpretation: string;
}

export interface DotnetTypeGraph {
  nodes: { id: string; name: string; kind: string; file: string; line: number; isPublic: boolean; isAbstract: boolean; layer: string; genericParams: string[]; methodCount: number }[];
  edges: { from: string; to: string; relation: string; file: string; line: number }[];
  cycles: string[][];
  orphanTypes: string[];
  mostConnected: { name: string; count: number }[];
  layerViolations: string[];
}

export interface DotnetCfgEntry {
  file: string; className: string; methodName: string; line: number;
  unreachableBlocks: { line: number; code: string; reason: string }[];
  missingReturnPaths: { path: string; line: number; suggestion: string }[];
  alwaysTrueConditions: { line: number; code: string; reason: string }[];
  infiniteLoopRisks: { line: number; loopType: string; reason: string }[];
}

export function runDotnetIntelligence(rootPath: string, feature: IntelligenceFeature = "all"): DotnetIntelligenceResult {
  const result = spawnSync("dotnet", ["script", SCRIPT_PATH, "--", rootPath, feature], {
    encoding: "utf-8", timeout: 120_000, maxBuffer: 30 * 1024 * 1024,
  });

  if (result.error || result.status !== 0)
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: result.error?.message ?? result.stderr };

  try {
    return normalizePascalToCamel(JSON.parse(result.stdout)) as DotnetIntelligenceResult;
  } catch (e) {
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: `Parse error: ${(e as Error).message}` };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
