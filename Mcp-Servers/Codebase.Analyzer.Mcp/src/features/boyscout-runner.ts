import { existsSync, readdirSync, statSync } from "fs";
import { basename, dirname, extname, join, relative, resolve } from "path";
import {
  analyzeCyclomaticComplexity,
  analyzeDeadCode,
  analyzeNullability,
  detectUntestedPublicApi,
} from "./ts-advanced-features.js";
import { findExtractionCandidates } from "./ts-method-extraction.js";
import { getCompilerDiagnostics } from "./ts-compiler-diagnostics.js";
import { runDotnetDiagnostics } from "./dotnet-diagnostics-runner.js";
import { runDotnetAdvancedAnalysis } from "./dotnet-advanced-runner.js";
import { runDotnetExtraction } from "./dotnet-extraction-runner.js";
import { runDotnetTestCoverageStatic } from "./dotnet-test-coverage-static-runner.js";
import { filterBySeverity } from "./diagnostics-types.js";
import {
  BOYSCOUT_SEVERITY_ORDER,
  BOYSCOUT_SEVERITY_WEIGHT,
  BoyscoutAction,
  BoyscoutCategory,
  BoyscoutFileReport,
  BoyscoutRunOptions,
  BoyscoutRunResult,
  BoyscoutSeverity,
  BoyscoutStack,
  DEFAULT_MAX_PER_FILE,
} from "./boyscout-types.js";

interface RawAction extends BoyscoutAction {
  file: string;
}

export function runBoyscoutActions(options: BoyscoutRunOptions): BoyscoutRunResult {
  const maxPerFile = options.maxPerFile ?? DEFAULT_MAX_PER_FILE;
  const absPaths = options.filePaths.map((p) => resolve(p));

  for (const p of absPaths) {
    if (!existsSync(p))
      throw new Error(`Path not found: ${p}`);
    if (!statSync(p).isFile())
      throw new Error(`Expected a file path, got directory: ${p}`);
  }

  const stack = resolveStack(absPaths, options.type);
  const projectRoot = resolveProjectRoot(absPaths[0], stack);
  const scopeRelPaths = new Set(absPaths.map((p) => normalizeRelPath(projectRoot, p)));

  const raw: RawAction[] = [];

  // ── Compiler gate (per file) — only real compiler errors, not analyzer unavailability ──
  let compilerGateTriggered = false;
  for (const abs of absPaths) {
    const rel = normalizeRelPath(projectRoot, abs);
    const { actions, hasErrors } = collectCompilerActions(abs, rel, stack);
    if (hasErrors) compilerGateTriggered = true;
    raw.push(...actions);
  }

  if (!compilerGateTriggered) {
    raw.push(...collectProjectScopedActions(projectRoot, stack, scopeRelPaths));
    for (const abs of absPaths) {
      const rel = normalizeRelPath(projectRoot, abs);
      raw.push(...collectFileScopedActions(abs, rel, stack));
    }
  }

  const files = buildFileReports(raw, scopeRelPaths, maxPerFile);

  return {
    stack,
    projectRoot,
    compilerGateTriggered,
    files,
  };
}

