# MCP Smoke-Tests (Skill-Maintainer / Zielprojekt)

Nach Install/Update oder Änderungen an `.cursor/references/mcp-project-paths.md`: Tests im Ziel-Workspace (Docker + MCP aktiv).

Referenz: [codebase-analyzer/SKILL.md](../skills/codebase-analyzer/SKILL.md), [mcp-project-paths.md](./mcp-project-paths.md).

---

## Positive Tests (Pfade aus mcp-project-paths.md)

| # | Call | Erwartung |
|---|------|-----------|
| 1 | `index_project(<mcp-frontend-path>, angular)` | Summary mit Components/Services |
| 2 | `index_project(<mcp-backend-path oder mcp-be-*>, dotnet)` | Symbole im Output |
| 3 | `find_in_index(<bekanntes Symbol>, korrektes projectPath)` | Treffer mit Datei |
| 4 | `find_in_index(RoleGuard, frontend)` → 0 | Danach Filesystem-MCP/Grep findet Guard — erwartet |

## Negative Tests

| Call | Erwartung |
|------|-----------|
| `index_project(<Host-Pfad ohne /workspace/>)` | `Path not found: /app/...` |
| `index_solution(...)` wenn mcp-project-paths `index_solution: disabled` | Fehler — kein Happy Path |

---

## Checkliste Maintainer

- [ ] `.cursor/references/mcp-project-paths.md` vorhanden und Routing geprüft?
- [ ] `.cursor/skill-params.json` Host-Pfade korrekt?
- [ ] Smoke-Tests grün?
