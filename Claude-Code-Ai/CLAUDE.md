# Dv.Ai.Development — Claude Code Guide

This repository contains **AI workflow artifacts** (skills, agents, references) for Claude Code and **MCP server implementations** for Angular/.NET development.

---

## Repository Structure

```
.claude/                Claude Code — direkt nutzbar
├── skills/             27 Skills (via /skill-name oder automatisch)
│   ├── planning-workflow/       Planungs-Workflow
│   ├── implementation-workflow/ Implementierungs-Workflow
│   ├── buddy-agent/             Pair-Programming-Agent
│   ├── repo-scout-protocol/     Repo-Erkundung
│   ├── ado/                     Azure DevOps Workflow
│   ├── angular-developer/       Angular-Entwicklung (Kernregeln)
│   ├── angular-developer-extension/ Angular Signals, RxJS, Testing
│   ├── angular-new-app/         Neue Angular-App erstellen
│   ├── angular-new-app-extension/   Angular-App erweitern
│   ├── angular-refactor/        Angular-Refactoring
│   ├── angular-material/        Angular Material
│   ├── angular-material-custom-input/ Custom Material Inputs
│   ├── angular-cache-busting/   Cache-Busting
│   ├── backend-ef-migrations/   EF Core Migrations
│   ├── dev-mcp/                 unified stdio exe (18 Tools: filesystem+dotnet+angular)
│   ├── dev-angular-mcp/         VERALTET, Redirect auf dev-mcp
│   ├── dev-dotnet-mcp/          VERALTET, Redirect auf dev-mcp
│   ├── dev-filesystem-mcp/      VERALTET, Redirect auf dev-mcp
│   ├── dev-tooling-mcp/         Router (aktualisiert auf dev-mcp)
│   ├── build-log-filter/        Build-Log-Kompression
│   ├── codebase-analyzer/       Statische Analyse & Review
│   ├── skill-creator/           Meta-skill: create/improve skills and agent profiles
│   ├── work-review/             Quality review: 4 parallel reviewer agents
│   ├── work-review-iterative/   Iterative review loop until no findings remain
│   ├── conversation-insights/   Konversations-Analyse
│   ├── describe-as/             Stil-Anpassung
│   ├── commit-message/          Commit-Message-Generator
│   └── caveman/                 Kommunikationsstil: Caveman
├── agents/             21 Sub-Agent-Profile (auto-discovered)
└── references/         Shared references (compliance, output-style, boilerplate)

Mcp-Servers/            MCP server implementations
├── Build.Log.Filter.Mcp/       build-log-filter — Build/Test log compression (Docker)
├── Codebase.Analyzer.Mcp/      codebase-analyzer — static analysis, index, review (Docker/Node)
├── Dev.WindowsService.Mcp/     dev-mcp — unified stdio exe: filesystem+dotnet+angular (18 Tools)
├── Dev.Filesystem.Mcp/         VERALTET — in dev-mcp integriert
├── Dev.Angular.Mcp/            VERALTET — in dev-mcp integriert
└── Dev.Dotnet.Mcp/             VERALTET — in dev-mcp integriert

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
| `Mcp-Servers/Dev.WindowsService.Mcp/` | `dev-mcp` | dev-mcp, dev-tooling-mcp |

When changing an MCP: update `Mcp-Servers/<name>/`, update `docs/mcp/<name>.md`, and update the matching skill under `.claude/skills/`.

---

## MCP Configuration

| Server | Transport | Details |
|--------|-----------|---------|
| build-log-filter | Docker HTTP | Port 8089 |
| codebase-analyzer | **Node stdio** | `C:\Develop\.apps\codebase-analyzer\index.js`, Log-Viewer Port 5052 |
| dev-mcp | **stdio** | `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`, Log-Viewer Port 5050 |

**Path convention (both MCPs):** Windows absolute paths (`C:\Develop\...`). No Docker, no `/workspace/` prefix, no `{parameter}` placeholders.

---

## Enforcement

Silent-shortcut prevention and MCP-first policy: `docs/silent-shortcut-prevention.md`

Agent compliance and output style: `.claude/references/agent-compliance.md`, `.claude/references/output-style-canon.md`
