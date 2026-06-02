import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const SCRIPT_PATH = "/app/roslyn-analyzer/dotnet-indexer.csx";
const CACHE_FILENAME = ".code-review-index-dotnet.json";

export interface DotnetProjectIndex {
  generatedAt: string;
  projectRoot: string;
  summary: DotnetSummary;
  namespaces: string[];
  classes: DotnetClassEntry[];
  interfaces: DotnetInterfaceEntry[];
  enums: DotnetEnumEntry[];
  records: DotnetRecordEntry[];
  dependencyGraph: Record<string, { dependsOn: string[]; usedBy: string[]; file: string }>;
  couplingReport: DotnetCouplingReport;
  architectureReport: DotnetArchitectureReport;
  error?: string;
}

export interface DotnetSummary {
  totalFiles: number;
  totalClasses: number;
  totalInterfaces: number;
  totalEnums: number;
  totalRecords: number;
  controllerCount: number;
  serviceCount: number;
  repositoryCount: number;
  abstractClasses: number;
  genericClasses: number;
  totalAsyncMethods: number;
  classesWithResultWait: number;
  classesWithDipViolations: number;
  totalSwitchStatements: number;
  interfacesWithoutImplementation: number;
  uniqueNamespaces: number;
}

export interface DotnetClassEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  layer: string;
  isAbstract: boolean;
  isSealed: boolean;
  isPartial: boolean;
  isGeneric: boolean;
  attributes: string[];
  implementedInterfaces: string[];
  baseClass: string | null;
  constructorDeps: string[];
  publicMethods: DotnetMethodEntry[];
  properties: string[];
  dipViolations: { typeName: string; line: number }[];
  asyncMethods: string[];
  resultWaitLines: number[];
  longMethods: { name: string; lines: number; isAsync: boolean; returnType: string }[];
  methodCount: number;
  propertyCount: number;
  switchCount: number;
}

export interface DotnetInterfaceEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  methods: string[];
  properties: string[];
  extendedInterfaces: string[];
  implementedBy: string[];
  methodCount: number;
}

export interface DotnetEnumEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  values: string[];
}

export interface DotnetRecordEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  properties: string[];
  isPositional: boolean;
}

export interface DotnetMethodEntry {
  name: string;
  returnType: string;
  isAsync: boolean;
  hasCancellationToken: boolean;
  paramCount: number;
  lines: number;
}

export interface DotnetCouplingReport {
  mostDepended: { name: string; count: number }[];
  mostDepending: { name: string; count: number }[];
  circularRiskPairs: string[];
}

export interface DotnetArchitectureReport {
  layerViolations: string[];
  orphanInterfaces: string[];
  godClassCandidates: string[];
  interfaceWithSingleImpl: string[];
}

export function isDotnetScriptAvailable(): boolean {
  try {
    const result = spawnSync("dotnet", ["script", "--version"], { encoding: "utf-8", timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function indexDotnetProject(rootPath: string, useCache = true): DotnetProjectIndex {
  const cacheFile = join(rootPath, CACHE_FILENAME);

  // Return cached index if fresh (< 5 minutes)
  if (useCache && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf-8")) as DotnetProjectIndex;
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < 5 * 60 * 1000) return cached;
    } catch {}
  }

  if (!isDotnetScriptAvailable()) {
    return buildFallback(rootPath, "dotnet-script not available");
  }

  const result = spawnSync("dotnet", ["script", "--no-cache", SCRIPT_PATH, "--", rootPath], {
    encoding: "utf-8",
    timeout: 60_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    return buildFallback(rootPath, result.error?.message ?? result.stderr ?? "unknown error");
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as DotnetProjectIndex;

    // Cache result
    try { writeFileSync(cacheFile, JSON.stringify(parsed, null, 2)); } catch {}

    return parsed;
  } catch (e) {
    return buildFallback(rootPath, `JSON parse error: ${(e as Error).message}`);
  }
}

function buildFallback(rootPath: string, error: string): DotnetProjectIndex {
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: rootPath,
    error,
    namespaces: [],
    classes: [],
    interfaces: [],
    enums: [],
    records: [],
    dependencyGraph: {},
    summary: { totalFiles: 0, totalClasses: 0, totalInterfaces: 0, totalEnums: 0, totalRecords: 0, controllerCount: 0, serviceCount: 0, repositoryCount: 0, abstractClasses: 0, genericClasses: 0, totalAsyncMethods: 0, classesWithResultWait: 0, classesWithDipViolations: 0, totalSwitchStatements: 0, interfacesWithoutImplementation: 0, uniqueNamespaces: 0 },
    couplingReport: { mostDepended: [], mostDepending: [], circularRiskPairs: [] },
    architectureReport: { layerViolations: [], orphanInterfaces: [], godClassCandidates: [], interfaceWithSingleImpl: [] },
  };
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.charAt(0).toLowerCase() + k.slice(1),
        normalizePascalToCamel(v),
      ])
    );
  }
  return obj;
}
