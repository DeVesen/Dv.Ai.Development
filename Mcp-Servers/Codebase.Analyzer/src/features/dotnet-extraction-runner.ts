import { spawnSync } from "child_process";
import {
  DEFAULT_MIN_CC,
  DEFAULT_MIN_LINES,
  ExtractionThresholds,
  MethodExtractionReport,
} from "./extraction-types.js";

const SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-extraction.csx";

export interface DotnetExtractionResult {
  reports: MethodExtractionReport[];
  error?: string;
}

export function runDotnetExtraction(
  filePath: string,
  thresholds?: ExtractionThresholds,
): DotnetExtractionResult {
  const minLines = thresholds?.minLines ?? DEFAULT_MIN_LINES;
  const minCC = thresholds?.minCC ?? DEFAULT_MIN_CC;

  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", SCRIPT_PATH, "--", filePath, String(minLines), String(minCC)],
    { encoding: "utf-8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024 },
  );

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    const hint =
      code === "ENOENT"
        ? "dotnet-script nicht verfügbar — Installation prüfen (dotnet tool install -g dotnet-script)"
        : `dotnet-script konnte nicht gestartet werden: ${result.error.message}`;
    return { reports: [], error: hint };
  }
  if (result.status !== 0) {
    return { reports: [], error: result.stderr?.trim() || `dotnet script exited with code ${result.status}` };
  }

  try {
    const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as {
      reports?: MethodExtractionReport[];
      error?: string;
    };
    if (parsed.error) return { reports: [], error: parsed.error };
    return { reports: parsed.reports ?? [] };
  } catch (e) {
    return { reports: [], error: `Parse error: ${(e as Error).message}` };
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
