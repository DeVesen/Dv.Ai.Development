# MCP Smoke-Tests (Skill-Maintainer / Zielprojekt)

Nach Install/Update oder Änderungen an MCP-Konfiguration: Tests im Ziel-Workspace (Docker + MCP aktiv).

Referenz: [codebase-analyzer/SKILL.md](../skills/codebase-analyzer/SKILL.md).

---

## Positive Tests

| # | Call | Erwartung |
|---|------|-----------|
| 1 | `index_project("/workspace/[fe-pfad]", "angular")` | Summary mit Components/Services |
| 2 | `index_project("/workspace/[be-pfad]", "dotnet")` | Symbole im Output |
| 3 | `find_in_index("<bekanntes Symbol>", "/workspace/[fe-pfad]")` | Treffer mit Datei |
| 4 | `find_in_index("RoleGuard", "/workspace/[fe-pfad]")` → 0 | Danach dev-filesystem-mcp findet Guard — erwartet |

## Negative Tests

| Call | Erwartung |
|------|-----------|
| `index_project("<Host-Pfad ohne /workspace/>")` | `Path not found: /app/...` |
| `index_solution(...)` wenn einzelne Projekte genutzt werden | Fehler — kein Happy Path |

---

## Checkliste Maintainer

- [ ] Docker-Container für alle MCPs laufen (Ports 8090–8093)?
- [ ] Volume-Mounts korrekt (`${workspaceFolder}:/workspace` bzw. `:/project`)?
- [ ] Smoke-Tests grün?
- [ ] `/workspace/` Prefix in allen MCP-Aufrufen (nie C:\ oder relative Pfade)?
