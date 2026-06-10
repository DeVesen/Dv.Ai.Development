# Dv.Ai.Development

> **Portable AI workflow library** for [Cursor](https://cursor.sh) and [Claude Code](https://claude.ai/code) — skills, agents, rules, and MCP servers for Angular & .NET development.

```
┌─────────────────────────────────────────────────────────────┐
│                     Dv.Ai.Development                       │
│                                                             │
│  AI-Skills/          Mcp-Servers/          docs/            │
│  ┌──────────┐        ┌──────────┐          ┌──────────┐     │
│  │ Skills   │        │ Docker   │          │ Guides & │     │
│  │ Agents   │──────▶ │  MCP     │          │  Refs    │     │
│  │ Rules    │        │ Servers  │          └──────────┘     │
│  │ Packages │        └──────────┘                          │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Was steckt dahinter?

Dieses Repository ist die **Quellbibliothek** für AI-Workflow-Artefakte, die in Projekte deploybar sind. Es enthält:

| Verzeichnis | Inhalt |
|-------------|--------|
| [`AI-Skills/`](./AI-Skills/) | Skills, Agents, Cursor-Rules, Package-Manifeste und Deploy-Skripte |
| [`Mcp-Servers/`](./Mcp-Servers/) | Implementierungen von MCP-Servern (Docker-Images) |
| [`docs/`](./docs/) | Installationsanleitungen, MCP-Server-Referenzen |

---

## AI-Skills

Die `AI-Skills/`-Bibliothek enthält wiederverwendbare **Skill-Pakete**, die in Projekte deployed werden:

- **Skills** — Schritt-für-Schritt-Workflows für Claude Code (`/skill-name`)
- **Agents** — Spezialisierte Sub-Agent-Profile (Planung, Review, Implementierung)
- **Rules** — Cursor-Rules (`.mdc`), die Context automatisch injizieren
- **Packages** — JSON-Manifeste, die definieren was wohin deployed wird

```
Planning Workflow  →  6 Phasen: Anforderung → Scouts → Interface → Topics → Review → Synthese
Implementation     →  1–10 Slices, Hard Gate, max. 3 Review-Iterationen
ADO Integration    →  Work Items laden, analysieren, speichern
Angular v20+       →  Signals, Material v22, Routing, Forms, Testing
Backend .NET       →  EF Core Migrations, Scaffolding
```

➡️ Details: [`AI-Skills/README.md`](./AI-Skills/README.md)

---

## Mcp-Servers

Fünf spezialisierte **MCP-Server** als Docker-Images:

| Server | Zweck | Log-Port¹ |
|--------|-------|-----------|
| `build-log-filter` | Build-/Test-Output auf Fehler & Warnings reduzieren | 8089 |
| `codebase-analyzer` | Statische Code-Analyse, Reviews, AST, Symbol-Suche | 8090 |
| `dev-filesystem-mcp` | Token-effizientes Lesen von `.cs`/`.ts` Dateien | 8091 |
| `dev-angular-mcp` | Angular-Scaffolding via `ng generate` | 8092 |
| `dev-dotnet-mcp` | .NET-Scaffolding via `dotnet new` | 8093 |

> ¹ Alle Server kommunizieren über **stdio** (kein TCP). Der Port ist für einen internen HTTP-Log-Viewer zur Diagnose — nicht für den MCP-Transport.

> **Volume-Mount erforderlich:**
> - `codebase-analyzer` → `-v ${workspaceFolder}:/workspace:ro` (liest Projektdateien für AST-Analyse)
> - `dev-filesystem-mcp` → `-v ${workspaceFolder}:/project:ro` + `-e PROJECT_ROOT=/project` (liest `.cs`/`.ts` Dateien token-effizient)

➡️ Details: [`Mcp-Servers/README.md`](./Mcp-Servers/README.md)

---

## mcps.md

Die Datei [`mcps.md`](./mcps.md) im Root ist eine **situative MCP-Auswahlhilfe** für Agents — welcher MCP-Server wann bevorzugt wird und wie der Fallback (Read/Grep) aussieht. Sie wird beim Deploy in Projekte mitgeliefert.

---

## Installation & Update

➡️ Vollständige Anleitung: **[`docs/InstallUpdate.md`](./docs/InstallUpdate.md)**

**Kurzfassung Windows:**
```powershell
# Pakete auflisten
.\AI-Skills\install-cursor-skills.ps1 -List

# In Projekt deployen (Cursor + Claude Code)
.\AI-Skills\install-cursor-skills.ps1 C:\project\.cursor C:\project\.claude

# Update (ersetzt veraltete Dateien, MCP bleibt unberührt)
.\AI-Skills\update-cursor-skills.ps1 C:\project\.cursor C:\project\.claude
```

**Kurzfassung Linux/macOS:**
```bash
./AI-Skills/install-skill.sh all /path/to/project/.cursor /path/to/project/.claude
```

---

## Platform-Support

| Feature | Cursor | Claude Code |
|---------|--------|-------------|
| Skills | ✅ via Rules (`.mdc`) | ✅ via `/skill-name` |
| Agents | ✅ `.cursor/agents/` | ✅ `.claude/agents/` |
| Rules (`.mdc`) | ✅ Auto-inject | — (nicht unterstützt) |
| MCP-Server | ✅ `mcp.json` | ✅ `mcp.json` |
