# dev-mcp Routing — Welcher Weg wann?

Lesen wenn unklar ist, ob dev-mcp, codebase-analyzer, ein Befehl von dv-dotnet bzw. dv-angular oder die Shell zuständig ist.

---

| Aufgabe | Weg |
|---------|-----|
| Angular **bauen / testen / linten** | `dv-angular-build`, `dv-angular-test`, `dv-angular-lint` im Bash-Tool |
| .NET **bauen / testen / linten** | `dv-dotnet-build`, `dv-dotnet-test`, `dv-dotnet-lint` im Bash-Tool |
| Angular-Komponente/Service/Spec **erzeugen** | Shell → `ng generate` |
| .NET-Projekt/Solution **anlegen** | Shell → `dotnet new` |
| EF-Migrationen | Shell → `dotnet ef`, siehe dotnet-Skill |
| `npm run`, `npm install`, `ng serve`, `dotnet publish` | Shell |
| Signaturen/Methode/Klasse **lesen** (token-sparend) | codebase-analyzer → `read_signatures_only`, `read_method`, `read_class_summary` |
| Angular-Komponente **bundle** lesen | codebase-analyzer → `read_component_bundle` |
| Member **einfügen** | codebase-analyzer → `insert_member` |
| Imports **aktualisieren** nach Move | codebase-analyzer → `update_imports` |
| Interface-Implementierungen **finden** | codebase-analyzer → `find_type_hierarchy` |
| Dateien nach Muster/Inhalt **suchen** | dev-mcp → `find_file`, `find_by_content` |
| Zeilen lesen, mehrere Dateien batch lesen | dev-mcp → `read_lines`, `read_files_batch` |
| Datei **patchen**, Batch-Ersetzung | dev-mcp → `apply_text_patch`, `replace_in_files` |
| Datei verschieben mit Git-History | dev-mcp → `git_move` |
| Git-Änderungen **auflisten** | dev-mcp → `git_changed_files`, `git_diff_summary` |
| Test-Targets für geänderte Dateien | dev-mcp → `slice_test_targets` |
| Laufende Prozesse | dev-mcp → `list_processes` |
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
