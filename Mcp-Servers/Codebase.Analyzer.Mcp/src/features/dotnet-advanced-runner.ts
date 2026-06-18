import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-advanced.csx";
function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../../roslyn-analyzer/roslyn-advanced.csx");
}

export type AdvancedFeature = "complexity" | "deadcode" | "nullflow" | "duplicates" | "refactoring" | "autofix" | "dataflow" | "all";

export interface DotnetAdvancedAnalysis {
  projectRoot: string;
  generatedAt: string;
  cyclomaticComplexity?: DotnetComplexityEntry[];
  deadCode?: DotnetDeadCodeEntry[];
  nullabilityIssues?: DotnetNullabilityEntry[];
  duplicates?: DotnetDuplicateGroup[];
  refactoringSafety?: DotnetRefactoringSafetyEntry[];
  autoFixes?: DotnetAutoFixEntry[];
  crossFileDataflow?: DotnetDataflowEntry[];
  error?: string;
}

export interface DotnetComplexityEntry { file: string; className: string; methodName: string; line: number; complexity: number; severity: string; branches: string[]; }
export interface DotnetDeadCodeEntry { file: string; name: string; kind: string; line: number; visibility: string; reason: string; }
export interface DotnetNullabilityEntry { file: string; line: number; code: string; issue: string; severity: string; fix: string; }
export interface DotnetDuplicateGroup { similarity: number; instances: { file: string; className: string; methodName: string; line: number }[]; suggestion: string; }
export interface DotnetRefactoringSafetyEntry { file: string; className: string; memberName: string; line: number; usageCount: number; usages: { file: string; line: number; context: string }[]; safeToRename: boolean; risks: string[]; }
export interface DotnetAutoFixEntry { file: string; line: number; category: string; description: string; before: string; after: string; automated: boolean; }
export interface DotnetDataflowEntry { file: string; line: number; fromClass: string; fromMethod: string; toClass: string; toMethod: string; issue: string; severity: string; dataPath: string; }

export function runDotnetAdvancedAnalysis(rootPath: string, feature: AdvancedFeature = "all"): DotnetAdvancedAnalysis {
  const result = spawnSync("dotnet", ["script", "--no-cache", resolveScriptPath(), "--", rootPath, feature], {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: result.error?.message ?? result.stderr ?? "unknown error" };
  }

  try {
    return normalizePascalToCamel(JSON.parse(result.stdout)) as DotnetAdvancedAnalysis;
  } catch (e) {
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: `Parse error: ${(e as Error).message}` };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
