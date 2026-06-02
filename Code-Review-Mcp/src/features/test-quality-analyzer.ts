import {
  Project, Node, SourceFile, ClassDeclaration,
  MethodDeclaration, SyntaxKind, CallExpression,
} from "ts-morph";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, extname, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestQualityReport {
  projectRoot: string;
  generatedAt: string;
  summary: TestQualitySummary;
  testFiles: TestFileAnalysis[];
  antiPatterns: TestAntiPattern[];
  coverageGaps: CoverageGap[];
  recommendations: string[];
}

export interface TestQualitySummary {
  totalTestFiles: number;
  totalTests: number;
  testsWithoutAssertions: number;
  testsWithWeakAssertions: number;
  testsWithOnlyHappyPath: number;
  duplicateTestLogic: number;
  avgAssertionsPerTest: number;
  qualityScore: number;     // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface TestFileAnalysis {
  file: string;
  testCount: number;
  framework: "jest" | "jasmine" | "vitest" | "xunit" | "nunit" | "mstest" | "unknown";
  tests: TestAnalysis[];
  qualityScore: number;
  issues: string[];
}

export interface TestAnalysis {
  name: string;
  line: number;
  assertionCount: number;
  hasSetup: boolean;
  hasTeardown: boolean;
  mockCount: number;
  assertionTypes: string[];
  antiPatterns: string[];
  isParameterized: boolean;
  testedMethod: string | null;  // inferred from test name
  quality: "good" | "weak" | "poor";
}

export interface TestAntiPattern {
  file: string;
  testName: string;
  line: number;
  pattern: string;
  description: string;
  severity: "critical" | "warning" | "suggestion";
  fix: string;
}

export interface CoverageGap {
  sourceFile: string;
  untestedMethods: string[];
  testFileExists: boolean;
  suggestedTestFile: string;
}

// ─── Angular / TypeScript Test Analyzer ──────────────────────────────────────

