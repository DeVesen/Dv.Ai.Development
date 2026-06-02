#!/usr/bin/env dotnet-script
// roslyn-test-quality.csx
// Usage: dotnet script roslyn-test-quality.csx -- <rootPath>

#r "nuget: Microsoft.CodeAnalysis.CSharp, 4.9.2"

using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text.Json;
using System.Text.Json.Serialization;

var rootPath = Args.ElementAtOrDefault(0) ?? Directory.GetCurrentDirectory();

var allFiles = Directory.GetFiles(rootPath, "*.cs", SearchOption.AllDirectories)
    .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
             && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"))
    .ToList();

var testFiles  = allFiles.Where(f => f.Contains("Test") || f.Contains("Spec") || f.EndsWith("Tests.cs")).ToList();
var srcFiles   = allFiles.Except(testFiles).ToList();

var parsedTests = testFiles.Select(f =>
    (Path: f, RelPath: Path.GetRelativePath(rootPath, f),
     Code: File.ReadAllText(f), Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f))).ToList();

var parsedSrc = srcFiles.Select(f =>
    (Path: f, RelPath: Path.GetRelativePath(rootPath, f),
     Code: File.ReadAllText(f), Tree: CSharpSyntaxTree.ParseText(File.ReadAllText(f), path: f))).ToList();

var result = new TestQualityResult { ProjectRoot = rootPath, GeneratedAt = DateTime.UtcNow.ToString("o") };

result.TestFiles  = parsedTests.Select(f => AnalyzeTestFile(f.RelPath, f.Code, f.Tree)).ToList();
result.CoverageGaps = FindCoverageGaps(parsedSrc, parsedTests);
result.AntiPatterns = result.TestFiles.SelectMany(f => f.Tests.SelectMany(t => t.AntiPatterns.Select(p =>
    new AntiPatternEntry { File = f.File, TestName = t.Name, Line = t.Line, Pattern = p, Description = Describe(p), Severity = Severity(p), Fix = Fix(p) }))).ToList();

var allTests = result.TestFiles.SelectMany(f => f.Tests).ToList();
int totalAssertions = allTests.Sum(t => t.AssertionCount);
int noAssertions = allTests.Count(t => t.AssertionCount == 0);
int qualityScore = ComputeScore(allTests, result.AntiPatterns);

result.Summary = new TestSummary
{
    TotalTestFiles = result.TestFiles.Count,
    TotalTests = allTests.Count,
    TestsWithoutAssertions = noAssertions,
    TestsWithWeakAssertions = allTests.Count(t => t.Quality == "weak"),
    TestsWithOnlyHappyPath = allTests.Count(t => t.AntiPatterns.Contains("happy-path-only")),
    AvgAssertionsPerTest = allTests.Count > 0 ? Math.Round((double)totalAssertions / allTests.Count, 1) : 0,
    QualityScore = qualityScore,
    Grade = qualityScore >= 80 ? "A" : qualityScore >= 65 ? "B" : qualityScore >= 50 ? "C" : qualityScore >= 30 ? "D" : "F",
};

result.Recommendations = BuildRecommendations(allTests, result.AntiPatterns, result.CoverageGaps);

var opts = new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
Console.WriteLine(JsonSerializer.Serialize(result, opts));

// ── Analysis Functions ────────────────────────────────────────────────────────

