# dev-mcp Routing — Welcher MCP wann?

Lesen wenn unklar ist ob dev-mcp oder codebase-analyzer zu verwenden ist.

---

## dev-mcp vs. codebase-analyzer

| Aufgabe | MCP |
|---------|-----|
| Datei/Klasse/Methode **lesen** (token-sparend) | dev-mcp |
| Interface-Implementierungen **finden** | dev-mcp |
| Muster-Spec/Testklasse **finden** | dev-mcp → `find_test_pattern` |
| Angular-Spec **anlegen** (bestehende .ts) | dev-mcp → `scaffold_spec_for` |
| Angular-Komponente/Service **erzeugen** | dev-mcp |
| Angular **bauen** | dev-mcp → `build_angular_project` |
| Angular **testen** | dev-mcp → `test_angular_project` |
| .NET-Testklasse **anlegen** | dev-mcp → `scaffold_dotnet_test_class` |
| .NET-Projekt / Ordnerstruktur **anlegen** | dev-mcp |
| .NET **bauen** | dev-mcp → `build_dotnet_solution` |
| .NET **testen** | dev-mcp → `test_dotnet_solution` |
| Datei **patchen** | dev-mcp → `apply_text_patch` |
| Zeilen lesen (token-sparend) | dev-mcp → `read_lines` |
| Mehrere Dateien batch lesen | dev-mcp → `read_files_batch` |
| Angular-Komponente **bundle** lesen | dev-mcp → `read_component_bundle` |
| Git-Änderungen **auflisten** | dev-mcp → `git_changed_files` |
| Test-Targets für geänderte Dateien | dev-mcp → `slice_test_targets` |
| Datei umbenennen (mit Impact-Preview) | dev-mcp → `rename_file_with_impact` |
| Imports **aktualisieren** nach Move | dev-mcp → `update_imports` |
| Code **reviewen**, **indexieren**, Komplexität | codebase-analyzer |
| Untestierte API **entdecken** | codebase-analyzer → `detect_untested_public_api` |
| Symbol **suchen** (Index + Fallback) | codebase-analyzer → `scout_symbol` |
| Mehrere Repo-Fragen (Buddy-Scout) | codebase-analyzer → `scout_scope` |
| Post-Slice Review (Compiler + BoyScout + Untested) | codebase-analyzer → `analyze_slice_impact` |
| Index-Cache **prüfen** | codebase-analyzer → `index_status` |
| Angular Route → Component | codebase-analyzer → `find_angular_route` |
| Angular Guard **finden** | codebase-analyzer → `find_angular_guard` |
| .NET Endpoint **finden** | codebase-analyzer → `find_dotnet_endpoint` |
| DI-Registrierung **finden** | codebase-analyzer → `find_di_registration` |
| FE Service → BE Endpoint + Validierung | codebase-analyzer → `trace_api_contract` |

---

## dev-mcp vs. build-log-filter

| Kommando | Tool | Grund |
|----------|------|-------|
| `ng build`, `ng test` | dev-mcp | MCP filtert intern — kein build-log-filter nötig |
| `dotnet build`, `dotnet test` | dev-mcp | MCP filtert intern — kein build-log-filter nötig |
| `ng serve`, `npm start` | build-log-filter (Shell) | Kein MCP für Dev-Server |
| Shell-Fallback nach BLOCKER | build-log-filter | Nur nach expliziter Nutzerfreigabe |
