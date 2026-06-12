import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { XMLParser } from "fast-xml-parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoverageReport {
  source: "lcov" | "cobertura" | "none";
  generatedAt: string;
  summary: CoverageSummary;
  files: FileCoverage[];
  uncoveredFiles: string[];
  lowCoverageFiles: LowCoverageFile[];
  hotspots: CoverageHotspot[];
}

export interface CoverageSummary {
  lineCoverage: number;        // 0–100
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  totalLines: number;
  coveredLines: number;
  totalBranches: number;
  coveredBranches: number;
  totalFunctions: number;
  coveredFunctions: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface FileCoverage {
  file: string;
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  coveredLines: number;
  totalLines: number;
  coveredFunctions: number;
  totalFunctions: number;
  uncoveredLineNumbers: number[];
  uncoveredFunctions: string[];
}

export interface LowCoverageFile {
  file: string;
  lineCoverage: number;
  uncoveredFunctions: string[];
  severity: "critical" | "warning";
}

export interface CoverageHotspot {
  file: string;
  functionName: string;
  line: number;
  reason: string;  // "never executed" | "branch not covered" | "only happy path"
}

// ─── LCOV Parser (Angular/Jest/Karma) ─────────────────────────────────────────

export function parseLcov(rootPath: string): CoverageReport {
  // Find lcov.info
  const candidates = [
    join(rootPath, "coverage", "lcov.info"),
    join(rootPath, "coverage", "lcov", "lcov.info"),
    join(rootPath, "coverage", "report", "lcov.info"),
  ];

  // Also search recursively
  function findLcov(dir: string, depth = 0): string | null {
    if (depth > 4) return null;
    try {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === "lcov.info") return full;
        if (statSync(full).isDirectory() && !["node_modules", ".git"].includes(entry)) {
          const found = findLcov(full, depth + 1);
          if (found) return found;
        }
      }
    } catch {}
    return null;
  }

  const lcovPath = candidates.find(existsSync) ?? findLcov(rootPath);

  if (!lcovPath) {
    return buildEmptyReport("lcov", "lcov.info not found. Run: ng test --code-coverage or jest --coverage");
  }

  const content = readFileSync(lcovPath, "utf-8");
  return parseLcovContent(content, rootPath);
}

function parseLcovContent(content: string, rootPath: string): CoverageReport {
  const files: FileCoverage[] = [];
  let currentFile: Partial<FileCoverage> & { lineHits: Map<number, number>; fnHits: Map<string, number> } | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("SF:")) {
      const filePath = trimmed.slice(3);
      currentFile = {
        file: relative(rootPath, filePath),
        lineCoverage: 0, branchCoverage: 0, functionCoverage: 0,
        coveredLines: 0, totalLines: 0, coveredFunctions: 0, totalFunctions: 0,
        uncoveredLineNumbers: [], uncoveredFunctions: [],
        lineHits: new Map(), fnHits: new Map(),
      };
    }

    if (!currentFile) continue;

    if (trimmed.startsWith("FN:")) {
      // FN:<line>,<name>
      const [, name] = trimmed.slice(3).split(",");
      if (name) currentFile.fnHits!.set(name, 0);
    }

    if (trimmed.startsWith("FNDA:")) {
      // FNDA:<count>,<name>
      const colonIdx = trimmed.indexOf(",");
      const count = parseInt(trimmed.slice(5, colonIdx));
      const name = trimmed.slice(colonIdx + 1);
      currentFile.fnHits!.set(name, count);
    }

    if (trimmed.startsWith("DA:")) {
      // DA:<line>,<count>
      const [lineNum, count] = trimmed.slice(3).split(",").map(Number);
      currentFile.lineHits!.set(lineNum, count);
    }

    if (trimmed === "end_of_record" && currentFile) {
      const lineHits = currentFile.lineHits!;
      const fnHits = currentFile.fnHits!;

      const totalLines = lineHits.size;
      const coveredLines = [...lineHits.values()].filter((c) => c > 0).length;
      const uncoveredLineNumbers = [...lineHits.entries()].filter(([, c]) => c === 0).map(([l]) => l).sort((a, b) => a - b);

      const totalFunctions = fnHits.size;
      const coveredFunctions = [...fnHits.values()].filter((c) => c > 0).length;
      const uncoveredFunctions = [...fnHits.entries()].filter(([, c]) => c === 0).map(([n]) => n);

      files.push({
        file: currentFile.file!,
        lineCoverage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 100,
        branchCoverage: 0, // filled below if BRH data exists
        functionCoverage: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 100,
        coveredLines, totalLines, coveredFunctions, totalFunctions,
        uncoveredLineNumbers: uncoveredLineNumbers.slice(0, 20),
        uncoveredFunctions,
      });

      currentFile = null;
    }
  }

  return buildReport("lcov", files);
}

// ─── Cobertura Parser (.NET) ──────────────────────────────────────────────────

