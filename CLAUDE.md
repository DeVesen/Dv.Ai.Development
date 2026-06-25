# Dv.Ai.Development — Claude Code Guide

This repository contains **AI workflow artifacts** (skills, agents, references) for Claude Code and **MCP server implementations** for Angular/.NET development.

---

## Repository Structure

```
.claude/                Claude Code — direkt nutzbar
├── skills/             20 Skills (via /skill-name oder automatisch)
│   ├── feature-delivery/        Orchestrator: Planung + Implementierung, drei Einstiege
│   ├── software-design-principles/         Persönliche Design-Philosophie: sauber·funktional·getestet·wartbar·nachhaltig
│   ├── acceptance-design/       Anforderungen auf Testbarkeit prüfen und schärfen
│   ├── ado/                     Azure DevOps Workflow
│   ├── angular-developer/       Angular Bundle: Language API, Projektstruktur, Signal-Architektur, Test-Policy, Migrationen
│   ├── angular-new-app/         Angular New App Bundle: ng new, ng generate, Decision Gate, Implementierungsplan, Subagents
│   ├── angular-material/        Angular Material Bundle: Komponenten, Theming, CDK, Custom mat-form-field Inputs
│   ├── backend-ef-migrations/   EF Core Migrations
│   ├── dev-tooling/             MCP-Gateway: Routing-Einstieg fuer dev-mcp, codebase-analyzer, build-log-filter
│   ├── dev-mcp/                 49 Tools: filesystem, dotnet, angular, git, patch
│   ├── build-log-filter/        Build-Log-Kompression
│   ├── codebase-analyzer/       Statische Analyse & Review
│   ├── code-intel-workflow/     Code-Intel: narrow→read→impact→verify
│   ├── skill-creator/           Meta-skill: create/improve skills and agent profiles
│   ├── delivery-inspection/     Delivery check: 6 Reviewer prüfen Anforderungserfüllung vor Auslieferung
│   ├── test-design/             AAA · Namenskonvention · Magic Strings (interne Dep. feature-delivery)
│   ├── describe-as/             Stil-Anpassung
│   ├── commit-message/          Commit-Message-Generator
│   ├── prozess-retrospektive/   Prozess-Analyse: Harness-Verbesserungsideen + Session-Erkenntnisse
│   └── caveman/                 Kommunikationsstil: Caveman
├── agents/             Sub-Agent-Profile (auto-discovered) — acceptance-design-agent.md vorhanden; weitere Profile liegen noch unter skills/*/agents/
└── references/         Shared references (compliance, output-style, boilerplate)

Mcp-Servers/            MCP server implementations
├── Build.Log.Filter.Mcp/       build-log-filter — Build/Test log compression (Docker)
├── Codebase.Analyzer.Mcp/      codebase-analyzer — static analysis, index, review (Docker/Node)
├── Dev.Mcp/Dev.Mcp/            dev-mcp — unified stdio exe: filesystem+dotnet+angular+git+patch
├── Dev.Filesystem.Mcp/         VERALTET — in dev-mcp integriert
├── Dev.Angular.Mcp/            VERALTET — in dev-mcp integriert
└── Dev.Dotnet.Mcp/             VERALTET — in dev-mcp integriert

docs/                   Skill docs, MCP docs, enforcement references
├── skills/             Skill usage docs (usage, sub-agents, examples)
│   ├── feature-delivery.md
│   ├── acceptance-design.md
│   ├── codebase-analyzer.md
│   ├── build-log-filter.md
│   ├── dev-tooling-mcp.md
│   ├── angular-developer.md
│   ├── ado.md
│   ├── utility-skills.md
│   └── angular-material-v22-components.md
├── mcp/                MCP server reference docs
│   ├── dev-mcp.md
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
| `/feature-delivery` | `plane`, `implementiere`, `fix`, `feature-delivery` | Orchestrator: Planung + Implementierung, drei Einstiege |
| `/acceptance-design` | `schärfe Anforderung`, `Akzeptanzkriterien prüfen` | Anforderungen auf Testbarkeit prüfen und schärfen |
| `/dev-tooling` | `welcher MCP`, `MCP-Einstieg`, Dev-Tooling-Fragen | Gateway: Routing zu dev-mcp, codebase-analyzer, build-log-filter |
| `/dev-mcp` | Dateien lesen/suchen, Scaffolding, Build, Test | 49 Tools — MCP-First-Gate für alle Dev-Operationen |
| `/codebase-analyzer` | Code-Gespräch, Review, Analyse | 43 MCP-Tools für Angular/.NET (inkl. Composite/Domain-Finder) |
| `/code-intel-workflow` | Symbol suchen, Rename-Impact, Post-Slice | MCP-Routing: narrow→read→impact→verify |
| `/build-log-filter` | `ng serve`, Shell-Fallback | Build/Test-Log-Filterung |
| `/angular-developer` | Angular-Arbeit | Bundle: Language API, Projektstruktur, Signal-Architektur, Test-Policy, Migrationen |
| `/software-design-principles` | `meine Prinzipien`, `@software-design-principles`, `beachte meine Designregeln`, `flow design` | Persönliche Design-Philosophie: 5 Werte + Flow Design + IODA/IOSP + SOLID + persönliche Regeln |
| `/skill-creator` | `create skill`, `agent profil` | Skills und Agents erstellen/verbessern |
| `/delivery-inspection` | Vor jeder Auslieferung | 6-Reviewer Anforderungserfüllungs-Gate |

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
| `Mcp-Servers/Dev.Mcp/Dev.Mcp/` | `dev-mcp` | dev-mcp |

When changing an MCP: update `Mcp-Servers/<name>/`, update `docs/mcp/<name>.md`, and update the matching skill under `.claude/skills/`.

---

## MCP Configuration

| Server | Transport | Details |
|--------|-----------|---------|
| build-log-filter | Docker HTTP | Port 8089 |
| codebase-analyzer | **Node stdio** | `C:\Develop\.apps\codebase-analyzer\index.js`, Log-Viewer Port 5052 |
| dev-mcp | **stdio** | `C:\Develop\.apps\dev-mcp\Dev.Mcp.exe`, Log-Viewer Port 5050 |

**Path convention (both MCPs):** Windows absolute paths (`C:\Develop\...`). No Docker, no `/workspace/` prefix, no `{parameter}` placeholders.

---

## MCP-First (immer aktiv)

Wenn Code oder Symbole im Repo nachgeschaut werden — MCP vor nativem Read/Grep:

| Aufgabe | Erster Griff |
|---------|-------------|
| Symbol / Datei suchen | `dev-mcp`: `find_file`, `find_by_content` |
| Klasse / Methode lesen | `dev-mcp`: `read_class_summary`, `read_signatures_only`, `read_method` |
| Index / Abhaengigkeiten | `codebase-analyzer`: `find_in_index`, `index_project` |
| Native Read / Grep | nur als dokumentierter Fallback — nach MCP-Versuch |

**Pfad-Format (verbindlich):** Windows-Absolutpfad `C:\Develop\...` — kein `/workspace/`, keine relativen Pfade.

---

## Enforcement

Silent-shortcut prevention and MCP-first policy: `docs/silent-shortcut-prevention.md`

Agent compliance and output style: `.claude/references/agent-compliance.md`, `.claude/references/output-style-canon.md`
