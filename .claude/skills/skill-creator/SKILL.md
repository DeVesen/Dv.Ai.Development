---
name: skill-creator
description: >
  Create, edit, and optimize AI workflow artifacts for Cursor and Claude Code: SKILL.md skill
  files, Cursor .mdc rules (Always/Auto-Attached/Agent-Requested/Manual), and agent profiles
  (.claude/agents/, .cursor/agents/). Produces token-dense descriptions, dual-platform agent
  files, correct rule→agent wiring. Use proactively when creating any skill, rule, or agent;
  improving or reviewing existing ones; running evals; or optimizing description triggering.
when_to_use: >
  Trigger: "create skill", "new rule", "mdc erstellen", "agent profil", "sub-agent",
  "cursorrules", "skill verbessern", "description optimieren", "rules schreiben",
  "agent-datei", ".cursor/rules", ".claude/agents", SKILL.md pasted for review/improvement.
  Aliases: /rule-creator, /agent-creator.
---

# Skill Creator

A meta-skill for creating and iterating on AI workflow artifacts. Three artifact types exist —
know which one you need before writing anything.

Calibrate communication to user familiarity: "evaluation" and "benchmark" are fine; explain
"JSON" and "assertion" if the user seems non-technical.

---

## Which artifact?

| Situation | Artifact | File |
|-----------|----------|------|
| Repeatable workflow / process (Claude-driven) | **Skill** (SKILL.md) | `.claude/skills/` or `skills/` |
| Auto-inject context by file pattern or phrase (Cursor-only) | **Rule** (.mdc) | `.cursor/rules/` |
| Specialized agent: own context window, model, tools | **Agent profile** (.md) | `.claude/agents/` / `agents/` |
| Skill needs isolation from main conversation | Skill + `context: fork` + `agent:` | — |
| Rule must delegate to defined agent behavior | Rule links agent profile | — |

**Migration note:** existing skills in `.claude/skills/` continue to work unchanged. The new
sections extend, not replace, the existing format.

---

## Creating / Editing a Skill

### Capture Intent

The current conversation may already contain a workflow to capture — extract steps, tools used,
corrections, and input/output formats before asking. Then confirm:

1. What should this skill enable Claude to do?
2. When should it trigger? (phrases, contexts)
3. Expected output format?
4. Does it need test cases? (yes for deterministic outputs; optional for subjective ones)

### Interview and Research

Ask about edge cases, input/output formats, example files, success criteria, dependencies. Check
available MCPs for research. Come prepared with context to reduce burden on the user.

### Write the SKILL.md

#### Frontmatter — all fields

| Field | Value / Notes |
|-------|--------------|
| `name` | Display name; directory name = the /command |
| `description` | Primary trigger — key use case first; ≤ 1536 chars with `when_to_use` |
| `when_to_use` | Extra trigger phrases (Claude Code only; Cursor ignores) |
| `argument-hint` | Hint in autocomplete, e.g. `[issue-number]` |
| `arguments` | Named positional args for `$name` substitution |
| `disable-model-invocation: true` | Manual /skill-name only; removes from Claude's context |
| `user-invocable: false` | Claude-only; hides from /menu |
| `allowed-tools` | Auto-approved without per-use prompt, e.g. `"Read Grep Bash(git *)"` |
| `disallowed-tools` | Removed from pool while skill active |
| `model` | `sonnet\|opus\|haiku\|full-id\|inherit` |
| `effort` | `low\|medium\|high\|xhigh\|max` |
| `context: fork` | Run in isolated subagent (Claude Code only) |
| `agent` | `Explore\|Plan\|general-purpose\|<custom-name>` |
| `paths` | Glob — auto-activate only for matching files |
| `hooks` | Skill lifecycle hooks (PreToolUse, PostToolUse, etc.) |
| `shell` | `bash` (default) or `powershell` for `` !`cmd` `` blocks |

**Naming:** Skill frontmatter uses kebab-case (`allowed-tools`, `disallowed-tools`). Agent profiles use camelCase (`tools`, `disallowedTools`). These are separate fields for separate systems.

