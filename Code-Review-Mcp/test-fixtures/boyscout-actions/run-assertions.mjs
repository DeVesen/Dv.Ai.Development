// Assertion harness for suggest_boyscout_actions.
// FE: imports runBoyscoutActions from dist/
// BE: same (dotnet runners invoked internally)
// Run: npm run test:boyscout-actions
// Opt-out: SKIP_BE_ASSERTIONS=1

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularDir = join(here, "angular");
const dotnetDir = join(here, "dotnet");

let failed = false;
let beSkipped = false;
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function assertSample(label, result, expected) {
  const fileReport = result.files.find((f) => f.file.replace(/\\/g, "/").endsWith(expected.file));
  if (!fileReport) {
    console.error(`${label}: no report for ${expected.file}, got [${result.files.map((f) => f.file).join(", ")}]`);
    failed = true;
    return;
  }

  if (fileReport.actions.length < expected.minActions) {
    console.error(`${label}: expected >= ${expected.minActions} actions, got ${fileReport.actions.length}`);
    failed = true;
  }

  const categories = new Set(fileReport.actions.map((a) => a.category));
  for (const cat of expected.requiredCategories) {
    if (!categories.has(cat)) {
      console.error(`${label}: missing category ${cat}, got [${[...categories].join(", ")}]`);
      failed = true;
    }
  }
}

function assertCompilerGate(label, result, expected) {
  if (!result.compilerGateTriggered) {
    console.error(`${label} gate: expected compilerGateTriggered=true`);
    failed = true;
    return;
  }

  const gateReport = result.files.find((f) => f.file.replace(/\\/g, "/").endsWith(expected.compilerGateFile));
  if (!gateReport) {
    console.error(`${label} gate: no report for ${expected.compilerGateFile}`);
    failed = true;
    return;
  }

  const criticals = gateReport.actions.filter((a) => a.severity === "critical" && a.category === "compiler");
  if (criticals.length < expected.compilerGateMinCritical) {
    console.error(`${label} gate: expected >= ${expected.compilerGateMinCritical} compiler criticals, got ${criticals.length}`);
    failed = true;
  }

  for (const skipCat of expected.compilerGateSkipCategories) {
    if (gateReport.actions.some((a) => a.category === skipCat)) {
      console.error(`${label} gate: category ${skipCat} should be skipped when compiler errors present`);
      failed = true;
    }
  }
}

async function testAngular() {
  const { runBoyscoutActions } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "boyscout-runner.js")).href
  );
  const expected = JSON.parse(readFileSync(join(angularDir, "expected.json"), "utf-8"));

  const samplePath = join(angularDir, expected.file);
  const sampleResult = runBoyscoutActions({ filePaths: [samplePath], type: "angular", maxPerFile: 5 });
  assertSample("FE sample", sampleResult, expected);

  const gatePath = join(angularDir, expected.compilerGateFile);
  const gateResult = runBoyscoutActions({ filePaths: [gatePath], type: "angular", maxPerFile: 5 });
  assertCompilerGate("FE", gateResult, expected);

  console.log("FE boyscout-actions assertions OK");
}

async function testDotnet() {
  const dotnetCheck = spawnSync("dotnet", ["--version"], { encoding: "utf-8" });
  if (dotnetCheck.error || dotnetCheck.status !== 0) {
    beSkipped = true;
    if (allowBeSkip) {
      console.log("BE skipped (dotnet unavailable, SKIP_BE_ASSERTIONS=1)");
      return;
    }
    console.error("BE skipped — dotnet not available (set SKIP_BE_ASSERTIONS=1 to opt out locally)");
    failed = true;
    return;
  }

  const { runBoyscoutActions } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "boyscout-runner.js")).href
  );
  const expected = JSON.parse(readFileSync(join(dotnetDir, "expected.json"), "utf-8"));

  const samplePath = join(dotnetDir, expected.file);
  const sampleResult = runBoyscoutActions({ filePaths: [samplePath], type: "dotnet", maxPerFile: 5 });
  assertSample("BE sample", sampleResult, expected);

  const gatePath = join(dotnetDir, expected.compilerGateFile);
  const gateResult = runBoyscoutActions({ filePaths: [gatePath], type: "dotnet", maxPerFile: 5 });
  if (gateResult.compilerGateTriggered) {
    assertCompilerGate("BE", gateResult, expected);
  } else {
    const skipped = gateResult.files.some((f) =>
      f.actions.some((a) => a.message.startsWith("Check skipped:")),
    );
    if (!skipped) {
      console.error("BE gate: expected compilerGateTriggered=true or documented analyzer skip");
      failed = true;
    } else {
      console.log("BE compiler-gate skipped (roslyn diagnostics unavailable in this environment)");
    }
  }

  console.log("BE boyscout-actions assertions OK");
}

await testAngular();
await testDotnet();

if (failed) {
  process.exit(1);
}
if (beSkipped && !allowBeSkip) {
  process.exit(1);
}
console.log("All boyscout-actions assertions passed.");
