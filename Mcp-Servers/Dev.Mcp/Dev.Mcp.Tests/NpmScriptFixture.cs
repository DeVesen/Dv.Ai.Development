namespace Dev.Mcp.Tests;

/// <summary>
/// Creates a throwaway npm project with three scripts:
///   pass       -> node exits 0
///   fail       -> node exits 1
///   lingerpass -> main prints, spawns a detached child that inherits+holds the
///                 stdout/stderr pipe for 25s, then main exits 0.
/// </summary>
public sealed class NpmScriptFixture : IDisposable
{
    public string Dir { get; }

    public NpmScriptFixture()
    {
        Dir = Path.Combine(Path.GetTempPath(), "devmcp-npm-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Dir);

        File.WriteAllText(Path.Combine(Dir, "package.json"),
            """
            {
              "name": "devmcp-fixture",
              "version": "1.0.0",
              "scripts": {
                "pass": "node -e \"process.exit(0)\"",
                "fail": "node -e \"process.exit(1)\"",
                "lingerpass": "node linger.js"
              }
            }
            """);

        File.WriteAllText(Path.Combine(Dir, "linger.js"),
            """
            const { spawn } = require('child_process');
            console.log('start');
            const child = spawn(process.execPath, ['-e', 'setTimeout(()=>{}, 25000)'], { stdio: 'inherit', detached: true });
            child.unref();
            console.log('done');
            process.exit(0);
            """);
    }

    public static string Npm => OperatingSystem.IsWindows() ? "npm.cmd" : "npm";

    public void Dispose()
    {
        try { Directory.Delete(Dir, recursive: true); } catch { /* best effort */ }
    }
}
