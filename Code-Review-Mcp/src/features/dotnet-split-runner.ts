import { spawnSync } from "child_process";

const SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-split.csx";

export interface DotnetClassSplitAnalysis {
  file: string;
  className: string;
  line: number;
  lcom: { score: number; methodCount: number; fieldCount: number; sharedFieldPairs: number; interpretation: string };
  methodClusters: { clusterId: number; methods: string[]; sharedFields: string[]; sharedDependencies: string[]; suggestedName: string }[];
  fieldAccessMap: { fieldName: string; typeName: string; readByMethods: string[]; writtenByMethods: string[]; exclusiveToCluster: number | null }[];
  dependencyGroups: { dependency: string; usedByMethods: string[]; suggestedOwner: string }[];
  splitSuggestions: { newClassName: string; responsibility: string; methods: string[]; fields: string[]; dependencies: string[]; reasoning: string; estimatedLines: number }[];
  shouldSplit: boolean;
  splitUrgency: string;
}

export function runDotnetSplitAnalysis(rootPath: string, targetClass?: string): DotnetClassSplitAnalysis[] {
  const args = ["script", "--no-cache", SCRIPT_PATH, "--", rootPath];
  if (targetClass) args.push(targetClass);

  const result = spawnSync("dotnet", args, {
    encoding: "utf-8",
    timeout: 90_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr ?? "roslyn-split failed");
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return normalizePascalToCamel(parsed) as DotnetClassSplitAnalysis[];
  } catch {
    return [];
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
