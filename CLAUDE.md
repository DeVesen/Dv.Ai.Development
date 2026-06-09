# Dv.Ai.Development — Claude Code Guide

This repository is the **source library** for dual-platform AI workflow artifacts (skills, rules, agents) targeting both **Cursor** and **Claude Code**.

**Cursor entry point:** [`AGENTS.md`](./AGENTS.md) — thin pointer to this file. Architecture, deploy workflow, and `.claude/` conventions are documented here only; do not duplicate them in `AGENTS.md` or elsewhere.

---

## Repository Structure

```
AI-Skills/              Source library — do not edit deployed copies
├── agents/             Dual-use agent profiles (.md)
├── skills/             Skill packages (SKILL.md + references/)
├── rules/              Cursor MDC rules (.mdc) — Cursor only
├── packages/           Package manifests (JSON) — define what gets deployed
├── references/         Shared references (subagent-model-before-task.md etc.)
├── install-cursor-skills.ps1   Deploy script (Windows/PowerShell)
├── install-skill.sh            Deploy script (Linux/macOS)
├── update-cursor-skills.ps1    Update script (Windows/PowerShell, handles params + MCP)
└── Readme.md           Full package reference + install instructions (= AGENTS.md after deploy)

.claude/                Claude Code config for this repo (skills used here)
└── skills/
    ├── skill-creator/  Meta-skill: create/improve skills, rules, and agent profiles
    └── work-review/    Quality review: 4 parallel reviewer agents on any deliverable
```

Note: `.claude/agents/` and `.cursor/` are populated in **target projects** after deployment — they do not exist in this source repo.

---

## Key Skills (Claude Code)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/skill-creator` | `create skill`, `new rule`, `agent profil` | Create/improve skills, rules, agents for both platforms |
| `/work-review` | After completing any deliverable | 4-reviewer quality gate (Pessimist, Lehrer, Normalo, Professor) |

---

## Deploying to a Project

AI-Skills artifacts must be deployed into a target project before they are active. The target project's `.cursor/` and `.claude/` directories must already exist.

**Step 0 — browse available packages:**
```bash
./AI-Skills/install-skill.sh --list
```

**Linux/macOS — install:**
```bash
# Cursor + Claude Code
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude

# Cursor only
./AI-Skills/install-skill.sh all /path/to/project/.cursor

# Preview without copying (target dirs need not exist for dry-run)
./AI-Skills/install-skill.sh planning-workflow /path/to/project/.cursor /path/to/project/.claude --dry-run
```

**Linux/macOS — update (re-run install, replaces files, MCP not touched):**
```bash
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude
```

**Windows (PowerShell):**
```powershell
# List packages
.\AI-Skills\install-cursor-skills.ps1 -List

# Cursor + Claude Code (also handles MCP config interactively; ADO is optional)
.\AI-Skills\install-cursor-skills.ps1 C:\project\.cursor C:\project\.claude

# Update existing install (manifest-based: removes stale files, updates present ones)
.\AI-Skills\update-cursor-skills.ps1 C:\project\.cursor C:\project\.claude
```

**Post-install — replace placeholders:**

Neither `install-skill.sh` nor `install-cursor-skills.ps1` substitutes `{param}` placeholders. After installing, replace them manually (or use `update-cursor-skills.ps1` on Windows for interactive prompts):

1. Check which params a package needs: `AI-Skills/packages/<name>.json` → `"params"` array
2. Search deployed files: `grep -r '{frontend-path}' /path/to/project/.cursor/`
3. Replace in all matched files

**What goes where (in target projects):**

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

**Claude Code** invokes skills directly (`/skill-name`) or via the `Skill` tool. The harness uses the skill's `description` + `when_to_use` frontmatter for automatic selection. Agent profiles deployed to `.claude/agents/` are auto-discovered; skills can also reference agent files directly to delegate with full agent context.

**Rules are Cursor-only.** Claude Code does not use `.mdc` files. The trigger equivalent in Claude Code is the skill's `description` + `when_to_use` frontmatter.
