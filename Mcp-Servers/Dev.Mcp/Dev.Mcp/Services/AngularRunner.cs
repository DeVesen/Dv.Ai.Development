using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed partial class AngularRunner
{
    private const int MaxErrors = 50;
    private const int MaxWarnings = 20;
    private const int BuildTimeoutSeconds = 300;
    private const int TestTimeoutSeconds = 600;

    private static readonly string NgExecutable = OperatingSystem.IsWindows() ? "ng.cmd" : "ng";

    [GeneratedRegex(@"\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))")]
    private static partial Regex AnsiRegex();

    [GeneratedRegex(@"(?:ERROR in |error\s+TS\d+:|✘\s*\[ERROR\]|^\s*✖|An unhandled exception occurred:)", RegexOptions.IgnoreCase)]
    private static partial Regex BuildErrorLineRegex();

    [GeneratedRegex(@"(?:WARNING in |warning\s+TS\d+:|⚠\s*\[WARNING\])", RegexOptions.IgnoreCase)]
    private static partial Regex BuildWarningLineRegex();

    [GeneratedRegex(@"Executed\s+\d+\s+of\s+\d+.*", RegexOptions.IgnoreCase)]
    private static partial Regex KarmaExecutedRegex();

    [GeneratedRegex(@"^\s*(?:FAILED|✗|✕)\s+(.+)", RegexOptions.IgnoreCase)]
    private static partial Regex KarmaFailedTestRegex();

    // Jest output patterns
    [GeneratedRegex(@"^\s*●\s+(.+)", RegexOptions.Multiline)]
    private static partial Regex JestFailedTestRegex();

    [GeneratedRegex(@"^\s*NOTE:\s+The Jest builder is currently EXPERIMENTAL", RegexOptions.IgnoreCase)]
    private static partial Regex JestExperimentalNoteRegex();

    [GeneratedRegex(@"Tests:\s+.+", RegexOptions.IgnoreCase)]
    private static partial Regex JestTestsSummaryRegex();

    [GeneratedRegex(@"^(?:FAIL|PASS)\s+.+", RegexOptions.Multiline)]
    private static partial Regex JestSuiteLineRegex();

    // Vitest output patterns (@angular/build:unit-test with runner: "vitest")
    [GeneratedRegex(@"^\s*(?:×|✗)\s+(.+)", RegexOptions.Multiline)]
    private static partial Regex VitestFailedTestRegex();

    [GeneratedRegex(@"^\s*(?:Test Files|Tests)\s+.+", RegexOptions.Multiline)]
    private static partial Regex VitestSummaryRegex();

    public async Task<AngularBuildResult> BuildAsync(string projectRoot, string? configuration = null, CancellationToken cancellationToken = default)
    {
        if (!ValidateRoot(projectRoot, out var error)) return MakeFailResult(error, "ng build");

        var preStep = await EnsureCompatibleEsbuildAsync(projectRoot, cancellationToken);
        var args = new List<string> { "build" };
        if (!string.IsNullOrWhiteSpace(configuration)) args.Add($"--configuration={configuration.Trim()}");

        var result = await RunAsync("ng build", projectRoot, args, ParseBuildOutput, BuildTimeoutSeconds, cancellationToken);
        if (preStep != null) result.ConsoleOutput = preStep + "\n\n" + result.ConsoleOutput;
        return result;
    }

    public async Task<AngularBuildResult> TestAsync(string projectRoot, string? options = null, CancellationToken cancellationToken = default)
    {
        if (!ValidateRoot(projectRoot, out var error)) return MakeFailResult(error, "ng test");

        var preStep = await EnsureCompatibleEsbuildAsync(projectRoot, cancellationToken);
        var builderKind = DetectTestBuilder(projectRoot);
        var args = new List<string> { "test" };
        if (builderKind != TestBuilderKind.Jest) args.Add("--watch=false");
        if (!string.IsNullOrWhiteSpace(options)) args.AddRange(options.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));

        var parser = builderKind switch
        {
            TestBuilderKind.Jest => ParseJestOutput,
            TestBuilderKind.Vitest => ParseVitestOutput,
            _ => (Func<string, string, int, AngularBuildResult>)ParseTestOutput,
        };

        var result = await RunAsync("ng test", projectRoot, args, parser, TestTimeoutSeconds, cancellationToken);
        if (preStep != null) result.ConsoleOutput = preStep + "\n\n" + result.ConsoleOutput;
        return result;
    }

    private enum TestBuilderKind { Karma, Jest, Vitest }

    private static TestBuilderKind DetectTestBuilder(string projectRoot)
    {
        var angularJsonPath = Path.Combine(projectRoot, "angular.json");
        if (!File.Exists(angularJsonPath)) return TestBuilderKind.Karma;
        try
        {
            var json = File.ReadAllText(angularJsonPath);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("projects", out var projects)) return TestBuilderKind.Karma;
            foreach (var project in projects.EnumerateObject())
            {
                if (!project.Value.TryGetProperty("architect", out var arch) ||
                    !arch.TryGetProperty("test", out var test) ||
                    !test.TryGetProperty("builder", out var builder)) continue;

                var builderValue = builder.GetString() ?? string.Empty;
                if (builderValue.Contains("jest", StringComparison.OrdinalIgnoreCase)) return TestBuilderKind.Jest;

                // @angular/build:unit-test (v20+) defaults to the vitest runner; the
                // "runner" option makes it explicit when set.
                if (builderValue.Contains("unit-test", StringComparison.OrdinalIgnoreCase))
                {
                    if (test.TryGetProperty("options", out var testOptions) &&
                        testOptions.TryGetProperty("runner", out var runner) &&
                        (runner.GetString() ?? string.Empty).Contains("karma", StringComparison.OrdinalIgnoreCase))
                        return TestBuilderKind.Karma;
                    return TestBuilderKind.Vitest;
                }
            }
        }
        catch { /* fall through */ }
        return TestBuilderKind.Karma;
    }

    public static AngularBuildResult ParseBuildOutput(string stdout, string stderr, int exitCode)
    {
        var lines = StripAnsi(stdout + "\n" + stderr).Split('\n');
        var errors = lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();
        var warnings = lines.Where(l => BuildWarningLineRegex().IsMatch(l)).Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxWarnings).ToArray();

        var summary = exitCode == 0 ? $"Build successful. {warnings.Length} warning(s)."
            : errors.Length > 0 ? $"Build failed: {errors.Length} error(s), {warnings.Length} warning(s)."
            : $"Build failed (exitCode {exitCode}) — see Console output for details.";

        return new AngularBuildResult { Success = exitCode == 0, Command = "ng build", Errors = errors, Warnings = warnings, ExitCode = exitCode, Summary = summary };
    }

    public static AngularBuildResult ParseTestOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');
        var failedTests = lines.Select(l => KarmaFailedTestRegex().Match(l)).Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim()).Where(t => t.Length > 0).Distinct().Take(MaxErrors).ToArray();
        var tsErrors = lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();
        var executedLine = lines.Select(l => KarmaExecutedRegex().Match(l)).FirstOrDefault(m => m.Success);

        string[] errors;
        if (failedTests.Length > 0) errors = failedTests;
        else if (tsErrors.Length > 0) errors = tsErrors;
        else if (exitCode != 0 && !string.IsNullOrWhiteSpace(stderr))
            errors = StripAnsi(stderr).Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).Take(MaxErrors).ToArray();
        else errors = [];

        var summary = executedLine is { Success: true } ? executedLine.Value.Trim()
            : exitCode == 0 ? "All tests passed."
            : failedTests.Length > 0 ? $"Tests failed: {failedTests.Length} failing test(s)."
            : tsErrors.Length > 0 ? $"Test run failed: {tsErrors.Length} TypeScript compilation error(s) — see Console output."
            : $"Test run failed (exitCode {exitCode}) — see Console output for details.";

        return new AngularBuildResult { Success = exitCode == 0, Command = "ng test", Errors = errors, Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    public static AngularBuildResult ParseJestOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        // Collect failed test names (lines starting with "●")
        var failedTests = lines.Select(l => JestFailedTestRegex().Match(l)).Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim()).Where(t => t.Length > 0 && !t.StartsWith("●"))
            .Distinct().Take(MaxErrors).ToArray();

        // Collect TS/build errors
        var tsErrors = lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();

        // Jest summary line: "Tests: 1 failed, 19 passed, 20 total"
        var jestSummaryLine = lines.Select(l => JestTestsSummaryRegex().Match(l)).FirstOrDefault(m => m.Success);

        string[] errors;
        if (failedTests.Length > 0) errors = failedTests;
        else if (tsErrors.Length > 0) errors = tsErrors;
        else if (exitCode != 0)
        {
            var stderrLines = StripAnsi(stderr).Split('\n').Select(l => l.Trim())
                .Where(l => l.Length > 0 && !JestExperimentalNoteRegex().IsMatch(l)).ToArray();
            var fallbackLines = lines.Where(l => l.Contains("Error", StringComparison.OrdinalIgnoreCase) && !JestExperimentalNoteRegex().IsMatch(l))
                .Select(l => l.Trim()).Where(l => l.Length > 0).ToArray();
            errors = stderrLines.Length > 0 ? stderrLines.Take(MaxErrors).ToArray()
                : fallbackLines.Take(MaxErrors).ToArray();
        }
        else errors = [];

        var summary = jestSummaryLine is { Success: true } ? jestSummaryLine.Value.Trim()
            : exitCode == 0 ? "All tests passed."
            : failedTests.Length > 0 ? $"Tests failed: {failedTests.Length} failing test(s)."
            : tsErrors.Length > 0 ? $"Test run failed: {tsErrors.Length} TypeScript compilation error(s) — see Console output."
            : $"Test run failed (exitCode {exitCode}) — see Console output for details.";

        return new AngularBuildResult { Success = exitCode == 0, Command = "ng test", Errors = errors, Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    public static AngularBuildResult ParseVitestOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        var failedTests = lines.Select(l => VitestFailedTestRegex().Match(l)).Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim()).Where(t => t.Length > 0).Distinct().Take(MaxErrors).ToArray();

        var tsErrors = lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();

        var summaryLines = lines.Where(l => VitestSummaryRegex().IsMatch(l)).Select(l => l.Trim()).ToArray();

        string[] errors;
        if (failedTests.Length > 0) errors = failedTests;
        else if (tsErrors.Length > 0) errors = tsErrors;
        else if (exitCode != 0 && !string.IsNullOrWhiteSpace(stderr))
            errors = StripAnsi(stderr).Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).Take(MaxErrors).ToArray();
        else errors = [];

        var summary = summaryLines.Length > 0 ? string.Join(" | ", summaryLines)
            : exitCode == 0 ? "All tests passed."
            : failedTests.Length > 0 ? $"Tests failed: {failedTests.Length} failing test(s)."
            : tsErrors.Length > 0 ? $"Test run failed: {tsErrors.Length} TypeScript compilation error(s) — see Console output."
            : $"Test run failed (exitCode {exitCode}) — see Console output for details.";

        return new AngularBuildResult { Success = exitCode == 0, Command = "ng test", Errors = errors, Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    private async Task<AngularBuildResult> RunAsync(
        string commandLabel, string projectRoot, List<string> args,
        Func<string, string, int, AngularBuildResult> parser, int timeoutSeconds, CancellationToken cancellationToken)
    {
        var arguments = string.Join(' ', args);
        var root = Path.GetFullPath(projectRoot);

        ProcessRunResult run;
        try
        {
            run = await ProcessRunner.RunAsync(NgExecutable, arguments, root, timeoutSeconds, cancellationToken);
        }
        catch (Exception ex)
        {
            return MakeFailResult($"Failed to start ng: {ex.Message}", commandLabel);
        }

        if (run.TimedOut)
            return MakeFailResult($"Process timed out after {timeoutSeconds}s.", commandLabel);

        var result = parser(run.Stdout, run.Stderr, run.ExitCode);
        result.ConsoleOutput = $"> {NgExecutable} {arguments}\n\n{StripAnsi(run.Stdout + "\n" + run.Stderr).Trim()}";
        return result;
    }

    private static async Task<string?> EnsureCompatibleEsbuildAsync(string projectRoot, CancellationToken cancellationToken)
    {
        if (!OperatingSystem.IsLinux()) return null;
        var esbuildDir = Path.Combine(projectRoot, "node_modules", "@esbuild");
        if (!Directory.Exists(esbuildDir)) return null;
        var linuxPkg = Path.Combine(esbuildDir, "linux-x64");
        if (Directory.Exists(linuxPkg)) return null;
        var hasWrongPlatform = Directory.GetDirectories(esbuildDir).Select(Path.GetFileName)
            .Any(n => n != null && (n.StartsWith("win", StringComparison.OrdinalIgnoreCase) || n.StartsWith("darwin", StringComparison.OrdinalIgnoreCase)));
        if (!hasWrongPlatform) return null;

        var psi = new ProcessStartInfo
        {
            FileName = "npm", Arguments = "install @esbuild/linux-x64 --no-save", WorkingDirectory = projectRoot,
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
        };
        using var process = new Process { StartInfo = psi };
        if (!process.Start()) return null;
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
        var stdoutTask = process.StandardOutput.ReadToEndAsync(linked.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(linked.Token);
        try { await Task.WhenAll(stdoutTask, stderrTask, process.WaitForExitAsync(linked.Token)); }
        catch (OperationCanceledException) { try { process.Kill(entireProcessTree: true); } catch { } }
        var output = StripAnsi((await stdoutTask) + "\n" + (await stderrTask)).Trim();
        return $"> npm install @esbuild/linux-x64 --no-save  [auto: non-Linux esbuild detected]\n\n{output}";
    }

    private static bool ValidateRoot(string projectRoot, out string error)
    {
        if (string.IsNullOrWhiteSpace(projectRoot)) { error = "project_root is required."; return false; }
        if (!Directory.Exists(projectRoot)) { error = $"project_root does not exist: {projectRoot}"; return false; }
        error = string.Empty;
        return true;
    }

    private static AngularBuildResult MakeFailResult(string message, string command) => new()
    {
        Success = false, Command = command, Errors = [message], Warnings = [], ExitCode = -1, Summary = message,
    };

    private static string StripAnsi(string input) => AnsiRegex().Replace(input, string.Empty);
}
