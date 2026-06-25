using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed partial class DotnetRunner
{
    private const int MaxErrors = 50;
    private const int MaxWarnings = 20;
    private const int BuildTimeoutSeconds = 300;
    private const int TestTimeoutSeconds = 600;

    [GeneratedRegex(@"\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))")]
    private static partial Regex AnsiRegex();

    [GeneratedRegex(@"\): error\s+[A-Z]+\d+:", RegexOptions.IgnoreCase)]
    private static partial Regex BuildErrorLineRegex();

    [GeneratedRegex(@"\): warning\s+[A-Z]+\d+:", RegexOptions.IgnoreCase)]
    private static partial Regex BuildWarningLineRegex();

    [GeneratedRegex(@"Build\s+(succeeded|FAILED)\.", RegexOptions.IgnoreCase)]
    private static partial Regex BuildSummaryLineRegex();

    [GeneratedRegex(@"(?:Passed|Failed|Aborted)!\s*-\s*Failed:\s*\d+.*", RegexOptions.IgnoreCase)]
    private static partial Regex TestSummaryLineRegex();

    [GeneratedRegex(@"^\s*Failed\s+(.+)\s+\[(?:<?\s*\d)", RegexOptions.IgnoreCase)]
    private static partial Regex FailedTestLineRegex();

    [GeneratedRegex(@"No test matches the given testcase filter\b.*", RegexOptions.IgnoreCase)]
    private static partial Regex NoTestMatchesRegex();

    [GeneratedRegex(@"^Test Run Aborted\.", RegexOptions.IgnoreCase | RegexOptions.Multiline)]
    private static partial Regex TestRunAbortedRegex();

    public async Task<DotnetBuildResult> BuildAsync(string path, string? configuration = null, CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error)) return MakeFailResult(error, "dotnet build");

        var fullPath = Path.GetFullPath(path);
        var args = $"build {Quote(fullPath)}";
        if (!string.IsNullOrWhiteSpace(configuration)) args += $" --configuration {configuration.Trim()}";

        var workingDir = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
        return await RunDotnetAsync("dotnet build", args, workingDir, ParseBuildOutput, BuildTimeoutSeconds, cancellationToken);
    }

    public async Task<DotnetBuildResult> TestAsync(string path, string? options = null, CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error)) return MakeFailResult(error, "dotnet test");

        var fullPath = Path.GetFullPath(path);
        var args = $"test {Quote(fullPath)}";
        if (!string.IsNullOrWhiteSpace(options)) args += $" {options.Trim()}";

        var workingDir = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
        return await RunDotnetAsync("dotnet test", args, workingDir, ParseTestOutput, TestTimeoutSeconds, cancellationToken);
    }

    public static DotnetBuildResult ParseBuildOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        var errors = lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim())
            .Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();
        var warnings = lines.Where(l => BuildWarningLineRegex().IsMatch(l)).Select(l => l.Trim())
            .Where(l => l.Length > 0).Distinct().Take(MaxWarnings).ToArray();

        var summaryLine = lines.Select(l => BuildSummaryLineRegex().Match(l)).FirstOrDefault(m => m.Success);
        var summary = summaryLine is { Success: true }
            ? summaryLine.Value.Trim()
            : exitCode == 0
                ? $"Build succeeded. {warnings.Length} warning(s)."
                : $"Build failed: {errors.Length} error(s), {warnings.Length} warning(s).";

        return new DotnetBuildResult { Success = exitCode == 0, Command = "dotnet build", Errors = errors, Warnings = warnings, ExitCode = exitCode, Summary = summary };
    }

    public static DotnetBuildResult ParseTestOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        var failedTests = lines.Select(l => FailedTestLineRegex().Match(l)).Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim()).Where(t => t.Length > 0).Distinct().Take(MaxErrors).ToArray();
        var summaryLine = lines.Select(l => TestSummaryLineRegex().Match(l)).FirstOrDefault(m => m.Success);
        var noMatchLine = lines.Select(l => NoTestMatchesRegex().Match(l)).FirstOrDefault(m => m.Success);
        var abortLine = TestRunAbortedRegex().Match(string.Join("\n", lines));

        // dotnet test fails at build phase: capture MSBuild errors as fallback
        var buildErrors = failedTests.Length == 0
            ? lines.Where(l => BuildErrorLineRegex().IsMatch(l)).Select(l => l.Trim())
                .Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray()
            : [];

        // Last-resort fallback: last 10 non-empty lines when nothing else matched
        var fallbackLines = (exitCode != 0 && failedTests.Length == 0 && buildErrors.Length == 0
                             && noMatchLine is not { Success: true } && !abortLine.Success)
            ? lines.Where(l => l.Trim().Length > 0).TakeLast(10).Select(l => l.Trim()).ToArray()
            : [];

        var errors = failedTests.Length > 0 ? failedTests
            : buildErrors.Length > 0 ? buildErrors
            : noMatchLine is { Success: true } ? [noMatchLine.Value.Trim()]
            : abortLine.Success ? ["Test Run Aborted."]
            : fallbackLines.Length > 0 ? fallbackLines
            : [];

        var summary = summaryLine is { Success: true } ? summaryLine.Value.Trim()
            : exitCode == 0 ? "All tests passed."
            : failedTests.Length > 0 ? $"Tests failed: {failedTests.Length} failing test(s)."
            : buildErrors.Length > 0 ? $"Build failed during test run: {buildErrors.Length} error(s)."
            : noMatchLine is { Success: true } ? "No tests matched the filter — run aborted."
            : abortLine.Success ? "Test run aborted — see Console output for details."
            : $"Test run failed (exitCode {exitCode}) — see Console output for details.";

        return new DotnetBuildResult { Success = exitCode == 0, Command = "dotnet test", Errors = errors, Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    public async Task<DotnetBuildResult> PublishAsync(string projectPath, string? configuration = null, string? runtime = null, string? outputPath = null, bool? selfContained = null, CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(projectPath, out var error)) return MakeFailResult(error, "dotnet publish");
        var fullPath = Path.GetFullPath(projectPath);
        var args = $"publish {Quote(fullPath)}";
        if (!string.IsNullOrWhiteSpace(configuration)) args += $" -c {configuration.Trim()}";
        if (!string.IsNullOrWhiteSpace(runtime)) args += $" -r {runtime.Trim()}";
        if (!string.IsNullOrWhiteSpace(outputPath)) args += $" -o {Quote(Path.GetFullPath(outputPath.Trim()))}";
        if (selfContained.HasValue) args += $" --self-contained {selfContained.Value.ToString().ToLowerInvariant()}";
        var workingDir = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
        return await RunDotnetAsync("dotnet publish", args, workingDir, ParseBuildOutput, BuildTimeoutSeconds, cancellationToken);
    }

    private async Task<DotnetBuildResult> RunDotnetAsync(
        string commandLabel, string arguments, string workingDirectory,
        Func<string, string, int, DotnetBuildResult> parser, int timeoutSeconds, CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet", Arguments = arguments, WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        try { if (!process.Start()) return MakeFailResult("Failed to start dotnet process.", commandLabel); }
        catch (Exception ex) { return MakeFailResult($"Failed to start dotnet: {ex.Message}", commandLabel); }

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        var stdoutTask = process.StandardOutput.ReadToEndAsync(linkedCts.Token);
        var stderrTask = process.StandardError.ReadToEndAsync(linkedCts.Token);

        string stdout, stderr;
        try
        {
            await Task.WhenAll(stdoutTask, stderrTask, process.WaitForExitAsync(linkedCts.Token));
            stdout = await stdoutTask;
            stderr = await stderrTask;
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { }
            var reason = timeoutCts.IsCancellationRequested ? $"Process timed out after {timeoutSeconds}s." : "Process was cancelled.";
            return MakeFailResult(reason, commandLabel);
        }
        catch (Exception ex)
        {
            using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { }
            return MakeFailResult($"Process communication error: {ex.Message}", commandLabel);
        }

        var result = parser(stdout, stderr, process.ExitCode);
        result.ConsoleOutput = $"> dotnet {arguments}\n\n{StripAnsi(stdout + "\n" + stderr).Trim()}";
        return result;
    }

    private static string StripAnsi(string input) => AnsiRegex().Replace(input, string.Empty);

    private static bool ValidatePath(string path, out string error)
    {
        if (string.IsNullOrWhiteSpace(path)) { error = "path is required."; return false; }
        if (!File.Exists(path) && !Directory.Exists(path)) { error = $"path does not exist: {path}"; return false; }
        error = string.Empty;
        return true;
    }

    private static DotnetBuildResult MakeFailResult(string message, string command) => new()
    {
        Success = false, Command = command, Errors = [message], Warnings = [], ExitCode = -1, Summary = message,
    };

    private static string Quote(string value)
    {
        if (!value.Contains(' ') && !value.Contains('"')) return value;
        var escaped = value.Replace("\"", "\\\"");
        if (escaped.EndsWith('\\')) escaped += '\\';
        return $"\"{escaped}\"";
    }
}