export function parseCobertura(rootPath: string): CoverageReport {
  // Find coverage.cobertura.xml
  function findCobertura(dir: string, depth = 0): string | null {
    if (depth > 5) return null;
    try {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === "coverage.cobertura.xml" || entry.endsWith(".cobertura.xml")) return full;
        if (statSync(full).isDirectory() && !["bin", "obj", ".git", "node_modules"].includes(entry)) {
          const found = findCobertura(full, depth + 1);
          if (found) return found;
        }
      }
    } catch {}
    return null;
  }

  const xmlPath = findCobertura(rootPath);
  if (!xmlPath) {
    return buildEmptyReport("cobertura", "coverage.cobertura.xml not found. Run: dotnet test --collect:\"XPlat Code Coverage\"");
  }

  const xml = readFileSync(xmlPath, "utf-8");
  return parseCoberturaXml(xml, rootPath);
}

function parseCoberturaXml(xml: string, rootPath: string): CoverageReport {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: (name) => ["package", "class", "method", "line"].includes(name) });
  const doc = parser.parse(xml);
  const coverage = doc.coverage;
  if (!coverage) return buildEmptyReport("cobertura", "Invalid Cobertura XML");

  const files: FileCoverage[] = [];

  const packages = coverage.packages?.package ?? [];
  for (const pkg of packages) {
    const classes = pkg.classes?.class ?? [];
    for (const cls of classes) {
      const fileName = (cls["@_filename"] ?? "").replace(/\\/g, "/");
      const relFile = fileName.includes(rootPath) ? relative(rootPath, fileName) : fileName;

      const methods = cls.methods?.method ?? [];
      const lines = cls.lines?.line ?? [];

      const totalLines = lines.length;
      const coveredLines = lines.filter((l: any) => parseInt(l["@_hits"] ?? "0") > 0).length;
      const uncoveredLineNumbers = lines
        .filter((l: any) => parseInt(l["@_hits"] ?? "0") === 0)
        .map((l: any) => parseInt(l["@_number"] ?? "0"))
        .slice(0, 20);

      const totalFunctions = methods.length;
      const coveredFunctions = methods.filter((m: any) => parseFloat(m["@_line-rate"] ?? "0") > 0).length;
      const uncoveredFunctions = methods
        .filter((m: any) => parseFloat(m["@_line-rate"] ?? "0") === 0)
        .map((m: any) => m["@_name"] ?? "");

      const lineRate = parseFloat(cls["@_line-rate"] ?? "0");
      const branchRate = parseFloat(cls["@_branch-rate"] ?? "0");

      files.push({
        file: relFile,
        lineCoverage: Math.round(lineRate * 100),
        branchCoverage: Math.round(branchRate * 100),
        functionCoverage: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 100,
        coveredLines, totalLines, coveredFunctions, totalFunctions,
        uncoveredLineNumbers,
        uncoveredFunctions,
      });
    }
  }

  return buildReport("cobertura", files);
}

// ─── Report Builder ───────────────────────────────────────────────────────────

function buildReport(source: "lcov" | "cobertura", files: FileCoverage[]): CoverageReport {
  const totalLines = files.reduce((s, f) => s + f.totalLines, 0);
  const coveredLines = files.reduce((s, f) => s + f.coveredLines, 0);
  const totalFunctions = files.reduce((s, f) => s + f.totalFunctions, 0);
  const coveredFunctions = files.reduce((s, f) => s + f.coveredFunctions, 0);

  const lineCov = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
  const fnCov = totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0;
  const branchCov = Math.round(files.reduce((s, f) => s + f.branchCoverage, 0) / Math.max(files.length, 1));

  const grade = lineCov >= 90 ? "A" : lineCov >= 75 ? "B" : lineCov >= 60 ? "C" : lineCov >= 40 ? "D" : "F";

  const uncoveredFiles = files.filter((f) => f.lineCoverage === 0).map((f) => f.file);
  const lowCoverageFiles: LowCoverageFile[] = files
    .filter((f) => f.lineCoverage < 60 && f.totalLines > 5)
    .map((f) => ({
      file: f.file,
      lineCoverage: f.lineCoverage,
      uncoveredFunctions: f.uncoveredFunctions,
      severity: f.lineCoverage < 30 ? "critical" as const : "warning" as const,
    }))
    .sort((a, b) => a.lineCoverage - b.lineCoverage);

  const hotspots: CoverageHotspot[] = [];
  for (const f of files) {
    for (const fn of f.uncoveredFunctions.slice(0, 3)) {
      hotspots.push({ file: f.file, functionName: fn, line: 0, reason: "never executed" });
    }
  }

  return {
    source, generatedAt: new Date().toISOString(),
    summary: { lineCoverage: lineCov, branchCoverage: branchCov, functionCoverage: fnCov, statementCoverage: lineCov, totalLines, coveredLines, totalBranches: 0, coveredBranches: 0, totalFunctions, coveredFunctions, grade },
    files: files.sort((a, b) => a.lineCoverage - b.lineCoverage),
    uncoveredFiles, lowCoverageFiles,
    hotspots: hotspots.slice(0, 30),
  };
}

function buildEmptyReport(source: "lcov" | "cobertura" | "none", message: string): CoverageReport {
  return {
    source: "none", generatedAt: new Date().toISOString(),
    summary: { lineCoverage: 0, branchCoverage: 0, functionCoverage: 0, statementCoverage: 0, totalLines: 0, coveredLines: 0, totalBranches: 0, coveredBranches: 0, totalFunctions: 0, coveredFunctions: 0, grade: "F" },
    files: [], uncoveredFiles: [], lowCoverageFiles: [],
    hotspots: [{ file: "", functionName: message, line: 0, reason: "never executed" }],
  };
}
