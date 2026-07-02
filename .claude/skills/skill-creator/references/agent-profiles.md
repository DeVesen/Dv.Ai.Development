# Agent Profiles — Complete Reference

Agent profiles are Markdown files with YAML frontmatter located in `.claude/agents/`.

---

## Claude Code — all frontmatter fields

File location: `.claude/agents/` (project) or `~/.claude/agents/` (personal).
Subdirectories are scanned recursively. Identity comes from the `name` field, not the filename.

```yaml
---
# Required
name: agent-name               # lowercase, hyphens; used in Agent(agent-name) tool calls
description: >                 # when Claude should delegate to this agent (required)
  Senior architect. Plans features in 6 phases; delegates Scout, Topic-Planner, Reviewers.
  Returns phase-6 plan package. Does NOT implement. Use proactively for architecture,
  refactor, feature planning. Alias: planer.

# Model
model: inherit                 # inherit (default) | sonnet | opus | haiku | full-model-id

# Tool access
tools: Read, Grep, Glob, Bash  # allowlist — only listed tools available
disallowedTools: Write, Edit   # denylist — inherits all except these
# If both set: disallowedTools applied first, then tools resolved against remainder

# Permissions
permissionMode: default        # default | acceptEdits | auto | dontAsk | bypassPermissions | plan

# Execution control
maxTurns: 10                   # max agentic turns before agent stops
background: false              # true = always run as background task
effort: high                   # low|medium|high|xhigh|max (overrides session effort)
isolation: worktree            # worktree = isolated git copy; cleaned up automatically if
                               # agent makes no changes. If changes exist: worktree path is
                               # returned in the result — user must merge manually.

# Context enrichment
skills:                        # preload full skill content at startup (not just description)
  - feature-delivery
  - caveman
mcpServers:                    # MCP servers scoped to this agent
  - github                     # string = reference to existing configured server
  - playwright:                # inline definition
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]

# Memory
memory: project                # user | project | local
# user   → ~/.claude/agent-memory/<name>/
# project → .claude/agent-memory/<name>/  (shareable via version control)
# local  → .claude/agent-memory-local/<name>/  (not committed)

# Hooks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"

# UI
color: blue                    # red|blue|green|yellow|purple|orange|pink|cyan

# Main-agent use (claude --agent)
initialPrompt: "Start by reading AGENTS.md"
---

[Markdown body = system prompt]
```

### Unavailable tools in subagents

These tools are never available to subagents regardless of `tools` field:
`Agent`, `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode`, `ScheduleWakeup`, `WaitForMcpServers`

Subagents cannot spawn other subagents.

### Tool syntax variants

```yaml
tools: Read, Grep, Glob, Bash          # simple list
tools: Agent(worker, researcher), Read # restrict which subagents can be spawned
tools: Bash(git add *), Bash(git commit *) # restrict specific Bash commands
```

> **`Agent(worker, researcher)` context:** The `Agent` tool is only available to top-level
> orchestrators — agents running as the main session (e.g. via `claude --agent`) or the root
> Claude Code session. **Subagents cannot spawn other subagents.** The `Agent` tool is never
> available inside a subagent regardless of what is listed in `tools`.

---

## Cursor — frontmatter fields

File location: `.cursor/agents/` (project) or `~/.cursor/agents/` (personal).

```yaml
---
name: agent-name
model: auto                    # auto | specific model ID (e.g. gpt-4o, claude-sonnet-4-6)
description: >
  Same delegation trigger as Claude Code. Keyword-first, imperative.
# Cursor-specific (Claude Code ignores):
readonly: false                # true = agent cannot modify files
is_background: false           # true = run in background
---

[Markdown body = system prompt / fresh context]
```

---

## Dual-use pattern (single source of truth)

Write one file that satisfies both systems:

```markdown
---
name: plan-agent
# model: omit for platform default (Claude Code → inherit; Cursor → auto)
#        'inherit' is Claude Code-specific; Cursor may treat it as unknown model ID.
#        Use a full model-id (e.g. claude-sonnet-4-6) only if both platforms must share it.
description: >
  Senior-Architekt und Planungs-Orchestrator (Planning Workflow). Führt Phasen 1, 2, 4a, 4c, 6 aus;
  delegiert Scout, Topic-Planer und Review. Liefert Phase-6-Planpaket. Implementiert nicht.
  Use proactively für Architektur, Refactor, Feature-Planung. Alias: Planer.

# Claude Code only (Cursor treats these as unknown YAML keys and ignores them):
tools: Read, Grep, Glob, Bash, Agent  # Agent only valid when profile runs as top-level orchestrator
disallowedTools: Write, Edit
permissionMode: default
memory: project
skills:
  - feature-delivery
  - caveman
  - codebase-analyzer
---

## Rolle

[Full system prompt follows — both Cursor and Claude Code use this as the system prompt]
```

