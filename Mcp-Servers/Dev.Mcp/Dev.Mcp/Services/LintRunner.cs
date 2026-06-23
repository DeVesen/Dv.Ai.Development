using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class LintRunner
{
    private const int LintTimeoutSeconds = 300;
    private static readonly string NgExecutable = OperatingSystem.IsWindows() ? "ng.cmd" : "ng";

    public async Task<LintResult> LintAsync(string projectPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectPath))
            return MakeFailResult("project_path is required.");
        if (!Directory.Exists(projectPath))
            return MakeFailResult($"project_path does not exist: {projectPath}");

        var angularJsonPath = Path.Combine(projectPath, "angular.json");
        if (!File.Exists(angularJsonPath))
            return MakeFailResult("angular.json nicht gefunden — kein Angular-Projekt-Root.");

        if (!HasLintTarget(angularJsonPath))
            return MakeFailResult("ESLint nicht konfiguriert — ng add @angular-eslint ausführen (Gate-2-Bootstrap).");

        var fullProjectPath = Path.GetFullPath(projectPath);

        var psi = new ProcessStartInfo
        {
            FileName = NgExecutable,
            Arguments = "lint --format=json",
            WorkingDirectory = fullProjectPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        try { if (!process.Start()) return MakeFailResult("Failed to start ng process."); }
        catch (Exception ex) { return MakeFailResult($"Failed to start ng: {ex.Message}"); }

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(LintTimeoutSeconds));
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
            try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
            using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { /* ignore */ }
            var reason = timeoutCts.IsCancellationRequested
                ? $"ng lint timed out after {LintTimeoutSeconds}s."
                : "Process was cancelled.";
            return MakeFailResult(reason);
        }
        catch (Exception ex)
        {
            using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { /* ignore */ }
            return MakeFailResult($"Process communication error: {ex.Message}");
        }

        var result = ParseLintOutput(stdout, process.ExitCode, stderr);
        result.ConsoleOutput = $"> {NgExecutable} lint --format=json\n\n{stderr.Trim()}";
        return result;
    }

    private static bool HasLintTarget(string angularJsonPath)
    {
        try
        {
            var json = File.ReadAllText(angularJsonPath);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("projects", out var projects)) return false;
            foreach (var project in projects.EnumerateObject())
            {
                if (project.Value.TryGetProperty("architect", out var arch) &&
                    arch.TryGetProperty("lint", out _))
                    return true;
            }
        }
        catch { /* fall through */ }
        return false;
    }

    internal static LintResult ParseLintOutput(string stdout, int exitCode, string stderr)
    {
        var trimmed = stdout.Trim();

        // Empty stdout = no findings
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            var emptyError = exitCode != 0 && !string.IsNullOrWhiteSpace(stderr) ? stderr.Trim() : null;
            return new LintResult { Success = emptyError == null, Command = "ng lint", Error = emptyError, Summary = new LintSummary() };
        }

        // Find start of JSON array (ng lint may prepend log output before the JSON)
        var startIdx = trimmed.IndexOf('[');
        if (startIdx < 0)
        {
            var noJsonError = exitCode != 0 && !string.IsNullOrWhiteSpace(stderr) ? stderr.Trim() : null;
            return new LintResult { Success = noJsonError == null, Command = "ng lint", Error = noJsonError, Summary = new LintSummary() };
        }

        var jsonPart = trimmed[startIdx..];

        var errors = new List<LintIssue>();
        var warnings = new List<LintIssue>();

        try
        {
            using var doc = JsonDocument.Parse(jsonPart);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                return new LintResult { Success = true, Command = "ng lint", Summary = new LintSummary() };

            foreach (var fileResult in root.EnumerateArray())
            {
                var filePath = fileResult.TryGetProperty("filePath", out var fpEl) && fpEl.ValueKind == JsonValueKind.String
                    ? fpEl.GetString() ?? string.Empty : string.Empty;

                if (!fileResult.TryGetProperty("messages", out var messages)) continue;

                foreach (var msg in messages.EnumerateArray())
                {
                    // severity: 2=error, 1=warning (ESLint convention)
                    var severity = msg.TryGetProperty("severity", out var sevEl) && sevEl.ValueKind == JsonValueKind.Number
                        ? sevEl.GetInt32() : 1;
                    var ruleId = msg.TryGetProperty("ruleId", out var rEl) && rEl.ValueKind == JsonValueKind.String
                        ? rEl.GetString() ?? string.Empty : string.Empty;
                    var message = msg.TryGetProperty("message", out var mEl) && mEl.ValueKind == JsonValueKind.String
                        ? mEl.GetString() ?? string.Empty : string.Empty;
                    var line = msg.TryGetProperty("line", out var lEl) ? lEl.GetInt32() : 0;

                    var issue = new LintIssue { File = filePath, Line = line, Rule = ruleId, Msg = message };
                    if (severity == 2) errors.Add(issue);
                    else warnings.Add(issue);
                }
            }
        }
        catch (JsonException ex)
        {
            var preview = jsonPart[..Math.Min(200, jsonPart.Length)];
            return MakeFailResult($"ESLint-Ausgabe kein gültiges JSON: {ex.Message}. Vorschau: {preview}");
        }

        return new LintResult
        {
            Success = true,
            Command = "ng lint",
            Summary = new LintSummary { Errors = errors.Count, Warnings = warnings.Count },
            Errors = [.. errors],
            Warnings = [.. warnings],
        };
    }

    private static LintResult MakeFailResult(string message) => new()
    {
        Success = false,
        Command = "ng lint",
        Error = message,
    };
}
