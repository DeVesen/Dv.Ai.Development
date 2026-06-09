import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, statSync, readdirSync } from "fs";
import { dirname, join, isAbsolute } from "path";
import { fileURLToPath } from "url";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/dotnet-indexer.csx";
const CACHE_FILENAME = ".codebase-analyzer-index-dotnet.json";
const CACHE_SOLUTION_FILENAME = ".codebase-analyzer-index-solution.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

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
  projectReferences?: string[];
  externalDependencies?: string[];
  error?: string;
}

export interface DotnetSolutionIndex extends DotnetProjectIndex {
  solutionPath: string;
  solutionMtime: string;
  projects: string[];
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
  project?: string;
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
  project?: string;
}

export interface DotnetEnumEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  values: string[];
  project?: string;
}

export interface DotnetRecordEntry {
  name: string;
  file: string;
  line: number;
  namespace: string;
  properties: string[];
  isPositional: boolean;
  project?: string;
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

function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../../roslyn-analyzer/dotnet-indexer.csx");
}

export function isDotnetSolutionPath(inputPath: string): boolean {
  if (inputPath.toLowerCase().endsWith(".sln")) return existsSync(inputPath);
  if (!existsSync(inputPath)) return false;
  try {
    return readdirSync(inputPath).some((f) => f.endsWith(".sln"));
  } catch {
    return false;
  }
}

export function resolveDotnetSolutionPath(inputPath: string): string | null {
  if (inputPath.toLowerCase().endsWith(".sln") && existsSync(inputPath)) return inputPath;
  if (!existsSync(inputPath)) return null;
  try {
    const sln = readdirSync(inputPath).find((f) => f.endsWith(".sln"));
    return sln ? join(inputPath, sln) : null;
  } catch {
    return null;
  }
}

/** Solution directory (parent of .sln) for Roslyn walk tools. */
export function resolveDotnetScopeRoot(inputPath: string): string {
  const sln = resolveDotnetSolutionPath(inputPath);
  if (sln) return dirname(sln);
  return inputPath;
}

export function isDotnetScriptAvailable(): boolean {
  try {
    const result = spawnSync("dotnet", ["script", "--version"], { encoding: "utf-8", timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function resolveDotnetIndex(inputPath: string, useCache = true): DotnetProjectIndex | DotnetSolutionIndex {
  const slnPath = resolveDotnetSolutionPath(inputPath);
  if (slnPath) return indexDotnetSolution(slnPath, useCache);
  return indexDotnetProject(inputPath, useCache);
}

export function isDotnetSolutionIndex(index: DotnetProjectIndex): index is DotnetSolutionIndex {
  return "solutionPath" in index && typeof (index as DotnetSolutionIndex).solutionPath === "string";
}

export function indexDotnetProject(rootPath: string, useCache = true): DotnetProjectIndex {
  const cacheFile = join(rootPath, CACHE_FILENAME);

  if (useCache && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf-8")) as DotnetProjectIndex;
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < CACHE_TTL_MS) return cached;
    } catch { /* re-index */ }
  }

  const parsed = runIndexerScript(rootPath, 60_000);
  if ("error" in parsed && parsed.error && !parsed.classes?.length) {
    return buildFallback(rootPath, parsed.error);
  }

  try { writeFileSync(cacheFile, JSON.stringify(parsed, null, 2)); } catch { /* best effort */ }
  return parsed;
}

export function indexDotnetSolution(
  solutionPath: string,
  useCache = true,
  projectFilter?: string[],
): DotnetSolutionIndex {
  const absSln = isAbsolute(solutionPath) ? solutionPath : join(process.cwd(), solutionPath);
  const slnDir = dirname(absSln);
  const cacheFile = join(slnDir, CACHE_SOLUTION_FILENAME);
  const currentMtime = statSync(absSln).mtime.toISOString();

  if (useCache && existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf-8")) as DotnetSolutionIndex;
      const age = Date.now() - new Date(cached.generatedAt).getTime();
      if (age < CACHE_TTL_MS && cached.solutionMtime === currentMtime) return cached;
    } catch { /* re-index */ }
  }

  const filterArg = projectFilter?.length ? projectFilter.join(",") : "";
  const args = filterArg ? [absSln, filterArg] : [absSln];
  const parsed = runIndexerScript(args, 120_000) as DotnetSolutionIndex;

  if (parsed.error && !parsed.classes?.length) {
    return buildSolutionFallback(absSln, currentMtime, parsed.error);
  }

  parsed.solutionPath = absSln;
  parsed.solutionMtime = currentMtime;
  parsed.projects = parsed.projects ?? [];

  try { writeFileSync(cacheFile, JSON.stringify(parsed, null, 2)); } catch { /* best effort */ }
  return parsed;
}

function runIndexerScript(pathOrArgs: string | string[], timeoutMs: number): DotnetProjectIndex {
  if (!isDotnetScriptAvailable()) {
    const root = Array.isArray(pathOrArgs) ? dirname(pathOrArgs[0]) : pathOrArgs;
    return buildFallback(root, "dotnet-script not available");
  }

  const scriptArgs = Array.isArray(pathOrArgs) ? pathOrArgs : [pathOrArgs];
  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", resolveScriptPath(), "--", ...scriptArgs],
    { encoding: "utf-8", timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
  );

  const root = Array.isArray(pathOrArgs) ? dirname(pathOrArgs[0]) : pathOrArgs;
  if (result.error || result.status !== 0) {
    return buildFallback(root, result.error?.message ?? result.stderr?.trim() ?? "unknown error");
  }

  const stdout = result.stdout?.trim();
  if (!stdout) {
    return buildFallback(root, result.stderr?.trim() || "empty stdout from dotnet script");
  }

  try {
    return normalizePascalToCamel(JSON.parse(stdout)) as DotnetProjectIndex;
  } catch (e) {
    return buildFallback(root, `JSON parse error: ${(e as Error).message}`);
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
    summary: emptySummary(),
    couplingReport: { mostDepended: [], mostDepending: [], circularRiskPairs: [] },
    architectureReport: { layerViolations: [], orphanInterfaces: [], godClassCandidates: [], interfaceWithSingleImpl: [] },
  };
}

function buildSolutionFallback(slnPath: string, mtime: string, error: string): DotnetSolutionIndex {
  return {
    ...buildFallback(dirname(slnPath), error),
    solutionPath: slnPath,
    solutionMtime: mtime,
    projects: [],
  };
}

function emptySummary(): DotnetSummary {
  return {
    totalFiles: 0, totalClasses: 0, totalInterfaces: 0, totalEnums: 0, totalRecords: 0,
    controllerCount: 0, serviceCount: 0, repositoryCount: 0, abstractClasses: 0, genericClasses: 0,
    totalAsyncMethods: 0, classesWithResultWait: 0, classesWithDipViolations: 0, totalSwitchStatements: 0,
    interfacesWithoutImplementation: 0, uniqueNamespaces: 0,
  };
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.charAt(0).toLowerCase() + k.slice(1),
        normalizePascalToCamel(v),
      ]),
    );
  }
  return obj;
}
