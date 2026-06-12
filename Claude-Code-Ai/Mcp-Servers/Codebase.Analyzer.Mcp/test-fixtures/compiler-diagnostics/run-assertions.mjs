// Assertion harness for analyze_compiler_diagnostics.
// FE: imports getCompilerDiagnostics from dist/
// BE: invokes roslyn-diagnostics.csx via dotnet script
// Run: npm run test:compiler-diagnostics
// Opt-out for local dev without dotnet-script: SKIP_BE_ASSERTIONS=1

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularDir = join(here, "angular");
const dotnetDir = join(here, "dotnet");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "roslyn-diagnostics.csx");

let failed = false;
let beSkipped = false;
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function assertSpec(label, diagnostics, spec) {
  if (diagnostics.length < spec.minCount) {
    console.error(`${label}: expected at least ${spec.minCount} diagnostic(s), got ${diagnostics.length}`);
    failed = true;
    return;
  }
  const codes = new Set(diagnostics.map((d) => d.code));
  for (const code of spec.codes) {
    if (!codes.has(code)) {
      console.error(`${label}: expected code ${code}, got [${[...codes].join(", ")}]`);
      failed = true;
    }
  }
}

async function testAngular() {
  const { getCompilerDiagnostics } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "ts-compiler-diagnostics.js")).href
  );
  const spec = JSON.parse(readFileSync(join(angularDir, "expected.json"), "utf-8"));
  const result = getCompilerDiagnostics(join(angularDir, "error-file.ts"), "error");
  if (result.error) {
    console.error(`FE error: ${result.error}`);
    failed = true;
    return;
  }
  assertSpec("FE", result.diagnostics, spec);
  console.log("FE compiler-diagnostics assertions OK");
}

function testDotnet() {
  const dotnetCheck = spawnSync("dotnet", ["--version"], { encoding: "utf-8" });
  if (dotnetCheck.error || dotnetCheck.status !== 0) {
    beSkipped = true;
    if (allowBeSkip) {
      console.log("BE skipped (dotnet unavailable, SKIP_BE_ASSERTIONS=1)");
      return;
    }
    console.error("BE: dotnet not available — set SKIP_BE_ASSERTIONS=1 to skip");
    failed = true;
    return;
  }

  const spec = JSON.parse(readFileSync(join(dotnetDir, "expected.json"), "utf-8"));
  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", csxPath, "--", join(dotnetDir, "Fixture.csproj"), "error"],
    { encoding: "utf-8", timeout: 120_000, maxBuffer: 30 * 1024 * 1024 },
  );

  if (result.error || result.status !== 0) {
    console.error(`BE spawn failed: ${result.stderr || result.error?.message}`);
    failed = true;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    console.error(`BE parse error: ${e.message}`);
    failed = true;
    return;
  }

  if (parsed.Error) {
    console.error(`BE script error: ${parsed.Error}`);
    failed = true;
    return;
  }

  const diagnostics = (parsed.Diagnostics ?? []).map((d) => ({
    code: d.Code,
    severity: d.Severity,
    file: d.File,
    line: d.Line,
    message: d.Message,
  }));

  assertSpec("BE", diagnostics, spec);
  console.log("BE compiler-diagnostics assertions OK");
}

await testAngular();
testDotnet();

if (failed) {
  console.error("compiler-diagnostics assertions FAILED");
  process.exit(1);
}
if (beSkipped && allowBeSkip) {
  console.log("compiler-diagnostics assertions OK (BE skipped)");
} else {
  console.log("compiler-diagnostics assertions OK");
}
