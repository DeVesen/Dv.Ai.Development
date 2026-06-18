import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  GodClassScanResult,
  filterAndRank,
  toGodClassCandidate,
} from "./god-class-types.js";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-split.csx";
function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../../roslyn-analyzer/roslyn-split.csx");
}

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
  const args = ["script", "--no-cache", resolveScriptPath(), "--", rootPath];
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

interface DotnetGodClassMetricsRow {
  file: string;
  className: string;
  line: number;
  methodCount: number;
  fieldCount: number;
  lcom: number;
  dependencies: number;
  linesOfCode: number;
}

interface DotnetGodClassScanPayload {
  capReached?: boolean;
  scannedClassCount: number;
  classes: DotnetGodClassMetricsRow[];
}

export function runDotnetGodClassScan(rootPath: string, top = 10): GodClassScanResult {
  const args = ["script", "--no-cache", resolveScriptPath(), "--", rootPath, "", "project-scan"];

  const result = spawnSync("dotnet", args, {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr ?? "roslyn-split project-scan failed");
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as DotnetGodClassScanPayload;
    const candidates = (parsed.classes ?? [])
      .map((row) =>
        toGodClassCandidate(row.className, row.file, row.line, {
          methodCount: row.methodCount,
          fieldCount: row.fieldCount,
          lcom: row.lcom,
          dependencies: row.dependencies,
          linesOfCode: row.linesOfCode,
        }),
      )
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      candidates: filterAndRank(candidates, top),
      capReached: parsed.capReached,
      scannedClassCount: parsed.scannedClassCount ?? candidates.length,
    };
  } catch {
    return { candidates: [], scannedClassCount: 0 };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
