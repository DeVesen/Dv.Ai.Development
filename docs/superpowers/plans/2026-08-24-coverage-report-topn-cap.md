# Coverage-Report topN-Cap Implementation Plan (revised — correct source repo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `topN` parameter to `analyze_coverage`, `analyze_test_quality`, and `analyze_test_health` in `Mcp-Servers/Codebase.Analyzer.Mcp/src/index.ts` so both the prose summary and the trailing JSON payload cap list length instead of always dumping full arrays — and fix the underlying report arrays to be sorted by relevance first, so capping never discards the most important entries.

**Architecture:** A new pure helper `capArrays<T>(obj, topN, arrayKeys)` in `src/features/report-cap.ts` shallow-copies a report object and truncates named top-level array properties to `topN` entries, adding `<key>Truncated`/`<key>Count` marker properties when truncation occurs. The three tool handlers in `src/index.ts` gain a `topN` zod parameter, replace their hardcoded `.slice(0, 8)`/`.slice(0, 10)` prose caps with `.slice(0, topN)`, add a truncation-count hint line matching the existing house pattern (`src/index.ts:1896-1897`), sort `antiPatterns`/`coverageGaps` by relevance before both prose filtering and capping, and apply `capArrays` to the object passed into `JSON.stringify` before returning.

**Tech Stack:** Node.js + TypeScript (compiled via `tsc`, run via `tsx` in dev), `node:test` + `node:assert/strict` executed through the `tsx` loader (`node --import tsx --test <file>.ts` — this repo's established convention, see `src/analyzers/roslyn-formatter.test.ts`), `zod` for tool parameter schemas, `@modelcontextprotocol/sdk` for tool registration.

**⚠️ Repo correction:** An earlier attempt at this feature was implemented against `C:\Develop\.apps\codebase-analyzer`, which is a **deploy target** (`Mcp-Servers/Codebase.Analyzer.Mcp/scripts/deploy.ps1` wipes it completely on every deploy). This plan targets the real source at `Mcp-Servers/Codebase.Analyzer.Mcp/src` inside the `Dv.Ai.Development` git repo (worktree branch `worktree-coverage-topn-cap`). Do not touch `C:\Develop\.apps\codebase-analyzer`.

## Global Constraints

- Language is TypeScript — all new files use `.ts`, `import`/`export`, with explicit types where the plan's code shows them.
- Test files are named `<subject>.test.ts`, co-located next to the file under test, run via `node --import tsx --test <path>`.
- Test naming convention observed in this repo: `<Method>_<Situation>_<Erwartung>` (German, see `src/analyzers/roslyn-formatter.test.ts`).
- Default `topN` must be `10` — matches current hardcoded behavior so small/medium projects see no change in list length.
- `topN` schema: `z.number().int().min(1).max(200).default(10)`.
- Do not cap nested per-entry arrays (`uncoveredFunctions`, `untestedMethods`) — only top-level arrays named in the design spec.
- Truncation marker convention: sibling properties `<key>Truncated: true` and `<key>Count: <originalLength>` on the same object as the array — never a nested wrapper.
- `antiPatterns` must be sorted so `severity === "critical"` sorts first, then `"warning"`, then `"suggestion"`, before any prose filtering or capping.
- `coverageGaps` must be sorted so `testFileExists === false` sorts first, before any prose filtering or capping.
- After code changes, run `cd Mcp-Servers/Codebase.Analyzer.Mcp && npm run build` and confirm it exits 0 (no TypeScript errors) before every commit.

---

## File Structure

- **Create:** `Mcp-Servers/Codebase.Analyzer.Mcp/src/features/report-cap.ts` — the `capArrays` helper, single responsibility, no dependencies on other modules.
- **Create:** `Mcp-Servers/Codebase.Analyzer.Mcp/src/features/report-cap.test.ts` — unit tests for `capArrays`.
- **Modify:** `Mcp-Servers/Codebase.Analyzer.Mcp/src/index.ts` — three tool handlers (`analyze_coverage` ~line 1707, `analyze_test_quality` ~line 1752, `analyze_test_health` ~line 2083): add `topN` param, sort-before-cap for antiPatterns/coverageGaps, replace hardcoded slices, add truncation hints, apply `capArrays` before `JSON.stringify`.

All paths below are relative to `Mcp-Servers/Codebase.Analyzer.Mcp/` unless stated otherwise.

---

### Task 1: `capArrays` helper + unit tests

**Files:**
- Create: `src/features/report-cap.ts`
- Test: `src/features/report-cap.test.ts`

**Interfaces:**
- Produces: `capArrays<T extends Record<string, unknown>>(obj: T, topN: number, arrayKeys: (keyof T)[]): T` — shallow copy of `obj`; for each key in `arrayKeys` where `obj[key]` is an array longer than `topN`, the copy gets `obj[key].slice(0, topN)`, plus `${String(key)}Truncated: true` and `${String(key)}Count: <original array length>`. Keys not present, not arrays, or with length `<= topN` are left untouched (no markers added). Later tasks (Task 2, 3, 4) import this from `./report-cap.js` (note: TS source imports compiled-output-style `.js` extensions per this repo's existing pattern — check an existing cross-file import in `src/index.ts` such as `from "./features/coverage-parser.js"` to confirm before writing your own import).

- [ ] **Step 1: Write the failing tests**

Create `src/features/report-cap.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capArrays } from "./report-cap.js";

describe("capArrays", () => {
    it("Cap_ArrayLaengerAlsTopN_WirdGekuerztMitMarkern", () => {
        const input = { files: [1, 2, 3, 4, 5] };
        const result = capArrays(input, 2, ["files"]);
        assert.deepEqual(result.files, [1, 2]);
        assert.equal((result as any).filesTruncated, true);
        assert.equal((result as any).filesCount, 5);
    });

    it("Cap_ArrayKuerzerAlsTopN_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [1, 2] };
        const result = capArrays(input, 10, ["files"]);
        assert.deepEqual(result.files, [1, 2]);
        assert.equal("filesTruncated" in result, false);
        assert.equal("filesCount" in result, false);
    });

    it("Cap_ArrayGenauTopNLang_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [1, 2, 3] };
        const result = capArrays(input, 3, ["files"]);
        assert.deepEqual(result.files, [1, 2, 3]);
        assert.equal("filesTruncated" in result, false);
    });

    it("Cap_LeeresArray_BleibtUnveraendertOhneMarker", () => {
        const input = { files: [] as number[] };
        const result = capArrays(input, 5, ["files"]);
        assert.deepEqual(result.files, []);
        assert.equal("filesTruncated" in result, false);
    });

    it("Cap_MehrereKeysNurEinerUeberschreitetTopN_NurDieserBekommtMarker", () => {
        const input = { files: [1, 2, 3, 4], hotspots: [1, 2] };
        const result = capArrays(input, 3, ["files", "hotspots"]);
        assert.equal((result as any).filesTruncated, true);
        assert.equal((result as any).filesCount, 4);
        assert.equal("hotspotsTruncated" in result, false);
        assert.deepEqual(result.hotspots, [1, 2]);
    });

    it("Cap_KeyFehltImObjekt_WirftNichtGibtObjektUnveraendertZurueck", () => {
        const input = { files: [1, 2, 3] } as { files: number[]; missingKey?: unknown[] };
        const result = capArrays(input, 1, ["missingKey"]);
        assert.deepEqual(result.files, [1, 2, 3]);
        assert.equal("missingKeyTruncated" in result, false);
    });

    it("Cap_OriginalObjektBleibtUnveraendert_ShallowCopyNichtMutiert", () => {
        const input = { files: [1, 2, 3, 4] };
        capArrays(input, 2, ["files"]);
        assert.deepEqual(input.files, [1, 2, 3, 4]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test src/features/report-cap.test.ts`
Expected: FAIL — module `./report-cap.js` cannot be found (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/features/report-cap.ts`:

```typescript
export function capArrays<T extends Record<string, unknown>>(
    obj: T,
    topN: number,
    arrayKeys: (keyof T)[]
): T {
    const result: Record<string, unknown> = { ...obj };
    for (const key of arrayKeys) {
        const arr = result[key as string];
        if (Array.isArray(arr) && arr.length > topN) {
            result[key as string] = arr.slice(0, topN);
            result[`${String(key)}Truncated`] = true;
            result[`${String(key)}Count`] = arr.length;
        }
    }
    return result as T;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test src/features/report-cap.test.ts`
Expected: `tests 7`, `pass 7`, `fail 0`.

- [ ] **Step 5: Run the project build to confirm no type errors**

Run: `npm run build`
Expected: exits 0, no TypeScript compile errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/report-cap.ts src/features/report-cap.test.ts
git commit -m "feat: add capArrays helper for truncating report arrays"
```

---

### Task 2: `analyze_coverage` — add `topN` param, cap prose + JSON

**Files:**
- Modify: `src/index.ts` (the `analyze_coverage` tool registration, currently ~line 1707-1749 — locate by searching for `"analyze_coverage"`, do not rely on the exact line number since it may have shifted)

**Interfaces:**
- Consumes: `capArrays(obj, topN, arrayKeys)` from `./features/report-cap.js` (Task 1).
- Consumes: `CoverageReport` shape from `parseLcov`/`parseCobertura` (`src/features/coverage-parser.ts`) — has top-level arrays `files`, `uncoveredFiles`, `lowCoverageFiles`, `hotspots`, plus `summary` object and `source` string. Unchanged by this task. `files` and `lowCoverageFiles` are already sorted ascending by `lineCoverage` (worst first) by the parser — no additional sort needed for this task.

- [ ] **Step 1: Add the import**

In `src/index.ts`, find the existing import of `coverage-parser.js` (search for `from "./features/coverage-parser.js"`) and add a new import line directly after it:

```typescript
import { capArrays } from "./features/report-cap.js";
```

- [ ] **Step 2: Replace the tool registration**

Replace the entire `analyze_coverage` registration with:

```typescript
server.tool(
  "analyze_coverage",
  "Parses existing coverage reports — lcov.info (Angular/Jest/Karma) or coverage.cobertura.xml (.NET/Coverlet). Shows line/branch/function coverage per file, uncovered files, low-coverage hotspots, and uncovered method names. Run 'ng test --code-coverage' or 'dotnet test --collect:\"XPlat Code Coverage\"' first to generate the report.",
  {
    projectPath: projectPathSchema,
    type: projectTypeSchema,
    topN: z.number().int().min(1).max(200).default(10).describe("Max entries per list in both the prose summary and the JSON payload. Truncated lists carry a `<key>Truncated`/`<key>Count` marker."),
  },
  async ({ projectPath, type, topN }) => {
    const abs = resolve(projectPath);
    const report = type === "angular" ? parseLcov(abs) : parseCobertura(abs);

    if (report.source === "none") {
      const cmd = type === "angular"
        ? "ng test --code-coverage  (or: jest --coverage)"
        : 'dotnet test --collect:"XPlat Code Coverage"';
      return { content: [{ type: "text", text: `⚠️ No coverage report found.\n\nGenerate one first:\n  ${cmd}\n\n${report.hotspots[0]?.functionName ?? ""}` }] };
    }

    const s = report.summary;
    const lines = [
      `## Code Coverage Report (${type === "angular" ? "Angular/lcov" : ".NET/Cobertura"})`,
      `**Grade: ${s.grade}**  |  Line: ${s.lineCoverage}%  |  Branch: ${s.branchCoverage}%  |  Function: ${s.functionCoverage}%`,
      `Covered: ${s.coveredLines}/${s.totalLines} lines  |  ${s.coveredFunctions}/${s.totalFunctions} functions\n`,
    ];

    if (report.uncoveredFiles.length > 0) {
      lines.push(`### 🔴 Uncovered Files (0%):\n${report.uncoveredFiles.slice(0, topN).map((f) => `  - ${f}`).join("\n")}`);
      if (report.uncoveredFiles.length > topN)
        lines.push(`  … and ${report.uncoveredFiles.length - topN} more (full list capped in the JSON below — increase topN to see more).`);
    }

    if (report.lowCoverageFiles.length > 0) {
      lines.push(`\n### ⚠️ Low Coverage Files (<60%):`);
      report.lowCoverageFiles.slice(0, topN).forEach((f) => {
        lines.push(`  [${f.severity}] ${f.lineCoverage}% — ${f.file}`);
        if (f.uncoveredFunctions.length > 0)
          lines.push(`    Untested: ${f.uncoveredFunctions.slice(0, 5).join(", ")}`);
      });
      if (report.lowCoverageFiles.length > topN)
        lines.push(`  … and ${report.lowCoverageFiles.length - topN} more (full list capped in the JSON below — increase topN to see more).`);
    }

    lines.push(`\n### Top ${topN} Files by Coverage:`);
    report.files.slice(0, topN).forEach((f) => {
      const bar = "█".repeat(Math.round(f.lineCoverage / 10)) + "░".repeat(10 - Math.round(f.lineCoverage / 10));
      lines.push(`  ${bar} ${f.lineCoverage}% — ${f.file} (${f.coveredFunctions}/${f.totalFunctions} fn)`);
    });
    if (report.files.length > topN)
      lines.push(`  … and ${report.files.length - topN} more (full list capped in the JSON below — increase topN to see more).`);

    const cappedReport = capArrays(report, topN, ["files", "uncoveredFiles", "lowCoverageFiles"]);
    return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(cappedReport, null, 2) }] };
  }
);
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exits 0, no TypeScript compile errors.

