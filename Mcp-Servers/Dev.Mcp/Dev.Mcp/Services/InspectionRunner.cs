using System.Diagnostics;
using System.Text.Json;
using Dev.Mcp.Models;

namespace Dev.Mcp.Services;

public sealed class InspectionRunner
{
    private const int InspectCodeTimeoutSeconds = 900;

    public async Task<InspectionResult> RunInspectCodeAsync(string solutionPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(solutionPath))
            return MakeFailResult("solution_path is required.");
        if (!File.Exists(solutionPath))
            return MakeFailResult($"solution_path does not exist: {solutionPath}");

        if (!await IsJbAvailableAsync(cancellationToken))
            return MakeFailResult("jb CLI nicht gefunden — installieren mit: dotnet tool install -g JetBrains.ReSharper.GlobalTools");

        var tempFile = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.sarif");
        try
        {
            var fullPath = Path.GetFullPath(solutionPath);
            var args = $"inspectcode {Quote(fullPath)} --output={Quote(tempFile)} --format=Sarif --no-build";
            var workingDir = Path.GetDirectoryName(fullPath)!;

            var psi = new ProcessStartInfo
            {
                FileName = "jb",
                Arguments = args,
                WorkingDirectory = workingDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = new Process { StartInfo = psi };
            try { if (!process.Start()) return MakeFailResult("Failed to start jb process."); }
            catch (Exception ex) { return MakeFailResult($"Failed to start jb: {ex.Message}"); }

            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(InspectCodeTimeoutSeconds));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

            var stdoutTask = process.StandardOutput.ReadToEndAsync(linkedCts.Token);
            var stderrTask = process.StandardError.ReadToEndAsync(linkedCts.Token);

            string stdout;
            try
            {
                await Task.WhenAll(stdoutTask, stderrTask, process.WaitForExitAsync(linkedCts.Token));
                stdout = await stdoutTask;
                await stderrTask;
            }
            catch (OperationCanceledException)
            {
                try { process.Kill(entireProcessTree: true); } catch { /* ignore */ }
                using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { /* ignore */ }
                var reason = timeoutCts.IsCancellationRequested
                    ? $"jb inspectcode timed out after {InspectCodeTimeoutSeconds}s."
                    : "Process was cancelled.";
                return MakeFailResult(reason);
            }
            catch (Exception ex)
            {
                using var drainCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                try { await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(drainCts.Token); } catch { /* ignore */ }
                return MakeFailResult($"Process communication error: {ex.Message}");
            }

            if (!File.Exists(tempFile))
                return MakeFailResult("jb inspectcode did not produce an output file — ensure the solution has been built first (--no-build requires up-to-date build artifacts).");

            var sarifContent = await File.ReadAllTextAsync(tempFile, cancellationToken);
            var result = ParseSarifOutput(sarifContent);
            result.ConsoleOutput = $"> jb {args}\n\n{stdout.Trim()}";
            return result;
        }
        finally
        {
            try { if (File.Exists(tempFile)) File.Delete(tempFile); } catch { /* ignore */ }
        }
    }

    private static async Task<bool> IsJbAvailableAsync(CancellationToken cancellationToken)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "jb",
                Arguments = "--version",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var process = new Process { StartInfo = psi };
            if (!process.Start()) return false;
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
            await process.WaitForExitAsync(cts.Token);
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    internal static InspectionResult ParseSarifOutput(string sarifContent)
    {
        try
        {
            using var doc = JsonDocument.Parse(sarifContent);
            var root = doc.RootElement;

            if (!root.TryGetProperty("runs", out var runsEl) || runsEl.GetArrayLength() == 0)
                return new InspectionResult { Success = true, Command = "jb inspectcode", Summary = new InspectionSummary() };

            var run = runsEl[0];

            // Build rule-id → default severity map
            var ruleSeverity = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (run.TryGetProperty("tool", out var tool) &&
                tool.TryGetProperty("driver", out var driver) &&
                driver.TryGetProperty("rules", out var rulesEl))
            {
                foreach (var rule in rulesEl.EnumerateArray())
                {
                    if (!rule.TryGetProperty("id", out var idEl)) continue;
                    var id = idEl.GetString() ?? string.Empty;
                    var level = "note";
                    if (rule.TryGetProperty("defaultConfiguration", out var defCfg) &&
                        defCfg.TryGetProperty("level", out var lvlEl) &&
                        lvlEl.ValueKind == JsonValueKind.String)
                        level = lvlEl.GetString() ?? "note";
                    ruleSeverity[id] = level;
                }
            }

            var errors = new List<InspectionIssue>();
            var warnings = new List<InspectionIssue>();
            var suggestions = new List<InspectionIssue>();

            if (run.TryGetProperty("results", out var resultsEl))
            {
                foreach (var result in resultsEl.EnumerateArray())
                {
                    var ruleId = result.TryGetProperty("ruleId", out var rEl) && rEl.ValueKind == JsonValueKind.String
                        ? rEl.GetString() ?? string.Empty : string.Empty;
                    var msg = result.TryGetProperty("message", out var mEl) &&
                              mEl.TryGetProperty("text", out var tEl) && tEl.ValueKind == JsonValueKind.String
                        ? tEl.GetString() ?? string.Empty : string.Empty;

                    // Level: from result field, else from rule default, else "note"
                    string level;
                    if (result.TryGetProperty("level", out var lEl) && lEl.ValueKind == JsonValueKind.String)
                        level = lEl.GetString() ?? "note";
                    else if (!string.IsNullOrEmpty(ruleId) && ruleSeverity.TryGetValue(ruleId, out var ruleLevel))
                        level = ruleLevel;
                    else
                        level = "note";

                    // File + line from first location
                    var file = string.Empty;
                    var line = 0;
                    if (result.TryGetProperty("locations", out var locsEl) && locsEl.GetArrayLength() > 0)
                    {
                        var loc = locsEl[0];
                        if (loc.TryGetProperty("physicalLocation", out var physLoc))
                        {
                            if (physLoc.TryGetProperty("artifactLocation", out var artLoc) &&
                                artLoc.TryGetProperty("uri", out var uriEl) &&
                                uriEl.ValueKind == JsonValueKind.String)
                            {
                                var uriStr = uriEl.GetString() ?? string.Empty;
                                try { file = new Uri(uriStr).LocalPath; }
                                catch (UriFormatException) { file = uriStr; }
                            }
                            if (physLoc.TryGetProperty("region", out var region) &&
                                region.TryGetProperty("startLine", out var lineEl))
                                line = lineEl.ValueKind == JsonValueKind.Number ? lineEl.GetInt32() : 0;
                        }
                    }

                    var issue = new InspectionIssue { File = file, Line = line, Rule = ruleId, Msg = msg };
                    switch (level)
                    {
                        case "error":   errors.Add(issue);      break;
                        case "warning": warnings.Add(issue);    break;
                        default:        suggestions.Add(issue); break;
                    }
                }
            }

            return new InspectionResult
            {
                Success = true,
                Command = "jb inspectcode",
                Summary = new InspectionSummary
                {
                    Errors = errors.Count,
                    Warnings = warnings.Count,
                    Suggestions = suggestions.Count,
                },
                Errors = [.. errors],
                Warnings = [.. warnings],
                Suggestions = [.. suggestions],
            };
        }
        catch (JsonException ex)
        {
            return MakeFailResult($"SARIF-Ausgabe konnte nicht geparst werden: {ex.Message}");
        }
    }

    private static InspectionResult MakeFailResult(string message) => new()
    {
        Success = false,
        Command = "jb inspectcode",
        Error = message,
    };

    private static string Quote(string value)
    {
        if (!value.Contains(' ') && !value.Contains('"')) return value;
        var escaped = value.Replace("\"", "\\\"");
        if (escaped.EndsWith('\\')) escaped += '\\';
        return $"\"{escaped}\"";
    }
}
