using System.Diagnostics;

namespace Dev.Mcp.Services;

public sealed record ProcessRunResult(int ExitCode, string Stdout, string Stderr, bool TimedOut);

/// <summary>
/// Central process spawner used by every tool that launches a child process.
/// Fixes two Windows defects at one layer:
///  1. Resolves the executable to a full path, so batch wrappers (npm.cmd/ng.cmd)
///     get a correct %~dp0 instead of misresolving to the working directory.
///  2. Captures the real exit code from process exit, independent of stdout/stderr
///     drain — a descendant that inherits and holds the redirected pipes can no
///     longer force a false timeout/failure.
/// </summary>
public static class ProcessRunner
{
    private const int StreamGraceSeconds = 2;

    public static async Task<ProcessRunResult> RunAsync(
        string executable, string arguments, string workingDirectory,
        int timeoutSeconds, CancellationToken cancellationToken = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = ResolveExecutable(executable, workingDirectory),
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        process.Start();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        try
        {
            await process.WaitForExitAsync(linkedCts.Token);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch { }
            var (o, e) = await DrainAsync(stdoutTask, stderrTask);
            return new ProcessRunResult(-1, o, e, TimedOut: true);
        }

        // Process has exited: its real exit code is available now, regardless of
        // whether a lingering child still holds the redirected pipes.
        var exitCode = process.ExitCode;

        var (stdout, stderr) = await DrainAsync(stdoutTask, stderrTask);
        if (!stdoutTask.IsCompleted || !stderrTask.IsCompleted)
        {
            // A descendant still holds a pipe; kill the tree so the readers unblock.
            try { process.Kill(entireProcessTree: true); } catch { }
        }

        return new ProcessRunResult(exitCode, stdout, stderr, TimedOut: false);
    }

    private static async Task<(string stdout, string stderr)> DrainAsync(Task<string> stdoutTask, Task<string> stderrTask)
    {
        try
        {
            await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(TimeSpan.FromSeconds(StreamGraceSeconds));
        }
        catch (TimeoutException)
        {
            // Child still holds the pipe; take whatever arrived. The reader tasks are
            // abandoned here — observe a later fault so it can't surface as an
            // unobserved task exception (e.g. IOException after the tree-kill).
            ObserveIfPending(stdoutTask);
            ObserveIfPending(stderrTask);
        }
        catch (OperationCanceledException) { /* reads cancelled */ }
        catch (Exception) { /* a read faulted (e.g. killed); take whatever arrived */ }

        var stdout = stdoutTask.IsCompletedSuccessfully ? stdoutTask.Result : string.Empty;
        var stderr = stderrTask.IsCompletedSuccessfully ? stderrTask.Result : string.Empty;
        return (stdout, stderr);
    }

    private static void ObserveIfPending(Task t)
    {
        if (!t.IsCompleted)
            _ = t.ContinueWith(static x => _ = x.Exception, TaskContinuationOptions.OnlyOnFaulted);
    }

    private static string ResolveExecutable(string executable, string workingDirectory)
    {
        // Already path-qualified: use as-is (full path if it exists).
        if (executable.Contains(Path.DirectorySeparatorChar) || executable.Contains(Path.AltDirectorySeparatorChar))
            return File.Exists(executable) ? Path.GetFullPath(executable) : executable;

        var candidates = CandidateNames(executable);

        // 1) Project-local CLI (npm/npx semantics): <workingDirectory>/node_modules/.bin
        var localBin = Path.Combine(workingDirectory, "node_modules", ".bin");
        foreach (var name in candidates)
        {
            var full = Path.Combine(localBin, name);
            if (File.Exists(full)) return full;
        }

        // 2) PATH
        var pathVar = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        var dirs = pathVar.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var dir in dirs)
            foreach (var name in candidates)
            {
                var full = Path.Combine(dir, name);
                if (File.Exists(full)) return full;
            }

        // 3) Best-effort fallback (unchanged failure mode if truly not found).
        return executable;
    }

    private static List<string> CandidateNames(string executable)
    {
        var names = new List<string> { executable };
        if (OperatingSystem.IsWindows() && !Path.HasExtension(executable))
        {
            var pathext = (Environment.GetEnvironmentVariable("PATHEXT") ?? ".COM;.EXE;.BAT;.CMD")
                .Split(';', StringSplitOptions.RemoveEmptyEntries);
            foreach (var ext in pathext)
                names.Add(executable + ext.ToLowerInvariant());
        }
        return names;
    }
}
