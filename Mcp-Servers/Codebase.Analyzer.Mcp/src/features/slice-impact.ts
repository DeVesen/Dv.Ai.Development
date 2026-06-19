// slice-impact.ts — analyze_slice_impact implementation
// Orchestrates: compiler diagnostics → boyscout → untested API → refactoring safety

import { resolve, extname } from "path";
import { existsSync, readFileSync } from "fs";
import { getCompilerDiagnostics } from "./ts-compiler-diagnostics.js";
import { runDotnetDiagnostics } from "./dotnet-diagnostics-runner.js";
import { runBoyscoutActions } from "./boyscout-runner.js";
import { detectUntestedPublicApi, analyzeRefactoringSafety } from "./ts-advanced-features.js";
import { runDotnetTestCoverageStatic } from "./dotnet-test-coverage-static-runner.js";
import { runDotnetAdvancedAnalysis } from "./dotnet-advanced-runner.js";

export interface SliceImpactSummary {
  compilerErrors: number;
  boyscoutIssues: number;
  untestedApis: number;
  refactoringSafetyIssues: number;
}

export interface CompilerGate {
  passed: boolean;
  errors: Array<{ file: string; line: number; message: string; code: string }>;
}

export interface SliceImpactResult {
  summary: SliceImpactSummary;
  compilerGate: CompilerGate;
  boyscout: unknown[];
  untestedApis: unknown[];
  refactoringSafety: unknown[];
  skipped: string[];
  markdown: string;
}

function detectStackFromFiles(filePaths: string[]): "angular" | "dotnet" | "auto" {
  const hasCsharp = filePaths.some((f) => f.endsWith(".cs"));
  const hasTs = filePaths.some((f) => [".ts", ".html"].includes(extname(f).toLowerCase()));
  if (hasCsharp && !hasTs) return "dotnet";
  if (hasTs && !hasCsharp) return "angular";
  return "auto";
}

function isProductionFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return !lower.includes(".spec.") && !lower.includes(".test.") && !lower.includes("_test.");
}

function looksLikeExportedApi(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    const content = readFileSync(filePath, "utf-8");
    return /export\s+(class|function|const|interface|abstract\s+class)/.test(content);
  } catch {
    return false;
  }
}