static TestFileEntry AnalyzeTestFile(string relPath, string code, SyntaxTree tree)
{
    var root = tree.GetRoot();
    var lines = code.Split('\n');
    var tests = new List<TestEntry>();

    // Detect framework
    var framework = code.Contains("[Fact]") || code.Contains("[Theory]") ? "xunit"
        : code.Contains("[Test]") || code.Contains("[TestCase]") ? "nunit"
        : code.Contains("[TestMethod]") ? "mstest"
        : "unknown";

    // Find test methods
    var testAttrs = new HashSet<string> { "Fact", "Theory", "Test", "TestCase", "TestMethod", "DataTestMethod" };
    foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
    foreach (var method in cls.Members.OfType<MethodDeclarationSyntax>())
    {
        var attrs = method.AttributeLists.SelectMany(al => al.Attributes).Select(a => a.Name.ToString()).ToList();
        if (!attrs.Any(a => testAttrs.Contains(a))) continue;

        var methodBody = method.Body?.ToString() ?? method.ExpressionBody?.ToString() ?? "";
        var ln = method.GetLocation().GetLineSpan().StartLinePosition.Line + 1;
        tests.Add(AnalyzeTestMethod(method.Identifier.Text, methodBody, ln, framework));
    }

    var fileIssues = new List<string>();
    if (tests.Count == 0) fileIssues.Add("No test methods found");
    if (code.Contains("Thread.Sleep")) fileIssues.Add("Thread.Sleep in tests — makes tests slow and flaky");
    if (code.Contains(".Result") || code.Contains(".Wait()")) fileIssues.Add("Blocking async in tests (.Result/.Wait()) — use async/await instead");

    int fileScore = tests.Count > 0 ? (int)tests.Average(t => t.Quality == "good" ? 100 : t.Quality == "weak" ? 50 : 0) : 0;

    return new TestFileEntry { File = relPath, TestCount = tests.Count, Framework = framework, Tests = tests, QualityScore = fileScore, Issues = fileIssues };
}

static TestEntry AnalyzeTestMethod(string name, string body, int line, string framework)
{
    // Count assertions
    var assertPatterns = new[] { "Assert.", "Should.", ".Should()", "Verify(", "Times." };
    int assertionCount = assertPatterns.Sum(p => CountOccurrences(body, p));

    // Also count xUnit-style: Assert.Equal, Assert.True, etc.
    var xunitAsserts = new[] { "Assert.Equal", "Assert.True", "Assert.False", "Assert.Null", "Assert.NotNull", "Assert.Throws", "Assert.Contains", "Assert.Empty", "Assert.NotEmpty" };
    assertionCount += xunitAsserts.Sum(p => CountOccurrences(body, p));

    // Assertion types
    var assertionTypes = new List<string>();
    if (body.Contains("Assert.Equal")) assertionTypes.Add("Equal");
    if (body.Contains("Assert.True")) assertionTypes.Add("True");
    if (body.Contains("Assert.False")) assertionTypes.Add("False");
    if (body.Contains("Assert.Null")) assertionTypes.Add("Null");
    if (body.Contains("Assert.NotNull")) assertionTypes.Add("NotNull");
    if (body.Contains("Assert.Throws")) assertionTypes.Add("Throws");
    if (body.Contains(".Should().Be(")) assertionTypes.Add("FluentBe");
    if (body.Contains(".Should().BeNull()")) assertionTypes.Add("FluentNull");

    // Mock count (Moq)
    int mockCount = CountOccurrences(body, "new Mock<") + CountOccurrences(body, ".Verify(") + CountOccurrences(body, ".Setup(");

    // Anti-patterns
    var antiPatterns = new List<string>();

    if (assertionCount == 0) antiPatterns.Add("no-assertions");

    if (assertionTypes.All(t => new[] { "True", "False", "NotNull" }.Contains(t)) && assertionTypes.Count > 0)
        antiPatterns.Add("weak-assertions");

    if (body.Contains("Assert.True(true)") || body.Contains("Assert.Equal(true, true)"))
        antiPatterns.Add("tautology");

    if (mockCount > 5) antiPatterns.Add("mock-heavy");
    if (assertionCount > 10) antiPatterns.Add("too-many-assertions");

    bool hasErrorScenario = System.Text.RegularExpressions.Regex.IsMatch(name + body, @"error|fail|throw|invalid|null|empty|exception|negative", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    if (!hasErrorScenario && assertionCount > 0) antiPatterns.Add("happy-path-only");

    if (body.Contains("Thread.Sleep")) antiPatterns.Add("real-timers");
    if (CountOccurrences(body, ".Result") + CountOccurrences(body, ".Wait()") > 0) antiPatterns.Add("blocking-async");
    if (body.Contains("Console.Write")) antiPatterns.Add("console-in-test");

    // Arrange/Act/Assert structure check
    bool hasArrange = body.Contains("// Arrange") || body.Contains("//Arrange") || body.Contains("var ");
    bool hasAct = body.Contains("// Act") || body.Contains("//Act");
    bool hasAssert = body.Contains("// Assert") || body.Contains("//Assert") || assertionCount > 0;
    if (!hasAct && body.Split('\n').Length > 10) antiPatterns.Add("no-aaa-structure");

    bool isParameterized = body.Contains("[InlineData") || body.Contains("[TestCase") || body.Contains("[MemberData");
    bool hasSetup = body.Contains("[SetUp]") || body.Contains("IClassFixture");
    bool hasTeardown = body.Contains("[TearDown]") || body.Contains("IDisposable");

    string quality = antiPatterns.Contains("no-assertions") || antiPatterns.Contains("tautology") ? "poor"
        : antiPatterns.Contains("weak-assertions") || antiPatterns.Contains("mock-heavy") ? "weak"
        : "good";

    return new TestEntry { Name = name, Line = line, AssertionCount = assertionCount, HasSetup = hasSetup, HasTeardown = hasTeardown, MockCount = mockCount, AssertionTypes = assertionTypes, AntiPatterns = antiPatterns, IsParameterized = isParameterized, Quality = quality };
}

static List<CoverageGapEntry> FindCoverageGaps(
    List<(string Path, string RelPath, string Code, SyntaxTree Tree)> srcFiles,
    List<(string Path, string RelPath, string Code, SyntaxTree Tree)> testFiles)
{
    var gaps = new List<CoverageGapEntry>();
    var testContent = string.Join(" ", testFiles.Select(f => f.Code));

    foreach (var (_, relPath, _, tree) in srcFiles.Take(100))
    {
        var root = tree.GetRoot();
        foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            var publicMethods = cls.Members.OfType<MethodDeclarationSyntax>()
                .Where(m => m.Modifiers.Any(mod => mod.Text == "public")
                         && !new[] { "Dispose", "Finalize" }.Contains(m.Identifier.Text))
                .Select(m => $"{cls.Identifier.Text}.{m.Identifier.Text}")
                .ToList();

            if (publicMethods.Count == 0) continue;

            var untested = publicMethods.Where(m => !testContent.Contains(m.Split('.')[1])).ToList();
            if (untested.Count > 0)
            {
                var testFileName = relPath.Replace(".cs", "Tests.cs");
                var testExists = testFiles.Any(f => f.RelPath.Contains(cls.Identifier.Text));
                gaps.Add(new CoverageGapEntry { SourceFile = relPath, UntestedMethods = untested, TestFileExists = testExists, SuggestedTestFile = testFileName });
            }
        }
    }
    return gaps.Take(30).ToList();
}

