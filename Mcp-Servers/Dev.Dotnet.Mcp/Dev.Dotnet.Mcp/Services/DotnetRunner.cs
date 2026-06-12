using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Dotnet.Mcp.Models;

namespace Dev.Dotnet.Mcp.Services;

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

    [GeneratedRegex(@"(?:Passed|Failed)!\s*-\s*Failed:\s*\d+.*", RegexOptions.IgnoreCase)]
    private static partial Regex TestSummaryLineRegex();

    // Greedy capture stops at the last [ before a duration indicator (digits or <)
    [GeneratedRegex(@"^\s*Failed\s+(.+)\s+\[(?:<?\s*\d)", RegexOptions.IgnoreCase)]
    private static partial Regex FailedTestLineRegex();

    public async Task<DotnetBuildResult> BuildAsync(
        string path,
        string? configuration = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error))
            return MakeFailResult(error, "dotnet build");

        var fullPath = Path.GetFullPath(path);
        var args = $"build {Quote(fullPath)}";
        if (!string.IsNullOrWhiteSpace(configuration))
            args += $" --configuration {configuration.Trim()}";

        var workingDir = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
        return await RunDotnetAsync("dotnet build", args, workingDir, ParseBuildOutput, BuildTimeoutSeconds, cancellationToken);
    }

    public async Task<DotnetBuildResult> TestAsync(
        string path,
        string? options = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error))
            return MakeFailResult(error, "dotnet test");

        var fullPath = Path.GetFullPath(path);
        var args = $"test {Quote(fullPath)}";
        if (!string.IsNullOrWhiteSpace(options))
            args += $" {options.Trim()}";

        var workingDir = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
        return await RunDotnetAsync("dotnet test", args, workingDir, ParseTestOutput, TestTimeoutSeconds, cancellationToken);
    }

    public static DotnetBuildResult ParseBuildOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        var errors = lines
            .Where(l => BuildErrorLineRegex().IsMatch(l))
            .Select(l => l.Trim())
            .Where(l => l.Length > 0)
            .Distinct()
            .Take(MaxErrors)
            .ToArray();

        var warnings = lines
            .Where(l => BuildWarningLineRegex().IsMatch(l))
            .Select(l => l.Trim())
            .Where(l => l.Length > 0)
            .Distinct()
            .Take(MaxWarnings)
            .ToArray();

        var summaryLine = lines
            .Select(l => BuildSummaryLineRegex().Match(l))
            .FirstOrDefault(m => m.Success);

        var summary = summaryLine is { Success: true }
            ? summaryLine.Value.Trim()
            : exitCode == 0
                ? $"Build succeeded. {warnings.Length} warning(s)."
                : $"Build failed: {errors.Length} error(s), {warnings.Length} warning(s).";

        return new DotnetBuildResult
        {
            Success = exitCode == 0,
            Command = "dotnet build",
            Errors = errors,
            Warnings = warnings,
            ExitCode = exitCode,
            Summary = summary,
        };
    }

    public static DotnetBuildResult ParseTestOutput(string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var lines = combined.Split('\n');

        var failedTests = lines
            .Select(l => FailedTestLineRegex().Match(l))
            .Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim())
            .Where(t => t.Length > 0)
            .Distinct()
            .Take(MaxErrors)
            .ToArray();

        var summaryLine = lines
            .Select(l => TestSummaryLineRegex().Match(l))
            .FirstOrDefault(m => m.Success);

        var summary = summaryLine is { Success: true }
            ? summaryLine.Value.Trim()
            : exitCode == 0
                ? "All tests passed."
                : $"Tests failed: {failedTests.Length} failing test(s).";

        return new DotnetBuildResult
        {
            Success = exitCode == 0,
            Command = "dotnet test",
            Errors = failedTests,
            Warnings = [],
            ExitCode = exitCode,
            Summary = summary,
        };
    }

    private async Task<DotnetBuildResult> RunDotnetAsync(
        string commandLabel,
        string arguments,
        string workingDirectory,
        Func<string, string, int, DotnetBuildResult> parser,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };

        try
        {
            if (!process.Start())
                return MakeFailResult("Failed to start dotnet process.", commandLabel);
        }
        catch (Exception ex)
        {
            return MakeFailResult($"Failed to start dotnet: {ex.Message}", commandLabel);
        }

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
            try { process.Kill(entireProcessTree: true); } catch { /* already exited */ }
            using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { /* drain & suppress */ }
            var reason = timeoutCts.IsCancellationRequested
                ? $"Process timed out after {timeoutSeconds}s."
                : "Process was cancelled.";
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
        if (string.IsNullOrWhiteSpace(path))
        {
            error = "path is required.";
            return false;
        }
        if (!File.Exists(path) && !Directory.Exists(path))
        {
            error = $"path does not exist: {path}";
            return false;
        }
        error = string.Empty;
        return true;
    }

    private static DotnetBuildResult MakeFailResult(string message, string command) => new()
    {
        Success = false,
        Command = command,
        Errors = [message],
        Warnings = [],
        ExitCode = -1,
        Summary = message,
    };

    private static string Quote(string value)
    {
        if (!value.Contains(' ') && !value.Contains('"'))
            return value;
        var escaped = value.Replace("\"", "\\\"");
        // Trailing backslash would escape the closing quote — double it
        if (escaped.EndsWith('\\'))
            escaped += '\\';
        return $"\"{escaped}\"";
    }
}