**Description quality**: keyword-first, imperative. To push: add `"Make sure to use whenever..."`.

#### Dynamic Context Injection (Claude Code)

```
!`git diff HEAD`           # inline — only at line start or after whitespace
```!
node --version
git log --oneline -5
```                         # multi-line block
```
Executed before Claude sees the skill. Output replaces the placeholder — Claude sees real data.
`disable-model-invocation: true` blocks this for skills users haven't opted into.

#### String Substitution

| Placeholder | Value |
|-------------|-------|
| `$ARGUMENTS` | All args after `/skill-name` |
| `$0`, `$1` … | Positional args (0-based) |
| `$name` | Named arg from `arguments:` frontmatter |
| `${CLAUDE_SKILL_DIR}` | Skill's own directory (use for bundled scripts) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_EFFORT}` | Active effort level |

#### Skill lifecycle

After invocation, SKILL.md content stays in context for the session. At compaction: 5,000 token
budget per skill, 25,000 total — most recently invoked wins. With `skills:` in an agent profile,
full content injects at startup instead of on-demand.

### Skill Writing Guide

#### Anatomy

```
my-skill/
├── SKILL.md              required — overview and navigation
├── agents/               sub-agent profiles referenced from this skill
│   └── worker.md
├── references/           large docs loaded on demand (link from SKILL.md)
│   └── api-docs.md
└── scripts/              executed, not loaded into context
    └── validate.sh
```

Keep SKILL.md under 500 lines. Push large reference material to `references/` with a note on
when to read it. For files >300 lines, include a table of contents.

**Sub-agent reference pattern** (Claude Code follows these links; Cursor agents use the same `.md` file directly via `.cursor/agents/` — no duplication needed):
```markdown
Subagent: [`agents/worker.md`](agents/worker.md)
Read full profile before delegation. Do not repeat model slug or behavior here.
```

#### Writing patterns

Use imperative form. Explain *why* behind requirements rather than heavy-handed MUSTs. Define
output format with an exact template. Include 1–2 input→output examples. Generalize from
feedback — avoid overfit to specific test cases.

#### Principle of Lack of Surprise

Skills must not contain malware, exploit code, or anything that would surprise the user if
described plainly.

### Test Cases

Write 2–3 realistic test prompts. Share with user for confirmation. Save to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    { "id": 1, "prompt": "User's task prompt", "expected_output": "Expected result", "files": [] }
  ]
}
```

---

## Creating a Cursor Rule (.mdc)

Use a rule when behavior must **auto-inject into Cursor** based on file context or recognized
phrases — without the user invoking anything explicitly. Rules are **Cursor-only**; Claude Code
has no equivalent (.mdc files are ignored there).

### Four activation modes

```yaml
# 1. Always — every conversation (expensive; use only for foundational project-wide context)
---
alwaysApply: true
---
Keep always-rules short: every token costs in every request.

