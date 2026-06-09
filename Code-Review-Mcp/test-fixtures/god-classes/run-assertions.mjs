// Assertion harness for detect_god_classes.
// FE: imports detectGodClasses from dist/
// BE: invokes roslyn-split.csx project-scan via dotnet script
// Run: npm run test:god-classes
// Opt-out for local dev without dotnet-script: SKIP_BE_ASSERTIONS=1

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const angularDir = join(here, "angular");
const dotnetDir = join(here, "dotnet");
const csxPath = resolve(here, "..", "..", "roslyn-analyzer", "roslyn-split.csx");

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

let failed = false;
let beSkipped = false;
const allowBeSkip = process.env.SKIP_BE_ASSERTIONS === "1";

function assertCandidate(candidates, className, spec, label) {
  const hit = candidates.find((c) => c.class === className);
  if (!hit) {
    console.error(`${label}: expected class ${className} in ranking, got [${candidates.map((c) => c.class).join(", ")}]`);
    failed = true;
    return;
  }
  if (hit.metrics.methodCount < spec.minMethodCount) {
    console.error(`${label} ${className}: methodCount ${hit.metrics.methodCount} < ${spec.minMethodCount}`);
    failed = true;
  }
  if (hit.metrics.dependencies < spec.minDependencies) {
    console.error(`${label} ${className}: dependencies ${hit.metrics.dependencies} < ${spec.minDependencies}`);
    failed = true;
  }
  const rank = URGENCY_RANK[hit.urgency] ?? 0;
  if (rank < spec.minUrgencyRank) {
    console.error(`${label} ${className}: urgency ${hit.urgency} below min rank ${spec.minUrgencyRank}`);
    failed = true;
  }
  if (!hit.reasons?.length) {
    console.error(`${label} ${className}: expected non-empty reasons`);
    failed = true;
  }
}

async function testAngular() {
  const { detectGodClasses } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "ts-advanced-features.js")).href
  );
  const expected = JSON.parse(readFileSync(join(angularDir, "expected.json"), "utf-8"));
  const result = detectGodClasses(angularDir, 10);

  for (const [className, spec] of Object.entries(expected)) {
    assertCandidate(result.candidates, className, spec, "FE");
  }
  console.log("FE god-classes assertions OK");
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

  const expected = JSON.parse(readFileSync(join(dotnetDir, "expected.json"), "utf-8"));
  const result = spawnSync(
    "dotnet",
    ["script", "--no-cache", csxPath, "--", dotnetDir, "", "project-scan"],
    { encoding: "utf-8", timeout: 120_000 },
  );

  if (result.status !== 0) {
    console.error(`BE script failed: ${result.stderr}`);
    failed = true;
    return;
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch (e) {
    console.error(`BE invalid JSON: ${e.message}`);
    failed = true;
    return;
  }

  const classes = payload.Classes ?? payload.classes ?? [];
  const { filterAndRank, toGodClassCandidate } = await import(
    pathToFileURL(resolve(here, "..", "..", "dist", "features", "god-class-types.js")).href
  );

  const candidates = classes
    .map((row) => {
      const className = row.ClassName ?? row.className;
      const file = row.File ?? row.file;
      const line = row.Line ?? row.line;
      return toGodClassCandidate(className, file, line, {
        methodCount: row.MethodCount ?? row.methodCount,
        fieldCount: row.FieldCount ?? row.fieldCount,
        lcom: row.Lcom ?? row.lcom,
        dependencies: row.Dependencies ?? row.dependencies,
        linesOfCode: row.LinesOfCode ?? row.linesOfCode,
      });
    })
    .filter(Boolean);

  const ranked = filterAndRank(candidates, 10);

  for (const [className, spec] of Object.entries(expected)) {
    assertCandidate(ranked, className, spec, "BE");
  }
  console.log("BE god-classes assertions OK");
}

await testAngular();
await testDotnet();

if (failed) {
  process.exit(1);
}
if (beSkipped && allowBeSkip) {
  process.exit(0);
}
