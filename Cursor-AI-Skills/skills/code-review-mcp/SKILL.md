---
name: code-review-mcp
description: >
  Aktiviere diesen Skill sobald der User über Code spricht — egal ob er plant,
  gerade schreibt oder fertig ist. Der MCP hat 23 Tools für Angular und .NET.
  Bei Code-Symbolen (Klasse, Methode, Property, Service, Route): zuerst
  index_project/find_in_index, Grep nur ergänzend. UI-Labels ohne Symbol:
  keine Landkarte. Trigger: Review, Analyse, Planung, Implementierung, Merge,
  index_project, find_in_index, Code-Landkarte.
disable-model-invocation: true
---

# Code-Review-MCP

## Voraussetzungen

- MCP `code-review-mcp` muss in `.cursor/mcp.json` konfiguriert sein (Docker-Image).
- **Volume-Mount ist Pflicht** für alle dateibasierten Tools: `-v ${workspaceFolder}:/workspace:ro`
  - Host-Workspace → `/workspace` im Container (read-only)
  - Kein `-w`-Flag setzen — MCP-Server läuft in `/app`, nicht im gemounteten Verzeichnis
- `projectPath` und `type` (`angular` | `dotnet` | `auto`) pro Aufruf angeben.
- Coverage-Tools (`analyze_coverage`, `analyze_test_health`) benötigen vorherigen Test-Run.

## Pfadregel (verbindlich)

Alle dateibezogenen Parameter (`filePath`, `filePaths`, `projectPath`) verwenden **Container-Pfade**:

| Format | Korrekt | Falsch |
|--------|---------|--------|
| `projectPath` | `/workspace/src/frontend` | `C:\Develop\...\frontend` |
| `filePath` | `/workspace/src/frontend/app/my.component.ts` | `src/frontend/app/my.component.ts` |

**Fehlerdiagnose:** `File not found: /app/...` oder `Path not found: /app/...` = falsches Pfadformat (Windows-Pfad oder IDE-relativer Pfad statt `/workspace/...`), nicht defekte MCP-Verbindung.

## Operationen

| Trigger | Operation | Detail |
|---------|-----------|--------|
| Tool-Liste, welches Tool, 23 Tools | Alle verfügbaren Tools (Übersicht & Parameter) | [references/op-tool-overview.md](references/op-tool-overview.md) |
| Code-Landkarte, Symbol suchen, index_project, find_in_index, Recherche-Reihenfolge | Code-Landkarte & verbindliche Recherche-Reihenfolge | [references/op-code-map.md](references/op-code-map.md) |
| Planung, Implementierung, Merge, Review-Phase, Sprint-End, Release | Die drei Review-Phasen (Planung / Implementierung / Nach-Implementierung) | [references/op-phasen.md](references/op-phasen.md) |

**Vor Ausführung:** relevante `op-*.md` vollständig lesen.

## Opt-out

`kein code-review-mcp` → Skill nicht laden.
