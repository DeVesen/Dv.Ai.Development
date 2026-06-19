---
name: dev-tooling-mcp
description: >
  Router für dev-mcp (unified stdio exe) und codebase-analyzer.
  Trigger: welcher Dev-MCP, Datei lesen vs. scaffold, build, test,
  ng build, ng test, dotnet build, dotnet test, Datei/Klasse/Methode verstehen,
  read_signatures_only, scaffold_angular, scaffold_dotnet, *.cs/*.ts Signaturen,
  Test anlegen (spec/Testklasse), find_test_pattern, scaffold_angular_spec, scaffold_dotnet_test_class.
  Nicht für codebase-analyzer oder build-log-filter.
when_to_use: >
  Aktiviere wenn unklar ist welcher Dev-MCP zu verwenden ist.
  Routet zu dev-mcp (Lesen/Suchen, Angular-Scaffolding, .NET-Scaffolding, Build, Test, Test anlegen)
  oder codebase-analyzer (Index, Review, Metriken).
  Nicht für Log-Filterung (build-log-filter).
---

## MCP-FIRST — Build/Test (Hard Gate)

**`ng build` / `ng test` / `dotnet build` / `dotnet test` niemals als Shell-Kommando** wenn dev-mcp verfügbar.

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` via dev-mcp |
| Shell: `ng test` | `test_angular_project` via dev-mcp |
| Shell: `dotnet build` | `build_dotnet_solution` via dev-mcp |
| Shell: `dotnet test` | `test_dotnet_solution` via dev-mcp |
| `build-log-filter` für Angular/dotnet Build/Test wenn MCP verfügbar | MCP-Ergebnis direkt auswerten (`errors[]`, `warnings[]`, `summary`) |
| Stille Ausweitung auf Shell ohne Nutzer-Freigabe | BLOCKER-Meldung + warten |

**Hard Stop — MCP nicht erreichbar:**

> **`BLOCKER: dev-mcp nicht erreichbar`**
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren (Exe gestartet? `C:\Develop\.apps\dev-mcp\`? claude.json Eintrag?)
> - Erst nach **expliziter Nutzerfreigabe**: Shell-Fallback + build-log-filter

---

## Pfad-Kanon (Pflicht)

| MCP | Pfad-Format |
|-----|-------------|
| dev-mcp | Windows-Absolutpfad: `C:\Develop\MyProject\...` |
| codebase-analyzer | Windows-Absolutpfad: `C:\Develop\MyProject\...` |

**VERBOTEN für beide MCPs:** `/project/`, `/workspace/`, relative Pfade ohne Laufwerk, `{parameter}`-Platzhalter.

---

## Routing: Welcher MCP wann?

| Aufgabe | MCP | Skill laden |
|---------|-----|-------------|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-mcp | dev-mcp |
| Interface-Implementierungen **finden** | dev-mcp | dev-mcp |
| Muster-Spec/Testklasse **finden** | dev-mcp → `find_test_pattern` | dev-mcp |
| Angular-Spec **anlegen** (bestehende .ts) | dev-mcp → `scaffold_angular_spec` | dev-mcp |
| Angular-Komponente/Service **erzeugen** | dev-mcp | dev-mcp |
| Angular **bauen** (`ng build`) | dev-mcp → `build_angular_project` | dev-mcp |
| Angular **testen** (`ng test`) | dev-mcp → `test_angular_project` | dev-mcp |
| .NET-Testklasse **anlegen** (bestehende .csproj) | dev-mcp → `scaffold_dotnet_test_class` | dev-mcp |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-mcp | dev-mcp |
| .NET **bauen** (`dotnet build`) | dev-mcp → `build_dotnet_solution` | dev-mcp |
| .NET **testen** (`dotnet test`) | dev-mcp → `test_dotnet_solution` | dev-mcp |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer | codebase-analyzer |
| Untestierte API **entdecken** | codebase-analyzer → `detect_untested_public_api` | codebase-analyzer |
| Symbol **suchen** (Index + Fallback) | codebase-analyzer → `scout_symbol` | codebase-analyzer |
| Mehrere Repo-Fragen (Buddy-Scout) | codebase-analyzer → `scout_scope` | codebase-analyzer |
| Post-Slice Review (Compiler+BoyScout+Untested) | codebase-analyzer → `analyze_slice_impact` | codebase-analyzer |
| Index-Cache **prüfen** | codebase-analyzer → `index_status` | codebase-analyzer |
| Angular Route → Component | codebase-analyzer → `find_angular_route` | codebase-analyzer |
| Angular Guard **finden** | codebase-analyzer → `find_angular_guard` | codebase-analyzer |
| .NET Endpoint **finden** | codebase-analyzer → `find_dotnet_endpoint` | codebase-analyzer |
| DI-Registrierung **finden** | codebase-analyzer → `find_di_registration` | codebase-analyzer |
| FE Service → BE Endpoint + Validierung | codebase-analyzer → `trace_api_contract` | codebase-analyzer |
| Datei **patch** (Zeile/Anker ersetzen) | dev-mcp → `apply_text_patch` | dev-mcp |
| Zeilen lesen (token-sparend) | dev-mcp → `read_lines` | dev-mcp |
| Mehrere Dateien batch lesen | dev-mcp → `read_files_batch` | dev-mcp |
| Angular-Komponente **bundle** lesen | dev-mcp → `read_component_bundle` | dev-mcp |
| Git-Änderungen **auflisten** | dev-mcp → `git_changed_files` | dev-mcp |
| Test-Targets für geänderte Dateien | dev-mcp → `slice_test_targets` | dev-mcp |
| Datei umbenennen (mit Impact-Preview) | dev-mcp → `rename_file_with_impact` | dev-mcp |
| Imports **aktualisieren** nach Move | dev-mcp → `update_imports` | dev-mcp |

---

## dev-mcp — Tools Kurzübersicht (39 Tools)

**Server:** stdio, `C:\Develop\.apps\dev-mcp\Dev.WindowsService.Mcp.exe`
**Log-Viewer:** `http://localhost:5050/`

**Filesystem Read (11):** `find_file`, `find_by_content` (+format/group_by_file), `find_implementations`, `read_signatures_only`, `read_method`, `read_class_summary`, `read_file_raw`, `read_lines` (NEU), `read_files_batch` (NEU), `read_component_bundle` (NEU), `list_directory`, `find_test_pattern`

**Filesystem Intelligence (7 NEU):** `find_angular_route`, `find_angular_guard`, `find_dotnet_endpoint`, `find_di_registration`, `read_related_files`, `update_imports`, `delete_file_safe`

**Git (2 NEU):** `git_changed_files`, `git_diff_summary`

**Patch/Write (3 NEU):** `apply_text_patch`, `replace_in_files`, `insert_member`

**Move/Rename (2):** `rename_file` (bestehend), `rename_file_with_impact` (NEU mit Preview/Execute)

**Angular (8):** `create_angular_project`, `scaffold_angular_component`, `scaffold_angular_service`, `scaffold_angular_directive`, `scaffold_angular_spec`, `scaffold_spec_for` (NEU), `build_angular_project`, `test_angular_project` (+include_patterns/test_name_pattern)

**.NET (8):** `create_dotnet_solution`, `scaffold_dotnet_project`, `scaffold_dotnet_test_class`, `create_directory_structure`, `build_dotnet_solution`, `test_dotnet_solution` (+filter/test_project_path), `scaffold_dto` (NEU), `scaffold_api_action` (NEU)

**Utilities (2 NEU):** `slice_test_targets`, `find_related_files`

---

## Scope-Trennung: build-log-filter vs. dev-mcp

| Kommando | Tool | Grund |
|----------|------|-------|
| `ng build`, `ng test` | dev-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `dotnet build`, `dotnet test` | dev-mcp (MCP-First) | MCP filtert intern — kein build-log-filter |
| `ng serve`, `npm start` | build-log-filter (Shell) | Kein MCP für Dev-Server |
| Shell-Fallback nach BLOCKER | build-log-filter | Nur nach expliziter Nutzerfreigabe |

---

## Opt-out

`kein dev-tooling`, `no-dev-tooling`, `skip-dev-tooling` → Router nicht laden.
