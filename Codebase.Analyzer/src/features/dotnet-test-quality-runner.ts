import { spawnSync } from "child_process";

const SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-test-quality.csx";

export interface DotnetTestQualityResult {
  projectRoot: string;
  generatedAt: string;
  summary?: { totalTestFiles: number; totalTests: number; testsWithoutAssertions: number; testsWithWeakAssertions: number; testsWithOnlyHappyPath: number; avgAssertionsPerTest: number; qualityScore: number; grade: string };
  testFiles?: { file: string; testCount: number; framework: string; tests: any[]; qualityScore: number; issues: string[] }[];
  antiPatterns?: { file: string; testName: string; line: number; pattern: string; description: string; severity: string; fix: string }[];
  coverageGaps?: { sourceFile: string; untestedMethods: string[]; testFileExists: boolean; suggestedTestFile: string }[];
  recommendations?: string[];
  error?: string;
}

export function runDotnetTestQuality(rootPath: string): DotnetTestQualityResult {
  const result = spawnSync("dotnet", ["script", "--no-cache", SCRIPT_PATH, "--", rootPath], {
    encoding: "utf-8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0)
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: result.error?.message ?? result.stderr };

  try {
    return normalizePascalToCamel(JSON.parse(result.stdout)) as DotnetTestQualityResult;
  } catch (e) {
    return { projectRoot: rootPath, generatedAt: new Date().toISOString(), error: `Parse error: ${(e as Error).message}` };
  }
}

function normalizePascalToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizePascalToCamel);
  if (obj !== null && typeof obj === "object")
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>)
      .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), normalizePascalToCamel(v)]));
  return obj;
}
