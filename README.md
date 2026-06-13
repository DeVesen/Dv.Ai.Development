# Dv.Ai.Development

> **Portable AI workflow library** for [Cursor](https://cursor.sh) and [Claude Code](https://claude.ai/code) — skills, agents, rules, and MCP servers for Angular & .NET development.

Dieses Repository ist die **Quellbibliothek** für AI-Workflow-Artefakte. Es enthält wiederverwendbare Skills, Agent-Profile und MCP-Server-Implementierungen, die in Projekte deploybar sind.

```
Dv.Ai.Development/
├── Claude-Code-Ai/     Skills, Agents & MCP-Server für Claude Code
├── Cursor-AI/          Skills, Agents & Rules für Cursor
└── Mcp-Servers/        MCP-Server-Implementierungen (Docker-Images)
```

---

## Claude-Code-Ai

Skills, Agents, References und MCP-Server-Implementierungen für **Claude Code**.

| Verzeichnis | Inhalt |
|-------------|--------|
| `.claude/` | 27 Skills (via `/skill-name`), 21 Agent-Profile, geteilte References |
| `Mcp-Servers/` | Alle 5 MCP-Server als Docker-Images |
| `docs/` | Skill- und MCP-Referenzdokumentation |

Enthaltene Workflows: Planning, Implementation, ADO-Integration, Angular v20+, .NET/EF Core.

➡️ Details: [`Claude-Code-Ai/README.md`](./Claude-Code-Ai/README.md)

---

## Cursor-AI

Skills, Agents und Cursor-Rules für **Cursor**.

| Verzeichnis | Inhalt |
|-------------|--------|
| `AI-Skills/` | Skills, Agents, Rules (`.mdc`), Package-Manifeste, Deploy-Skripte |
| `docs/` | Installationsanleitungen, Referenzen |

➡️ Details: [`Cursor-AI/README.md`](./Cursor-AI/README.md)

---

## Mcp-Servers

MCP-Server-Implementierungen als **Docker-Images** — nutzbar in Cursor und Claude Code.

| Server | Zweck | Log-Port |
|--------|-------|----------|
| `build-log-filter` | Build-/Test-Output auf Fehler & Warnings reduzieren | 8089 |
| `codebase-analyzer` | Statische Code-Analyse, Reviews, AST, Symbol-Suche | 8090 |
| `dev-filesystem-mcp` | Token-effizientes Lesen von `.cs`/`.ts`-Dateien | 8091 |
| `dev-angular-mcp` | Angular-Scaffolding + Build/Test via `ng` | 8092 |
| `dev-dotnet-mcp` | .NET-Scaffolding + Build/Test via `dotnet` | 8093 |

> Alle Server kommunizieren über **stdio** (kein TCP). Ports sind für einen internen HTTP-Log-Viewer zur Diagnose.

➡️ Details: [`Mcp-Servers/README.md`](./Mcp-Servers/README.md)

---

## Platform-Support

| Feature | Cursor | Claude Code |
|---------|--------|-------------|
| Skills | ✅ via Rules (`.mdc`) | ✅ via `/skill-name` |
| Agents | ✅ `.cursor/agents/` | ✅ `.claude/agents/` |
| Rules (`.mdc`) | ✅ Auto-inject | — |
| MCP-Server | ✅ `mcp.json` | ✅ `mcp.json` |
