# dev-mcp exit-code + CRLF-anchor fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two dev-mcp server bugs — `run_npm_script` reporting a passing run as `success:false/exitCode:1`, and `apply_text_patch` multi-line anchors failing on CRLF files — at the lowest correct layer, with regression tests.

**Architecture:** Introduce one shared `ProcessRunner` that resolves executables to a full path (fixing `npm.cmd`/`ng.cmd`'s `%~dp0` misresolution) and captures the real exit code independent of stdout/stderr drain (fixing pipe-holding children); route `run_npm_script` and the Angular build/test runner through it. Fix `apply_text_patch` anchor matching with EOL-agnostic, index-mapped matching that preserves the file's original EOL. New xUnit test project.

**Tech Stack:** C# / .NET 9, `System.Diagnostics.Process`, xUnit 2.9.2 (repo's existing test stack), dev-mcp build/test tooling.

**Design spec:** `docs/superpowers/specs/2026-07-08-dev-mcp-exitcode-crlf-anchor-fixes-design.md`

## Global Constraints

- **Target framework:** `net9.0` (matches `Dev.Mcp.csproj`).
- **Tool output contract is frozen:** do not rename or reshape any tool's JSON fields. `run_npm_script` stays `{ success, command, errors[], warnings[], exitCode, summary }`; `apply_text_patch` keeps the `ApplyPatchResult` record shape. Only behaviour changes.
- **Test stack = the repo's existing one:** xUnit `2.9.2`, `xunit.runner.visualstudio` `2.8.2`, `Microsoft.NET.Test.Sdk` `17.12.0`, `coverlet.collector` `6.0.2`, plain `Assert` (NO FluentAssertions). This deviates from the spec's §4.1 wording ("xUnit v3 + FluentAssertions") — the spec was inaccurate about the repo; we follow the real established pattern in `Build.Log.Filter.Mcp.Tests`. The spec is corrected to match.
- **Platform verification:** all tests must pass on Windows (run locally). The "one POSIX OS" leg is a **CI/WSL/container requirement** — tests are written OS-portable but POSIX is NOT claimed as locally verified (this machine is Windows-only).
- **Behaviour change to state when it lands (per repo rule "decide, do, mention"):** the executable resolver prefers a project-local `node_modules/.bin/<cli>` over a global one — correct npm/npx semantics, a visible change from today's global-only resolution.
- **Tooling note:** Plan `Run:` steps use portable `dotnet` CLI. In this harness, build/test go through dev-mcp: `build_dotnet_solution` and `test_dotnet_solution` with `test_project_path` pointing at `Dev.Mcp.Tests.csproj`. Either is acceptable; the CLI form is shown for determinism.
- **Fixtures need node+npm** on PATH (present: node 24, npm 11). Tests that spawn npm are real integration tests by design (they must exercise the `.cmd` path).

**Paths** (all under `C:\Develop\Dv.Ai.Development\`):
- Main project: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj`
- New test project: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/`
- Solution: `Mcp-Servers/Dev.Mcp/Dev.Mcp.slnx` (EXISTS already — canonical, referenced by run_inspectcode/build-prompts; register the test project here, do NOT create a new `.sln`)

---

## File Structure

**Created:**
- `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ProcessRunner.cs` — the shared spawner (resolution + decoupled exit-code capture).
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj` — test project.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/NpmScriptFixture.cs` — shared temp-project fixture (package.json + linger.js).
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ProcessRunnerTests.cs` — Bug-1 core regression (pass/fail/lingering via real npm.cmd).
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/RunNpmScriptTests.cs` — npm call-site fails-before/passes-after.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/AngularParserMappingTests.cs` — build/test parser exit-code→success mapping.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/PatchServiceAnchorEolTests.cs` — Bug-2 CRLF/LF/mixed/single-line.
- (Solution: register the test project in the EXISTING `Mcp-Servers/Dev.Mcp/Dev.Mcp.slnx` — no new `.sln`.)

**Modified:**
- `Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj` — add `InternalsVisibleTo`.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/AngularTools.cs` — `RunNpmInternalAsync` → `internal static`, route through `ProcessRunner`.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/AngularRunner.cs` — `RunAsync` routes through `ProcessRunner`.
- `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/PatchService.cs` — `ApplyAnchorPatch` EOL-agnostic matching.

**Out of scope (tracked fast-follow):** tsc compiler-gate migration (`task_ece0abdc`), `DotnetRunner`, git spawns, `ApplyLinePatch` `Environment.NewLine` behaviour.

---

## Task 1: Scaffold test project + solution

**Files:**
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SmokeTest.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.sln`

**Interfaces:**
- Produces: a buildable test project referencing `Dev.Mcp`, and `Dev.Mcp.sln` containing both projects. Later tasks add test files here.

- [ ] **Step 1: Create the test project file**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.2" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Dev.Mcp\Dev.Mcp.csproj" />
  </ItemGroup>

</Project>
```

> The `Microsoft.AspNetCore.App` FrameworkReference mirrors the main project (which uses it via `LogWebServer`); referencing an app that targets the shared framework requires the test project to declare it too.

- [ ] **Step 2: Add a smoke test**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/SmokeTest.cs`:

```csharp
namespace Dev.Mcp.Tests;

public sealed class SmokeTest
{
    [Fact]
    public void Harness_Runs()
    {
        Assert.True(true);
    }
}
```

- [ ] **Step 3: Create the solution and add both projects**

Run (from `Mcp-Servers/Dev.Mcp/`):

```bash
dotnet new sln -n Dev.Mcp
dotnet sln add Dev.Mcp/Dev.Mcp.csproj
dotnet sln add Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: "Project ... added to the solution." twice.

- [ ] **Step 4: Build and run tests**

Run (from `Mcp-Servers/Dev.Mcp/`):

```bash
dotnet test Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: PASS — 1 test passed (`Harness_Runs`).

- [ ] **Step 5: Commit**

```bash
git add Mcp-Servers/Dev.Mcp/Dev.Mcp.sln Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/
git commit -m "test(dev-mcp): scaffold Dev.Mcp.Tests project + solution"
```

---

## Task 2: `ProcessRunner` component + spawn regression tests

**Files:**
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ProcessRunner.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/NpmScriptFixture.cs`
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ProcessRunnerTests.cs`

**Interfaces:**
- Produces:
  - `Dev.Mcp.Services.ProcessRunResult` — `record(int ExitCode, string Stdout, string Stderr, bool TimedOut)`.
  - `Dev.Mcp.Services.ProcessRunner.RunAsync(string executable, string arguments, string workingDirectory, int timeoutSeconds, CancellationToken cancellationToken = default) : Task<ProcessRunResult>`.
  - `Dev.Mcp.Tests.NpmScriptFixture` — `IDisposable`, exposes `string Dir` with `pass`/`fail`/`lingerpass` npm scripts.

- [ ] **Step 1: Write the shared npm fixture helper**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/NpmScriptFixture.cs`:

```csharp
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
```

- [ ] **Step 2: Write the failing ProcessRunner tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ProcessRunnerTests.cs`:

```csharp
using System.Diagnostics;
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class ProcessRunnerTests
{
    [Fact]
    public async Task RunAsync_PassingScript_ReportsExitCodeZero()
    {
        using var fx = new NpmScriptFixture();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run pass", fx.Dir, timeoutSeconds: 60);

        Assert.False(result.TimedOut);
        Assert.Equal(0, result.ExitCode);
    }

    [Fact]
    public async Task RunAsync_FailingScript_ReportsExitCodeOne()
    {
        using var fx = new NpmScriptFixture();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run fail", fx.Dir, timeoutSeconds: 60);

        Assert.False(result.TimedOut);
        Assert.Equal(1, result.ExitCode);
    }

    [Fact]
    public async Task RunAsync_PassingScriptWithLingeringChild_ReturnsExitZeroWithoutWaitingForChild()
    {
        using var fx = new NpmScriptFixture();
        var sw = Stopwatch.StartNew();
        var result = await ProcessRunner.RunAsync(NpmScriptFixture.Npm, "run lingerpass", fx.Dir, timeoutSeconds: 60);
        sw.Stop();

        Assert.False(result.TimedOut);
        Assert.Equal(0, result.ExitCode);
        // Must return well before the 25s lingering child dies (proves exit code
        // is decoupled from stream drain). Generous ceiling for npm startup + grace.
        Assert.True(sw.Elapsed < TimeSpan.FromSeconds(20), $"took {sw.Elapsed}");
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: FAIL — compile error "The name 'ProcessRunner' does not exist" (type not yet implemented).

- [ ] **Step 4: Implement `ProcessRunner`**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ProcessRunner.cs`:

```csharp
using System.Diagnostics;
using System.Text;

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
        catch (TimeoutException) { /* child still holds pipe; take whatever arrived */ }
        catch (OperationCanceledException) { /* reads cancelled */ }
        catch (Exception) { /* a read faulted (e.g. killed); take whatever arrived */ }

        var stdout = stdoutTask.IsCompletedSuccessfully ? stdoutTask.Result : string.Empty;
        var stderr = stderrTask.IsCompletedSuccessfully ? stderrTask.Result : string.Empty;
        return (stdout, stderr);
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: PASS — `RunAsync_PassingScript_ReportsExitCodeZero`, `RunAsync_FailingScript_ReportsExitCodeOne`, `RunAsync_PassingScriptWithLingeringChild_...` all green (+ smoke).

- [ ] **Step 6: Commit**

```bash
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/ProcessRunner.cs Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/NpmScriptFixture.cs Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/ProcessRunnerTests.cs
git commit -m "feat(dev-mcp): add shared ProcessRunner with full-path resolution + decoupled exit-code capture"
```

---

## Task 3: Route `run_npm_script` through `ProcessRunner` (fails-before/passes-after)

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj` (add `InternalsVisibleTo`)
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/AngularTools.cs` (`RunNpmInternalAsync`)
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/RunNpmScriptTests.cs`

**Interfaces:**
- Consumes: `ProcessRunner.RunAsync(...)` and `ProcessRunResult` from Task 2; `NpmScriptFixture` from Task 2.
- Produces: `Dev.Mcp.Tools.AngularTools.RunNpmInternalAsync(string workingDirectory, string script, string? extraArgs) : Task<AngularBuildResult>` becomes `internal static` (was `private static`); returns unchanged `AngularBuildResult` shape.

- [ ] **Step 1: Expose internals to the test assembly**

In `Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj`, add inside a new `<ItemGroup>`:

```xml
  <ItemGroup>
    <InternalsVisibleTo Include="Dev.Mcp.Tests" />
  </ItemGroup>
```

- [ ] **Step 2: Make `RunNpmInternalAsync` internal**

In `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/AngularTools.cs`, change the signature (around line 119) from:

```csharp
    private static async Task<AngularBuildResult> RunNpmInternalAsync(string workingDirectory, string script, string? extraArgs)
```

to:

```csharp
    internal static async Task<AngularBuildResult> RunNpmInternalAsync(string workingDirectory, string script, string? extraArgs)
```

- [ ] **Step 3: Write the failing call-site tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/RunNpmScriptTests.cs`:

```csharp
using Dev.Mcp.Tools;

namespace Dev.Mcp.Tests;

public sealed class RunNpmScriptTests
{
    [Fact]
    public async Task RunNpmInternalAsync_PassingScript_ReportsSuccess()
    {
        using var fx = new NpmScriptFixture();
        var result = await AngularTools.RunNpmInternalAsync(fx.Dir, "pass", null);

        Assert.True(result.Success, $"exitCode={result.ExitCode} summary={result.Summary}");
        Assert.Equal(0, result.ExitCode);
    }

    [Fact]
    public async Task RunNpmInternalAsync_FailingScript_ReportsFailure()
    {
        using var fx = new NpmScriptFixture();
        var result = await AngularTools.RunNpmInternalAsync(fx.Dir, "fail", null);

        Assert.False(result.Success);
        Assert.Equal(1, result.ExitCode);
    }
}
```

- [ ] **Step 4: Run tests to verify the passing-script test fails**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj --filter "FullyQualifiedName~RunNpmScriptTests"
```

Expected: FAIL — `RunNpmInternalAsync_PassingScript_ReportsSuccess` fails on Windows because the current bare-`npm.cmd` launch makes npm exit 1 (`%~dp0` misresolution). This reproduces the reported bug. (`RunNpmInternalAsync_FailingScript_ReportsFailure` may pass coincidentally — the assertion of interest is the passing case.)

- [ ] **Step 5: Route `RunNpmInternalAsync` through `ProcessRunner`**

In `Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/AngularTools.cs`, replace the body of `RunNpmInternalAsync` (the `ProcessStartInfo` construction, `process.Start()`, the `CancellationTokenSource`/`Task.WhenAll` block, and the timeout `catch`) with a call to `ProcessRunner`. The full method becomes:

```csharp
    internal static async Task<AngularBuildResult> RunNpmInternalAsync(string workingDirectory, string script, string? extraArgs)
    {
        if (string.IsNullOrWhiteSpace(workingDirectory)) return NpmFail("npm", "working_directory is required");
        if (!Directory.Exists(workingDirectory)) return NpmFail("npm", $"Directory not found: {workingDirectory}");
        if (string.IsNullOrWhiteSpace(script)) return NpmFail("npm", "script is required");

        var npmExe = OperatingSystem.IsWindows() ? "npm.cmd" : "npm";
        var scriptArgs = string.Equals(script, "install", StringComparison.OrdinalIgnoreCase)
            ? "install"
            : $"run {script.Trim()}";
        if (!string.IsNullOrWhiteSpace(extraArgs)) scriptArgs += $" {extraArgs.Trim()}";
        var command = $"npm {scriptArgs}";

        ProcessRunResult run;
        try
        {
            run = await ProcessRunner.RunAsync(npmExe, scriptArgs, workingDirectory, timeoutSeconds: 300);
        }
        catch (Exception ex)
        {
            return NpmFail(command, $"Failed to start npm: {ex.Message}");
        }

        if (run.TimedOut) return NpmFail(command, "npm timed out after 300s");

        var combined = (run.Stdout + "\n" + run.Stderr).Trim();
        var lines = combined.Split('\n');
        var errors = lines
            .Where(l => l.StartsWith("npm ERR!", StringComparison.OrdinalIgnoreCase) ||
                        Regex.IsMatch(l, @"error\s+TS\d+:|✘\s*\[ERROR\]", RegexOptions.IgnoreCase))
            .Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(20).ToArray();
        var warnings = lines
            .Where(l => l.StartsWith("npm warn", StringComparison.OrdinalIgnoreCase))
            .Select(l => l.Trim()).Where(l => l.Length > 0).Distinct().Take(10).ToArray();
        var summary = run.ExitCode == 0
            ? $"npm {script} succeeded."
            : errors.Length > 0 ? errors[0] : $"npm {script} failed (exit code {run.ExitCode}).";

        const int MaxOutput = 3000;
        var output = combined.Length > MaxOutput ? combined[..MaxOutput] + "\n... (truncated)" : combined;

        return new AngularBuildResult
        {
            Success = run.ExitCode == 0, Command = command,
            Errors = errors, Warnings = warnings, ExitCode = run.ExitCode, Summary = summary,
            ConsoleOutput = output
        };
    }
```

> The `System.Diagnostics` using may become unused in this file if no other member needs it — leave it; other members in `AngularTools.cs` (e.g. `Stopwatch`) still use it. Do not remove usings blindly.

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj --filter "FullyQualifiedName~RunNpmScriptTests"
```

Expected: PASS — both `RunNpmScriptTests` green.

- [ ] **Step 7: Commit**

```bash
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj Mcp-Servers/Dev.Mcp/Dev.Mcp/Tools/AngularTools.cs Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/RunNpmScriptTests.cs
git commit -m "fix(dev-mcp): run_npm_script reports real child exit code via ProcessRunner"
```

---

## Task 4: Route Angular build/test through `ProcessRunner` + mapping tests

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/AngularRunner.cs` (`RunAsync`)
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/AngularParserMappingTests.cs`

**Interfaces:**
- Consumes: `ProcessRunner.RunAsync(...)`, `ProcessRunResult` from Task 2.
- Produces: no signature change to `AngularRunner`'s public methods; `ParseBuildOutput`, `ParseTestOutput`, `ParseJestOutput` (already `public static`) remain the mapping seams under test.

- [ ] **Step 1: Write the parser mapping tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/AngularParserMappingTests.cs`:

```csharp
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

// Locks the contract that success is strictly the child's exit code, for each
// Angular runner parser (build + Karma test + Jest test).
public sealed class AngularParserMappingTests
{
    [Fact]
    public void ParseBuildOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseBuildOutput("", "", 0).Success);

    [Fact]
    public void ParseBuildOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseBuildOutput("", "", 1).Success);

    [Fact]
    public void ParseTestOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseTestOutput("", "", 0).Success);

    [Fact]
    public void ParseTestOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseTestOutput("", "", 1).Success);

    [Fact]
    public void ParseJestOutput_ExitZero_IsSuccess() => Assert.True(AngularRunner.ParseJestOutput("", "", 0).Success);

    [Fact]
    public void ParseJestOutput_ExitOne_IsFailure() => Assert.False(AngularRunner.ParseJestOutput("", "", 1).Success);
}
```

- [ ] **Step 2: Run the mapping tests (baseline green)**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj --filter "FullyQualifiedName~AngularParserMappingTests"
```

Expected: PASS — these characterize the already-correct exit-code→success mapping and guard it against regression during the migration. (No red phase: the mapping was never the bug; the spawn layer was.)

- [ ] **Step 3: Route `AngularRunner.RunAsync` through `ProcessRunner`**

In `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/AngularRunner.cs`, replace the entire `RunAsync` method (the private one that builds `ProcessStartInfo` with `NgExecutable`) with:

```csharp
    private async Task<AngularBuildResult> RunAsync(
        string commandLabel, string projectRoot, List<string> args,
        Func<string, string, int, AngularBuildResult> parser, int timeoutSeconds, CancellationToken cancellationToken)
    {
        var arguments = string.Join(' ', args);
        var root = Path.GetFullPath(projectRoot);

        ProcessRunResult run;
        try
        {
            run = await ProcessRunner.RunAsync(NgExecutable, arguments, root, timeoutSeconds, cancellationToken);
        }
        catch (Exception ex)
        {
            return MakeFailResult($"Failed to start ng: {ex.Message}", commandLabel);
        }

        if (run.TimedOut)
            return MakeFailResult($"Process timed out after {timeoutSeconds}s.", commandLabel);

        var result = parser(run.Stdout, run.Stderr, run.ExitCode);
        result.ConsoleOutput = $"> {NgExecutable} {arguments}\n\n{StripAnsi(run.Stdout + "\n" + run.Stderr).Trim()}";
        return result;
    }
```

> Behaviour note to state when this lands: an externally-cancelled run now reports "Process timed out …" rather than "Process was cancelled." (single `TimedOut` flag) — cancellation is rare here and the failure outcome is unchanged.

- [ ] **Step 4: Build the main project to confirm it compiles**

Run:

```bash
dotnet build Mcp-Servers/Dev.Mcp/Dev.Mcp/Dev.Mcp.csproj
```

Expected: Build succeeded. (If the compiler flags now-unused usings as warnings, that's acceptable; do not strip usings still used by other members.)

- [ ] **Step 5: Run the full test suite**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: PASS — all tests green (smoke + ProcessRunner + RunNpmScript + AngularParserMapping).

- [ ] **Step 6: Commit**

```bash
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/AngularRunner.cs Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/AngularParserMappingTests.cs
git commit -m "fix(dev-mcp): route ng build/test through ProcessRunner; lock exit-code mapping"
```

---

## Task 5: Fix `apply_text_patch` CRLF multi-line anchor (fails-before/passes-after)

**Files:**
- Modify: `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/PatchService.cs` (`ApplyAnchorPatch` + private EOL helpers)
- Create: `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/PatchServiceAnchorEolTests.cs`

**Interfaces:**
- Consumes: `Dev.Mcp.Services.PatchService` (public parameterless ctor); `ApplyAnchorPatch(string filePath, string oldText, string newText, bool runCompilerGate, bool dryRun, bool rollbackOnError) : ApplyPatchResult`.
- Produces: unchanged `ApplyPatchResult` record; EOL-agnostic matching + original-EOL-preserving write-back.

- [ ] **Step 1: Write the failing CRLF + LF + mixed + single-line tests**

Create `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/PatchServiceAnchorEolTests.cs`:

```csharp
using Dev.Mcp.Services;

namespace Dev.Mcp.Tests;

public sealed class PatchServiceAnchorEolTests : IDisposable
{
    private readonly string _dir;
    private readonly PatchService _patch = new();

    public PatchServiceAnchorEolTests()
    {
        _dir = Path.Combine(Path.GetTempPath(), "devmcp-patch-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_dir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_dir, recursive: true); } catch { }
    }

    private string WriteBytes(string name, string exactContent)
    {
        var p = Path.Combine(_dir, name);
        File.WriteAllText(p, exactContent); // written verbatim; no EOL translation
        return p;
    }

    [Fact]
    public void MultiLineAnchor_OnCrlfFile_MatchesAndKeepsCrlf()
    {
        var path = WriteBytes("crlf.txt", "foo\r\nbar\r\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\r\nBAR\r\nbaz\r\n", File.ReadAllText(path));
    }

    [Fact]
    public void MultiLineAnchor_OnLfFile_MatchesAndKeepsLf()
    {
        var path = WriteBytes("lf.txt", "foo\nbar\nbaz\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\nBAR\nbaz\n", File.ReadAllText(path));
    }

    [Fact]
    public void MultiLineAnchor_OnMixedEolFile_UsesDominantAndLeavesUnrelatedLineUntouched()
    {
        // 3x CRLF vs 1x lone LF -> dominant is CRLF; the lone-LF "keep" line is unrelated and must stay LF.
        var path = WriteBytes("mixed.txt", "foo\r\nbar\r\nkeep\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "foo\nbar", "FOO\nBAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("FOO\r\nBAR\r\nkeep\nbaz\r\n", File.ReadAllText(path));
    }

    [Fact]
    public void SingleLineAnchor_OnCrlfFile_StillWorks()
    {
        var path = WriteBytes("single.txt", "foo\r\nbar\r\nbaz\r\n");

        var result = _patch.ApplyAnchorPatch(path, "bar", "BAR",
            runCompilerGate: false, dryRun: false, rollbackOnError: false);

        Assert.True(result.Success, result.Error);
        Assert.Equal("foo\r\nBAR\r\nbaz\r\n", File.ReadAllText(path));
    }
}
```

- [ ] **Step 2: Run tests to verify the CRLF/mixed multi-line cases fail**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj --filter "FullyQualifiedName~PatchServiceAnchorEolTests"
```

Expected: FAIL — `MultiLineAnchor_OnCrlfFile_...` and `MultiLineAnchor_OnMixedEolFile_...` fail with `anchor_not_found` (current code matches the `\n`-joined anchor byte-for-byte against `\r\n` content). The LF and single-line tests pass. This reproduces Bug 2.

- [ ] **Step 3: Implement EOL-agnostic anchor matching**

In `Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/PatchService.cs`, replace the `ApplyAnchorPatch` method body with the version below, and add the three private helpers (place them in the `private helpers` region). Also add `using System.Text;` at the top of the file (for `StringBuilder`).

```csharp
    /// <summary>Anchor-based patch (old_text → new_text). EOL-agnostic match; preserves the file's original EOL.</summary>
    public ApplyPatchResult ApplyAnchorPatch(
        string filePath, string oldText, string newText,
        bool runCompilerGate, bool dryRun, bool rollbackOnError)
    {
        var raw = File.ReadAllText(filePath);

        // Match in LF space so a \n-joined anchor matches \r\n content, keeping a
        // map from each LF-space index back to its raw offset.
        var (rawLf, map) = NormalizeWithMap(raw);
        var anchorLf = oldText.Replace("\r\n", "\n");

        var firstLf = rawLf.IndexOf(anchorLf, StringComparison.Ordinal);
        if (firstLf < 0)
            return Fail(filePath, "anchor_not_found: old_text not found in file", dryRun);

        var secondLf = rawLf.IndexOf(anchorLf, firstLf + 1, StringComparison.Ordinal);
        if (secondLf >= 0)
            return Fail(filePath, "ambiguous_anchor: old_text appears more than once", dryRun);

        // Map the matched LF span back to raw offsets. rawEnd is one past the LAST
        // matched char (map[last] + 1) — NOT map[firstLf + len], which would swallow
        // a trailing '\r' at a CRLF boundary.
        var rawStart = map[firstLf];
        var lastLf = firstLf + anchorLf.Length - 1;
        var rawEnd = map[lastLf] + 1;

        var dominantEol = DominantEol(raw);
        var newTextEol = ToEol(newText, dominantEol);
        var patched = raw[..rawStart] + newTextEol + raw[rawEnd..];

        var oldLineCount = oldText.Count(c => c == '\n') + 1;
        var newLineCount = newText.Count(c => c == '\n') + 1;
        var linesChanged = Math.Abs(newLineCount - oldLineCount);

        return CommitPatch(filePath, raw, patched, linesChanged, "anchor", runCompilerGate, dryRun, rollbackOnError);
    }
```

Add these private helpers to `PatchService`:

```csharp
    // Returns an LF-normalized copy of raw plus a map: map[i] = raw offset of the
    // i-th char of the LF-normalized string. Only the '\r' of each "\r\n" pair is
    // dropped; lone '\r' and lone '\n' are preserved.
    private static (string lf, int[] map) NormalizeWithMap(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        var map = new int[raw.Length];
        var n = 0;
        for (var i = 0; i < raw.Length; i++)
        {
            if (raw[i] == '\r' && i + 1 < raw.Length && raw[i + 1] == '\n')
                continue; // drop CR of CRLF; the following LF is emitted next iteration
            map[n] = i;
            sb.Append(raw[i]);
            n++;
        }
        var trimmed = new int[n];
        Array.Copy(map, trimmed, n);
        return (sb.ToString(), trimmed);
    }

    // Dominant EOL by frequency; defaults to "\n" for a file with no newline.
    private static string DominantEol(string raw)
    {
        var crlf = 0;
        for (var i = 0; i + 1 < raw.Length; i++)
            if (raw[i] == '\r' && raw[i + 1] == '\n') crlf++;
        var lfOnly = raw.Count(c => c == '\n') - crlf;
        if (crlf == 0 && lfOnly == 0) return "\n";
        return crlf >= lfOnly ? "\r\n" : "\n";
    }

    // Rewrites text to the given EOL style (normalize to LF first, then expand).
    private static string ToEol(string text, string eol)
    {
        var lf = text.Replace("\r\n", "\n");
        return eol == "\n" ? lf : lf.Replace("\n", "\r\n");
    }
```

> Worked example (CRLF): raw `foo\r\nbar\r\nbaz\r\n`, anchor `foo\nbar` → `rawLf="foo\nbar\nbaz\n"`, match at `firstLf=0`, `lastLf=6` (the `r`), `map[6]=7`, `rawEnd=8`. `raw[..0] + "FOO\r\nBAR" + raw[8..]` = `FOO\r\nBAR\r\nbaz\r\n`. Trailing `\r` at raw index 8 correctly stays with the untouched tail.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj --filter "FullyQualifiedName~PatchServiceAnchorEolTests"
```

Expected: PASS — all four `PatchServiceAnchorEolTests` green (CRLF, LF, mixed, single-line).

- [ ] **Step 5: Commit**

```bash
git add Mcp-Servers/Dev.Mcp/Dev.Mcp/Services/PatchService.cs Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/PatchServiceAnchorEolTests.cs
git commit -m "fix(dev-mcp): apply_text_patch multi-line anchors match on CRLF, preserve original EOL"
```

---

## Task 6: Full verification + close-out

**Files:** none (verification + notes only).

- [ ] **Step 1: Run the complete suite (Windows)**

Run (from repo root):

```bash
dotnet test Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/Dev.Mcp.Tests.csproj
```

Expected: PASS — all tests green: `SmokeTest`, `ProcessRunnerTests` (3), `RunNpmScriptTests` (2), `AngularParserMappingTests` (6), `PatchServiceAnchorEolTests` (4).

- [ ] **Step 2: Rebuild the deployed exe and sanity-check the real tools**

The dev-mcp exe is deployed to `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`. Rebuild/publish per the repo's normal process, then per-call-site smoke-check against a known pass and known fail (documented, not automated):
- `run_npm_script` on the `NpmScriptFixture` `pass` script → `success:true, exitCode:0`; on `fail` → `success:false, exitCode:1`.
- `build_angular_project` / `test_angular_project` against a known-good and a known-broken Angular project → success matches the real result.

Record the observed JSON in the PR description.

- [ ] **Step 3: Note the POSIX + fast-follow items in the PR**

State explicitly in the PR:
- Windows verified locally; **POSIX leg must run in CI/WSL** (not verified locally).
- Behaviour change: local `node_modules/.bin` CLI now preferred over global; external-cancel now reports "timed out".
- Fast-follow tracked: tsc compiler-gate migration (`task_ece0abdc`), `DotnetRunner`, git spawns, `ApplyLinePatch` EOL.

- [ ] **Step 4: Final commit (if any doc/PR notes were added to the repo)**

```bash
git add -A
git commit -m "docs(dev-mcp): record verification + fast-follow notes for ProcessRunner/CRLF fixes"
```

---

## Self-Review notes (author)

- **Spec coverage:** ProcessRunner (spec §3.1) → Task 2; run_npm_script wiring (§3.2) → Task 3; Angular runner (§3.2) → Task 4; PatchService anchor (§3.3) → Task 5; tests (§4.2/4.3/4.4) → Tasks 2–5; verification + POSIX + Playwright-out (§4.5) → Task 6; scope/fast-follow (§6) → Task 6 close-out + `task_ece0abdc`.
- **Type consistency:** `ProcessRunResult(ExitCode, Stdout, Stderr, TimedOut)` and `ProcessRunner.RunAsync(executable, arguments, workingDirectory, timeoutSeconds, cancellationToken)` are used identically in Tasks 2/3/4. `RunNpmInternalAsync(workingDirectory, script, extraArgs)` signature unchanged except visibility.
- **Deviation from spec:** test stack is xUnit 2.9.2 + `Assert` (repo reality), not v3 + FluentAssertions — recorded in Global Constraints; spec §4.1 corrected.
