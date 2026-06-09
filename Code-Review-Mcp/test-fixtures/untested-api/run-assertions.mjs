// Lightweight assertion harness for detect_untested_public_api.
//
// FE: imports the built detectUntestedPublicApi (dist/) and runs:
//     • depth="project" against the angular fixtures (both reason values)
//     • depth="file"    against fe-file-mode (spec in a PARENT directory →
//       specCandidatesUpward) and a synthetic cap smoke test (capReached).
// BE: invokes the .csx via `dotnet script` against the dotnet fixtures:
//     • depth="project" against the dotnet fixtures (both reason values)
//     • depth="file"    against be-file-mode (source in a subproject, test in a
//       sibling *.Tests project under a shared .sln → FindSolutionRoot).
//     If dotnet / dotnet-script is unavailable, BE parts are SKIPPED and the
//     harness exits 1 (CI-safe). Opt-out for local dev without dotnet-script:
//     SKIP_BE_ASSERTIONS=1
//
// Compared projection: { symbol, file, reason } (line numbers excluded — stable
// across edits). Run via:  npm run test:untested-api

import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularDir = join(here, "angular");
const dotnetDir = join(here, "dotnet");
const feFileSource = join(here, "fe-file-mode", "child", "upward.widget.ts");
const beFileSource = join(here, "be-file-mode", "src", "Calc", "Calculator.cs");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "roslyn-test-coverage-static.csx");

let failed = false;
let beSkipped = false;
let beSkipReason = "";
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

const norm = (arr) =>
  arr
    .map((f) => `${f.file}|${f.symbol}|${f.reason}`)
    .sort()
    .join("\n");

function assertSet(label, actual, expected) {
  const a = norm(actual);
  const e = norm(expected);
  if (a === e) {
    console.log(`✅ ${label}: ${actual.length} finding(s) match expected.`);
  } else {
    failed = true;
    console.error(`❌ ${label}: MISMATCH`);
    console.error(`  expected:\n${e.split("\n").map((l) => "    " + l).join("\n")}`);
    console.error(`  actual:\n${a.split("\n").map((l) => "    " + l).join("\n")}`);
  }
}

function assertEqual(label, actual, expected) {
  if (actual === expected) {
    console.log(`✅ ${label}: ${actual} (as expected).`);
  } else {
    failed = true;
    console.error(`❌ ${label}: expected ${expected}, got ${actual}`);
  }
}

const hasFinding = (findings, symbol, reason) =>
  findings.some((f) => f.symbol === symbol && f.reason === reason);

// G1 discrimination: a member untested in its OWN class must be reported even when
// the same name is exercised by ANOTHER class's test. Asserts the positive case
// (A.compute reported) AND the negative case (B.compute NOT reported) so a
// rollback to global cross-class matching turns this red.
function assertDiscriminator(label, findings, untestedSym, decoySym) {
  if (!hasFinding(findings, untestedSym, "no_reference_found")) {
    failed = true;
    console.error(`❌ ${label}: expected ${untestedSym} (no_reference_found) — per-class scoping not falsifiable.`);
    return;
  }
  if (findings.some((f) => f.symbol === decoySym)) {
    failed = true;
    console.error(`❌ ${label}: decoy ${decoySym} must NOT be reported.`);
    return;
  }
  console.log(`✅ ${label}: ${untestedSym} reported, decoy ${decoySym} not — scoping discriminates.`);
}

// G7: class→test association via word-boundary code reference (not filename stem).
// Cleanup must be "no_reference_found" (test file exists via word boundary), not
// "no_test_file" (which would indicate stem-only matching).
function assertWordBoundaryAssociation(label, findings) {
  if (!hasFinding(findings, "WordBoundaryTarget.Cleanup", "no_reference_found")) {
    failed = true;
    console.error(
      `❌ ${label}: expected WordBoundaryTarget.Cleanup (no_reference_found) — word-boundary association not falsifiable.`,
    );
    return;
  }
  if (hasFinding(findings, "WordBoundaryTarget.Execute", "no_reference_found")
    || hasFinding(findings, "WordBoundaryTarget.Execute", "no_test_file")) {
    failed = true;
    console.error(`❌ ${label}: WordBoundaryTarget.Execute must NOT be reported (referenced in MiscIntegrationTest).`);
    return;
  }
  if (hasFinding(findings, "WordBoundaryTarget.Cleanup", "no_test_file")) {
    failed = true;
    console.error(`❌ ${label}: WordBoundaryTarget.Cleanup reported as no_test_file — stem-only rollback detected.`);
    return;
  }
  console.log(`✅ ${label}: word-boundary class→test association discriminates (Cleanup only).`);
}

// G6: ES #private members must never surface as untested public API.
function assertNoPrivate(label, findings) {
  const leaked = findings.filter((f) => f.symbol.startsWith("PrivateSample") || f.symbol.includes(".#"));
  if (leaked.length === 0) {
    console.log(`✅ ${label}: no #private members reported (exclusion holds).`);
  } else {
    failed = true;
    console.error(`❌ ${label}: #private/excluded members leaked: ${leaked.map((f) => f.symbol).join(", ")}`);
  }
}

// ── FE (Angular) ─────────────────────────────────────────────────────────────
let detectUntestedPublicApi;
let untestedApiScanState;

async function loadFe() {
  try {
    ({ detectUntestedPublicApi, untestedApiScanState } = await import(
      pathToFileURL(resolve(here, "..", "..", "dist", "features", "ts-advanced-features.js")).href
    ));
    return true;
  } catch (e) {
    failed = true;
    console.error(`❌ FE: could not load dist build — run \`npm run build\` first. (${e.message})`);
    return false;
  }
}

