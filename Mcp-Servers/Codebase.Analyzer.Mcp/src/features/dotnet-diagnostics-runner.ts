import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  CompilerDiagnosticsResult,
  SeverityFilter,
  sortDiagnostics,
} from "./diagnostics-types.js";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-diagnostics.csx";
function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../roslyn-analyzer/roslyn-diagnostics.csx");
}

export function runDotnetDiagnostics(
  path: string,
  severity: SeverityFilter = "error",
): CompilerDiagnosticsResult {
  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", resolveScriptPath(), "--", path, severity],
    { encoding: "utf-8", timeout: 120_000, maxBuffer: 30 * 1024 * 1024 },
  );

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    const hint = code === "ENOENT"
      ? "dotnet-script nicht verfügbar — Installation prüfen (dotnet tool install -g dotnet-script)"
      : `dotnet-script konnte nicht gestartet werden: ${result.error.message}`;
    return { diagnostics: [], error: hint };
  }

  if (result.status !== 0) {
    return {
      diagnostics: [],
      error: result.stderr?.trim() || `dotnet script exited with code ${result.status}`,
    };
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as CompilerDiagnosticsResult;
    if (parsed.error) return { diagnostics: [], error: parsed.error };
    return {
      diagnostics: sortDiagnostics(parsed.diagnostics ?? []),
      capReached: parsed.capReached,
    };
  } catch (e) {
    return { diagnostics: [], error: `Parse error: ${(e as Error).message}` };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.charAt(0).toLowerCase() + k.slice(1),
        normalizePascalToCamel(v),
      ]),
    );
  return obj;
}
