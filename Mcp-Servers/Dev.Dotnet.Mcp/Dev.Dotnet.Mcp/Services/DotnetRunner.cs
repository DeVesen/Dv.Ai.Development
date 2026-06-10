using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Dotnet.Mcp.Models;

namespace Dev.Dotnet.Mcp.Services;

public sealed partial class DotnetRunner
{
    private const int MaxErrors = 50;
    private const int MaxWarnings = 20;

    [GeneratedRegex(@"\): error\s+[A-Z]+\d+:", RegexOptions.IgnoreCase)]
    private static partial Regex BuildErrorLineRegex();

    [GeneratedRegex(@"\): warning\s+[A-Z]+\d+:", RegexOptions.IgnoreCase)]
    private static partial Regex BuildWarningLineRegex();

    [GeneratedRegex(@"Build\s+(succeeded|FAILED)\.", RegexOptions.IgnoreCase)]
    private static partial Regex BuildSummaryLineRegex();

    [GeneratedRegex(@"(?:Passed|Failed)!\s*-\s*Failed:\s*\d+.*", RegexOptions.IgnoreCase)]
    private static partial Regex TestSummaryLineRegex();

    [GeneratedRegex(@"^\s*Failed\s+(\S+(?:\s+\S+)*?)\s+\[", RegexOptions.IgnoreCase)]
    private static partial Regex FailedTestLineRegex();

    public async Task<DotnetBuildResult> BuildAsync(
        string path,
        string? configuration = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error))
            return MakeFailResult(error, "dotnet build");

        var args = $"build {Quote(Path.GetFullPath(path))}";
        if (!string.IsNullOrWhiteSpace(configuration))
            args += $" --configuration {configuration.Trim()}";

        return await RunDotnetAsync("dotnet build", args, ParseBuildOutput, cancellationToken);
    }

    public async Task<DotnetBuildResult> TestAsync(
        string path,
        string? options = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidatePath(path, out var error))
            return MakeFailResult(error, "dotnet test");

        var args = $"test {Quote(Path.GetFullPath(path))}";
        if (!string.IsNullOrWhiteSpace(options))
            args += $" {options.Trim()}";

        return await RunDotnetAsync("dotnet test", args, ParseTestOutput, cancellationToken);
    }

    public static DotnetBuildResult ParseBuildOutput(string stdout, string stderr, int exitCode)
    {
        var combined = stdout + "\n" + stderr;
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
        var combined = stdout + "\n" + stderr;
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
        Func<string, string, int, DotnetBuildResult> parser,
        CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = arguments,
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

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        return parser(await stdoutTask, await stderrTask, process.ExitCode);
    }

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

    private static string Quote(string value) =>
        value.Contains(' ') || value.Contains('"') ? $"\"{value.Replace("\"", "\\\"")}\"" : value;
}
