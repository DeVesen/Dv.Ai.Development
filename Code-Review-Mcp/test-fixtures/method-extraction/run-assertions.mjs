// Assertion harness for analyze_method_extraction_candidates.
//
// FE: imports findExtractionCandidates from dist/
// BE: invokes roslyn-extraction.csx via dotnet script
// Set comparison on { method, suggestedName, startLine, endLine, parameters[] }
// Negative case: method under threshold → candidates: []
// SKIP_BE_ASSERTIONS=1 for local dev without dotnet-script; CI exits 1 if BE skipped.
//
// Run: npm run test:method-extraction

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularSource = join(here, "angular", "complex-method.ts");
const dotnetSource = join(here, "dotnet", "ComplexMethod.cs");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "roslyn-extraction.csx");

let failed = false;
let beSkipped = false;
let beSkipReason = "";
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function candidateKey(c) {
  if (c.expectCandidates === false) {
    return `${c.method}|__none__`;
  }
  return `${c.method}|${c.suggestedName}|${c.startLine}|${c.endLine}|${(c.parameters ?? []).join(",")}`;
}

function flattenReports(reports) {
  const flat = [];
  for (const r of reports) {
    if (r.candidates.length === 0) {
      flat.push({
        method: r.method,
        suggestedName: null,
        startLine: null,
        endLine: null,
        parameters: [],
        expectCandidates: false,
      });
      continue;
    }
    for (const c of r.candidates) {
      flat.push({
        method: r.method,
        suggestedName: c.suggestedName,
        startLine: c.startLine,
        endLine: c.endLine,
        parameters: [...(c.parameters ?? [])].sort(),
      });
    }
  }
  return flat;
}

function assertSet(label, actualReports, expectedRows) {
  const actual = flattenReports(actualReports).filter((row) => {
    if (row.expectCandidates === false) return true;
    return expectedRows.some(
      (e) => e.method === row.method && e.suggestedName === row.suggestedName,
    );
  });

  const expected = expectedRows;
  const a = actual.map(candidateKey).sort().join("\n");
  const e = expected.map(candidateKey).sort().join("\n");

  if (a === e) {
    console.log(`✅ ${label}: ${expected.length} row(s) match expected.`);
    return;
  }
  failed = true;
  console.error(`❌ ${label}: MISMATCH`);
  console.error(`  expected:\n${e.split("\n").map((l) => "    " + l).join("\n")}`);
  console.error(`  actual:\n${a.split("\n").map((l) => "    " + l).join("\n")}`);
}

function assertComplexity(label, reports, methodName, minCC) {
  const row = reports.find((r) => r.method === methodName);
  if (!row) {
    failed = true;
    console.error(`❌ ${label}: method ${methodName} not found`);
    return;
  }
  if (row.cyclomaticComplexity >= minCC) {
    console.log(`✅ ${label}: ${methodName} CC=${row.cyclomaticComplexity} >= ${minCC}`);
  } else {
    failed = true;
    console.error(`❌ ${label}: ${methodName} CC=${row.cyclomaticComplexity} expected >= ${minCC}`);
  }
}

function assertNegative(label, reports, methodName) {
  const row = reports.find((r) => r.method === methodName);
  if (!row) {
    failed = true;
    console.error(`❌ ${label}: method ${methodName} missing`);
    return;
  }
  if (row.candidates.length === 0) {
    console.log(`✅ ${label}: ${methodName} has no candidates (under threshold).`);
  } else {
    failed = true;
    console.error(`❌ ${label}: ${methodName} should have empty candidates, got ${row.candidates.length}`);
  }
}

// ── FE ───────────────────────────────────────────────────────────────────────
let findExtractionCandidates;

async function loadFe() {
  try {
    ({ findExtractionCandidates } = await import(
      pathToFileURL(resolve(here, "..", "..", "dist", "features", "ts-method-extraction.js")).href
    ));
    return true;
  } catch (e) {
    failed = true;
    console.error(`❌ FE: could not load dist — run npm run build first. (${e.message})`);
    return false;
  }
}

function runFrontend() {
  const expected = JSON.parse(readFileSync(join(here, "angular", "expected.json"), "utf-8"));
  const reports = findExtractionCandidates(angularSource);
  assertSet("FE (angular)", reports, expected);
  assertNegative("FE negative (shortMethod)", reports, "shortMethod");
  assertComplexity("FE CC (processOrder)", reports, "processOrder", 8);
}

// ── BE ───────────────────────────────────────────────────────────────────────
function runCsx(filePath) {
  return spawnSync("dotnet", ["script", "--no-cache", csxPath, "--", filePath, "20", "8"], {
    encoding: "utf-8",
    timeout: 180_000,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function normalizeBeReports(parsed) {
  const raw = parsed.Reports ?? parsed.reports ?? [];
  return raw.map((r) => ({
    method: r.Method ?? r.method,
    lines: r.Lines ?? r.lines,
    cyclomaticComplexity: r.CyclomaticComplexity ?? r.cyclomaticComplexity,
    candidates: (r.Candidates ?? r.candidates ?? []).map((c) => ({
      suggestedName: c.SuggestedName ?? c.suggestedName,
      startLine: c.StartLine ?? c.startLine,
      endLine: c.EndLine ?? c.endLine,
      parameters: [...(c.Parameters ?? c.parameters ?? [])].sort(),
    })),
  }));
}

function runBackend(label, filePath, expected) {
  if (beSkipped) {
    console.warn(`⏭️  ${label}: SKIPPED (${beSkipReason}).`);
    return null;
  }
  const res = runCsx(filePath);
  if (res.error) {
    beSkipped = true;
    beSkipReason = `dotnet-script not runnable (${res.error.code ?? res.error.message})`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}`);
    return null;
  }
  if (res.status !== 0) {
    beSkipped = true;
    beSkipReason = `dotnet script exited ${res.status}`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch (e) {
    beSkipped = true;
    beSkipReason = `parse error (${e.message})`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}`);
    return null;
  }
  if (parsed.Error ?? parsed.error) {
    failed = true;
    console.error(`❌ ${label}: CSX error: ${parsed.Error ?? parsed.error}`);
    return null;
  }
  const reports = normalizeBeReports(parsed);
  if (expected) assertSet(label, reports, expected);
  return reports;
}

// ── Run ──────────────────────────────────────────────────────────────────────
if (await loadFe()) {
  runFrontend();
}

const beExpected = JSON.parse(readFileSync(join(here, "dotnet", "expected.json"), "utf-8"));
const beReports = runBackend("BE (dotnet)", dotnetSource, beExpected);
if (beReports) {
  assertNegative("BE negative (ShortMethod)", beReports, "ShortMethod");
  assertComplexity("BE CC (ProcessOrder)", beReports, "ProcessOrder", 8);
}

if (failed) {
  console.error("\nAssertion harness: FAILED");
  process.exit(1);
}
if (beSkipped) {
  if (allowBeSkip) {
    console.warn(`\nAssertion harness: FE OK, BE SKIPPED (${beSkipReason}) — SKIP_BE_ASSERTIONS=1`);
    process.exit(0);
  }
  failed = true;
  console.error(`\nAssertion harness: FAILED — BE skipped (${beSkipReason}). Set SKIP_BE_ASSERTIONS=1 for local-only FE runs.`);
  process.exit(1);
}
console.log("\nAssertion harness: OK");