export function formatBoyscoutMarkdown(result: BoyscoutRunResult): string {
  const lines: string[] = [
    `## BoyScout Actions (${result.stack})`,
    `_Compiler gate: ${result.compilerGateTriggered ? "active — only compiler findings" : "clear"}_`,
    ``,
  ];

  if (result.files.every((f) => f.actions.length === 0)) {
    lines.push(`No boyscout actions found for the given file(s).`);
    return lines.join("\n");
  }

  for (const fileReport of result.files) {
    lines.push(`### \`${fileReport.file}\``);
    if (fileReport.actions.length === 0) {
      lines.push(`_No findings._`);
      lines.push(``);
      continue;
    }
    for (const a of fileReport.actions) {
      const tag = a.severity.toUpperCase();
      const sym = a.symbol ? ` \`${a.symbol}\`` : "";
      lines.push(`- **[${tag}]** [${a.category}] L${a.line}${sym}: ${a.message}`);
      if (a.quickfix) lines.push(`  - Quickfix: ${a.quickfix}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

// ─── Stack / path helpers ─────────────────────────────────────────────────────

function normalizeRelPath(projectRoot: string, filePath: string): string {
  return relative(projectRoot, resolve(filePath)).replace(/\\/g, "/");
}

function pathInScope(resultFile: string, scopeRelPaths: Set<string>): boolean {
  const norm = resultFile.replace(/\\/g, "/");
  if (scopeRelPaths.has(norm)) return true;
  for (const scope of scopeRelPaths) {
    if (norm.endsWith("/" + scope) || norm === basename(scope)) return true;
  }
  return false;
}

function resolveStack(absPaths: string[], type: BoyscoutStack | "auto"): BoyscoutStack {
  if (type !== "auto") return type;

  let ts = 0;
  let cs = 0;
  for (const p of absPaths) {
    const ext = extname(p).toLowerCase();
    if (ext === ".ts") ts++;
    else if (ext === ".cs") cs++;
  }
  if (ts > 0 && cs > 0)
    throw new Error(`Mixed stack file extensions — specify type: "angular" or "dotnet"`);
  if (cs > 0) return "dotnet";
  if (ts > 0) return "angular";
  throw new Error(`Could not auto-detect stack — specify type: "angular" or "dotnet"`);
}

function resolveProjectRoot(startFile: string, stack: BoyscoutStack): string {
  let dir = dirname(resolve(startFile));
  let prev = "";
  while (dir && dir !== prev) {
    if (stack === "angular") {
      if (existsSync(join(dir, "angular.json")) || existsSync(join(dir, "project.json")))
        return dir;
      if (existsSync(join(dir, "tsconfig.json")) || existsSync(join(dir, "tsconfig.app.json")))
        return dir;
    } else {
      try {
        if (readdirSync(dir).some((f) => f.endsWith(".csproj") || f.endsWith(".sln")))
          return dir;
      } catch { /* continue walk */ }
    }
    prev = dir;
    dir = dirname(dir);
  }
  return dirname(resolve(startFile));
}

// ─── Collectors ───────────────────────────────────────────────────────────────

function collectCompilerActions(
  absPath: string,
  relPath: string,
  stack: BoyscoutStack,
): { actions: RawAction[]; hasErrors: boolean } {
  const actions: RawAction[] = [];

  if (stack === "angular") {
    const res = getCompilerDiagnostics(absPath, "error");
    if (res.error) {
      actions.push(skipWarning(relPath, "compiler", res.error));
      return { actions, hasErrors: false };
    }
    for (const d of res.diagnostics) {
      actions.push({
        file: relPath,
        severity: "critical",
        category: "compiler",
        line: d.line,
        message: `${d.code}: ${d.message}`,
        symbol: d.code,
      });
    }
    return { actions, hasErrors: actions.length > 0 };
  }

  const res = runDotnetDiagnostics(absPath, "error");
  if (res.error) {
    actions.push(skipWarning(relPath, "compiler", res.error));
    return { actions, hasErrors: false };
  }
  for (const d of filterBySeverity(res.diagnostics, "error")) {
    actions.push({
      file: relPath,
      severity: "critical",
      category: "compiler",
      line: d.line,
      message: `${d.code}: ${d.message}`,
      symbol: d.code,
    });
  }
  return { actions, hasErrors: actions.length > 0 };
}

function collectProjectScopedActions(
  projectRoot: string,
  stack: BoyscoutStack,
  scopeRelPaths: Set<string>,
): RawAction[] {
  const actions: RawAction[] = [];

  if (stack === "angular") {
    for (const item of analyzeNullability(projectRoot)) {
      if (!pathInScope(item.file, scopeRelPaths)) continue;
      actions.push({
        file: item.file.replace(/\\/g, "/"),
        severity: item.severity === "critical" ? "critical" : "warning",
        category: "nullability",
        line: item.line,
        message: item.issue,
        quickfix: item.fix,
        symbol: item.code.slice(0, 40),
      });
    }
    for (const item of analyzeDeadCode(projectRoot)) {
      if (!pathInScope(item.file, scopeRelPaths)) continue;
      actions.push({
        file: item.file.replace(/\\/g, "/"),
        severity: "warning",
        category: "dead_code",
        line: item.line,
        message: `${item.kind} ${item.name}: ${item.reason}`,
        symbol: item.name,
      });
    }
    for (const item of analyzeCyclomaticComplexity(projectRoot)) {
      if (!pathInScope(item.file, scopeRelPaths)) continue;
      if (item.complexity < 10) continue;
      actions.push({
        file: item.file.replace(/\\/g, "/"),
        severity: item.severity === "critical" ? "critical" : "warning",
        category: "complexity",
        line: item.line,
        message: `${item.className}.${item.methodName} CC=${item.complexity}`,
        symbol: `${item.className}.${item.methodName}`,
      });
    }
  } else {
    const nullRes = runDotnetAdvancedAnalysis(projectRoot, "nullflow");
    if (nullRes.error) {
      for (const rel of scopeRelPaths)
        actions.push(skipWarning(rel, "nullability", nullRes.error));
    } else {
      for (const item of nullRes.nullabilityIssues ?? []) {
        if (!pathInScope(item.file, scopeRelPaths)) continue;
        actions.push({
          file: item.file.replace(/\\/g, "/"),
          severity: item.severity === "critical" ? "critical" : "warning",
          category: "nullability",
          line: item.line,
          message: item.issue,
          quickfix: item.fix,
          symbol: item.code?.slice(0, 40),
        });
      }
    }

    const deadRes = runDotnetAdvancedAnalysis(projectRoot, "deadcode");
    if (deadRes.error) {
      for (const rel of scopeRelPaths)
        actions.push(skipWarning(rel, "dead_code", deadRes.error));
    } else {
      for (const item of deadRes.deadCode ?? []) {
        if (!pathInScope(item.file, scopeRelPaths)) continue;
        actions.push({
          file: item.file.replace(/\\/g, "/"),
          severity: "warning",
          category: "dead_code",
          line: item.line,
          message: `${item.kind} ${item.name}: ${item.reason}`,
          symbol: item.name,
        });
      }
    }

    const ccRes = runDotnetAdvancedAnalysis(projectRoot, "complexity");
    if (ccRes.error) {
      for (const rel of scopeRelPaths)
        actions.push(skipWarning(rel, "complexity", ccRes.error));
    } else {
      for (const item of ccRes.cyclomaticComplexity ?? []) {
        if (!pathInScope(item.file, scopeRelPaths)) continue;
        if (item.complexity < 10) continue;
        actions.push({
          file: item.file.replace(/\\/g, "/"),
          severity: item.severity === "critical" ? "critical" : "warning",
          category: "complexity",
          line: item.line,
          message: `${item.className}.${item.methodName} CC=${item.complexity}`,
          symbol: `${item.className}.${item.methodName}`,
        });
      }
    }
  }

  return actions;
}

function collectFileScopedActions(
  absPath: string,
  relPath: string,
  stack: BoyscoutStack,
): RawAction[] {
  const actions: RawAction[] = [];

  if (stack === "angular") {
    try {
      for (const f of detectUntestedPublicApi(absPath, "file")) {
        actions.push({
          file: relPath,
          severity: "suggestion",
          category: "untested_api",
          line: f.line,
          message: `public ${f.symbol} has no test reference (${f.reason})`,
          symbol: f.symbol,
        });
      }
    } catch (e) {
      actions.push(skipWarning(relPath, "untested_api", (e as Error).message));
    }

    try {
      const reports = findExtractionCandidates(absPath, { minCC: 10, minLines: 20 });
      for (const r of reports) {
        if (r.cyclomaticComplexity < 10 || r.candidates.length === 0) continue;
        const c = r.candidates[0];
        actions.push({
          file: relPath,
          severity: "suggestion",
          category: "extraction",
          line: c.startLine,
          message: `Extract from ${r.method} → ${c.suggestedName}() (CC=${r.cyclomaticComplexity}, L${c.startLine}–${c.endLine})`,
          symbol: r.method,
          quickfix: `Consider extract-method: ${c.suggestedName}(${c.parameters.join(", ")})`,
        });
      }
    } catch (e) {
      actions.push(skipWarning(relPath, "extraction", (e as Error).message));
    }
  } else {
    try {
      for (const f of runDotnetTestCoverageStatic(absPath, "file")) {
        actions.push({
          file: relPath,
          severity: "suggestion",
          category: "untested_api",
          line: f.line,
          message: `public ${f.symbol} has no test reference (${f.reason})`,
          symbol: f.symbol,
        });
      }
    } catch (e) {
      actions.push(skipWarning(relPath, "untested_api", (e as Error).message));
    }

    try {
      const res = runDotnetExtraction(absPath, { minCC: 10, minLines: 20 });
      if (res.error) {
        actions.push(skipWarning(relPath, "extraction", res.error));
      } else {
        for (const r of res.reports) {
          if (r.cyclomaticComplexity < 10 || r.candidates.length === 0) continue;
          const c = r.candidates[0];
          actions.push({
            file: relPath,
            severity: "suggestion",
            category: "extraction",
            line: c.startLine,
            message: `Extract from ${r.method} → ${c.suggestedName}() (CC=${r.cyclomaticComplexity}, L${c.startLine}–${c.endLine})`,
            symbol: r.method,
            quickfix: `Consider extract-method: ${c.suggestedName}(${c.parameters.join(", ")})`,
          });
        }
      }
    } catch (e) {
      actions.push(skipWarning(relPath, "extraction", (e as Error).message));
    }
  }

  return actions;
}

function skipWarning(file: string, category: BoyscoutCategory, reason: string): RawAction {
  return {
    file,
    severity: "warning",
    category,
    line: 1,
    message: `Check skipped: ${reason}`,
  };
}

// ─── Dedup, score, cap ────────────────────────────────────────────────────────

function dedupeKey(file: string, action: BoyscoutAction): string {
  return `${file}:${action.line}:${action.symbol ?? action.category}`;
}

function mergeSeverity(a: BoyscoutSeverity, b: BoyscoutSeverity): BoyscoutSeverity {
  return BOYSCOUT_SEVERITY_ORDER[a] <= BOYSCOUT_SEVERITY_ORDER[b] ? a : b;
}

function buildFileReports(
  raw: RawAction[],
  scopeRelPaths: Set<string>,
  maxPerFile: number,
): BoyscoutFileReport[] {
  const byFile = new Map<string, Map<string, { action: BoyscoutAction; count: number }>>();

  for (const item of raw) {
    const file = item.file.replace(/\\/g, "/");
    if (!pathInScope(file, scopeRelPaths) && !scopeRelPaths.has(file)) continue;

    const key = dedupeKey(file, item);
    const fileMap = byFile.get(file) ?? new Map();
    const existing = fileMap.get(key);
    if (existing) {
      existing.count++;
      existing.action.severity = mergeSeverity(existing.action.severity, item.severity);
    } else {
      fileMap.set(key, {
        action: {
          severity: item.severity,
          category: item.category,
          line: item.line,
          message: item.message,
          quickfix: item.quickfix,
          symbol: item.symbol,
        },
        count: 1,
      });
    }
    byFile.set(file, fileMap);
  }

  const reports: BoyscoutFileReport[] = [];
  const orderedFiles = [...scopeRelPaths];

  for (const scopeFile of orderedFiles) {
    const fileMap = byFile.get(scopeFile);
    const scored = fileMap
      ? [...fileMap.values()].map(({ action, count }) => ({
          action,
          score: BOYSCOUT_SEVERITY_WEIGHT[action.severity] * (1 + 0.2 * (count - 1)),
        }))
      : [];

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return BOYSCOUT_SEVERITY_ORDER[a.action.severity] - BOYSCOUT_SEVERITY_ORDER[b.action.severity];
    });

    reports.push({
      file: scopeFile,
      actions: scored.slice(0, maxPerFile).map((s) => s.action),
    });
  }

  return reports;
}
