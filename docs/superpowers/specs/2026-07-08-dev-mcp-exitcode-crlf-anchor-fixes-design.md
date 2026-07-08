# dev-mcp — exit-code + CRLF-anchor fixes (design)

- **Date:** 2026-07-08
- **Status:** approved design → next: implementation plan (writing-plans)
- **Scope:** two reproducible server-behaviour bugs in the `dev-mcp` MCP server. Pure server bugs; no consuming-project knowledge required.
- **Contract rule (both bugs):** tool input/output field names and shapes stay identical — only buggy behaviour changes.

---

## 1. Motivation & verified root causes

Two defects were reported from field use. The stated root causes were hypotheses; both were verified against the actual code and Bug 1 was reproduced end-to-end with a throwaway project (npm 11, node 24, .NET 10 on Windows).

### Bug 1 — `run_npm_script` reports a passing run as `success:false / exitCode:1 / errors:[] / warnings:[]`

The hypothesis ("success comes from a heuristic, not the exit code") is **wrong**: `RunNpmInternalAsync` already sets `Success = process.ExitCode == 0`. The real causes, both at the process-spawn layer, are:

1. **Bare `.cmd` launch (primary — matches the exact symptom).** Launching `FileName = "npm.cmd"` by bare name (`UseShellExecute=false`) makes npm.cmd's internal `%~dp0` resolve to the *working directory* instead of the Node install dir. npm then can't find `npm-cli.js` and exits **1** with a raw Node `Error: Cannot find module …` on stderr. That error is not `npm ERR!`-prefixed, so the parser classifies nothing → `errors:[]`, `warnings:[]`. Result: `success:false / exitCode:1 / errors:[] / warnings:[]` — exactly the report.
2. **Exit code coupled to stream drain (secondary — the "long-running runners" hint).** The current code does `await Task.WhenAll(stdoutTask, stderrTask, WaitForExitAsync)`. A descendant that inherits and holds the stdout/stderr pipe (Playwright's browser / HTML-report server) stalls the reads up to the timeout; if it outlives the timeout, the read is cancelled and the *already-known* real exit code is discarded for a `-1` timeout failure.

The identical bare-`ng.cmd` pattern lives in `AngularRunner.RunAsync`, so `build_angular_project` / `test_angular_project` carry the same latent bug.

**Reproduction evidence (throwaway project, three npm scripts):**

| launch mode | `pass` (exit 0) | `fail` (exit 1) | `lingerpass` (child holds pipe, main exits 0) |
|---|---|---|---|
| bare `npm.cmd` (current) | ❌ exitCode 1 | exitCode 1 | ❌ exitCode 1 |
| resolved full path | ✅ 0 | ✅ 1 | ✅ 0 |
| `cmd.exe /c` | ✅ 0 | ✅ 1 | ✅ 0 |

With the chosen design (full-path resolution + `WaitForExitAsync` first, then bounded-grace drain), `lingerpass` returns in ~1 s with `exitCode 0` and the lingering child is killed after the grace window — no false timeout, no false failure.

### Bug 2 — `apply_text_patch` multi-line anchor fails on CRLF files

Confirmed as hypothesized. `PatchService.ApplyAnchorPatch` does `content.IndexOf(oldText, StringComparison.Ordinal)` — the LF-joined anchor is matched byte-for-byte against raw content. On a CRLF file, `"foo\nbar"` cannot match `"foo\r\nbar"`. Single-line anchors dodge it (no cross-line `\n`). Write-back via `File.WriteAllText` also needs to preserve the file's original EOL style.

---

## 2. Decisions (with rationale)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Fix at a shared `ProcessRunner`**, route `run_npm_script` + Angular build/test through it | Exit-code fidelity is the most fundamental operation the server offers; a wrong signal undermines every process-spawning tool. The latent race in the build/test runners is the worst place for a landmine — real decisions hang on those signals. DRY: future spawners inherit the fix. |
| D2 | **Launch mechanism = full-path resolution** (not `cmd.exe /c`) | More surgical; avoids shell-quoting pitfalls and an extra process layer; keeps `entireProcessTree` kill clean. Both were verified to work. |
| D3 | **Tests use node + lingering-child fixtures via real npm/.cmd spawn**; Playwright is opt-in manual only | node exit codes + a pipe-holding child deterministically cover all three sub-defects (exit-code layer, stream-drain race, bare-.cmd resolution) without a hundreds-of-MB browser install or CI flakiness. Playwright is not a distinct runner code path — just "a child with async output that then exits." |
| D4 | **tsc compiler-gate migration = fast-follow** (tracked task `task_ece0abdc`), not this change | The 3 confirmed call sites are homogeneous async spawners → mechanical route-through, low risk, now. The tsc gate is *synchronous* and migrating it forces a sync→async change rippling into `ApplyTextPatch`'s signature — a refactor of a different tool, separately reviewable. The layer exists now; tsc adopts it next. |

---

## 3. Component design

### 3.1 `Services/ProcessRunner.cs` (new, `public static`)

The single spawner every process-launching tool delegates to.

```csharp
public sealed record ProcessRunResult(int ExitCode, string Stdout, string Stderr, bool TimedOut);

public static Task<ProcessRunResult> RunAsync(
    string executable, string arguments, string workingDirectory,
    int timeoutSeconds, CancellationToken cancellationToken = default);
```

**Responsibility A — full-path executable resolution.** Resolve `executable` before spawning, probing in order:
1. an already path-qualified value → use as-is (full path if it exists);
2. `<workingDirectory>/node_modules/.bin/<name>` (so a project-local `ng` is used — see behaviour-change note in §6);
3. `PATH` directories, applying `PATHEXT` candidates on Windows for extension-less names.

Found → resolved absolute path goes into the child's `%0`, so `npm.cmd`/`ng.cmd`'s `%~dp0` resolves correctly. Not found → fall back to the bare name (best-effort; unchanged failure mode).

**Responsibility B — exit code decoupled from stream drain.**
1. Start async stdout/stderr reads.
2. `await process.WaitForExitAsync(processTimeoutCts)` — returns when the *process* exits (not on pipe EOF). Capture `process.ExitCode` immediately.
3. Drain the reader tasks under a **short grace window** (`Task.WhenAll(reads).WaitAsync(grace)`). If the grace elapses (a descendant still holds the pipe), kill the process tree and keep the output gathered so far.
4. If `WaitForExitAsync` itself times out → genuine hang → `TimedOut:true`, kill tree.

`success` at every call site is strictly `ExitCode == 0`; parsing never overrides it.

### 3.2 Bug 1 wiring — contract unchanged

- `RunNpmInternalAsync` (Tools/AngularTools.cs) and `AngularRunner.RunAsync` (build + test) drop their inline `ProcessStartInfo` / `Task.WhenAll` blocks and call `ProcessRunner.RunAsync`, then run their **existing** parsers on `(stdout, stderr, exitCode)`.
- `errors` / `warnings` parsing is unchanged and advisory — it can no longer override the exit code.
- JSON shape untouched: `{ success, command, errors[], warnings[], exitCode, summary }`. Timeout still maps to the current `-1` / "timed out" failure.
- `entireProcessTree` kill and `CancellationToken` linking preserved.

### 3.3 Bug 2 wiring — `PatchService.ApplyAnchorPatch`, contract unchanged

Approach: **EOL-agnostic match with index-mapping back to raw bytes** (chosen over whole-file re-normalisation because it satisfies *both* "dominant EOL preserved" *and* "don't touch unrelated lines," including mixed-EOL files).

1. Read raw content. Detect dominant EOL by counting `\r\n` vs lone `\n` (no newline → default `\n`, deterministic and cross-platform).
2. Build an LF-normalised copy **plus an index map** LF-offset → raw-offset (dropping only the `\r` of each `\r\n`).
3. Normalise the anchor to LF; `IndexOf` in the normalised copy; keep the existing `anchor_not_found` / `ambiguous_anchor` guards.
4. Map the match span back to raw offsets; splice `raw[..start] + newTextInDominantEol + raw[end..]`, where `newText` is converted to the file's dominant EOL. Every unrelated byte is preserved verbatim.
5. `File.WriteAllText` the spliced raw string — CRLF stays CRLF, LF stays LF, mixed keeps its untouched regions.

Single-line anchors take the same path (no regression). `ApplyLinePatch` is untouched (see §6 note).

---

## 4. Tests & verification

### 4.1 New test project
- `Mcp-Servers/Dev.Mcp/Dev.Mcp.Tests/` — xUnit `2.9.2` + plain `Assert` (**the repo's actual established test stack**, mirroring `Build.Log.Filter.Mcp.Tests`; the earlier "xUnit v3 + FluentAssertions" note was inaccurate for this repo). `ProjectReference` to `Dev.Mcp`. `ProcessRunner` and `PatchService` are `public`.
- Add a minimal `.sln` tying `Dev.Mcp` + `Dev.Mcp.Tests` together.

### 4.2 ProcessRunner regression tests (core Bug-1 net)
Spawn the **real** `npm.cmd` / `npm` via the resolver against a fixture `package.json` written at test time:
- `pass` = `node -e "process.exit(0)"` → `ExitCode 0`, success.
- `fail` = `node -e "process.exit(1)"` → `ExitCode 1`, failure.
- `lingerpass` = script whose main prints, spawns a detached child that inherits+holds the pipe, then exits 0 → `ExitCode 0`, returns promptly, `TimedOut:false`.

This goes through the actual `.cmd` resolution — the true defect (not ProcessRunner fed a bare `node` command). **Fails before / passes after.**

### 4.3 Per-call-site pass+fail coverage
- **Angular build/test:** `ParseBuildOutput` / `ParseTestOutput` / `ParseJestOutput` (already `public static`), each asserting `exitCode 0 → success true` and `exitCode 1 → success false` at the mapping layer.
- **npm:** exercise the public `run_npm_script` tool method against the `pass` / `fail` fixtures and assert on the returned JSON `success` / `exitCode`. This gives the npm call site a genuine tool-level pass+fail (and, going through `npm.cmd`, also covers the bare-.cmd resolution) without needing access to the private `RunNpmInternalAsync`.

Every migrated runner thus has its own pass+fail coverage; the shared bare-.cmd + drain-race surface is covered once by §4.2 because all call sites share `ProcessRunner`.

### 4.4 PatchService EOL tests
Multi-line anchor on **CRLF**, **LF**, and **mixed-EOL** files (each asserts the patch applied *and* the dominant EOL preserved by inspecting bytes), plus single-line-on-CRLF no-regression. **Fails before / passes after.**

### 4.5 Verification runnable here vs. not
- Build + full Windows test run via dev-mcp `test_dotnet_solution` targeting `Dev.Mcp.Tests.csproj`.
- Each migrated call site checked against a known pass and known fail before merge.
- **POSIX gap (explicit):** this machine is Windows-only (the Bash tool is Git Bash, still Windows). The "one POSIX OS" acceptance criterion cannot be executed locally — tests are written OS-portable and this is flagged as a **required CI/WSL/container check**, not claimed as locally verified.
- **Playwright:** left out of the automated suite; a documented opt-in manual smoke script only.

---

## 5. Acceptance-criteria mapping

**Bug 1**
- Script exits 0 (node `process.exit(0)`, Playwright passing) → `success:true / exitCode:0` — §3.1 B + §4.2.
- Script exits non-zero (node `process.exit(1)`, Playwright failing) → `success:false / exitCode:1` — §4.2/§4.3.
- Verified on Windows (local) and one POSIX OS (CI — §4.5).
- Regression tests for passing + failing — §4.2.
- Generic fix at the exit-code layer benefiting other runners — §3.1 (shared ProcessRunner).

**Bug 2**
- Multi-line anchor matches+patches on CRLF, LF, mixed-EOL — §3.3 + §4.4.
- Original dominant EOL preserved (CRLF stays CRLF) — §3.3 step 5 + §4.4 byte assertions.
- Single-line anchors still work — §3.3 + §4.4.
- Regression tests for CRLF + LF + mixed with multi-line anchors — §4.4.
- Verified on Windows — §4.5.

---

## 6. Scope boundaries, fast-follow & behaviour notes

- **In scope now:** `run_npm_script`, `build_angular_project`, `test_angular_project` migrated to `ProcessRunner`; Bug 2 anchor fix; new test project.
- **Fast-follow (tracked, not in this change):**
  - **tsc compiler-gate** in `PatchService` — same bare-.cmd bug; needs a sync→async touch on `ApplyTextPatch`. Tracked as task `task_ece0abdc`, with its own regression test reusing the node/pipe fixtures. *Interim risk:* until migrated, the tsc compile-gate of `apply_text_patch` can mis-signal under the stream-drain race on Windows — acceptable short-term (validation gate, lower frequency than `run_npm_script`, no observed misbehaviour), to be closed near-term.
  - **DotnetRunner** — `dotnet` is a real exe (no bare-.cmd bug) but shares the stream-drain race; migrate when convenient.
  - **git spawns** — inherit the fix when migrated.
- **Behaviour change to flag (decide-do-mention):** the resolver prefers a project-local `node_modules/.bin/ng` over a global one — correct npm/npx semantics and a robustness gain, but a visible change from today's global-only resolution.
- **Observed but out of scope:** `ApplyLinePatch` joins with `Environment.NewLine` (CRLF on Windows), which can normalise an LF file's EOLs in line-range mode. Separate from Bug 2 (anchor mode); noted for a future pass.

---

## 7. Risks

- **Grace-window tuning:** too short truncates trailing output on legitimately slow-flushing children; too long delays return when a child holds the pipe. Pick a small default (≈2 s) with the process timeout as the hard ceiling; output truncation is cosmetic, exit-code fidelity is not affected.
- **Local-CLI resolution** (§6) could pick an unexpected project-local binary — mitigated by it being the correct, documented behaviour and covered by the known pass/fail checks per call site.
- **POSIX coverage** depends on CI (§4.5) — must not be reported as locally verified.