export function analyzeAngularTestQuality(rootPath: string): TestQualityReport {
  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular"];
  const testFiles: string[] = [];
  const sourceFiles: string[] = [];

  function walk(dir: string) {
    try {
      for (const entry of readdirSync(dir)) {
        if (ignored.includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (extname(full) === ".ts") {
          if (full.endsWith(".spec.ts") || full.endsWith(".test.ts")) testFiles.push(full);
          else if (!full.endsWith(".d.ts")) sourceFiles.push(full);
        }
      }
    } catch {}
  }
  walk(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of [...testFiles, ...sourceFiles.slice(0, 200)]) {
    try { project.addSourceFileAtPath(f); } catch {}
  }

  const analyses: TestFileAnalysis[] = [];
  const allAntiPatterns: TestAntiPattern[] = [];

  // Analyze each test file
  for (const testFile of testFiles) {
    const sf = project.getSourceFile(testFile);
    if (!sf) continue;
    const analysis = analyzeTestFile(sf, testFile, rootPath);
    analyses.push(analysis);
    allAntiPatterns.push(...analysis.tests.flatMap((t) =>
      t.antiPatterns.map((p): TestAntiPattern => ({
        file: relative(rootPath, testFile),
        testName: t.name,
        line: t.line,
        pattern: p,
        description: describeAntiPattern(p),
        severity: antiPatternSeverity(p),
        fix: antiPatternFix(p),
      }))
    ));
  }

  // Find coverage gaps (source files without test counterparts)
  const coverageGaps = findCoverageGaps(sourceFiles, testFiles, project, rootPath);

  // Summary
  const allTests = analyses.flatMap((a) => a.tests);
  const totalAssertions = allTests.reduce((s, t) => s + t.assertionCount, 0);
  const testsWithoutAssertions = allTests.filter((t) => t.assertionCount === 0).length;
  const testsWithWeakAssertions = allTests.filter((t) => t.quality === "weak").length;
  const qualityScore = computeQualityScore(allTests, allAntiPatterns);

  return {
    projectRoot: rootPath,
    generatedAt: new Date().toISOString(),
    summary: {
      totalTestFiles: testFiles.length,
      totalTests: allTests.length,
      testsWithoutAssertions,
      testsWithWeakAssertions,
      testsWithOnlyHappyPath: allTests.filter((t) => t.antiPatterns.includes("happy-path-only")).length,
      duplicateTestLogic: allAntiPatterns.filter((p) => p.pattern === "duplicate-logic").length,
      avgAssertionsPerTest: allTests.length > 0 ? Math.round((totalAssertions / allTests.length) * 10) / 10 : 0,
      qualityScore,
      grade: qualityScore >= 80 ? "A" : qualityScore >= 65 ? "B" : qualityScore >= 50 ? "C" : qualityScore >= 30 ? "D" : "F",
    },
    testFiles: analyses,
    antiPatterns: allAntiPatterns,
    coverageGaps,
    recommendations: buildRecommendations(allTests, allAntiPatterns, coverageGaps),
  };
}

function analyzeTestFile(sf: SourceFile, filePath: string, rootPath: string): TestFileAnalysis {
  const relFile = relative(rootPath, filePath);
  const rawText = sf.getFullText();
  const lines = rawText.split("\n");

  // Detect framework
  const framework = rawText.includes("describe(") && rawText.includes("it(") ? "jest"
    : rawText.includes("describe(") && rawText.includes("jasmine") ? "jasmine"
    : "jest"; // default for Angular

  const tests: TestAnalysis[] = [];

  // Find all it() / test() blocks
  sf.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    const fnName = Node.isIdentifier(expr) ? expr.getText()
      : Node.isPropertyAccessExpression(expr) ? expr.getName() : "";

    if (!["it", "test", "xit", "xtest", "fit", "ftest"].includes(fnName)) return;

    const args = node.getArguments();
    if (args.length < 2) return;

    const testName = args[0].getText().replace(/['"]/g, "");
    const testBody = args[1];
    const line = node.getStartLineNumber();

    const analysis = analyzeTestBody(testName, testBody, line, rawText);
    tests.push(analysis);
  });

  // File-level issues
  const issues: string[] = [];
  if (tests.length === 0) issues.push("No tests found in file");
  if (!rawText.includes("describe(")) issues.push("No describe() block — tests not grouped");
  if (rawText.includes("fdescribe(") || rawText.includes("fit(")) issues.push("⚠️ Focused test (fdescribe/fit) — other tests will be skipped in CI");
  if (rawText.includes("xdescribe(") || rawText.includes("xit(")) issues.push("Skipped tests (xdescribe/xit) — may indicate broken tests");

  const fileQuality = tests.length > 0
    ? Math.round(tests.reduce((s, t) => s + (t.quality === "good" ? 100 : t.quality === "weak" ? 50 : 0), 0) / tests.length)
    : 0;

  return { file: relFile, testCount: tests.length, framework, tests, qualityScore: fileQuality, issues };
}

function analyzeTestBody(testName: string, bodyNode: Node, line: number, rawText: string): TestAnalysis {
  const bodyText = bodyNode.getText();

  // Count assertions
  const assertPatterns = [
    /expect\s*\(/.source,
    /\.toBe\(/.source, /\.toEqual\(/.source, /\.toBeNull\(/.source,
    /\.toBeTruthy\(/.source, /\.toBeFalsy\(/.source, /\.toHaveBeenCalled/.source,
    /\.toContain\(/.source, /\.toThrow/.source, /\.toHaveLength\(/.source,
    /\.toMatchObject\(/.source, /\.toBeGreaterThan\(/.source,
  ];
  const assertionCount = assertPatterns.reduce((s, p) => s + (bodyText.match(new RegExp(p, "g"))?.length ?? 0), 0);

  // Collect assertion types
  const assertionTypes: string[] = [];
  if (bodyText.includes(".toBe(")) assertionTypes.push("toBe");
  if (bodyText.includes(".toEqual(")) assertionTypes.push("toEqual");
  if (bodyText.includes(".toBeNull()")) assertionTypes.push("toBeNull");
  if (bodyText.includes(".toBeTruthy()")) assertionTypes.push("toBeTruthy");
  if (bodyText.includes(".toBeFalsy()")) assertionTypes.push("toBeFalsy");
  if (bodyText.includes(".toHaveBeenCalled")) assertionTypes.push("toHaveBeenCalled");
  if (bodyText.includes(".toThrow")) assertionTypes.push("toThrow");

  // Count mocks
  const mockCount = (bodyText.match(/jest\.fn\(|spyOn\(|createSpyObj\(|jest\.spyOn\(/g) ?? []).length;

  // Anti-patterns
  const antiPatterns: string[] = [];

  if (assertionCount === 0)
    antiPatterns.push("no-assertions");

  if (assertionTypes.every((t) => ["toBeTruthy", "toBeFalsy", "toBeDefined"].includes(t)) && assertionTypes.length > 0)
    antiPatterns.push("weak-assertions");

  if (bodyText.includes("expect(true).toBe(true)") || bodyText.includes("expect(true).toBeTruthy()"))
    antiPatterns.push("tautology");

  if (mockCount > 5)
    antiPatterns.push("mock-heavy");

  if (assertionCount > 10)
    antiPatterns.push("too-many-assertions");

  // Happy-path-only heuristic: no error words in test name/body
  const hasErrorScenario = /error|fail|throw|invalid|null|undefined|empty|exception|reject/i.test(testName + bodyText);
  if (!hasErrorScenario && assertionCount > 0)
    antiPatterns.push("happy-path-only");

  if (bodyText.includes("setTimeout") || bodyText.includes("setInterval"))
    antiPatterns.push("real-timers");

  if (!bodyText.includes("await") && bodyText.includes("Promise"))
    antiPatterns.push("unhandled-async");

  if (bodyText.match(/console\.(log|warn|error)/))
    antiPatterns.push("console-in-test");

  // Setup/teardown detection
  const hasSetup = bodyText.includes("beforeEach") || bodyText.includes("beforeAll");
  const hasTeardown = bodyText.includes("afterEach") || bodyText.includes("afterAll");

  // Infer tested method from test name
  const methodMatch = testName.match(/(?:should\s+)?(?:call|invoke|return|test|check|verify)?\s*(\w+)/i);
  const testedMethod = methodMatch?.[1] ?? null;

  // Quality
  const quality = antiPatterns.includes("no-assertions") || antiPatterns.includes("tautology") ? "poor"
    : antiPatterns.includes("weak-assertions") || antiPatterns.includes("mock-heavy") ? "weak"
    : "good";

  return { name: testName, line, assertionCount, hasSetup, hasTeardown, mockCount, assertionTypes, antiPatterns, isParameterized: bodyText.includes("each"), testedMethod, quality };
}

function findCoverageGaps(sourceFiles: string[], testFiles: string[], project: Project, rootPath: string): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const testFileSet = new Set(testFiles.map((f) => f.replace(".spec.ts", "").replace(".test.ts", "")));

  for (const sf of sourceFiles.slice(0, 100)) {
    const withoutExt = sf.replace(".ts", "");
    const hasTest = testFileSet.has(withoutExt);

    const sourceSf = project.getSourceFile(sf);
    if (!sourceSf) continue;

    const publicMethods: string[] = [];
    for (const cls of sourceSf.getClasses()) {
      for (const method of cls.getMethods()) {
        if (method.getScope() === "public" || !method.getScope()) {
          const name = method.getName();
          if (!["ngOnInit", "ngOnDestroy", "constructor"].includes(name))
            publicMethods.push(`${cls.getName()}.${name}`);
        }
      }
    }

    if (publicMethods.length === 0) continue;

    if (!hasTest || publicMethods.length > 3) {
      gaps.push({
        sourceFile: relative(rootPath, sf),
        untestedMethods: publicMethods,
        testFileExists: hasTest,
        suggestedTestFile: relative(rootPath, sf).replace(".ts", ".spec.ts"),
      });
    }
  }

  return gaps.slice(0, 30);
}

function computeQualityScore(tests: TestAnalysis[], antiPatterns: TestAntiPattern[]): number {
  if (tests.length === 0) return 0;
  let score = 100;
  const noAssertions = tests.filter((t) => t.assertionCount === 0).length;
  const tautologies = antiPatterns.filter((p) => p.pattern === "tautology").length;
  const mockHeavy = antiPatterns.filter((p) => p.pattern === "mock-heavy").length;
  score -= (noAssertions / tests.length) * 40;
  score -= (tautologies / tests.length) * 30;
  score -= (mockHeavy / tests.length) * 15;
  score -= Math.min(15, antiPatterns.filter((p) => p.severity === "critical").length * 5);
  return Math.max(0, Math.round(score));
}

function describeAntiPattern(pattern: string): string {
  const map: Record<string, string> = {
    "no-assertions": "Test has no assertions — always passes, proves nothing",
    "weak-assertions": "Only uses toBeTruthy/toBeFalsy/toBeDefined — doesn't verify actual values",
    "tautology": "expect(true).toBe(true) — logically always true, tests nothing",
    "mock-heavy": "More than 5 mocks — test may be testing mock behavior, not real logic",
    "too-many-assertions": "More than 10 assertions — test does too much, hard to diagnose failures",
    "happy-path-only": "No error/null/edge-case scenario covered",
    "real-timers": "Uses real setTimeout/setInterval — makes tests slow and flaky",
    "unhandled-async": "Promise not awaited — test may pass before async code runs",
    "console-in-test": "console.log in test — leftover debugging code",
  };
  return map[pattern] ?? pattern;
}

function antiPatternSeverity(pattern: string): "critical" | "warning" | "suggestion" {
  const critical = ["no-assertions", "tautology", "unhandled-async"];
  const warning = ["weak-assertions", "mock-heavy", "happy-path-only", "real-timers"];
  if (critical.includes(pattern)) return "critical";
  if (warning.includes(pattern)) return "warning";
  return "suggestion";
}

function antiPatternFix(pattern: string): string {
  const map: Record<string, string> = {
    "no-assertions": "Add expect() calls that verify the actual output of the tested method",
    "weak-assertions": "Replace toBeTruthy() with toEqual(expectedValue) or toBe(specificValue)",
    "tautology": "Remove expect(true).toBe(true) — add a real assertion on the method's return value",
    "mock-heavy": "Consider integration test instead; real implementations reveal more bugs than mocks",
    "too-many-assertions": "Split into multiple focused tests, one behavior per test",
    "happy-path-only": "Add test cases: null input, empty array, max value, error thrown",
    "real-timers": "Use jest.useFakeTimers() and jest.runAllTimers() instead",
    "unhandled-async": "Add async/await: it('...', async () => { await method(); expect(...) })",
    "console-in-test": "Remove console.log statements from tests",
  };
  return map[pattern] ?? "Review and fix the test";
}

function buildRecommendations(tests: TestAnalysis[], antiPatterns: TestAntiPattern[], gaps: CoverageGap[]): string[] {
  const recs: string[] = [];
  const noAssertionPct = tests.length > 0 ? (tests.filter((t) => t.assertionCount === 0).length / tests.length) * 100 : 0;

  if (noAssertionPct > 20) recs.push(`${Math.round(noAssertionPct)}% of tests have no assertions — add expect() calls`);
  if (antiPatterns.filter((p) => p.pattern === "happy-path-only").length > 5)
    recs.push("Many tests only cover the happy path — add error, null, and edge-case scenarios");
  if (gaps.filter((g) => !g.testFileExists).length > 0)
    recs.push(`${gaps.filter((g) => !g.testFileExists).length} source files have no test file at all`);
  if (antiPatterns.filter((p) => p.pattern === "mock-heavy").length > 3)
    recs.push("Too many mock-heavy tests — consider integration tests with real implementations");
  if (antiPatterns.filter((p) => p.pattern === "tautology").length > 0)
    recs.push("Remove tautological assertions (expect(true).toBe(true)) — they never fail");
  if (tests.filter((t) => t.assertionCount > 10).length > 0)
    recs.push("Split tests with >10 assertions into smaller focused tests");

  return recs;
}

// ─── .NET Test Quality Analyzer (pure AST, no Roslyn needed) ─────────────────
// This runs via the roslyn-test-quality.csx script — see that file
