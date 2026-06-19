import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { TypeHierarchyResult } from "./type-hierarchy-types.js";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-hierarchy.csx";
function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../roslyn-analyzer/roslyn-hierarchy.csx");
}

export function runDotnetHierarchy(
  rootPath: string,
  typeName: string,
  filePath?: string,
  direction: "up" | "down" | "both" = "both",
): TypeHierarchyResult {
  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", resolveScriptPath(), "--", rootPath, typeName, filePath ?? "", direction],
    { encoding: "utf-8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024 },
  );

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    const hint = code === "ENOENT"
      ? "dotnet-script nicht verfügbar — Installation prüfen (dotnet tool install -g dotnet-script)"
      : `dotnet-script konnte nicht gestartet werden: ${result.error.message}`;
    return { up: [], down: [], error: hint };
  }
  if (result.status !== 0) {
    return { up: [], down: [], error: result.stderr?.trim() || `dotnet script exited with code ${result.status}` };
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as TypeHierarchyResult;
    if (parsed.error) return { up: [], down: [], error: parsed.error };
    const sortDown = (items: TypeHierarchyResult["down"]) =>
      [...items].sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
    return {
      up: parsed.up ?? [],
      down: sortDown(parsed.down ?? []),
      capReached: parsed.capReached ?? false,
    };
  } catch (e) {
    return { up: [], down: [], error: `Parse error: ${(e as Error).message}` };
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
