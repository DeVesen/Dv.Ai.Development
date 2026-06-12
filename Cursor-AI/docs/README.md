# docs

Dokumentation und Referenzen für Installation, Update und MCP-Server.

---

## Inhalt

| Dokument | Beschreibung |
|----------|-------------|
| [`InstallUpdate.md`](./InstallUpdate.md) | Schritt-für-Schritt: AI-Skills in ein Projekt deployen und aktualisieren |
| [`mcp-build-log-filter.md`](./mcp-build-log-filter.md) | Build.Log.Filter.Mcp — Menschen-Doku; Kanon: `skills/build-log-filter/` |
| [`mcp-codebase-analyzer.md`](./mcp-codebase-analyzer.md) | Codebase.Analyzer.Mcp — Kanon: `skills/codebase-analyzer/` |
| [`mcp-dev-filesystem.md`](./mcp-dev-filesystem.md) | Dev.Filesystem.Mcp — Kanon: `skills/dev-filesystem-mcp/` |
| [`mcp-dev-angular.md`](./mcp-dev-angular.md) | Dev.Angular.Mcp — Kanon: `skills/dev-angular-mcp/` |
| [`mcp-dev-dotnet.md`](./mcp-dev-dotnet.md) | Dev.Dotnet.Mcp — Kanon: `skills/dev-dotnet-mcp/` |
| [`mcp-scout-fallback-chain.md`](./mcp-scout-fallback-chain.md) | Scout-/Repo-Check: MCP-Sequenz vor Grep — Agent-Kanon: `skills/repo-scout-protocol/` |
| [`angular-material-v22-components.md`](./angular-material-v22-components.md) | Angular Material v22.0.0 — vollständige Komponenten-Referenz |

**MCP-Architektur:** Ein Skill pro MCP-Server (`src/AI-Skills/skills/<name>/SKILL.md`) = kanonische Tool-/Parameter-Referenz. `mcps.md` im Projekt-Root = Router. `dev-tooling-mcp` = Router für die drei Dev-Server. **Scout-Phasen:** verbindliche MCP-Fallback-Kette in `skills/repo-scout-protocol/SKILL.md` (nicht ein MCP → sofort Grep).

---

## Schnellnavigation

**Neu hier?** → Starte mit [`InstallUpdate.md`](./InstallUpdate.md)

**MCP-Server einrichten?** → Package in `packages/*.json` installieren, dann Kanon-Skill unter `.cursor/skills/`

**Scout-/Repo-Check-Kette?** → `skills/repo-scout-protocol/SKILL.md` (mit `buddy-agent` / `planning-workflow` via `dependsOn`)

**Angular Material?** → [`angular-material-v22-components.md`](./angular-material-v22-components.md)