export async function analyzeSliceImpact(
  changedFilePaths: string[],
  type: "auto" | "angular" | "dotnet",
  format: "compact" | "full",
): Promise<SliceImpactResult> {
  const absFilePaths = changedFilePaths.map((f) => resolve(f)).filter((f) => existsSync(f));
  const prodFiles = absFilePaths.filter(isProductionFile);
  const detectedStack = type === "auto" ? detectStackFromFiles(absFilePaths) : type;

  const result: SliceImpactResult = {
    summary: { compilerErrors: 0, boyscoutIssues: 0, untestedApis: 0, refactoringSafetyIssues: 0 },
    compilerGate: { passed: true, errors: [] },
    boyscout: [],
    untestedApis: [],
    refactoringSafety: [],
    skipped: [],
    markdown: "",
  };

  // Step 1: Compiler Gate
  const compilerErrors: Array<{ file: string; line: number; message: string; code: string }> = [];

  if (detectedStack === "angular" || detectedStack === "auto") {
    const tsFiles = absFilePaths.filter((f) => f.endsWith(".ts") && existsSync(f));
    if (tsFiles.length > 0) {
      try {
        // Run on project root (parent of first file)
        const projectRoot = tsFiles[0].split(/[\\/]/).slice(0, -1).join("\\") || ".";
        const diagResult = getCompilerDiagnostics(projectRoot);
        const errors = (diagResult.diagnostics ?? []).filter((d) => d.severity === "error");
        for (const e of errors) {
          // Only include errors in our changed files
          if (absFilePaths.some((f) => e.file && (f.endsWith(e.file) || e.file.endsWith(f.split(/[\\/]/).pop()!)))) {
            compilerErrors.push({ file: e.file ?? "unknown", line: e.line ?? 0, message: e.message, code: e.code ?? "" });
          }
        }
      } catch { /* ignore compiler errors - tool may not have tsconfig */ }
    }
  }

  if (detectedStack === "dotnet") {
    const csFiles = absFilePaths.filter((f) => f.endsWith(".cs") && existsSync(f));
    if (csFiles.length > 0) {
      try {
        const projectRoot = csFiles[0].split(/[\\/]/).slice(0, -1).join("\\") || ".";
        const dotnetDiags = runDotnetDiagnostics(projectRoot, "error");
        if (!dotnetDiags.error && dotnetDiags.diagnostics) {
          for (const d of dotnetDiags.diagnostics) {
            if (d.severity === "error") {
              compilerErrors.push({ file: d.file ?? "unknown", line: d.line ?? 0, message: d.message, code: d.code ?? "" });
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  result.compilerGate.errors = compilerErrors;
  result.compilerGate.passed = compilerErrors.length === 0;
  result.summary.compilerErrors = compilerErrors.length;

  // If compiler errors → skip remaining analyses
  if (!result.compilerGate.passed) {
    result.skipped.push("suggest_boyscout_actions (compiler gate failed)");
    result.skipped.push("detect_untested_public_api (compiler gate failed)");
    result.skipped.push("analyze_refactoring_safety (compiler gate failed)");
  } else {
    // Step 2: BoyScout
    if (prodFiles.length > 0) {
      try {
        const boyscoutResult = runBoyscoutActions({
          filePaths: prodFiles,
          type: detectedStack,
          maxPerFile: 5,
        });
        const allActions = boyscoutResult.files.flatMap((f) => f.actions);
        result.boyscout = allActions;
        result.summary.boyscoutIssues = allActions.length;
      } catch { /* ignore */ }
    }

    // Step 3: Untested Public API
    if (detectedStack === "angular" || detectedStack === "auto") {
      for (const filePath of prodFiles.filter((f) => f.endsWith(".ts"))) {
        try {
          const projectRoot = filePath.split(/[\\/]/).slice(0, -1).join("\\") || ".";
          const untestedResult = detectUntestedPublicApi(filePath, "file");
          result.untestedApis.push(...untestedResult);
          result.summary.untestedApis += untestedResult.length;
        } catch { /* ignore */ }
      }
    }

    if (detectedStack === "dotnet") {
      for (const filePath of prodFiles.filter((f) => f.endsWith(".cs"))) {
        try {
          const dotnetUntested = runDotnetTestCoverageStatic(filePath, "file");
          result.untestedApis.push(...dotnetUntested);
          result.summary.untestedApis += dotnetUntested.length;
        } catch { /* ignore */ }
      }
    }

    // Step 4: Refactoring Safety (only for files with exported API)
    const apiFiles = prodFiles.filter(looksLikeExportedApi);
    if (apiFiles.length > 0) {
      if (detectedStack === "angular" || detectedStack === "auto") {
        // analyzeRefactoringSafety takes a project root path
        const tsApiFiles = apiFiles.filter((f) => f.endsWith(".ts"));
        if (tsApiFiles.length > 0) {
          try {
            const projectRoot = tsApiFiles[0].split(/[\\/]/).slice(0, -1).join("\\") || ".";
            const safety = analyzeRefactoringSafety(projectRoot);
            result.refactoringSafety.push(...safety);
            result.summary.refactoringSafetyIssues += safety.length;
          } catch { /* ignore */ }
        }
      }
      if (detectedStack === "dotnet") {
        const csApiFiles = apiFiles.filter((f) => f.endsWith(".cs"));
        if (csApiFiles.length > 0) {
          try {
            const projectRoot = csApiFiles[0].split(/[\\/]/).slice(0, -1).join("\\") || ".";
            const safety = runDotnetAdvancedAnalysis(projectRoot, "refactoring");
            if (!safety.error) {
              const items = safety.refactoringSafety ?? [];
              result.refactoringSafety.push(...items);
              result.summary.refactoringSafetyIssues += items.length;
            }
          } catch { /* ignore */ }
        }
      }
    } else {
      result.skipped.push("analyze_refactoring_safety (no exported API detected in changed files)");
    }
  }

  // Build Markdown
  const md: string[] = [];
  md.push("## Slice Impact Analysis\n");
  md.push(`### Summary`);
  md.push(`| Check | Count | Status |`);
  md.push(`|-------|-------|--------|`);
  md.push(`| Compiler Errors | ${result.summary.compilerErrors} | ${result.compilerGate.passed ? "✅ PASS" : "🔴 FAIL"} |`);
  md.push(`| BoyScout Issues | ${result.summary.boyscoutIssues} | ${result.summary.boyscoutIssues === 0 ? "✅" : "⚠️"} |`);
  md.push(`| Untested Public APIs | ${result.summary.untestedApis} | ${result.summary.untestedApis === 0 ? "✅" : "⚠️"} |`);
  md.push(`| Refactoring Safety Issues | ${result.summary.refactoringSafetyIssues} | ${result.summary.refactoringSafetyIssues === 0 ? "✅" : "⚠️"} |`);

  if (!result.compilerGate.passed) {
    md.push("\n### 🔴 Compiler Gate FAILED");
    for (const e of result.compilerGate.errors.slice(0, 10)) {
      md.push(`- ${e.file}:${e.line} [${e.code}] ${e.message}`);
    }
  }

  if (format === "full") {
    if (result.boyscout.length > 0) {
      md.push("\n### BoyScout Issues");
      md.push(JSON.stringify(result.boyscout.slice(0, 10), null, 2));
    }
    if (result.untestedApis.length > 0) {
      md.push("\n### Untested Public APIs");
      md.push(JSON.stringify(result.untestedApis.slice(0, 10), null, 2));
    }
    if (result.refactoringSafety.length > 0) {
      md.push("\n### Refactoring Safety Issues");
      md.push(JSON.stringify(result.refactoringSafety.slice(0, 10), null, 2));
    }
  }

  if (result.skipped.length > 0) {
    md.push(`\n### Skipped`);
    for (const s of result.skipped) md.push(`- ${s}`);
  }

  result.markdown = md.join("\n");
  return result;
}
