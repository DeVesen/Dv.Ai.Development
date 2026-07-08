namespace Dev.Mcp.Tests;

/// <summary>
/// Shared node source for a "lingering child" fixture: the main process prints,
/// spawns a detached child that inherits and holds the stdout/stderr pipe for 25s,
/// then the main exits 0. Used to prove exit-code capture is decoupled from stream
/// drain — a descendant holding the pipe must not force a false timeout/failure.
/// </summary>
internal static class LingerScript
{
    public const string Source =
        """
        const { spawn } = require('child_process');
        console.log('start');
        const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 25000)'], { stdio: 'inherit', detached: true });
        child.unref();
        console.log('done');
        process.exit(0);
        """;
}
