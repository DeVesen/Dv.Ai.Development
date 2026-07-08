namespace Dev.Mcp.Tests;

/// <summary>
/// Creates a throwaway npm project with four scripts:
///   pass       -> node exits 0
///   fail       -> node exits 1
///   lingerpass -> main prints, spawns a detached child that inherits+holds the
///                 stdout/stderr pipe for 25s, then main exits 0.
///   reapmark   -> main spawns a detached child that writes <see cref="MarkerPath"/>
///                 4s after spawn, then main exits 0. The marker appears only if the
///                 orphaned child is NOT reaped — a probe for Job Object teardown.
/// </summary>
public sealed class NpmScriptFixture : IDisposable
{
    public string Dir { get; }

    /// <summary>File the "reapmark" grandchild writes iff it survives long enough.</summary>
    public string MarkerPath => Path.Combine(Dir, "REAPED_MARKER");

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
                "lingerpass": "node linger.js",
                "reapmark": "node linger-mark.js"
              }
            }
            """);

        File.WriteAllText(Path.Combine(Dir, "linger.js"), LingerScript.Source);

        var markerJs = MarkerPath.Replace('\\', '/');
        File.WriteAllText(Path.Combine(Dir, "linger-mark.js"),
            $$"""
            const { spawn } = require('child_process');
            const marker = "{{markerJs}}";
            console.log('start');
            const child = spawn(process.execPath,
              ['-e', "setTimeout(function(){require('fs').writeFileSync(process.argv[1],'x')},4000)", marker],
              { stdio: 'inherit', detached: true });
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
