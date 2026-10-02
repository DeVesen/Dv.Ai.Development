# Dev.Mcp

MCP-Server (stdio, C# / .NET) für Entwicklungsarbeit an **.NET**- und **Angular**-Projekten: Dateien suchen und lesen, Text patchen, Projekte scaffolden sowie bauen, testen und linten. Zugriffe sind auf konfigurierte Verzeichnisse beschränkt (`AllowedDirectoriesService`, `PathValidator`).

## Tools (Auswahl)

| Gruppe | Tools |
|---|---|
| Suchen und Lesen | `find_file`, `find_by_content`, `find_implementations`, `read_lines`, `read_files_batch`, `read_method`, `read_class_summary`, `read_signatures_only` |
| Ändern | `apply_text_patch`, `replace_in_files`, `insert_member`, `update_imports`, `rename_file`, `rename_file_with_impact`, `delete_file_safe` |
| Git | `git_changed_files`, `git_diff_summary`, `git_move`, `slice_test_targets` |
| .NET | `build_dotnet_solution`, `test_dotnet_solution`, `publish_dotnet_project`, `run_ef_migration`, `scaffold_dotnet_project`, `scaffold_dto`, `scaffold_api_action`, `run_inspectcode` |
| Angular | `build_angular_project`, `test_angular_project`, `lint_angular_project`, `scaffold_angular_component`, `scaffold_angular_service`, `analyze_angular_architecture` |
| Navigation | `find_angular_route`, `find_angular_guard`, `find_dotnet_endpoint`, `find_di_registration`, `list_processes` |

Die vollständige Liste mit Parametern liefert der Server über `tools/list`.

## Voraussetzungen

- .NET SDK
- Für `build_angular_project` und verwandte Tools: Node.js und `npm`

## Bauen und installieren

Solution: [`Dev.Mcp.slnx`](Dev.Mcp.slnx), Tests: [`Dev.Mcp.Tests`](Dev.Mcp.Tests).

```powershell
dotnet test
.\scripts\deploy.ps1
```

[`scripts/deploy.ps1`](scripts/deploy.ps1) veröffentlicht einen self-contained Single-File-Build (`win-x64`) und legt ihn standardmäßig nach `C:\Develop\.apps\dev-mcp`. Mit `-Target <Pfad>` lässt sich das Ziel ändern.

## Einbinden

Den veröffentlichten `Dev.Mcp.exe` im MCP-Client als stdio-Server eintragen. Die erlaubten Verzeichnisse stehen in der `appsettings.json` neben der Exe, unter `McpService:AllowedDirectories`.
