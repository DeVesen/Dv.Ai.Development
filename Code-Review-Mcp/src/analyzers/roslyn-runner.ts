import { execSync, spawnSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface RoslynMetadata {
  filename: string;
  classes: RoslynClassMeta[];
  interfaces: RoslynInterfaceMeta[];
  usings: string[];
  solidViolations: RoslynSolidViolation[];
  metrics: RoslynMetrics;
  error?: string;
}

export interface RoslynClassMeta {
  name: string;
  lineStart: number;
  methodCount: number;
  propertyCount: number;
  constructorDeps: string[];
  newExpressions: { typeName: string; line: number }[];
  longMethods: { name: string; lines: number }[];
  switchCount: number;
  deepNestingLines: number[];
  attributes: string[];
  baseTypes: string[];
  asyncMethods: string[];
  resultWaitLines: number[];
  hardcodedSecretLines: number[];
  isAbstract: boolean;
  isSealed: boolean;
  isPartial: boolean;
}

export interface RoslynInterfaceMeta {
  name: string;
  lineStart: number;
  methodCount: number;
  propertyCount: number;
}

export interface RoslynSolidViolation {
  principle: string;
  severity: string;
  className: string;
  line: number;
  description: string;
  evidence: string;
}

export interface RoslynMetrics {
  totalClasses: number;
  totalInterfaces: number;
  totalUsings: number;
  avgMethodsPerClass: number;
  maxMethodsInClass: number;
  totalSolidViolations: number;
  criticalViolations: number;
}

const SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-analyzer.csx";

/**
 * Checks whether dotnet-script is available in the container.
 */
export function isRoslynAvailable(): boolean {
  try {
    execSync("dotnet script --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs the Roslyn analyzer on a given C# code string.
 * Writes a temp file, runs dotnet-script, parses JSON output.
 */
export function analyzeCSharp(code: string, filename: string): RoslynMetadata {
  if (!isRoslynAvailable()) {
    return buildFallbackMetadata(filename, "dotnet-script not available. Falling back to prompt-only analysis.");
  }

  // Write code to temp file
  const tmpFile = join(tmpdir(), `roslyn-${Date.now()}.cs`);
  try {
    writeFileSync(tmpFile, code, "utf-8");

    const result = spawnSync("dotnet", ["script", SCRIPT_PATH, "--", tmpFile], {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    if (result.error) {
      return buildFallbackMetadata(filename, `dotnet-script error: ${result.error.message}`);
    }

    if (result.status !== 0) {
      return buildFallbackMetadata(filename, `Roslyn analyzer exited with code ${result.status}: ${result.stderr}`);
    }

    const parsed = JSON.parse(result.stdout);
    // Normalize keys to camelCase (C# outputs PascalCase)
    return normalizePascalToCamel(parsed) as RoslynMetadata;

  } catch (e) {
    return buildFallbackMetadata(filename, `Analysis failed: ${(e as Error).message}`);
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
}

function buildFallbackMetadata(filename: string, error: string): RoslynMetadata {
  return {
    filename,
    classes: [],
    interfaces: [],
    usings: [],
    solidViolations: [],
    metrics: { totalClasses: 0, totalInterfaces: 0, totalUsings: 0, avgMethodsPerClass: 0, maxMethodsInClass: 0, totalSolidViolations: 0, criticalViolations: 0 },
    error,
  };
}

// Deep convert PascalCase keys → camelCase
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