- [ ] **Step 4: Manual smoke check**

Run: `node --import tsx -e "import('./src/index.ts').then(() => console.log('loaded ok')).catch(e => { console.error(e); process.exit(1); })"`
Expected: `loaded ok` printed, or the process hangs (because `index.ts` connects an stdio transport) — a hang with no printed exception confirms the module loaded successfully; kill it after ~5 seconds. Only a printed stack trace/exception is a failure.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: add topN cap to analyze_coverage"
```

---

### Task 3: `analyze_test_quality` — sort + `topN` cap in both branches

**Files:**
- Modify: `src/index.ts` (the `analyze_test_quality` tool registration, currently ~line 1752-1834 — locate by searching for `"analyze_test_quality"`, both the `angular` branch and the `else` branch)

**Interfaces:**
- Consumes: `capArrays` from Task 1.
- Consumes: `TestQualityReport` shape (`src/features/test-quality-analyzer.ts`) — top-level arrays `antiPatterns` (each with `severity: "critical"|"warning"|"suggestion"`), `coverageGaps` (each with `testFileExists: boolean`), plus `summary`/`recommendations`. The .NET branch's report type has `antiPatterns`/`coverageGaps` as optional (`?? []` guards already present in the existing code) — preserve that.

- [ ] **Step 1: Replace the tool registration**

Replace the entire `analyze_test_quality` registration with:

```typescript
server.tool(
  "analyze_test_quality",
  "Statically analyzes test files without running them. Detects: tests without assertions, tautological assertions (expect(true).toBe(true)), mock-heavy tests, happy-path-only tests, missing error/null scenarios, unhandled async, real timers, no Arrange/Act/Assert structure (.NET), focused/skipped tests. Also finds source files with no test counterpart. Works for Angular (Jest/Jasmine .spec.ts) and .NET (xUnit/NUnit/MSTest).",
  {
    projectPath: projectPathSchema,
    type: projectTypeSchema,
    topN: z.number().int().min(1).max(200).default(10).describe("Max entries per list in both the prose summary and the JSON payload. Truncated lists carry a `<key>Truncated`/`<key>Count` marker."),
  },
  async ({ projectPath, type, topN }) => {
    const abs = resolve(projectPath);
    const severityRank = (sev: string) => sev === "critical" ? 0 : sev === "warning" ? 1 : 2;

    if (type === "angular") {
      const report = analyzeAngularTestQuality(abs);
      const s = report.summary;

      const sortedAntiPatterns = [...report.antiPatterns].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
      const sortedCoverageGaps = [...report.coverageGaps].sort((a, b) => Number(a.testFileExists) - Number(b.testFileExists));

      const lines = [
        `## Test Quality Report (Angular)`,
        `**Quality Score: ${s.qualityScore}/100 (${s.grade})**`,
        `Tests: ${s.totalTests} in ${s.totalTestFiles} files  |  Avg assertions: ${s.avgAssertionsPerTest}`,
        `Without assertions: ${s.testsWithoutAssertions}  |  Weak assertions: ${s.testsWithWeakAssertions}  |  Happy-path-only: ${s.testsWithOnlyHappyPath}\n`,
      ];

      const critical = sortedAntiPatterns.filter((p) => p.severity === "critical");
      if (critical.length > 0) {
        lines.push(`### 🔴 Critical Issues (${critical.length}):`);
        critical.slice(0, topN).forEach((p) => {
          lines.push(`  ${p.file} — "${p.testName}" (line ${p.line})`);
          lines.push(`  → ${p.description}`);
          lines.push(`  Fix: ${p.fix}\n`);
        });
        if (critical.length > topN)
          lines.push(`  … and ${critical.length - topN} more (full list capped in the JSON below — increase topN to see more).\n`);
      }

      const noTest = sortedCoverageGaps.filter((g) => !g.testFileExists);
      if (noTest.length > 0) {
        lines.push(`\n### ⚠️ Source Files Without Tests:`);
        noTest.slice(0, topN).forEach((g) => {
          lines.push(`  ${g.sourceFile} → create ${g.suggestedTestFile}`);
          lines.push(`  Untested: ${g.untestedMethods.slice(0, 4).join(", ")}`);
        });
        if (noTest.length > topN)
          lines.push(`  … and ${noTest.length - topN} more (full list capped in the JSON below — increase topN to see more).`);
      }

      if (report.recommendations.length > 0) {
        lines.push(`\n### 💡 Recommendations:`);
        report.recommendations.forEach((r) => lines.push(`  • ${r}`));
      }

      const cappedReport = capArrays(
        { ...report, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps },
        topN,
        ["antiPatterns", "coverageGaps"]
      );
      return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(cappedReport, null, 2) }] };

    } else {
      const report = runDotnetTestQuality(abs);
      if (report.error) return { content: [{ type: "text", text: `⚠️ ${report.error}` }] };

      const s = report.summary!;
      const sortedAntiPatterns = [...(report.antiPatterns ?? [])].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
      const sortedCoverageGaps = [...(report.coverageGaps ?? [])].sort((a, b) => Number(a.testFileExists) - Number(b.testFileExists));

      const lines = [
        `## Test Quality Report (.NET)`,
        `**Quality Score: ${s.qualityScore}/100 (${s.grade})**`,
        `Tests: ${s.totalTests} in ${s.totalTestFiles} files  |  Avg assertions: ${s.avgAssertionsPerTest}`,
        `Without assertions: ${s.testsWithoutAssertions}  |  Weak: ${s.testsWithWeakAssertions}  |  Happy-path-only: ${s.testsWithOnlyHappyPath}\n`,
      ];

      const critical = sortedAntiPatterns.filter((p) => p.severity === "critical");
      if (critical.length > 0) {
        lines.push(`### 🔴 Critical Issues (${critical.length}):`);
        critical.slice(0, topN).forEach((p) => {
          lines.push(`  ${p.file} — "${p.testName}" (line ${p.line})`);
          lines.push(`  → ${p.description}`);
          lines.push(`  Fix: ${p.fix}\n`);
        });
        if (critical.length > topN)
          lines.push(`  … and ${critical.length - topN} more (full list capped in the JSON below — increase topN to see more).\n`);
      }

      const noTestFile = sortedCoverageGaps.filter((g) => !g.testFileExists);
      if (noTestFile.length > 0) {
        lines.push(`\n### ⚠️ Classes Without Test Files:`);
        noTestFile.slice(0, topN).forEach((g) => {
          lines.push(`  ${g.sourceFile} → create ${g.suggestedTestFile}`);
          lines.push(`  Untested: ${g.untestedMethods.slice(0, 4).join(", ")}`);
        });
        if (noTestFile.length > topN)
          lines.push(`  … and ${noTestFile.length - topN} more (full list capped in the JSON below — increase topN to see more).`);
      }

      if ((report.recommendations ?? []).length > 0) {
        lines.push(`\n### 💡 Recommendations:`);
        (report.recommendations ?? []).forEach((r) => lines.push(`  • ${r}`));
      }

      const cappedReport = capArrays(
        { ...report, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps },
        topN,
        ["antiPatterns", "coverageGaps"]
      );
      return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(cappedReport, null, 2) }] };
    }
  }
);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0. If TypeScript complains about the `capArrays({ ...report, ... }, topN, ["antiPatterns", "coverageGaps"])` call's inferred generic type (e.g. because `report`'s type has other required fields), that's expected structurally — `{ ...report, antiPatterns: ..., coverageGaps: ... }` has the same shape as `report`, just with two fields replaced, so it should satisfy the same interface. If the compiler still errors, report BLOCKED with the exact error text rather than adding an `as any` cast.

