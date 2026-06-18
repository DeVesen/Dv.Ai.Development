using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Dev.WindowsService.Mcp.Models;

namespace Dev.WindowsService.Mcp.Services;

public sealed partial class AngularScaffolder
{
    private static readonly string NgExecutable = OperatingSystem.IsWindows() ? "ng.cmd" : "ng";

    [GeneratedRegex(@"^\s*CREATE\s+(.+?)\s+\(\d+\s+bytes\)\s*$", RegexOptions.IgnoreCase)]
    private static partial Regex CreateLineRegex();

    public async Task<AngularScaffoldResult> CreateProjectAsync(string parentDirectory, string name, string? options = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(parentDirectory))
            return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "parent_directory is required." };
        if (!Directory.Exists(parentDirectory))
            return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"parent_directory does not exist: {parentDirectory}" };

        var args = new List<string> { "new", name };
        if (!string.IsNullOrWhiteSpace(options)) args.AddRange(SplitOptions(options));
        else args.AddRange(["--standalone", "--skip-tests", "--routing", "--style=scss"]);

        return await RunNgAsync(parentDirectory, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldComponentAsync(string projectRoot, string name, string? path = null, string? options = null, CancellationToken cancellationToken = default)
    {
        var args = BuildArgumentList("component", name, path, options, "--standalone", "--skip-tests");
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldServiceAsync(string projectRoot, string name, string? path = null, string? options = null, CancellationToken cancellationToken = default)
    {
        var args = BuildArgumentList("service", name, path, options, "--skip-tests");
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    public async Task<AngularScaffoldResult> ScaffoldDirectiveAsync(string projectRoot, string name, string? path = null, string? options = null, CancellationToken cancellationToken = default)
    {
        var args = BuildArgumentList("directive", name, path, options, "--standalone", "--skip-tests");
        return await RunNgAsync(projectRoot, args, cancellationToken);
    }

    private static IReadOnlyList<string> BuildArgumentList(string schematic, string name, string? path, string? options, params string[] defaultFlags)
    {
        var args = new List<string> { "generate", schematic, name };
        if (!string.IsNullOrWhiteSpace(path)) args.Add($"--path={path.Trim()}");
        if (!string.IsNullOrWhiteSpace(options)) args.AddRange(SplitOptions(options));
        else args.AddRange(defaultFlags);
        return args;
    }

    private async Task<AngularScaffoldResult> RunNgAsync(string projectRoot, IReadOnlyList<string> args, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(projectRoot)) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "project_root is required." };
        if (!Directory.Exists(projectRoot)) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"project_root does not exist: {projectRoot}" };

        var psi = new ProcessStartInfo
        {
            FileName = NgExecutable, Arguments = string.Join(' ', args.Select(QuoteIfNeeded)),
            WorkingDirectory = Path.GetFullPath(projectRoot),
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        try { if (!process.Start()) return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = "Failed to start ng process." }; }
        catch (Exception ex) { return new AngularScaffoldResult { Success = false, ExitCode = -1, Error = $"Failed to start ng: {ex.Message}" }; }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        var exitCode = process.ExitCode;
        var createdFiles = ParseCreateLines(stdout);

        return new AngularScaffoldResult
        {
            Success = exitCode == 0, CreatedFiles = createdFiles, ExitCode = exitCode,
            Error = exitCode == 0 ? null : BuildErrorMessage(exitCode, stderr, stdout),
            Stdout = stdout, Stderr = string.IsNullOrWhiteSpace(stderr) ? null : stderr,
        };
    }

    private static IReadOnlyList<string> ParseCreateLines(string stdout)
    {
        if (string.IsNullOrWhiteSpace(stdout)) return [];
        var files = new List<string>();
        foreach (var line in stdout.Split('\n'))
        {
            var match = CreateLineRegex().Match(line.TrimEnd('\r'));
            if (match.Success) files.Add(match.Groups[1].Value);
        }
        return files;
    }

    private static string? BuildErrorMessage(int exitCode, string stderr, string stdout)
    {
        if (!string.IsNullOrWhiteSpace(stderr)) return stderr.Trim();
        if (!string.IsNullOrWhiteSpace(stdout)) return stdout.Trim();
        return $"ng exited with code {exitCode}.";
    }

    private static string QuoteIfNeeded(string arg) =>
        arg.Contains(' ') || arg.Contains('"') ? $"\"{arg.Replace("\"", "\\\"")}\"" : arg;

    private static IEnumerable<string> SplitOptions(string options)
    {
        var tokens = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        foreach (var ch in options.Trim())
        {
            if (ch == '"') { inQuotes = !inQuotes; continue; }
            if (char.IsWhiteSpace(ch) && !inQuotes) { if (current.Length > 0) { tokens.Add(current.ToString()); current.Clear(); } continue; }
            current.Append(ch);
        }
        if (current.Length > 0) tokens.Add(current.ToString());
        return tokens;
    }
}