**File placement (single source — no content duplication):**
- Shared source: `Cursor-AI-Skills/agents/agent-name.md`
- **Cursor:** symlink → `.cursor/agents/agent-name.md` — always required (Cursor only discovers agents here)
- **Claude Code (skill-driven):** link the file from SKILL.md body using the Subagent reference pattern — Claude Code reads it directly; no `.claude/agents/` entry needed
- **Claude Code (auto-discovery):** symlink → `.claude/agents/agent-name.md` — only if the agent should be discoverable outside of a skill context

**What each system does with the file:**
- **Cursor:** reads Markdown body as fresh subagent context (no parent conversation history)
- **Claude Code:** reads YAML as agent definition; body as system prompt

---

## Built-in Claude Code agents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `Explore` | Haiku | Read-only | Fast codebase search; skips CLAUDE.md |
| `Plan` | inherit | Read-only | Research during plan mode; skips CLAUDE.md |
| `general-purpose` | inherit | All | Complex multi-step tasks |

`Explore` and `Plan` skip CLAUDE.md and git status to stay fast and cheap. All other agents
(built-in and custom) load CLAUDE.md.

---

## Skills preloading

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

The full SKILL.md content (not just description) is injected at startup. The agent can also
invoke any project/user/plugin skill via the Skill tool during execution. Skills with
`disable-model-invocation: true` cannot be preloaded.

---

## Memory

With `memory: project`, Claude Code creates `.claude/agent-memory/<name>/` containing
`MEMORY.md`. The agent's system prompt is automatically extended with:
- Path to memory directory
- Instructions to read/write MEMORY.md
- First 200 lines or 25KB of MEMORY.md (whichever comes first)

Ask the agent to maintain its memory explicitly:
```markdown
Update your agent memory as you discover codepaths, patterns, and architectural decisions.
After completing a task: save what you learned to your memory.
```

---

## Permission modes

| Mode | Behavior |
|------|---------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits in working directory |
| `auto` | Agent runs autonomously without per-tool prompts; standard permission model still applies |
| `dontAsk` | Auto-proceed without prompting — no permission requests shown; agent does not pause to ask |
| `bypassPermissions` | Skip all permission prompts (use with extreme caution) |
| `plan` | Read-only plan mode |

Parent's `bypassPermissions` or `acceptEdits` always overrides child agent's `permissionMode`.

---

## Agent description quality

The description is the delegation trigger. Write it so the model can pattern-match to it:

```
[Role] — [Key actions, comma-separated].
[Output format / deliverable]. [Non-goals — explicit].
Use proactively [when / trigger condition]. Alias: [alternative names].
```

**Good:**
```
Senior code reviewer. Checks PR diff for security vulnerabilities, correctness, style.
Returns numbered findings with file:line references. Does NOT implement fixes.
Use proactively after code changes or before merge. Alias: reviewer.
```

**Bad:**
```
Helps with reviewing code things when asked.
```

---

## subagent-model-before-task pattern

When an orchestrator agent delegates to a sub-agent, read the sub-agent's profile to get
the model slug before each task. Do not hardcode or duplicate model slugs in the
orchestrator:

```markdown
Sub-agent: [`agents/implement-scribe-agent.md`](agents/implement-scribe-agent.md)
Read `## Modell` section before each delegation. Do not duplicate slugs here.
```

This ensures model changes propagate from a single source.

---

## Agent scope and priority

| Location | Scope | Priority |
|----------|-------|---------|
| Managed settings | Organization | 1 (highest) |
| `--agents` CLI flag | Current session | 2 |
| `.claude/agents/` | Current project | 3 |
| `~/.claude/agents/` | All projects | 4 |
| Plugin `agents/` directory | Plugin scope | 5 (lowest) |

When multiple agents share the same `name`, higher priority wins. Keep `name` values unique
within each scope level.

---

## Field compatibility summary

| Field | Claude Code | Cursor |
|-------|-------------|--------|
| `name` | Required | Required |
| `description` | Required | Required |
| `model` | inherit/sonnet/opus/haiku/full-id | auto/model-id |
| `tools` | Allowlist | Ignored |
| `disallowedTools` | Denylist | Ignored |
| `permissionMode` | Permission mode | Ignored |
| `maxTurns` | Turn cap | Ignored |
| `skills` | Preload skills | Ignored |
| `mcpServers` | MCP server scope | Ignored |
| `hooks` | Lifecycle hooks | Ignored |
| `memory` | Persistent memory | Ignored |
| `background` | Background task | Ignored |
| `effort` | Effort override | Ignored |
| `isolation` | Git worktree | Ignored |
| `color` | UI color | Ignored |
| `initialPrompt` | Auto-submit first turn | Ignored |
| `readonly` | Ignored | Read-only mode |
| `is_background` | Ignored | Background task |