- [ ] **Step 3: Manual smoke check**

Run: `node --import tsx -e "import('./src/index.ts').then(() => console.log('loaded ok')).catch(e => { console.error(e); process.exit(1); })"`
Expected: `loaded ok` or a hang with no exception (see Task 2 Step 4 note).

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add topN cap and severity sort to analyze_test_quality"
```

---

### Task 4: `analyze_test_health` — sort + `topN` cap for combined coverage+quality JSON

**Files:**
- Modify: `src/index.ts` (the `analyze_test_health` tool registration, currently ~line 2083-2143 — locate by searching for `"analyze_test_health"`)

**Interfaces:**
- Consumes: `capArrays` from Task 1.
- Consumes: same `CoverageReport`/`TestQualityReport` shapes as Task 2/3.

- [ ] **Step 1: Replace the tool registration**

Replace the entire `analyze_test_health` registration with:

```typescript
server.tool(
  "analyze_test_health",
  "Combines coverage report + static test quality in one shot. Shows overall test health: what is covered, what is tested well, and what is missing. Best run after 'ng test --code-coverage' or 'dotnet test --collect:\"XPlat Code Coverage\"'.",
  {
    projectPath: projectPathSchema,
    type: projectTypeSchema,
    topN: z.number().int().min(1).max(200).default(10).describe("Max entries per list in both the prose summary and the JSON payload. Truncated lists carry a `<key>Truncated`/`<key>Count` marker."),
  },
  async ({ projectPath, type, topN }) => {
    const abs = resolve(projectPath);
    const severityRank = (sev: string) => sev === "critical" ? 0 : sev === "warning" ? 1 : 2;

    const coverage = type === "angular" ? parseLcov(abs) : parseCobertura(abs);
    const quality = type === "angular"
      ? analyzeAngularTestQuality(abs)
      : runDotnetTestQuality(abs);

    if ("error" in quality && quality.error)
      return { content: [{ type: "text", text: `⚠️ Test quality analyzer error: ${quality.error}` }], isError: true };

    const qs = "summary" in quality ? quality.summary : null;
    const cs = coverage.summary;

    const lines = [
      `## Test Health Dashboard (${type === "angular" ? "Angular" : ".NET"})`,
      ``,
      `### Coverage  [${cs.grade}]`,
      `  Line: ${cs.lineCoverage}%  |  Branch: ${cs.branchCoverage}%  |  Function: ${cs.functionCoverage}%`,
      ``,
      `### Quality   [${qs?.grade ?? "?"}]`,
      `  Score: ${qs?.qualityScore ?? "n/a"}/100  |  ${qs?.totalTests ?? 0} tests  |  Avg ${qs?.avgAssertionsPerTest ?? 0} assertions/test`,
      `  Without assertions: ${qs?.testsWithoutAssertions ?? 0}  |  Happy-path-only: ${qs?.testsWithOnlyHappyPath ?? 0}`,
      ``,
      `### Top Priorities:`,
    ];

    // Priority 1: uncovered files
    if (coverage.uncoveredFiles.length > 0)
      lines.push(`  🔴 ${coverage.uncoveredFiles.length} files with 0% coverage`);

    // Priority 2: tests without assertions
    if ((qs?.testsWithoutAssertions ?? 0) > 0)
      lines.push(`  🔴 ${qs!.testsWithoutAssertions} tests with NO assertions — false confidence`);

    // Priority 3: low coverage + no quality test
    const lowCov = coverage.lowCoverageFiles.filter((f) => f.severity === "critical").length;
    if (lowCov > 0)
      lines.push(`  🟠 ${lowCov} files with <30% coverage`);

    // Priority 4: recommendations
    const allRecs = [
      ...("recommendations" in quality ? quality.recommendations ?? [] : []),
    ];
    allRecs.slice(0, topN).forEach((r) => lines.push(`  • ${r}`));

    if (coverage.source === "none")
      lines.push(`\n  ⚠️ No coverage report found — run tests with coverage first`);

    const cappedCoverage = capArrays(coverage, topN, ["files", "uncoveredFiles", "lowCoverageFiles"]);

    const sortedAntiPatterns = "antiPatterns" in quality ? [...(quality.antiPatterns ?? [])].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)) : [];
    const sortedCoverageGaps = "coverageGaps" in quality ? [...(quality.coverageGaps ?? [])].sort((a, b) => Number(a.testFileExists) - Number(b.testFileExists)) : [];
    const cappedQuality = capArrays(
      { ...quality, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps },
      topN,
      ["antiPatterns", "coverageGaps"]
    );

    return {
      content: [{
        type: "text",
        text: lines.join("\n") + "\n\n" + JSON.stringify({ coverage: cappedCoverage, quality: cappedQuality }, null, 2),
      }],
    };
  }
);
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exits 0. If the `{ ...quality, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps }` spread causes a type error because `quality`'s union type (Angular vs .NET report) doesn't have `antiPatterns`/`coverageGaps` as a common required field, report BLOCKED with the exact error rather than adding a cast — this may need a small type narrowing adjustment that a fresh set of eyes on the actual union type should decide, not a blind `as any`.

