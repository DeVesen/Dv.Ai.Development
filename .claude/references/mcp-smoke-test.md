# MCP Smoke-Tests (Skill-Maintainer / Zielprojekt)

Nach Install/Update oder Änderungen an MCP-Konfiguration im Ziel-Workspace.

**Pfad-Kanon:** Beide MCPs nutzen Windows-Absolutpfade (`C:\...`) — kein `/workspace/`, kein Docker.

Referenz: [codebase-analyzer/SKILL.md](../skills/codebase-analyzer/SKILL.md), [dev-mcp/SKILL.md](../skills/dev-mcp/SKILL.md).

---

## codebase-analyzer Smoke-Tests

| # | Call | Erwartung |
|---|------|-----------|
| 1 | `index_project("C:\\Develop\\MyProject\\src\\frontend", "angular")` | Summary mit Components/Services/Guards |
| 2 | `index_project("C:\\Develop\\MyProject\\src\\backend", "dotnet")` | Symbole (classes, interfaces) im Output |
| 3 | `find_in_index("<bekanntes Symbol>", "C:\\Develop\\MyProject\\src\\frontend")` | Treffer mit Datei + Zeile |
| 4 | `find_in_index("RoleGuard", "C:\\Develop\\MyProject\\src\\frontend")` → 0 Treffer | Erwartet: Guards nicht im Index → dev-mcp Fallback |
| 5 | `index_status()` | Einträge mit indexedAt, stale, symbolCount |
| 6 | `scout_symbol("ExperimentService", "C:\\Develop\\MyProject\\src\\frontend", "angular", "compact")` | 1 Treffer mit filePath + line |
| 7 | `scout_scope([{"id":"1","query":"MachineFilter"}], "C:\\Develop\\MyProject\\src\\frontend")` | Markdown-Tabelle mit Ergebnis-Zeile |
| 8 | `analyze_slice_impact(["C:\\...\\experiment.service.ts"], "auto", "compact")` | compilerGate + boyscout Summary |
| 9 | `analyze_component_test_coverage("C:\\...\\experiment.component.ts")` | Coverage-Report für Component |

## dev-mcp Smoke-Tests

| # | Call | Erwartung |
|---|------|-----------|
| 10 | `read_lines("C:\\...\\experiment.service.ts", 1, 20, 0)` | Zeilen 1–20, totalLines |
| 11 | `read_files_batch(["C:\\...\\a.ts", "C:\\...\\b.ts"], "signatures")` | Array mit filePath + SignatureEntry[] |
| 12 | `git_changed_files("C:\\Develop\\MyProject", "unstaged")` | files[] mit path + status |
| 13 | `slice_test_targets(["C:\\...\\experiment.service.ts"], "angular")` | includeGlobs + suggestedNgTestArgs |
| 14 | `apply_text_patch("C:\\...\\foo.ts", old_text="old", new_text="new", dry_run=true)` | success + linesChanged, keine Dateiänderung |
| 15 | `rename_file_with_impact("C:\\...\\old.ts", "C:\\...\\new.ts", execute=false)` | impact.importers[] ohne Dateiänderung |
| 16 | `find_angular_route("C:\\...\\frontend", "/search")` | routes[] mit component + line |
| 17 | `find_di_registration("C:\\...\\backend", "SearchService")` | registrations[] mit lifetime |

## Negative Tests

| Call | Erwartung |
|------|-----------|
| `index_project("/workspace/frontend", "angular")` | Fehler: Pfad nicht gefunden oder path_not_allowed |
| `read_lines("C:\\...\\notexist.ts", 1, 10)` | `{ "error": "path_not_found: ..." }` |
| `apply_text_patch("C:\\...\\foo.ts", old_text="AMBIGUOUS", new_text="x")` wenn Text 2× vorkommt | `{ "error": "ambiguous_anchor" }` |
| `index_solution(...)` wenn Einzel-Projekte genutzt werden | Fehler / Known Issue — kein Happy Path |

---

## Checkliste Maintainer

- [ ] dev-mcp Exe läuft: `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe` (Log-Viewer Port 5050)
- [ ] codebase-analyzer läuft: `C:\Develop\.apps\codebase-analyzer\index.js` (Log-Viewer Port 5052)
- [ ] Beide MCPs nutzen Windows-Absolutpfade (kein `/workspace/`)
- [ ] Smoke-Tests 1–17 grün
- [ ] Negative Tests geben korrekten Fehlercode
- [ ] Nach MCP-Update: `index_status()` zeigt neue Einträge
