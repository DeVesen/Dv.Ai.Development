import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { UntestedApiFinding } from "./untested-api-types.js";

const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-test-coverage-static.csx";

function resolveScriptPath(): string {
  if (existsSync(DOCKER_SCRIPT_PATH)) return DOCKER_SCRIPT_PATH;
  return join(dirname(fileURLToPath(import.meta.url)), "../roslyn-analyzer/roslyn-test-coverage-static.csx");
}

// Set by runDotnetTestCoverageStatic; read by the index.ts handler to surface a
// cap warning. Mirrors untestedApiScanState on the Angular side.
export const dotnetUntestedApiScanState: { capReached: boolean } = { capReached: false };

export function runDotnetTestCoverageStatic(path: string, depth: "file" | "project", testProjectPath?: string): UntestedApiFinding[] {
  dotnetUntestedApiScanState.capReached = false;
  const args = ["script", "--no-cache", resolveScriptPath(), "--", path, depth];
  if (testProjectPath) args.push(testProjectPath);
  const result = spawnSync("dotnet", args, {
    encoding: "utf-8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    // A spawn ENOENT means dotnet itself is missing; the more common practical
    // case is dotnet present but the `dotnet-script` global tool absent, which
    // surfaces as a non-zero exit with a telltale stderr. Surface the same
    // actionable install hint in both situations.
    const stderr = result.stderr ?? "";
    const isMissing =
      (result.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT" ||
      /not found|No such|dotnet-script|\bscript\b/i.test(stderr);
    const detail = result.error?.message ?? stderr ?? "dotnet script failed";
    const hint = isMissing ? " — Install: dotnet tool install -g dotnet-script" : "";
    throw new Error(`${detail}${hint}`);
  }

  const parsed = normalizePascalToCamel(JSON.parse(result.stdout)) as {
    findings?: UntestedApiFinding[];
    capReached?: boolean;
  };
  dotnetUntestedApiScanState.capReached = parsed.capReached ?? false;
  return (parsed.findings ?? []) as UntestedApiFinding[];
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
