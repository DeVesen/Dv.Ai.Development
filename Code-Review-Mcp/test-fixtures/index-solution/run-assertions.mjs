// Assertion harness for index_solution.
// Run: npm run test:index-solution
// Opt-out for local dev without dotnet-script: SKIP_BE_ASSERTIONS=1

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const slnPath = join(here, "App.sln");
const apiDir = join(here, "Api");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "dotnet-indexer.csx");

let failed = false;
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function fail(msg) {
  console.error(msg);
  failed = true;
}

function runDotnetScript(args) {
  const result = spawnSync("dotnet", ["script", "--no-cache", csxPath, "--", ...args], {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail(`dotnet script failed: ${result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    fail(`JSON parse error: ${e.message}`);
    return null;
  }
}

async function testRunner() {
  const { indexDotnetSolution, indexDotnetProject, resolveDotnetIndex } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "indexers", "dotnet-indexer-runner.js")).href
  );
  const expected = JSON.parse(readFileSync(join(here, "expected.json"), "utf-8"));

  const solutionIndex = indexDotnetSolution(slnPath, false);
  if (solutionIndex.error) fail(`indexDotnetSolution error: ${solutionIndex.error}`);

  for (const proj of expected.projects) {
    if (!solutionIndex.projects?.includes(proj)) {
      fail(`Solution index missing project: ${proj} (got ${solutionIndex.projects?.join(", ")})`);
    }
  }

  for (const [name, spec] of Object.entries(expected.symbols)) {
    const cls = solutionIndex.classes.find((c) => c.name === name)
      ?? solutionIndex.interfaces.find((i) => i.name === name);
    if (!cls) {
      fail(`Symbol ${name} not found in solution index`);
      continue;
    }
    if (cls.project !== spec.project) {
      fail(`${name}: expected project ${spec.project}, got ${cls.project}`);
    }
    if (spec.layer && cls.layer !== spec.layer) {
      fail(`${name}: expected layer ${spec.layer}, got ${cls.layer}`);
    }
  }

  const apiIndex = indexDotnetProject(apiDir, false);
  for (const ref of expected.apiProjectReferences) {
    if (!apiIndex.projectReferences?.some((r) => r.replace(/\\/g, "/").includes(ref.replace(/^\.\.\//, "")))) {
      fail(`Api projectReferences missing ${ref} (got ${JSON.stringify(apiIndex.projectReferences)})`);
    }
  }

  const viaResolver = resolveDotnetIndex(slnPath, false);
  if (!viaResolver.classes.some((c) => c.name === "CalcController")) {
    fail("resolveDotnetIndex did not return CalcController");
  }

  console.log("Runner index-solution assertions OK");
}

function testCsxDirect() {
  const expected = JSON.parse(readFileSync(join(here, "expected.json"), "utf-8"));
  const raw = runDotnetScript([slnPath]);
  if (!raw) return;

  if (!raw.Projects?.includes("Api") || !raw.Projects?.includes("Domain")) {
    fail(`csx solution Projects: ${JSON.stringify(raw.Projects)}`);
  }

  const calc = raw.Classes?.find((c) => c.Name === "CalcController");
  if (!calc || calc.Project !== "Api") fail(`csx CalcController project: ${calc?.Project}`);

  const iface = raw.Interfaces?.find((i) => i.Name === "ICalcService");
  if (!iface || iface.Project !== "Domain") fail(`csx ICalcService project: ${iface?.Project}`);

  const apiRaw = runDotnetScript([apiDir]);
  if (apiRaw && !apiRaw.ProjectReferences?.some((r) => r.includes("Domain"))) {
    fail(`csx api ProjectReferences: ${JSON.stringify(apiRaw.ProjectReferences)}`);
  }

  console.log("CSX index-solution assertions OK");
}

async function main() {
  await testRunner();
  if (!allowBeSkip) testCsxDirect();
  else {
    console.log("BE csx assertions skipped (SKIP_BE_ASSERTIONS=1)");
    beSkipped = true;
  }
  if (failed) process.exit(1);
  console.log("All index-solution assertions passed");
}

let beSkipped = false;
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
