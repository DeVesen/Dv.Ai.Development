# MCP Scout-Fallback-Kette

Agents in Scout- und Repo-Check-Phasen sollen **nicht** nach einem einzelnen MCP-Aufruf auf natives Grep ausweichen, sondern eine **vollständige MCP-Sequenz** abarbeiten.

| Zielgruppe | Kanon |
|------------|-------|
| **Agents (deployed)** | `.cursor/skills/repo-scout-protocol/SKILL.md` |
| **Quelle** | `src/.claude/skills/repo-scout-protocol/SKILL.md` |
| **Cursor-Rule** | `rules/repo-scout-protocol.mdc` |
| **Alias-Referenz** | `src/.claude/references/mcp-scout-fallback-chain.md` (Verweis nur) |

---

## Problem

Typischer Fehlablauf:

1. Agent wählt `codebase-analyzer` (`index_project` → `find_in_index`)
2. Kein Treffer oder falscher Index-Befehl
3. Sofort Read/Grep — ohne blindes `index_solution`, ohne `find_by_content`

Nach außen wirkt das wie „MCP-Scout“, faktisch ist es Grep mit MCP-Vorreiter.

---

## Soll-Verhalten

```
Repo-Frage
  ├─ Pfad/Klasse bekannt? → dev-filesystem (read_*, find_file) zuerst
  ├─ Symbol unbekannt?    → index_project (MCP container path) → find_in_index
  │                         → bei Multi-.csproj: mehrere index_project (mcp-project-paths.md)
  │                         → index_solution nur wenn mcp-project-paths.md erlaubt
  │                         → bei Miss: find_by_content / find_file
  └─ Erst wenn Kette leer oder MCP down → Read/Grep (dokumentiert)
```

### Begriffe

| Begriff | Grep erlaubt? |
|---------|---------------|
| MCP-Fehler (Server down, Exception) | Ja, nach BLOCKER-Dokumentation |
| Index-Miss (0 Treffer) | Nein — Filesystem-MCP zuerst |
| MCP-Hinweis „use index_solution" | Nein — nur wenn mcp-project-paths.md freigibt |

### Mindestkette bei Code-Recherche

Typisch **codebase-analyzer** und **dev-filesystem-mcp** — Reihenfolge abhängig vom Kontext (bekannte Pfade → Filesystem zuerst).

Nicht Teil der Scout-Kette: `build-log-filter`, Scaffolding-MCPs (`dev-angular-mcp`, `dev-dotnet-mcp`).

---

## Reporting (Scout-Protokoll)

Jede Scout-/repo-check-Antwort enthält eine Tabelle — Format im Skill **repo-scout-protocol** (Abschnitt „Scout-Protokoll“).

Fallback nur mit expliziter Zeile, welche MCP-Schritte vorher versucht wurden.

---

## Betroffene Workflows

| Workflow | Artefakt |
|----------|----------|
| Buddy repo-check | `skills/buddy-agent/SKILL.md` (`dependsOn`: repo-scout-protocol) |
| Planning Phase 3 | `agents/plan-agent-scout.md`, `planning-workflow/SKILL.md` |
| Code-Landkarte | `codebase-analyzer/references/op-code-map.md`, `rules/codebase-analyzer.mdc` |
| Router | `mcps.md`, `skills/dev-tooling-mcp/SKILL.md` |

**Pakete:** `repo-scout-protocol` (Skill + Rule); mitgeliefert über `buddy-agent` und `planning-workflow` via `dependsOn`.

---

## Siehe auch

- `mcps.md` — situative Server-Auswahl; verweist auf repo-scout-protocol in Scout-Phasen
- [`dev-filesystem.md`](./dev-filesystem.md) — `find_by_content`, `find_file`
- [`codebase-analyzer.md`](./codebase-analyzer.md) — Index, `index_solution`
