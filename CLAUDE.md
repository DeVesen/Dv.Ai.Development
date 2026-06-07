# Dv.Ai.Development — Claude Code Guide

This repository is the **source library** for dual-platform AI workflow artifacts (skills, rules, agents) targeting both **Cursor** and **Claude Code**.

---

## Repository Structure

```
AI-Skills/              Source library — do not edit deployed copies
├── agents/             Dual-use agent profiles (.md)
├── skills/             Skill packages (SKILL.md + references/)
├── rules/              Cursor MDC rules (.mdc) — Cursor only
├── packages/           Package manifests (JSON) — define what gets deployed
├── references/         Shared references (subagent-model-before-task.md etc.)
├── install-skill.ps1   Deploy script (Windows/PowerShell)
├── install-skill.sh    Deploy script (Linux/macOS)
├── update-skill.ps1    Update script (Windows/PowerShell)
└── Readme.md           Full package reference + install instructions (= AGENTS.md after deploy)

.claude/
└── skills/
    ├── skill-creator/  Meta-skill: create/improve skills, rules, and agent profiles
    └── work-review/    Quality review: 4 parallel reviewer agents on any deliverable
```

---

## Key Skills (Claude Code)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/skill-creator` | `create skill`, `new rule`, `agent profil` | Create/improve skills, rules, agents for both platforms |
| `/work-review` | After completing any deliverable | 4-reviewer quality gate (Pessimist, Lehrer, Normalo, Professor) |

---

## Deploying to a Project

AI-Skills artifacts must be deployed into a target project before they are active.

**Linux/macOS:**
```bash
# Cursor + Claude Code
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude

# Cursor only
./AI-Skills/install-skill.sh all /path/to/project/.cursor

# Preview without copying
./AI-Skills/install-skill.sh planning-workflow /path/to/project/.cursor /path/to/project/.claude --dry-run
```

**Windows (PowerShell):**
```powershell
# Cursor + Claude Code (also handles MCP config interactively)
.\AI-Skills\install-skill.ps1 all C:\project\.cursor C:\project\.claude

# Update existing install (preserves MCP settings, prompts for new params)
.\AI-Skills\update-skill.ps1 all C:\project\.cursor C:\project\.claude
```

**What goes where:**

| Artifact | `.cursor/` | `.claude/` |
|----------|-----------|-----------|
| Rules (`.mdc`) | ✓ `rules/` | — Cursor only |
| Skills | ✓ `skills/<name>/` | ✓ `skills/<name>/` |
| Agents | ✓ `agents/` | ✓ `agents/` |
| References | ✓ `references/` | ✓ `references/` |
| Docs (AGENTS.md) | ✓ root | — |

---

## Adding or Changing a Skill / Rule / Agent

Always update all four artifacts together — missing any one breaks the deploy for other users:

| Step | File |
|------|------|
| 1. Edit content | `AI-Skills/skills/<name>/`, `agents/<name>.md`, `rules/<name>.mdc` |
| 2. Update package manifest | `AI-Skills/packages/<name>.json` — add new files to `skills`, `agents`, `rules`, `references`, `params` |
| 3. Update Readme | `AI-Skills/Readme.md` — sync Operations, Rules, Skills, Sub-Agents, Parameters tables |
| 4. Sync parameters | `{platzhalter}` in content → list in `packages/<name>.json` `"params"` array + Readme Parameters table |

Use `/skill-creator` to create new artifacts — it knows both Cursor and Claude Code conventions.

---

## Platform Notes

**Cursor** activates skills via Rules (`.mdc`). Rules auto-inject context based on file patterns or keywords, and route to agent profiles in `.cursor/agents/`.

**Claude Code** invokes skills directly (`/skill-name`) or via the `Skill` tool. Agent profiles in `.claude/agents/` are auto-discovered. Skills reference agents via relative paths — no `.claude/agents/` copy needed for skill-driven delegation.

**Rules are Cursor-only.** Claude Code does not use `.mdc` files. The trigger equivalent in Claude Code is the skill's `description` + `when_to_use` frontmatter.
