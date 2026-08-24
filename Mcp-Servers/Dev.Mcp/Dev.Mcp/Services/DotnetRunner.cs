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

    [GeneratedRegex(@"^Done\.\s*$", RegexOptions.Multiline)]
    private static partial Regex EfDoneRegex();

    [GeneratedRegex(@"^(No migrations were found\.|No migrations were applied\. The database is already up to date\.)\s*$", RegexOptions.IgnoreCase | RegexOptions.Multiline)]
    private static partial Regex EfNothingToDoRegex();

    [GeneratedRegex(@"^Applying migration '(.+)'\.\s*$", RegexOptions.Multiline)]
    private static partial Regex EfApplyingMigrationRegex();

    [GeneratedRegex(@"has pending changes", RegexOptions.IgnoreCase)]
    private static partial Regex EfPendingModelChangesRegex();

    [GeneratedRegex(@"^Unhandled exception\.\s*(.+?):\s*(.+)$", RegexOptions.Multiline)]
    private static partial Regex EfUnhandledExceptionRegex();

    [GeneratedRegex(@"^(info|warn|dbug|fail): ", RegexOptions.IgnoreCase | RegexOptions.Multiline)]
    private static partial Regex EfLogLinePrefixRegex();

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

    private static readonly HashSet<string> AllowedEfActions =
        new(StringComparer.OrdinalIgnoreCase) { "add", "list", "remove", "database-update", "has-pending-model-changes" };

    public async Task<DotnetBuildResult> RunEfMigrationAsync(
        string action, string backendPath, string databaseProject, string startupProject,
        string? name = null, string? targetMigration = null, string? connection = null,
        CancellationToken cancellationToken = default)
    {
        if (!AllowedEfActions.Contains(action))
            return MakeFailResult($"Unknown action '{action}'. Allowed: {string.Join(", ", AllowedEfActions)}", "dotnet ef");

        if (action.Equals("add", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(name))
            return MakeFailResult("name is required for action=add.", "dotnet ef migrations add");

        if (!ValidatePath(backendPath, out var error)) return MakeFailResult(error, "dotnet ef");

        var subcommand = action.ToLowerInvariant() switch
        {
            "add" => $"migrations add {Quote(name!.Trim())}",
            "list" => "migrations list",
            "remove" => "migrations remove",
            "database-update" => "database update" + (string.IsNullOrWhiteSpace(targetMigration) ? "" : $" {Quote(targetMigration.Trim())}"),
            "has-pending-model-changes" => "migrations has-pending-model-changes",
            _ => throw new UnreachableException(),
        };

        var args = $"ef {subcommand} --project {Quote(databaseProject)} --startup-project {Quote(startupProject)} --no-color";
        if (!string.IsNullOrWhiteSpace(connection)) args += $" --connection {Quote(connection)}";

        var result = await RunDotnetAsync(
            $"dotnet ef {action}", args, backendPath,
            (stdout, stderr, exitCode) => ParseEfOutput(action, stdout, stderr, exitCode),
            BuildTimeoutSeconds, cancellationToken);

        // Redact the secret everywhere it could have leaked back (echoed args, provider exceptions, etc.)
        if (!string.IsNullOrWhiteSpace(connection))
            result.ConsoleOutput = result.ConsoleOutput.Replace(connection, "***");

        return result;
    }

    public static DotnetBuildResult ParseEfOutput(string action, string stdout, string stderr, int exitCode)
    {
        var combined = StripAnsi(stdout + "\n" + stderr);
        var command = "dotnet ef " + action;

        // dotnet-ef fails at compile time before ever reaching the CLI logic (bad entity change, etc.):
        // same MSBuild error shape as `dotnet build`, so surface it the same way instead of falling through.
        var buildErrors = combined.Split('\n').Where(l => BuildErrorLineRegex().IsMatch(l))
            .Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(MaxErrors).ToArray();
        if (buildErrors.Length > 0)
            return new DotnetBuildResult
            {
                Success = false, Command = command, Errors = buildErrors, Warnings = [], ExitCode = exitCode,
                Summary = $"Build failed before {command} could run: {buildErrors.Length} error(s).",
            };

        var unhandled = EfUnhandledExceptionRegex().Match(combined);
        if (unhandled.Success)
        {
            var message = $"{unhandled.Groups[1].Value.Trim()}: {unhandled.Groups[2].Value.Trim()}";
            return new DotnetBuildResult
            {
                Success = false, Command = command, Errors = [message], Warnings = [], ExitCode = exitCode,
                Summary = $"{command} failed: {message}",
            };
        }

        if (exitCode != 0)
        {
            // Last-resort fallback: dotnet-ef writes plain error text (design-time factory failures,
            // Postgres provider errors) with no fixed marker — keep the last non-log, non-empty lines.
            var fallback = combined.Split('\n')
                .Select(l => l.Trim())
                .Where(l => l.Length > 0 && !EfLogLinePrefixRegex().IsMatch(l))
                .TakeLast(10).ToArray();
            return new DotnetBuildResult
            {
                Success = false, Command = command, Errors = fallback, Warnings = [], ExitCode = exitCode,
                Summary = $"{command} failed (exitCode {exitCode}) — see Console output for details.",
            };
        }

        return action.ToLowerInvariant() switch
        {
            "add" => SummarizeAdd(combined, command, exitCode),
            "remove" => SummarizeSimpleDone(combined, command, exitCode, "Migration removed."),
            "database-update" => SummarizeDatabaseUpdate(combined, command, exitCode),
            "has-pending-model-changes" => SummarizePendingModelChanges(combined, command, exitCode),
            "list" => SummarizeList(combined, command, exitCode),
            _ => throw new UnreachableException(),
        };
    }

    private static DotnetBuildResult SummarizeAdd(string combined, string command, int exitCode)
    {
        var done = EfDoneRegex().IsMatch(combined);
        var summary = done ? "Migration created." : "dotnet ef migrations add finished without the expected 'Done.' marker — verify the Migrations folder manually.";
        return new DotnetBuildResult { Success = done, Command = command, Errors = done ? [] : ["Missing 'Done.' marker in output."], Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    private static DotnetBuildResult SummarizeSimpleDone(string combined, string command, int exitCode, string doneSummary)
    {
        var done = EfDoneRegex().IsMatch(combined);
        return new DotnetBuildResult { Success = done, Command = command, Errors = done ? [] : ["Missing 'Done.' marker in output."], Warnings = [], ExitCode = exitCode, Summary = done ? doneSummary : "Operation finished without the expected 'Done.' marker." };
    }

    private static DotnetBuildResult SummarizeDatabaseUpdate(string combined, string command, int exitCode)
    {
        if (EfNothingToDoRegex().IsMatch(combined))
            return new DotnetBuildResult { Success = true, Command = command, Errors = [], Warnings = [], ExitCode = exitCode, Summary = "No migrations were applied — database already up to date." };

        var applied = EfApplyingMigrationRegex().Matches(combined).Select(m => m.Groups[1].Value).ToArray();
        var summary = applied.Length > 0
            ? $"Applied {applied.Length} migration(s): {string.Join(", ", applied)}"
            : "database update finished with no 'Applying migration' lines — verify __EFMigrationsHistory manually.";
        return new DotnetBuildResult { Success = true, Command = command, Errors = [], Warnings = [], ExitCode = exitCode, Summary = summary };
    }

    private static DotnetBuildResult SummarizePendingModelChanges(string combined, string command, int exitCode)
    {
        var hasPending = EfPendingModelChangesRegex().IsMatch(combined);
        return new DotnetBuildResult
        {
            Success = !hasPending, Command = command, ExitCode = exitCode, Warnings = [],
            Errors = hasPending ? ["Model has pending changes not captured by any migration."] : [],
            Summary = hasPending ? "Pending model changes detected — run action=add first." : "No pending model changes.",
        };
    }

    private static DotnetBuildResult SummarizeList(string combined, string command, int exitCode)
    {
        var names = combined.Split('\n').Select(l => l.Trim())
            .Where(l => l.Length > 0 && !EfLogLinePrefixRegex().IsMatch(l) && !EfNothingToDoRegex().IsMatch(l)
                        && !BuildSummaryLineRegex().IsMatch(l) && !l.StartsWith("Build started", StringComparison.OrdinalIgnoreCase))
            .ToArray();
        return new DotnetBuildResult
        {
            Success = true, Command = command, Warnings = [], ExitCode = exitCode, Errors = names,
            Summary = names.Length == 0 ? "No migrations found." : $"{names.Length} migration(s) in the chain.",
        };
    }

    private static async Task<DotnetBuildResult> RunDotnetAsync(
        string commandLabel, string arguments, string workingDirectory,
        Func<string, string, int, DotnetBuildResult> parser, int timeoutSeconds, CancellationToken cancellationToken)
    {
        // Route through the shared ProcessRunner: it decouples the real exit code
        // from stdout/stderr drain and reaps the whole descendant subtree, so a test
        // that spawns a lingering child (npm -> detached node) can no longer hold the
        // pipe open and hang the run to its ceiling.
        ProcessRunResult run;
        try
        {
            run = await ProcessRunner.RunAsync("dotnet", arguments, workingDirectory, timeoutSeconds, cancellationToken);
        }
        catch (Exception ex)
        {
            return MakeFailResult($"Failed to start dotnet: {ex.Message}", commandLabel);
        }

        if (run.TimedOut)
            return MakeFailResult($"Process timed out after {timeoutSeconds}s.", commandLabel);

        var result = parser(run.Stdout, run.Stderr, run.ExitCode);
        result.ConsoleOutput = $"> dotnet {arguments}\n\n{StripAnsi(run.Stdout + "\n" + run.Stderr).Trim()}";
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
