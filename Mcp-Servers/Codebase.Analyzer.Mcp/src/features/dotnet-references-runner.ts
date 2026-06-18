import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SymbolReference } from "./symbol-reference-types.js";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-references.csx";
function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../../roslyn-analyzer/roslyn-references.csx");
}

export interface DotnetReferencesResult {
  references: SymbolReference[];
  capReached?: boolean;
  error?: string;
}

export function runDotnetReferences(rootPath: string, symbolName: string, filePath?: string): DotnetReferencesResult {
  const result = spawnSync("dotnet", ["script", "--no-cache", resolveScriptPath(), "--", rootPath, symbolName, filePath ?? ""], {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  // Spawn failure (binary missing etc.) → translate into an actionable hint.
  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    const hint = code === "ENOENT"
      ? "dotnet-script nicht verfügbar — Installation prüfen (dotnet tool install -g dotnet-script)"
      : `dotnet-script konnte nicht gestartet werden: ${result.error.message}`;
    return { references: [], error: hint };
  }
  if (result.status !== 0) {
    return { references: [], error: result.stderr?.trim() || `dotnet script exited with code ${result.status}` };
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as { references?: SymbolReference[]; capReached?: boolean; error?: string };
    if (parsed.error) return { references: [], error: parsed.error };
    const references = (parsed.references ?? []).sort((a, b) =>
      a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)
    );
    return { references, capReached: parsed.capReached ?? false };
  } catch (e) {
    return { references: [], error: `Parse error: ${(e as Error).message}` };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