# 2. Auto-Attached — loads when matching files are in context
---
globs: "src/**/*.ts, **/*.spec.ts"
---
Glob syntax: src/**/*.tsx matches subdirs; src/*.tsx matches src/ root only.

# 3. Agent-Requested — agent reads description and decides (no globs, alwaysApply: false)
---
description: "EF Core Migrations. Load when dotnet migration, DbContext, Add-Migration in scope."
alwaysApply: false
---

# 4. Manual — user explicitly requests via @rule-name (empty frontmatter, no globs)
---
---
```

### Agent-Requested description quality

Keyword-first, imperative: `"Angular Components. Load when Angular, Component, Signal in scope."` — not `"Use for Angular stuff"`.

### Rule → agent profile reference pattern

Rule = *routing* (triggers, opt-out, priority). Agent profile = *behavior*. Never duplicate.

```markdown
## Mandatory activation

Recognized intent → read full agent profile before responding:

[`agents/plan-agent.md`](../agents/plan-agent.md)

Phase model and workflow defined there only. Opt-out: `ohne plan-agent`
```

→ Full reference: [`references/cursor-rules.md`](references/cursor-rules.md)

---

## Creating an Agent Profile

Use an agent profile when you need a **specialized context window** with its own model, tools,
and system prompt — reusable across skills and rules without duplicating behavior.

### Dual-use pattern (single source of truth)

One `.md` file works for both Cursor and Claude Code. Both systems read the YAML frontmatter
for configuration and the Markdown body as the system prompt. Claude Code-only fields are
ignored by Cursor; Cursor-only fields are ignored by Claude Code:

```markdown
---
name: agent-name               # required by both: unique identifier
# model: omit for platform default (Claude Code → inherit; Cursor → auto)
#        or use full model-id for explicit control (e.g. claude-sonnet-4-6)
#        — no shared alias exists between platforms
description: >                 # required by both: delegation trigger (keyword-first)
  Senior code reviewer. Checks PR diff for security, correctness, style violations.
  Returns numbered findings with file:line references. Does NOT implement fixes.
  Use proactively after code changes or before merge. Alias: reviewer.

# Claude Code-only fields (Cursor ignores these silently):
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
permissionMode: acceptEdits
memory: project
skills:
  - api-conventions
---

[Markdown body = system prompt for BOTH systems]
```

**Shared source:** `Cursor-AI-Skills/agents/agent-name.md` (single file, no content duplication):
- Symlink → `.cursor/agents/agent-name.md` — **required** for Cursor to discover the agent
- **Claude Code via skill reference** (Subagent reference pattern): link the file in SKILL.md body → Claude Code reads it directly — `.claude/agents/` is **not** needed
- Symlink → `.claude/agents/agent-name.md` — only needed if the agent should be **auto-discoverable** by Claude Code *without* a skill referencing it

**Cursor:** reads Markdown body as fresh subagent context (no parent conversation history). **Claude Code:** reads YAML + body.
**Note:** Claude Code-only fields (`tools`, `disallowedTools`, `memory`, etc.) are not recognized by Cursor's YAML parser and are treated as unknown keys — standard YAML behavior, but verify with your Cursor version.

### Agent description quality

Formula: `[Role] — [Key actions]. [Output]. [Non-goals]. Use proactively [trigger]. Alias: [name].`

Elements: keyword-first role + actions (delegation trigger) · output format · explicit non-goals · `Use proactively` · `Alias:` for `@mention`.

### Key Claude Code frontmatter fields

| Field | Effect |
|-------|--------|
| `tools: Read, Grep` | Allowlist — only listed tools available |
| `disallowedTools: Write` | Denylist — inherits all except these |
| `permissionMode: acceptEdits` | 6 modes: `default` · `acceptEdits` · `auto` · `dontAsk` · `bypassPermissions` · `plan` — see references/agent-profiles.md |
| `maxTurns: 8` | Cap agentic turns |
| `skills: [my-skill]` | Preload full skill content at startup |
| `memory: project` | Persist knowledge in `.claude/agent-memory/` |
| `isolation: worktree` | Isolated git worktree per invocation |
| `background: true` | Always run as background task |
| `color: blue` | UI display color |

Note: subagents cannot spawn other subagents in Claude Code.

→ Full reference: [`references/agent-profiles.md`](references/agent-profiles.md)

---

## Dual-Platform Quick Reference

### Field compatibility table

| Field | Claude Code (agents) | Cursor (agents) |
|-------|---------------------|-----------------|
| `name` | Unique identifier (required) | Agent name (required) |
| `description` | Delegation trigger (required) | Delegation trigger (required) |
| `model` | inherit/sonnet/opus/haiku/full-id | auto/model-id |
| `tools` | Allowlist | Ignored |
| `disallowedTools` | Denylist | Ignored |
| `permissionMode` | Permission mode | Ignored |
| `skills` | Preload skills at startup | Ignored |
| `memory` | Persistent memory scope | Ignored |
| `isolation` | Git worktree | Ignored |
| `background` | Run as background task | Ignored |
| `is_background` | Ignored | Run in background (Cursor-specific) |
| `readonly` | Ignored | Read-only mode (Cursor-specific) |

### Token-dense description formula

`[Role] — [Key actions]. [Output]. [Non-goals]. Use proactively [trigger]. Alias: [name].`

**Budget:** `description` + `when_to_use` ≤ 1,536 chars (Claude Code). No hard limit in Cursor, keep concise.

---

## Running and evaluating test cases

This section is one continuous sequence — don't stop partway through. Do NOT use `/skill-test` or any other testing skill.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Within the workspace, organize results by iteration (`iteration-1/`, `iteration-2/`, etc.) and within that, each test case gets a directory (`eval-0/`, `eval-1/`, etc.). Don't create all of this upfront — just create directories as you go.

### Step 1: Spawn all runs (with-skill AND baseline) in the same turn

For each test case, spawn two subagents in the same turn — one with the skill, one without. Launch everything at once so it all finishes around the same time.

**With-skill run:**

```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
- Outputs to save: <what the user cares about>
```

**Baseline run** (same prompt, but the baseline depends on context):

- **Creating a new skill**: no skill at all. Same prompt, no skill path, save to `without_skill/outputs/`.
- **Improving an existing skill**: the old version. Before editing, snapshot the skill (`cp -r <skill-path> <workspace>/skill-snapshot/`), then point the baseline subagent at the snapshot. Save to `old_skill/outputs/`.

Write an `eval_metadata.json` for each test case:

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

### Step 2: While runs are in progress, draft assertions

Don't just wait for the runs to finish — draft quantitative assertions for each test case and explain them to the user. Good assertions are objectively verifiable and have descriptive names. Update the `eval_metadata.json` files and `evals/evals.json` with the assertions once drafted.

### Step 3: As runs complete, capture timing data

When each subagent task completes, save timing data immediately to `timing.json` in the run directory:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

### Step 4: Grade, aggregate, and launch the viewer

Once all runs are done:

1. **Grade each run** — spawn a grader subagent (or grade inline) that reads `agents/grader.md` and evaluates each assertion against the outputs. Save results to `grading.json` in each run directory. The grading.json expectations array must use the fields `text`, `passed`, and `evidence`.
1. **Aggregate into benchmark** — run the aggregation script from the skill-creator directory:
   
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```
1. **Launch the eval viewer** — from the skill-creator directory:
   
   ```bash
   python -m eval-viewer.generate_review <workspace>/iteration-N --background
   VIEWER_PID=$!
   ```
   
   Open the URL it prints, share it with the user, and wait for them to review.

### Step 5: Read the feedback

When the user tells you they're done, read `feedback.json`. Empty feedback means the user thought it was fine. Focus improvements on test cases where the user had specific complaints.

Kill the viewer server when done:

```bash
kill $VIEWER_PID 2>/dev/null
```

-----

## Improving the skill

### How to think about improvements

1. **Generalize from the feedback.** Create skills that work across many prompts, not just the test examples. Avoid overfitty changes or oppressively constrictive MUSTs.
1. **Keep the prompt lean.** Remove things that aren't pulling their weight. Read the transcripts, not just the final outputs.
1. **Explain the why.** Try to explain the **why** behind everything you're asking the model to do. If you find yourself writing ALWAYS or NEVER in all caps, reframe and explain the reasoning instead.
1. **Look for repeated work across test cases.** If all test cases resulted in the subagent writing similar helper scripts, bundle that script in `scripts/` and tell the skill to use it.

### The iteration loop

After improving the skill:

1. Apply your improvements to the skill
1. Rerun all test cases into a new `iteration-<N+1>/` directory, including baseline runs
1. Launch the reviewer with `--previous-workspace` pointing at the previous iteration
1. Wait for the user to review and tell you they're done
1. Read the new feedback, improve again, repeat

Keep going until the user says they're happy, feedback is all empty, or you're not making meaningful progress.

-----

## Description Optimization

The description field in SKILL.md frontmatter is the primary mechanism that determines whether Claude invokes a skill. After creating or improving a skill, offer to optimize the description for better triggering accuracy.

### Step 1: Generate trigger eval queries

Create 20 eval queries — a mix of should-trigger and should-not-trigger. Save as JSON:

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

For **should-trigger** queries (8-10): different phrasings of the same intent — some formal, some casual. Include cases where the user doesn't explicitly name the skill but clearly needs it.

For **should-not-trigger** queries (8-10): near-misses — queries that share keywords but actually need something different. Make them genuinely tricky, not obviously irrelevant.

### Step 2: Review with user

Present the eval set to the user for review using the HTML template:

1. Read the template from `assets/eval_review.html`
1. Replace `__EVAL_DATA_PLACEHOLDER__` with the JSON array, `__SKILL_NAME_PLACEHOLDER__` with the skill's name, `__SKILL_DESCRIPTION_PLACEHOLDER__` with the current description
1. Write to `/tmp/eval_review_<skill-name>.html` and open it: `open /tmp/eval_review_<skill-name>.html`
1. The user edits queries, toggles should-trigger, then clicks "Export Eval Set"
1. Check `~/Downloads/` for the most recent `eval_set.json`

### Step 3: Run the optimization loop

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

Periodically tail the output to give the user updates. The loop splits the eval set into 60% train and 40% held-out test, evaluates the current description (running each query 3 times), proposes improvements based on failures, and iterates up to 5 times. Returns JSON with `best_description` — selected by test score to avoid overfitting.

### Step 4: Apply the result

Take `best_description` from the JSON output and update the skill's SKILL.md frontmatter. Show the user before/after and report the scores.

-----

## Claude.ai-specific instructions

**Running test cases**: No subagents means no parallel execution. For each test case, read the skill's SKILL.md, then follow its instructions to accomplish the test prompt yourself. Do them one at a time. Skip the baseline runs — just use the skill to complete the task as requested.

**Reviewing results**: If you can't open a browser, present results directly in the conversation. For each test case, show the prompt and the output. If the output is a file the user needs to see, save it to the filesystem and tell them where it is. Ask for feedback inline.

**Benchmarking**: Skip quantitative benchmarking — focus on qualitative feedback from the user.

**Description optimization**: Requires the `claude` CLI tool (`claude -p`) — only available in Claude Code. Skip it if you're on Claude.ai.

**Blind comparison**: Requires subagents. Skip it.

**Packaging**: The `package_skill.py` script works anywhere with Python and a filesystem. Run it and the user can download the resulting `.skill` file.

**Updating an existing skill**:

- **Preserve the original name.** Use the existing directory name and `name` frontmatter field unchanged.
- **Copy to a writeable location before editing.** Copy to `/tmp/skill-name/`, edit there, and package from the copy.

-----

## Cowork-Specific Instructions

- You have subagents — the main workflow (spawn test cases in parallel, run baselines, grade, etc.) all works.
- No browser/display — use `--static <output_path>` to write a standalone HTML file instead of starting a server.
- GENERATE THE EVAL VIEWER *BEFORE* evaluating inputs yourself using `generate_review.py`.
- Feedback: since there's no running server, the viewer's "Submit All Reviews" button downloads `feedback.json`.
- Description optimization (`run_loop.py` / `run_eval.py`) works in Cowork since it uses `claude -p` via subprocess.
- **Updating an existing skill**: Follow the update guidance in the claude.ai section above.

-----

## Reference files

The `agents/` directory contains instructions for specialized subagents used in eval workflows:

- `agents/grader.md` — Evaluate assertions against outputs
- `agents/comparator.md` — Blind A/B comparison between two outputs
- `agents/analyzer.md` — Analyze why one version beat another

The `references/` directory has additional documentation:

- `references/schemas.md` — JSON structures for evals.json, grading.json, etc.
- `references/cursor-rules.md` — Complete Cursor .mdc rule reference (modes, glob syntax, best practices, anti-patterns)
- `references/agent-profiles.md` — Complete agent profile reference for Claude Code and Cursor (all fields, dual-use pattern, memory, permissions, agent teams)
