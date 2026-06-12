# Claude-Code-Ai

> **Portable AI workflow library** for [Claude Code](https://claude.ai/code) — skills, agents, references, and MCP servers for Angular & .NET development.

```
┌─────────────────────────────────────────────────────────────┐
│                     Dv.Ai.Development                       │
│                                                             │
│  Claude-Code-Ai/     Cursor-AI/            Mcp-Servers/     │
│  ┌───────────────┐   ┌──────────┐          ┌──────────┐     │
│  │ .claude/      │   │ Rules    │          │ Docker   │     │
│  │ docs/         │   │ Agents   │          │  MCP     │     │
│  │               │   └──────────┘          │ Servers  │     │
│  └───────────────┘                         └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

```
Claude-Code-Ai/
├── .claude/            Skills, Agents, References für Claude Code
└── docs/               Skill- und MCP-Referenzdokumentation
```

---

## Was steckt dahinter?

Dieses Verzeichnis enthält alle **Claude Code AI-Workflow-Artefakte** — deploybar in Projekte. Es enthält:

| Verzeichnis | Inhalt |
|-------------|--------|
| [`.claude/`](./.claude/) | 27 Skills, 21 Agent-Profile, geteilte References |
| [`docs/`](./docs/) | Skill-Verwendungsdoku (`docs/skills/`), MCP-Server-Referenzen (`docs/mcp/`), Enforcement |

> Die MCP-Server-Implementierungen liegen auf der Hauptebene unter [`../Mcp-Servers/`](../Mcp-Servers/).

---

## Skills & Agents

27 Skills für Claude Code (`/skill-name`) und 21 spezialisierte Sub-Agent-Profile:

```
Planning Workflow  →  6 Phasen: Anforderung → Scouts → Interface → Topics → Review → Synthese
Implementation     →  1–10 Slices, Hard Gate, max. 3 Review-Iterationen
ADO Integration    →  Work Items laden, analysieren, speichern
Angular v20+       →  Signals, Material v22, Routing, Forms, Testing
Backend .NET       →  EF Core Migrations, Scaffolding
```

| Skill-Gruppe | Dokument |
|-------------|---------|
| Planning Workflow + Agents | [`docs/skills/planning-workflow.md`](./docs/skills/planning-workflow.md) |
| Implementation Workflow + Agents | [`docs/skills/implementation-workflow.md`](./docs/skills/implementation-workflow.md) |
| Buddy Agent | [`docs/skills/buddy-agent.md`](./docs/skills/buddy-agent.md) |
| Repo Scout Protocol | [`docs/skills/repo-scout-protocol.md`](./docs/skills/repo-scout-protocol.md) |
| Codebase Analyzer | [`docs/skills/codebase-analyzer.md`](./docs/skills/codebase-analyzer.md) |
| Dev-Tooling MCPs (filesystem, angular, dotnet) | [`docs/skills/dev-tooling-mcp.md`](./docs/skills/dev-tooling-mcp.md) |
| Angular Developer (inkl. Material, Refactor, New App) | [`docs/skills/angular-developer.md`](./docs/skills/angular-developer.md) |
| ADO | [`docs/skills/ado.md`](./docs/skills/ado.md) |
| Utility Skills (work-review, skill-creator, …) | [`docs/skills/utility-skills.md`](./docs/skills/utility-skills.md) |

---

## Mcp-Servers

Fünf spezialisierte **MCP-Server** als Docker-Images:

| Server | Zweck | Port¹ |
|--------|-------|-------|
| `build-log-filter` | Build-/Test-Output auf Fehler & Warnings reduzieren | 8089 |
| `codebase-analyzer` | Statische Code-Analyse, Reviews, AST, Symbol-Suche | 8090 |
| `dev-filesystem-mcp` | Token-effizientes Lesen von `.cs`/`.ts` Dateien | 8091 |
| `dev-angular-mcp` | Angular-Scaffolding + Build/Test via `ng` | 8092 |
| `dev-dotnet-mcp` | .NET-Scaffolding + Build/Test via `dotnet` | 8093 |

> ¹ Alle Server kommunizieren über **stdio** (kein TCP). Der Port ist für einen internen HTTP-Log-Viewer zur Diagnose.

> **Volume-Mounts:**
> - `codebase-analyzer` → `-v ${workspaceFolder}:/workspace:ro`
> - `dev-filesystem-mcp` → `-v ${workspaceFolder}:/project:ro -e PROJECT_ROOT=/project`
> - `dev-angular-mcp`, `dev-dotnet-mcp` → `-v ${workspaceFolder}:/workspace`

| MCP-Referenz | Dokument |
|-------------|---------|
| Build Log Filter | [`docs/mcp/build-log-filter.md`](./docs/mcp/build-log-filter.md) |
| Codebase Analyzer | [`docs/mcp/codebase-analyzer.md`](./docs/mcp/codebase-analyzer.md) |
| Dev Filesystem | [`docs/mcp/dev-filesystem.md`](./docs/mcp/dev-filesystem.md) |
| Dev Angular | [`docs/mcp/dev-angular.md`](./docs/mcp/dev-angular.md) |
| Dev Dotnet | [`docs/mcp/dev-dotnet.md`](./docs/mcp/dev-dotnet.md) |
| Scout-Fallback-Kette | [`docs/mcp/scout-fallback-chain.md`](./docs/mcp/scout-fallback-chain.md) |

➡️ Details: [`../Mcp-Servers/README.md`](../Mcp-Servers/README.md)

---

## Scout-Fallback-Kette

In **Scout-Phasen** (repo-check, Code-Landkarte, `plan-agent-scout`) bauen Agents eine **MCP-Sequenz** (`codebase-analyzer` → `dev-filesystem-mcp`) und arbeiten sie vollständig ab — kein vorzeitiger Grep-Fallback.

| Dokument | Inhalt |
|----------|--------|
| [`.claude/skills/repo-scout-protocol/SKILL.md`](./.claude/skills/repo-scout-protocol/SKILL.md) | Agent-Kanon (Routing-Matrix, Scout-Protokoll-Tabelle) |
| [`docs/mcp/scout-fallback-chain.md`](./docs/mcp/scout-fallback-chain.md) | MCP-Sequenz-Referenz |
| [`docs/skills/repo-scout-protocol.md`](./docs/skills/repo-scout-protocol.md) | Verwendungs-Doku |

---

## Platform-Support

| Feature | Cursor | Claude Code |
|---------|--------|-------------|
| Skills | ✅ via Rules (`.mdc`) | ✅ via `/skill-name` |
| Agents | ✅ `.cursor/agents/` | ✅ `.claude/agents/` |
| Rules (`.mdc`) | ✅ Auto-inject | — (nicht unterstützt) |
| MCP-Server | ✅ `mcp.json` | ✅ `mcp.json` |
