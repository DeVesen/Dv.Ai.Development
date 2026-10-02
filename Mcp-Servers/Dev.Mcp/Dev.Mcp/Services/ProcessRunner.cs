using System.Diagnostics;

namespace Dev.Mcp.Services;

public sealed record ProcessRunResult(int ExitCode, string Stdout, string Stderr, bool TimedOut);

/// <summary>
/// Central process spawner used by every tool that launches a child process.
/// Fixes three Windows defects at one layer:
///  1. Resolves the executable to a full path, so batch wrappers (npm.cmd/ng.cmd)
///     get a correct %~dp0 instead of misresolving to the working directory.
///  2. Captures the real exit code from process exit, independent of stdout/stderr
///     drain — a descendant that inherits and holds the redirected pipes can no
///     longer force a false timeout/failure (the reason the tool hung to its ceiling).
///  3. Reaps the whole descendant subtree — including detached/orphaned grandchildren
///     that <c>Process.Kill(entireProcessTree)</c> misses — via a Job Object, so a
///     lingering child can neither hold the pipe open nor leak past the call.
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
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = psi };
        process.Start();

        // Without this, the child inherits our own stdin — a live pipe to the MCP
        // host that never sends EOF. Node-based CLIs (e.g. Vitest) that probe stdin
        // for an interactive keypress listener then block forever instead of exiting,
        // even after all work is done — the process itself never terminates, so the
        // job-object/pipe-drain handling below never gets a chance to run.
        try { process.StandardInput.Close(); } catch { /* best-effort */ }

        // Bind the child (and everything it spawns) to a Job Object so a detached
        // grandchild can't survive as an orphan. Best-effort: null on non-Windows or
        // if the job is unavailable, in which case the tree-kill fallback applies.
        var job = OperatingSystem.IsWindows() ? CreateAndAssignJob(process) : null;

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

        try
        {
            try
            {
                await process.WaitForExitAsync(linkedCts.Token);
            }
            catch (OperationCanceledException)
            {
                KillTree(process, job);
                await WaitReadersAsync(stdoutTask, stderrTask);
                var (to, te) = ReadResults(stdoutTask, stderrTask);
                return new ProcessRunResult(-1, to, te, TimedOut: true);
            }

            // Process has exited: its real exit code is available now, regardless of
            // whether a lingering descendant still holds the redirected pipes.
            var exitCode = process.ExitCode;

            // Fast path: with no lingering child both readers hit EOF immediately.
            if (!await WaitReadersAsync(stdoutTask, stderrTask))
            {
                // A descendant still holds a pipe. Reap the whole subtree — the job
                // kills even detached/orphaned grandchildren — then drain again: the
                // readers now hit EOF and yield the fully buffered output.
                KillTree(process, job);
                await WaitReadersAsync(stdoutTask, stderrTask);
            }

            var (stdout, stderr) = ReadResults(stdoutTask, stderrTask);
            return new ProcessRunResult(exitCode, stdout, stderr, TimedOut: false);
        }
        finally
        {
            // Reap any survivor even on the clean path (belt-and-suspenders hygiene).
            if (OperatingSystem.IsWindows()) job?.Dispose();
        }
    }

    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    private static JobObject? CreateAndAssignJob(Process process)
    {
        JobObject? job = null;
        try
        {
            job = new JobObject();
            job.AssignProcess(process);
            return job;
        }
        catch
        {
            job?.Dispose(); // job unavailable (e.g. nested-job restriction): tree-kill fallback applies
            return null;
        }
    }

    private static void KillTree(Process process, JobObject? job)
    {
        // Closing the job (KILL_ON_JOB_CLOSE) reaps the entire subtree, orphaned
        // grandchildren included. The tree-kill is the cross-platform fallback.
        if (OperatingSystem.IsWindows()) job?.Dispose();
        try { process.Kill(entireProcessTree: true); } catch { }
    }

    /// <summary>
    /// Awaits both readers with a short grace. Returns true if both completed; on
    /// grace-expiry or fault, abandons them (observing any later fault so it can't
    /// surface as an unobserved task exception) and returns false.
    /// </summary>
    private static async Task<bool> WaitReadersAsync(Task<string> stdoutTask, Task<string> stderrTask)
    {
        try
        {
            await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(TimeSpan.FromSeconds(StreamGraceSeconds));
            return true;
        }
        catch
        {
            ObserveFault(stdoutTask);
            ObserveFault(stderrTask);
            return false;
        }
    }

    private static (string stdout, string stderr) ReadResults(Task<string> stdoutTask, Task<string> stderrTask)
    {
        var stdout = stdoutTask.IsCompletedSuccessfully ? stdoutTask.Result : string.Empty;
        var stderr = stderrTask.IsCompletedSuccessfully ? stderrTask.Result : string.Empty;
        return (stdout, stderr);
    }

    private static void ObserveFault(Task t) =>
        _ = t.ContinueWith(static x => _ = x.Exception,
            TaskContinuationOptions.OnlyOnFaulted | TaskContinuationOptions.ExecuteSynchronously);

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
