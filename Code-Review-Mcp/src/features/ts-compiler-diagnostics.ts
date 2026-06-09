import { Project } from "ts-morph";
import { existsSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import {
  CompilerDiagnostic,
  CompilerDiagnosticsResult,
  mapTsSeverity,
  SeverityFilter,
  sortDiagnostics,
} from "./diagnostics-types.js";

export const compilerDiagnosticsScanState: { capReached: boolean } = { capReached: false };

export function getCompilerDiagnostics(
  path: string,
  severity: SeverityFilter = "error",
): CompilerDiagnosticsResult {
  compilerDiagnosticsScanState.capReached = false;

  const abs = resolve(path);
  if (!existsSync(abs))
    return { diagnostics: [], error: `Path not found: ${abs}` };

  const isFile = statSync(abs).isFile();
  const projectRoot = isFile ? findProjectRoot(dirname(abs)) : findProjectRoot(abs);
  if (!projectRoot)
    return { diagnostics: [], error: `No tsconfig found for: ${abs}` };

  const tsConfigPath = resolveTsConfig(projectRoot);
  if (!tsConfigPath)
    return { diagnostics: [], error: `No tsconfig found for: ${abs}` };

  let project: Project;
  try {
    project = new Project({ tsConfigFilePath: tsConfigPath });
  } catch (e) {
    return { diagnostics: [], error: `Failed to load tsconfig: ${(e as Error).message}` };
  }

  const raw = project.getPreEmitDiagnostics();
  let mapped = raw
    .filter((d) => d.getSourceFile() !== undefined)
    .map((d) => mapDiagnostic(d, projectRoot));

  if (isFile) {
    const normTarget = abs.replace(/\\/g, "/");
    mapped = mapped.filter((d) => {
      const full = resolve(projectRoot, d.file).replace(/\\/g, "/");
      return full === normTarget || normTarget.endsWith("/" + d.file);
    });
  }

  mapped = mapped.filter((d) => passesSeverityFilter(d.severity, severity));
  return { diagnostics: sortDiagnostics(mapped) };
}

function formatTsCode(raw: number | string | undefined): string {
  if (raw === undefined) return "TS";
  const s = String(raw);
  if (s.startsWith("TS")) return s;
  if (/^\d+$/.test(s)) return `TS${s}`;
  return s;
}

function mapDiagnostic(
  d: ReturnType<Project["getPreEmitDiagnostics"]>[number],
  projectRoot: string,
): CompilerDiagnostic {
  const sf = d.getSourceFile()!;
  const start = d.getStart() ?? 0;
  const pos = sf.getLineAndColumnAtPos(start);
  const filePath = sf.getFilePath();
  const rel = relative(projectRoot, filePath).replace(/\\/g, "/");

  return {
    code: formatTsCode(d.getCode()),
    message: d.getMessageText().toString(),
    file: rel,
    line: pos.line,
    column: pos.column,
    severity: mapTsSeverity(d.getCategory() ?? 0),
  };
}

function passesSeverityFilter(
  severity: CompilerDiagnostic["severity"],
  filter: SeverityFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "error") return severity === "error";
  if (filter === "warning") return severity === "error" || severity === "warning";
  return true;
}

function resolveTsConfig(rootPath: string): string | null {
  const candidates = ["tsconfig.json", "tsconfig.app.json"];
  for (const name of candidates) {
    const p = join(rootPath, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  let prev = "";
  while (dir && dir !== prev) {
    if (resolveTsConfig(dir)) return dir;
    prev = dir;
    dir = dirname(dir);
  }
  return null;
}