static int ComputeScore(List<TestEntry> tests, List<AntiPatternEntry> patterns)
{
    if (tests.Count == 0) return 0;
    double score = 100;
    score -= ((double)tests.Count(t => t.AssertionCount == 0) / tests.Count) * 40;
    score -= ((double)patterns.Count(p => p.Pattern == "tautology") / tests.Count) * 30;
    score -= ((double)patterns.Count(p => p.Pattern == "mock-heavy") / tests.Count) * 15;
    score -= Math.Min(15, patterns.Count(p => p.Severity == "critical") * 5);
    return Math.Max(0, (int)score);
}

static List<string> BuildRecommendations(List<TestEntry> tests, List<AntiPatternEntry> patterns, List<CoverageGapEntry> gaps)
{
    var recs = new List<string>();
    if (tests.Count > 0 && (double)tests.Count(t => t.AssertionCount == 0) / tests.Count > 0.2)
        recs.Add($"{(int)((double)tests.Count(t => t.AssertionCount == 0) / tests.Count * 100)}% of tests have no assertions");
    if (patterns.Count(p => p.Pattern == "happy-path-only") > 5)
        recs.Add("Many tests only cover happy path — add error, null, and boundary cases");
    if (gaps.Count(g => !g.TestFileExists) > 0)
        recs.Add($"{gaps.Count(g => !g.TestFileExists)} classes have no test file");
    if (patterns.Count(p => p.Pattern == "mock-heavy") > 3)
        recs.Add("Too many mock-heavy tests — consider integration tests");
    if (patterns.Count(p => p.Pattern == "tautology") > 0)
        recs.Add("Remove tautological assertions — they never catch bugs");
    if (patterns.Count(p => p.Pattern == "no-aaa-structure") > 5)
        recs.Add("Add // Arrange / Act / Assert comments for test readability");
    return recs;
}

