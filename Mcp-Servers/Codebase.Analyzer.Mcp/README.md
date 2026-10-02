# Codebase.Analyzer.Mcp

MCP-Server (stdio, TypeScript) für Code-Reviews und statische Analyse von **Angular**- und **.NET**-Projekten. Angular wird mit ts-morph, .NET mit Roslyn analysiert.

## Tools (Auswahl)

| Gruppe | Tools |
|---|---|
| Index | `index_project`, `index_solution`, `index_status`, `find_in_index`, `scout_symbol` |
| Review | `review_file`, `review_code`, `review_git_diff`, `review_files_batch`, `review_with_index` |
| Struktur | `detect_god_classes`, `suggest_class_splits`, `analyze_type_graph`, `find_type_hierarchy`, `find_symbol_references`, `analyze_refactoring_safety` |
| Qualität | `analyze_complexity`, `analyze_maintainability_index`, `analyze_dead_code`, `analyze_duplicates`, `analyze_nullability`, `analyze_compiler_diagnostics` |
| Tests | `analyze_coverage`, `analyze_test_quality`, `analyze_test_health`, `detect_untested_public_api` |
| Verbesserung | `suggest_boyscout_actions`, `analyze_method_extraction_candidates`, `generate_auto_fixes` |

Die vollständige Liste mit Parametern liefert der Server über `tools/list`. Hintergrund zu Phasen und Tools: [`doku/`](doku).

## Voraussetzungen

- Node.js und `npm`
- Für die .NET-Analyse: .NET SDK (Roslyn-Skripte unter [`roslyn-analyzer/`](roslyn-analyzer))

## Bauen und starten

```bash
npm install
npm run build
npm start
```

Entwicklungsmodus ohne Build: `npm run dev`.

## Einbinden

Beispielkonfiguration für Claude Desktop (Docker): [`claude_desktop_config.example.json`](claude_desktop_config.example.json). Das Projekt wird dabei read-only unter `/workspace` eingehängt.

Für eine lokale Installation ohne Docker: [`scripts/deploy.ps1`](scripts/deploy.ps1) baut den Server und legt ihn nach `C:\Develop\.apps\codebase-analyzer`.

## Tests

Die Tests laufen über Fixtures unter [`test-fixtures/`](test-fixtures), zum Beispiel:

```bash
npm run test:god-classes
npm run test:readers
```

Alle Test-Skripte stehen in [`package.json`](package.json).
