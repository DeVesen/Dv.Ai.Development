# Offene Aufgaben

Laufende Arbeit, die noch nicht fertig ist. Erledigtes wird gestrichen.

## MCP-Server verschlanken (dev-mcp)

Ziel: Aufgaben des dev-mcp prüfen, was wegfallen oder als Skript ins Plugin wandern kann.
Der codebase-analyzer bleibt als Server, weil er warm läuft (Roslyn und ts-morph starten nicht jedes Mal neu).

| Nr | Gruppe | Stand |
|---|---|---|
| 1 | Tools, die Claude Code schon hat (Suchen, Lesen, Ersetzen, Umbenennen, Löschen, Ordner, Git, Prozesse) | **Entschieden:** 2–3 Retros messen, dann streichen oder behalten |
| 2 | Build, Test, Lint mit gefilterter Ausgabe, dazu build-log-filter | **Entschieden:** wandert als Skripte ins Plugin (siehe unten) |
| 3 | Scaffolding (`ng generate`, `dotnet new`, `dotnet ef`) | **Entschieden:** Shell-Befehle, Konventionen in den Skills (siehe unten) |
| 4 | Code gezielt lesen (`read_method`, `read_signatures_only` …) | **Entschieden:** wandert in den codebase-analyzer (siehe unten) |

### Entscheidung zu Gruppe 2

- Ein eigenes, unabhängiges Skript je Kommando und Plattform, kein Sammel-Skript:
  - Angular: `angular-build`, `angular-test`, `angular-lint`
  - .NET: `dotnet-build`, `dotnet-test`, `dotnet-lint`
- Jedes Skript: volles Log in eine Datei, zurück nur Fehler und Zusammenfassung.
- Folgen: build-log-filter entfällt, Build/Test-Teil der dev-mcp-SKILL.md und MCP-First-Regel in der `CLAUDE.md` anpassen.
- [ ] Umsetzen, nachdem die Gruppen 3 und 4 besprochen sind.

### Entscheidung zu Gruppe 3

- Anlegen über Shell: `ng generate`, `dotnet new`, `dotnet ef`. Kein eigenes Skript, kein MCP.
- Konventionen (z. B. Komponente = `.ts`, `.html`, `.scss`, `.spec.ts`) stehen im Skill `angular`; das ist dort schon abgedeckt (`op-generate.md`, `feature-first-layout.md`).
- [ ] Skill `dotnet`: Abschnitt zu `dotnet new` fehlt noch.
- [ ] Ein Block-Hook darf `ng generate`, `dotnet new` und `dotnet ef` nicht blocken.

### Entscheidung zu Gruppe 4

- Die Lese- und Such-Tools ziehen in den codebase-analyzer um: `read_method`, `read_signatures_only`, `read_class_summary`, `read_component_bundle`, `find_implementations`, `insert_member`, `update_imports`, `rename_file_with_impact`, `analyze_angular_architecture`.
- Doppelt vorhanden, nur im dev-mcp streichen: `find_angular_route`, `find_angular_guard`, `find_dotnet_endpoint`, `find_di_registration`.
- [ ] Umzug umsetzen.

### Zielbild

Nur noch ein MCP-Server: der codebase-analyzer. Der dev-mcp fällt weg, sobald die Messung zu Gruppe 1 vorliegt. Der build-log-filter fällt mit Gruppe 2 weg.

### Reihenfolge der Umsetzung (Vorschlag)

1. Gruppe 2: die sechs Skripte für Build, Test und Lint.
2. Gruppe 4: der Umzug in den codebase-analyzer.
3. Skills und `CLAUDE.md` anpassen, Block-Hook entscheiden.
4. Nach 2–3 Retros: Gruppe 1 entscheiden, dev-mcp abschalten.

## Retro-Skill

- [ ] Nach dem ersten echten dv-forge-Lauf mit Retro prüfen, ob die Agent-Namen in der MCP-Tabelle stimmen.
- [ ] Nach 2–3 Retros: Entscheidung zu Gruppe 1 treffen (siehe oben).

## Hooks für MCP-Regeln

- [ ] Hook gegen Shell-Aufrufe (`dotnet test`, `ng test` …): hart blocken, nur warnen oder Mittelweg? Hängt von Gruppe 2 ab.
- [ ] Wo liegen die Hooks: in dv-forge oder in einem eigenen Plugin?
