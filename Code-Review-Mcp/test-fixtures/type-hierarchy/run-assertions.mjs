// Assertion harness for find_type_hierarchy.
// FE: imports findTypeHierarchy from dist/
// BE: invokes roslyn-hierarchy.csx via dotnet script
// Run: npm run test:type-hierarchy
// Opt-out for local dev without dotnet-script: SKIP_BE_ASSERTIONS=1

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularDir = join(here, "angular");
const dotnetDir = join(here, "dotnet");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "roslyn-hierarchy.csx");

let failed = false;
let beSkipped = false;
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function names(list, dir) {
  return list.map((t) => t.name).sort().join(",");
}

async function testAngular() {
  const { findTypeHierarchy } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "ts-type-hierarchy.js")).href
  );
  const expected = JSON.parse(readFileSync(join(angularDir, "expected.json"), "utf-8"));

  for (const [typeName, spec] of Object.entries(expected)) {
    if (spec.up) {
      const res = findTypeHierarchy(angularDir, typeName, undefined, "up");
      const got = names(res.up, "up");
      const want = [...spec.up].sort().join(",");
      if (got !== want) {
        console.error(`FE up ${typeName}: want [${want}] got [${got}]`);
        failed = true;
      }
    }
    if (spec.down) {
      const res = findTypeHierarchy(angularDir, typeName, undefined, "down");
      const got = names(res.down, "down");
      const want = [...spec.down].sort().join(",");
      if (got !== want) {
        console.error(`FE down ${typeName}: want [${want}] got [${got}]`);
        failed = true;
      }
    }
  }
  console.log("FE type-hierarchy assertions OK");
}

function testDotnet() {
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

  const expected = JSON.parse(readFileSync(join(dotnetDir, "expected.json"), "utf-8"));

  for (const [typeName, spec] of Object.entries(expected)) {
    for (const dir of ["up", "down"]) {
      if (!spec[dir]) continue;
      const result = spawnSync(
        "dotnet",
        ["script", "--no-cache", csxPath, "--", dotnetDir, typeName, "", dir],
        { encoding: "utf-8", timeout: 120_000 },
      );
      if (result.status !== 0) {
        console.error(`BE ${dir} ${typeName}: script failed: ${result.stderr}`);
        failed = true;
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(result.stdout);
      } catch (e) {
        console.error(`BE ${dir} ${typeName}: parse error ${e.message}`);
        failed = true;
        continue;
      }
      if (parsed.Error) {
        console.error(`BE ${dir} ${typeName}: ${parsed.Error}`);
        failed = true;
        continue;
      }
      const list = parsed[dir === "up" ? "Up" : "Down"] ?? [];
      const got = list.map((t) => t.Name).sort().join(",");
      const want = [...spec[dir]].sort().join(",");
      if (got !== want) {
        console.error(`BE ${dir} ${typeName}: want [${want}] got [${got}]`);
        failed = true;
      }
    }
  }
  if (!beSkipped) console.log("BE type-hierarchy assertions OK");
}

await testAngular();
testDotnet();

if (failed) {
  console.error("\nType-hierarchy assertions FAILED");
  process.exit(1);
}
console.log("\nAll type-hierarchy assertions passed");
