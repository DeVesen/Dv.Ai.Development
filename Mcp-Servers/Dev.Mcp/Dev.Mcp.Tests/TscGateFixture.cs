namespace Dev.Mcp.Tests;

public enum TscOutcome
{
    /// <summary>tsc prints a non-error line and exits 0.</summary>
    Pass,
    /// <summary>tsc prints a TS-formatted error and exits 1.</summary>
    Fail,
    /// <summary>tsc spawns a detached child that holds the pipe for 25s, then exits 0.</summary>
    LingerPass,
}

/// <summary>
/// Throwaway project exercising the apply_text_patch compiler gate over a REAL
/// batch/shell wrapper. A fake <c>tsc</c> is placed in <c>node_modules/.bin</c> so the
/// gate resolves and launches it exactly like a project-local TypeScript compiler:
///   - Windows: <c>tsc.cmd</c> (the bare-.cmd surface the ProcessRunner fix targets)
///   - POSIX:   <c>tsc</c> shell script (executable bit set)
/// The compiler is only reachable via full-path resolution (never on PATH), so the
/// pre-fix bare-name launch cannot find it — this is what makes the tests fail before
/// the fix and pass after, without depending on a real TypeScript install.
/// </summary>
public sealed class TscGateFixture : IDisposable
{
    public string Dir { get; }
    public string TsFile { get; }

    public TscGateFixture(TscOutcome outcome)
    {
        Dir = Path.Combine(Path.GetTempPath(), "devmcp-tsc-" + Guid.NewGuid().ToString("N"));
        var binDir = Path.Combine(Dir, "node_modules", ".bin");
        Directory.CreateDirectory(binDir);

        // The file the gate patches. A single-line anchor keeps the patch itself
        // trivial; the behaviour under test is the compiler gate, not the splice.
        TsFile = Path.Combine(Dir, "sample.ts");
        File.WriteAllText(TsFile, "export const answer = 41;\n");

        WriteFakeTsc(binDir, outcome);
    }

    private static void WriteFakeTsc(string binDir, TscOutcome outcome)
    {
        if (OperatingSystem.IsWindows())
            WriteWindowsTsc(binDir, outcome);
        else
            WritePosixTsc(binDir, outcome);
    }

    private static void WriteWindowsTsc(string binDir, TscOutcome outcome)
    {
        var body = outcome switch
        {
            TscOutcome.Pass => "@echo off\r\necho compiled ok\r\nexit /b 0\r\n",
            TscOutcome.Fail => "@echo off\r\necho error TS1005: ';' expected.\r\nexit /b 1\r\n",
            TscOutcome.LingerPass => "@echo off\r\necho compiling\r\nnode \"%~dp0linger.js\"\r\nexit /b 0\r\n",
            _ => throw new ArgumentOutOfRangeException(nameof(outcome)),
        };
        File.WriteAllText(Path.Combine(binDir, "tsc.cmd"), body);
        if (outcome == TscOutcome.LingerPass)
            File.WriteAllText(Path.Combine(binDir, "linger.js"), LingerScript.Source);
    }

    private static void WritePosixTsc(string binDir, TscOutcome outcome)
    {
        var body = outcome switch
        {
            TscOutcome.Pass => "#!/bin/sh\necho compiled ok\nexit 0\n",
            TscOutcome.Fail => "#!/bin/sh\necho \"error TS1005: ';' expected.\"\nexit 1\n",
            TscOutcome.LingerPass => "#!/bin/sh\necho compiling\nnode \"$(dirname \"$0\")/linger.js\"\nexit 0\n",
            _ => throw new ArgumentOutOfRangeException(nameof(outcome)),
        };
        var path = Path.Combine(binDir, "tsc");
        File.WriteAllText(path, body);
        File.SetUnixFileMode(path,
            UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute |
            UnixFileMode.GroupRead | UnixFileMode.GroupExecute |
            UnixFileMode.OtherRead | UnixFileMode.OtherExecute);
        if (outcome == TscOutcome.LingerPass)
            File.WriteAllText(Path.Combine(binDir, "linger.js"), LingerScript.Source);
    }

    public void Dispose()
    {
        try { Directory.Delete(Dir, recursive: true); } catch { /* best effort */ }
    }
}
