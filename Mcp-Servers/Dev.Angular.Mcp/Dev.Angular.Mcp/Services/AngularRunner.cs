using System.Diagnostics;
using System.Text.RegularExpressions;
using Dev.Angular.Mcp.Models;

namespace Dev.Angular.Mcp.Services;

public sealed partial class AngularRunner
{
    private const int MaxErrors = 50;
    private const int MaxWarnings = 20;

    private static readonly string NgExecutable = OperatingSystem.IsWindows() ? "ng.cmd" : "ng";

    [GeneratedRegex(@"\x1B\[[0-9;]*[mGKHFJK]")]
    private static partial Regex AnsiRegex();

    [GeneratedRegex(@"(?:ERROR in |error\s+TS\d+:|✘\s*\[ERROR\])", RegexOptions.IgnoreCase)]
    private static partial Regex BuildErrorLineRegex();

    [GeneratedRegex(@"(?:WARNING in |warning\s+TS\d+:|⚠\s*\[WARNING\])", RegexOptions.IgnoreCase)]
    private static partial Regex BuildWarningLineRegex();

    [GeneratedRegex(@"Executed\s+\d+\s+of\s+\d+.*", RegexOptions.IgnoreCase)]
    private static partial Regex KarmaExecutedRegex();

    [GeneratedRegex(@"^\s*(?:FAILED|✗|✕)\s+(.+)", RegexOptions.IgnoreCase)]
    private static partial Regex KarmaFailedTestRegex();

    public async Task<BuildResult> BuildAsync(
        string projectRoot,
        string? configuration = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidateRoot(projectRoot, out var error))
            return MakeFailResult(error, "ng build");

        var args = new List<string> { "build" };
        if (!string.IsNullOrWhiteSpace(configuration))
            args.Add($"--configuration={configuration.Trim()}");

        return await RunAsync("ng build", projectRoot, args, ParseBuildOutput, cancellationToken);
    }

    public async Task<BuildResult> TestAsync(
        string projectRoot,
        string? options = null,
        CancellationToken cancellationToken = default)
    {
        if (!ValidateRoot(projectRoot, out var error))
            return MakeFailResult(error, "ng test");

        var args = new List<string> { "test", "--watch=false" };
        if (!string.IsNullOrWhiteSpace(options))
            args.AddRange(options.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));

        return await RunAsync("ng test", projectRoot, args, ParseTestOutput, cancellationToken);
    }

    public static BuildResult ParseBuildOutput(string stdout, string stderr, int exitCode)
    {
        var lines = StripAnsi(stdout + "\n" + stderr).Split('\n');

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

        var summary = exitCode == 0
            ? $"Build successful. {warnings.Length} warning(s)."
            : $"Build failed: {errors.Length} error(s), {warnings.Length} warning(s).";

        return new BuildResult
        {
            Success = exitCode == 0,
            Command = "ng build",
            Errors = errors,
            Warnings = warnings,
            ExitCode = exitCode,
            Summary = summary,
        };
    }

    public static BuildResult ParseTestOutput(string stdout, string stderr, int exitCode)
    {
        var lines = StripAnsi(stdout + "\n" + stderr).Split('\n');

        var failedTests = lines
            .Select(l => KarmaFailedTestRegex().Match(l))
            .Where(m => m.Success)
            .Select(m => m.Groups[1].Value.Trim())
            .Where(t => t.Length > 0)
            .Distinct()
            .Take(MaxErrors)
            .ToArray();

        var executedLine = lines
            .Select(l => KarmaExecutedRegex().Match(StripAnsi(l)))
            .FirstOrDefault(m => m.Success);

        var summary = executedLine is { Success: true }
            ? executedLine.Value.Trim()
            : exitCode == 0
                ? "All tests passed."
                : $"Tests failed: {failedTests.Length} failing test(s).";

        return new BuildResult
        {
            Success = exitCode == 0,
            Command = "ng test",
            Errors = failedTests,
            Warnings = [],
            ExitCode = exitCode,
            Summary = summary,
        };
    }

    private async Task<BuildResult> RunAsync(
        string commandLabel,
        string projectRoot,
        List<string> args,
        Func<string, string, int, BuildResult> parser,
        CancellationToken cancellationToken)
    {
        var psi = new ProcessStartInfo
        {
            FileName = NgExecutable,
            Arguments = string.Join(' ', args),
            WorkingDirectory = Path.GetFullPath(projectRoot),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };

        try
        {
            if (!process.Start())
                return MakeFailResult("Failed to start ng process.", commandLabel);
        }
        catch (Exception ex)
        {
            return MakeFailResult($"Failed to start ng: {ex.Message}", commandLabel);
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        return parser(await stdoutTask, await stderrTask, process.ExitCode);
    }

    private static bool ValidateRoot(string projectRoot, out string error)
    {
        if (string.IsNullOrWhiteSpace(projectRoot))
        {
            error = "project_root is required.";
            return false;
        }
        if (!Directory.Exists(projectRoot))
        {
            error = $"project_root does not exist: {projectRoot}";
            return false;
        }
        error = string.Empty;
        return true;
    }

    private static BuildResult MakeFailResult(string message, string command) => new()
    {
        Success = false,
        Command = command,
        Errors = [message],
        Warnings = [],
        ExitCode = -1,
        Summary = message,
    };

    private static string StripAnsi(string input) => AnsiRegex().Replace(input, string.Empty);
}