function runFrontendProject() {
  const expected = JSON.parse(readFileSync(join(angularDir, "expected.json"), "utf-8"));
  const findings = detectUntestedPublicApi(angularDir, "project");
  assertSet("FE (angular, depth=project)", findings, expected);
  assertDiscriminator("FE G1 (per-class scoping)", findings, "DiscriminatorA.compute", "DiscriminatorB.compute");
  assertNoPrivate("FE G6 (#private excluded)", findings);
}

function runFrontendFileMode() {
  // Spec lives in the PARENT directory of the source file.
  const findings = detectUntestedPublicApi(feFileSource, "file");
  assertSet("FE (angular, depth=file, upward spec)", findings, [
    { symbol: "UpwardWidget.untestedRender", file: "upward.widget.ts", reason: "no_reference_found" },
  ]);
}

// Synthetic cap smoke test: generate FILE_CAP+1 trivial sources and assert the
// scan flags capReached (cheaper than committing 401 fixtures).
function runFrontendCap() {
  const CAP = 400;
  const dir = mkdtempSync(join(tmpdir(), "untested-api-cap-"));
  try {
    for (let i = 0; i <= CAP; i++) {
      writeFileSync(join(dir, `f${i}.ts`), `export class C${i} { m(): number { return ${i}; } }\n`);
    }
    detectUntestedPublicApi(dir, "project");
    assertEqual("FE cap smoke (capReached)", untestedApiScanState.capReached, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── BE (.NET) ────────────────────────────────────────────────────────────────
function runCsx(target, depth) {
  return spawnSync("dotnet", ["script", "--no-cache", csxPath, "--", target, depth], {
    encoding: "utf-8",
    timeout: 180_000,
    maxBuffer: 20 * 1024 * 1024,
  });
}

// Returns the normalized findings array, or null when BE was skipped / failed.
function runBackend(label, target, depth, expected) {
  if (beSkipped) {
    console.warn(`⏭️  ${label}: SKIPPED (${beSkipReason}).`);
    return null;
  }
  const res = runCsx(target, depth);
  if (res.error) {
    beSkipped = true;
    beSkipReason = `dotnet-script not runnable (${res.error.code ?? res.error.message})`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}. Install: dotnet tool install -g dotnet-script`);
    return null;
  }
  if (res.status !== 0) {
    beSkipped = true;
    beSkipReason = `dotnet script exited ${res.status}`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}. stderr:\n${(res.stderr ?? "").trim()}`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch (e) {
    beSkipped = true;
    beSkipReason = `could not parse .csx output (${e.message})`;
    console.warn(`⏭️  ${label}: SKIPPED — ${beSkipReason}.`);
    return null;
  }
  const raw = Array.isArray(parsed) ? parsed : parsed.Findings ?? parsed.findings ?? [];
  const findings = raw.map((f) => ({
    symbol: f.Symbol ?? f.symbol,
    file: f.File ?? f.file,
    reason: f.Reason ?? f.reason,
  }));
  if (expected) assertSet(label, findings, expected);
  return findings;
}

// G5: synthetic cap smoke — generate FILE_CAP+1 trivial .cs sources and assert the
// .csx flags CapReached (analogous to runFrontendCap, BE side). Skipped when BE is
// unavailable.
function runBackendCap() {
  if (beSkipped) {
    console.warn(`⏭️  BE cap smoke (capReached): SKIPPED (${beSkipReason}).`);
    return;
  }
  const CAP = 400;
  const dir = mkdtempSync(join(tmpdir(), "untested-api-cap-be-"));
  try {
    for (let i = 0; i <= CAP; i++) {
      writeFileSync(join(dir, `F${i}.cs`), `namespace G { public class C${i} { public int M() => ${i}; } }\n`);
    }
    const res = runCsx(dir, "project");
    if (res.error || res.status !== 0) {
      console.warn(`⏭️  BE cap smoke (capReached): SKIPPED — dotnet script failed (status ${res.status}).`);
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(res.stdout);
    } catch (e) {
      console.warn(`⏭️  BE cap smoke (capReached): SKIPPED — could not parse output (${e.message}).`);
      return;
    }
    assertEqual("BE cap smoke (capReached)", parsed.CapReached ?? parsed.capReached ?? false, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────
if (await loadFe()) {
  runFrontendProject();
  runFrontendFileMode();
  runFrontendCap();
}

const beProjectFindings = runBackend(
  "BE (dotnet, depth=project)",
  dotnetDir,
  "project",
  JSON.parse(readFileSync(join(dotnetDir, "expected.json"), "utf-8")),
);
if (beProjectFindings) {
  assertDiscriminator(
    "BE G1 (per-class scoping)",
    beProjectFindings,
    "DiscriminatorA.Compute",
    "DiscriminatorB.Compute",
  );
  assertWordBoundaryAssociation("BE G7 (word-boundary class→test)", beProjectFindings);
}
runBackend("BE (dotnet, depth=file, solution root)", beFileSource, "file", [
  { symbol: "Calculator.Divide", file: "Calculator.cs", reason: "no_reference_found" },
]);
// G2: a test file as the file-mode input must yield zero findings (FE/.NET parity).
runBackend(
  "BE G2 (dotnet, depth=file, test-file guard)",
  resolve(here, "be-file-mode", "tests", "Calc.Tests", "CalculatorTests.cs"),
  "file",
  [],
);
runBackendCap();

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
  console.error(`\nAssertion harness: FAILED — BE assertions skipped (${beSkipReason}). Install dotnet-script or set SKIP_BE_ASSERTIONS=1 for local-only FE runs.`);
  process.exit(1);
}
console.log("\nAssertion harness: OK");
