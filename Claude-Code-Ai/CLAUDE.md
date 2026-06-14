# Dv.Ai.Development — Claude Code Guide

This repository contains **AI workflow artifacts** (skills, agents, references) for Claude Code and **MCP server implementations** for Angular/.NET development.

---

## Repository Structure

```
.claude/                Claude Code — direkt nutzbar
├── skills/             25 Skills (via /skill-name oder automatisch)
│   ├── planning-workflow/
│   ├── implementation-workflow/
│   ├── buddy-agent/
│   ├── repo-scout-protocol/
│   ├── codebase-analyzer/
│   ├── build-log-filter/
│   ├── dev-tooling-mcp/
│   ├── dev-angular-mcp/
│   ├── dev-dotnet-mcp/
│   ├── dev-filesystem-mcp/
│   ├── angular-developer/
│   ├── angular-developer-extension/
│   ├── angular-cache-busting/
│   ├── angular-material/
│   ├── angular-material-custom-input/
│   ├── angular-new-app/
│   ├── angular-new-app-extension/
│   ├── angular-refactor/
│   ├── backend-ef-migrations/
│   ├── ado/
│   ├── describe-as/
│   ├── commit-message/
│   ├── conversation-insights/
│   ├── caveman/
│   ├── skill-creator/       Meta-skill: create/improve skills and agent profiles
│   ├── work-review/         Quality review: 4 parallel reviewer agents
│   └── work-review-iterative/  Iterative review loop until no findings remain
├── agents/             21 Sub-Agent-Profile (auto-discovered)
└── references/         Shared references (compliance, output-style, boilerplate)

Mcp-Servers/            MCP server implementations (Docker)
├── Build.Log.Filter.Mcp/   build-log-filter — Build/Test log compression
├── Codebase.Analyzer.Mcp/  codebase-analyzer — static analysis, index, review
├── Dev.Filesystem.Mcp/     dev-filesystem-mcp — token-efficient read/search
├── Dev.Angular.Mcp/        dev-angular-mcp — Angular scaffolding + build/test
└── Dev.Dotnet.Mcp/         dev-dotnet-mcp — .NET scaffolding + build/test

docs/                   Skill docs, MCP docs, enforcement references
├── skills/             Skill usage docs (usage, sub-agents, examples)
│   ├── planning-workflow.md
│   ├── implementation-workflow.md
│   ├── buddy-agent.md
│   ├── repo-scout-protocol.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   ├── dev-tooling-mcp.md
│   ├── angular-developer.md
│   ├── ado.md
│   ├── utility-skills.md
│   └── angular-material-v22-components.md
├── mcp/                MCP server reference docs
│   ├── dev-angular.md
│   ├── dev-dotnet.md
│   ├── dev-filesystem.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   └── scout-fallback-chain.md
├── silent-shortcut-prevention.md
└── output-style-enforcement.md
```

---

## Key Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/planning-workflow` | `plane`, `Roadmap`, `Architektur` | 6-Phasen-Planung mit Scouts, Topic-Planern, 5 Reviews |
| `/implementation-workflow` | `implementiere`, `fix`, `IMP-*` | Hard Gate, Slices, iterativer Review-Loop |
| `/buddy-agent` | `buddy intake`, `Sparring`, `plan-prompt` | Pre-Planning Sparring Partner |
| `/repo-scout-protocol` | `repo-check`, `Code-Scout` | MCP-First Repo-Recherche-Kette |
| `/codebase-analyzer` | Code-Gespräch, Review, Analyse | 31 MCP-Tools für Angular/.NET |
| `/build-log-filter` | `ng serve`, Shell-Fallback | Build/Test-Log-Filterung |
| `/angular-developer` | Angular-Arbeit | Signals, DI, Routing, Testing |
| `/skill-creator` | `create skill`, `agent profil` | Skills und Agents erstellen/verbessern |
| `/work-review` | Nach jedem Deliverable | 4-Reviewer Qualitäts-Gate |

---

## Adding or Changing a Skill / Agent

| Step | File |
|------|------|
| 1. Edit content | `.claude/skills/<name>/SKILL.md` + `references/` |
| 2. Edit agent | `.claude/agents/<name>.md` |
| 3. Update shared refs | `.claude/references/` |

Use `/skill-creator` to create new skills or agent profiles.

---

## Adding or Changing an MCP Server

| Folder | MCP Server Key | Skills |
|--------|---------------|--------|
| `Mcp-Servers/Build.Log.Filter.Mcp/` | `build-log-filter` | build-log-filter |
| `Mcp-Servers/Codebase.Analyzer.Mcp/` | `codebase-analyzer` | codebase-analyzer |
| `Mcp-Servers/Dev.Filesystem.Mcp/` | `dev-filesystem-mcp` | dev-filesystem-mcp, dev-tooling-mcp |
| `Mcp-Servers/Dev.Angular.Mcp/` | `dev-angular-mcp` | dev-angular-mcp, dev-tooling-mcp |
| `Mcp-Servers/Dev.Dotnet.Mcp/` | `dev-dotnet-mcp` | dev-dotnet-mcp, dev-tooling-mcp |

When changing an MCP: update `Mcp-Servers/<name>/`, update `docs/mcp/<name>.md`, and update the matching skill under `.claude/skills/`.

---

## MCP Configuration

MCP servers run as Docker containers. Configure in Claude Code settings (`mcpServers`):

| Server | Port | Volume |
|--------|------|--------|
| build-log-filter | 8089 | — |
| codebase-analyzer | 8090 | `${workspaceFolder}:/workspace:ro` |
| dev-filesystem-mcp | 8091 | `${workspaceFolder}:/project:ro` |
| dev-angular-mcp | 8092 | `${workspaceFolder}:/workspace` |
| dev-dotnet-mcp | 8093 | `${workspaceFolder}:/workspace` |

Reference config: `.claude/mcp.json`.

**Path convention:** All MCP calls use `/workspace/` prefix (codebase-analyzer, dev-angular-mcp, dev-dotnet-mcp) or `/project/` prefix (dev-filesystem-mcp). Never use host paths or `{parameter}` placeholders.

---

## Enforcement

Silent-shortcut prevention and MCP-first policy: `docs/silent-shortcut-prevention.md`

Agent compliance and output style: `.claude/references/agent-compliance.md`, `.claude/references/output-style-canon.md`