static int CountOccurrences(string text, string pattern) =>
    (text.Length - text.Replace(pattern, "").Length) / pattern.Length;

static string Describe(string p) => p switch
{
    "no-assertions" => "Test has no assertions — always passes, proves nothing",
    "weak-assertions" => "Only uses Assert.True/False/NotNull — doesn't verify actual values",
    "tautology" => "Assert.True(true) — logically always true, tests nothing",
    "mock-heavy" => "More than 5 mocks — may test mock behavior, not real logic",
    "too-many-assertions" => "More than 10 assertions — hard to diagnose on failure",
    "happy-path-only" => "No error/null/edge-case scenario covered",
    "real-timers" => "Thread.Sleep in tests — slow and flaky",
    "blocking-async" => ".Result/.Wait() in async test — deadlock risk",
    "console-in-test" => "Console.Write in test — leftover debugging code",
    "no-aaa-structure" => "No Arrange/Act/Assert structure — hard to read",
    _ => p
};

static string Severity(string p) => p switch
{
    "no-assertions" or "tautology" or "blocking-async" => "critical",
    "weak-assertions" or "mock-heavy" or "happy-path-only" or "real-timers" => "warning",
    _ => "suggestion"
};

static string Fix(string p) => p switch
{
    "no-assertions" => "Add Assert.Equal(expected, actual) or .Should().Be(value)",
    "weak-assertions" => "Replace Assert.True(x != null) with Assert.NotNull(x) and Assert.Equal(expectedValue, x.Property)",
    "tautology" => "Remove Assert.True(true) — add assertion on the method under test's return value",
    "mock-heavy" => "Consider using real implementations; extract integration tests",
    "too-many-assertions" => "Split into multiple [Fact] methods, one behavior each",
    "happy-path-only" => "Add test cases: null input, empty list, max boundary, exception thrown",
    "real-timers" => "Remove Thread.Sleep; use async/await or mock time",
    "blocking-async" => "Change test to async Task and await instead of .Result/.Wait()",
    "console-in-test" => "Remove Console.Write — use assertions to verify output",
    "no-aaa-structure" => "Structure with // Arrange / // Act / // Assert comments",
    _ => "Review and fix"
};

// ── Data Models ───────────────────────────────────────────────────────────────
class TestQualityResult { public string ProjectRoot{get;set;}="" public string GeneratedAt{get;set;}="" public TestSummary? Summary{get;set;} public List<TestFileEntry> TestFiles{get;set;}=new(); public List<AntiPatternEntry> AntiPatterns{get;set;}=new(); public List<CoverageGapEntry> CoverageGaps{get;set;}=new(); public List<string> Recommendations{get;set;}=new(); }
class TestSummary { public int TotalTestFiles{get;set;} public int TotalTests{get;set;} public int TestsWithoutAssertions{get;set;} public int TestsWithWeakAssertions{get;set;} public int TestsWithOnlyHappyPath{get;set;} public double AvgAssertionsPerTest{get;set;} public int QualityScore{get;set;} public string Grade{get;set;}="" }
class TestFileEntry { public string File{get;set;}="" public int TestCount{get;set;} public string Framework{get;set;}="" public List<TestEntry> Tests{get;set;}=new(); public int QualityScore{get;set;} public List<string> Issues{get;set;}=new(); }
class TestEntry { public string Name{get;set;}="" public int Line{get;set;} public int AssertionCount{get;set;} public bool HasSetup{get;set;} public bool HasTeardown{get;set;} public int MockCount{get;set;} public List<string> AssertionTypes{get;set;}=new(); public List<string> AntiPatterns{get;set;}=new(); public bool IsParameterized{get;set;} public string Quality{get;set;}="" }
class AntiPatternEntry { public string File{get;set;}="" public string TestName{get;set;}="" public int Line{get;set;} public string Pattern{get;set;}="" public string Description{get;set;}="" public string Severity{get;set;}="" public string Fix{get;set;}="" }
class CoverageGapEntry { public string SourceFile{get;set;}="" public List<string> UntestedMethods{get;set;}=new(); public bool TestFileExists{get;set;} public string SuggestedTestFile{get;set;}="" }