- [ ] **Step 3: Manual smoke check**

Run: `node --import tsx -e "import('./src/index.ts').then(() => console.log('loaded ok')).catch(e => { console.error(e); process.exit(1); })"`
Expected: `loaded ok` or a hang with no exception (see Task 2 Step 4 note).

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add topN cap and severity sort to analyze_test_health"
```

---

### Task 5: End-to-end verification against real coverage fixtures

**Files:**
- None modified — read-only verification task.

**Interfaces:**
- Consumes: whichever `analyze_coverage`/`analyze_test_quality`/`analyze_test_health` behavior can be exercised via a direct script import, since there's no running MCP client in this environment.

- [ ] **Step 1: Check for existing fixtures with coverage data**

Run: `ls test-fixtures/ 2>&1` — this repo already has `test-fixtures/` (boyscout-actions, compiler-diagnostics, god-classes, index-solution, method-extraction, type-hierarchy, untested-api). None of these are coverage-report fixtures (`lcov.info`/`coverage.cobertura.xml`). This step confirms that — if you find one that does contain 10+ files worth of coverage data, use it in Step 2; otherwise proceed to Step 3.

- [ ] **Step 2 (only if a fixture with 10+ covered files exists): call the capping logic directly**

Write a throwaway script (do not commit it) that imports `parseLcov`/`parseCobertura` from `src/features/coverage-parser.ts` and `capArrays` from `src/features/report-cap.ts`, runs `capArrays(report, 3, ["files", "uncoveredFiles", "lowCoverageFiles"])` against the fixture's report, and confirms `filesTruncated === true` with `filesCount` equal to the real count.

- [ ] **Step 3 (if no fixture qualifies): construct a synthetic report and verify inline**

Run this one-off check (not a committed test — Task 1's unit tests already cover `capArrays` exhaustively; this step verifies the *wiring*, i.e. that the real `CoverageReport` shape survives `capArrays` unchanged apart from the capped fields):

```bash
node --import tsx -e "
import { capArrays } from './src/features/report-cap.js';
const fakeReport = {
  source: 'lcov',
  summary: { grade: 'B', lineCoverage: 70, branchCoverage: 60, functionCoverage: 65, coveredLines: 700, totalLines: 1000, coveredFunctions: 65, totalFunctions: 100 },
  files: Array.from({ length: 15 }, (_, i) => ({ file: 'f' + i, lineCoverage: i, coveredFunctions: 1, totalFunctions: 2 })),
  uncoveredFiles: [],
  lowCoverageFiles: [],
  hotspots: [],
};
const capped = capArrays(fakeReport, 3, ['files', 'uncoveredFiles', 'lowCoverageFiles']);
console.log('filesTruncated:', capped.filesTruncated, 'filesCount:', capped.filesCount, 'files.length:', capped.files.length);
if (capped.filesTruncated !== true || capped.filesCount !== 15 || capped.files.length !== 3) { console.error('FAIL'); process.exit(1); }
console.log('PASS');
"
```

Expected: `PASS` printed, exit code 0.

- [ ] **Step 4: Report result, no commit needed (read-only verification)**

---

## Self-Review Notes

- **Spec coverage:** Helper (Task 1) ✓, `analyze_coverage` (Task 2) ✓, `analyze_test_quality` both branches with sort-before-cap (Task 3) ✓, `analyze_test_health` with sort-before-cap on the combined quality object (Task 4) ✓, truncation prose hints in all three tools ✓, rollback-safety via default `topN=10` ✓, build-must-pass constraint added to every task ✓, out-of-scope items (nested arrays, hotspots, boyscout tool, file-based output, capArrays undefined-guard) correctly excluded.
- **Placeholder scan:** No TBD/TODO; every step has literal code or literal commands. Task 3/4 build steps explicitly tell the implementer what to do if a TS type error appears (report BLOCKED, don't cast around it) instead of leaving it vague.
- **Type consistency:** `capArrays<T>(obj, topN, arrayKeys)` signature and marker naming (`${key}Truncated`, `${key}Count`) identical across Tasks 1-4. `severityRank` helper duplicated inline in Tasks 3 and 4 (two separate tool handlers, not worth extracting a shared function for a 1-line arrow — consistent with this file's existing style of small inline helpers per tool).
