# Offene Aufgaben

Laufende Arbeit, die noch nicht fertig ist. Erledigtes wird gestrichen.

## MCP-Server verschlanken (dev-mcp)

Ziel: Aufgaben des dev-mcp prüfen, was wegfallen oder als Skript ins Plugin wandern kann.

**Maßstab für jede Entscheidung:** Die MCPs sollen helfen und Zeit und Tokens sparen. Ein Tool fällt nur weg, wenn der Ersatz nicht teurer ist.
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
- [x] Die sechs Skripte liegen unter `plugins/forge/scripts/toolchain/`, mit Tests.
  - Angular-Skripte an einem echten Angular-20-Projekt geprüft.
- [x] Option `--show errors|warnings|all` für Build und Lint: normal nur Fehler, auf Wunsch nur Warnungen (z. B. für Review oder Whiteboarding) oder beides.
- [ ] .NET-Skripte an einem echten Projekt prüfen (in der Cloud-Umgebung kein .NET SDK verfügbar).
- [ ] Einbinden: dv-forge-Konfiguration (`Build`, `Test`, `Lint`), Umsetzungs-Skill, `init`-Skill.

### Entscheidung zu Gruppe 3

- Anlegen über Shell: `ng generate`, `dotnet new`, `dotnet ef`. Kein eigenes Skript, kein MCP.
- Konventionen (z. B. Komponente = `.ts`, `.html`, `.scss`, `.spec.ts`) stehen im Skill `angular`; das ist dort schon abgedeckt (`op-generate.md`, `feature-first-layout.md`).
- [ ] Skill `dotnet`: Abschnitt zu `dotnet new` fehlt noch.
- [ ] Ein Block-Hook darf `ng generate`, `dotnet new` und `dotnet ef` nicht blocken.

### Entscheidung zu Gruppe 4

- Ziehen in den codebase-analyzer um (7): `read_method`, `read_signatures_only`, `read_class_summary`, `read_component_bundle`, `analyze_angular_architecture`, `insert_member`, `update_imports`.
- Gestrichen, weil gleich günstig ersetzbar (2): `find_implementations` (→ `find_type_hierarchy`), `rename_file_with_impact` (→ Suche + `git mv`).
- Doppelt vorhanden, nur im dev-mcp streichen: `find_angular_route`, `find_angular_guard`, `find_dotnet_endpoint`, `find_di_registration`.
- [ ] Umzug umsetzen.

### Zielbild

Nur noch ein MCP-Server: der codebase-analyzer. Der dev-mcp fällt weg, sobald die Messung zu Gruppe 1 vorliegt. Der build-log-filter fällt mit Gruppe 2 weg.

### Reihenfolge der Umsetzung (Vorschlag)

1. Gruppe 2: die sechs Skripte für Build, Test und Lint.
2. Gruppe 4: der Umzug in den codebase-analyzer.
3. Skills und `CLAUDE.md` anpassen, Block-Hook entscheiden.
4. Nach 2–3 Retros: Gruppe 1 entscheiden, dev-mcp abschalten.

## Kompletttest (offen, macht der User)

- [ ] Wenn alle Schritte umgesetzt sind: ein kompletter dv-forge-Lauf an einem echten Projekt mit Angular und .NET, danach Retro.
- [ ] Die Erfahrungsberichte aus `docs/wishes/` gemeinsam durchsehen: Laufen die sechs Skripte? Stimmen Fehler, Warnungen und Testnamen? Wird der dev-mcp noch gebraucht?

## Retro-Skill

- [ ] Nach dem ersten echten dv-forge-Lauf mit Retro prüfen, ob die Agent-Namen in der MCP-Tabelle stimmen.
- [ ] Nach 2–3 Retros: Entscheidung zu Gruppe 1 treffen (siehe oben).

## Hooks für MCP-Regeln

- [ ] Hook gegen Shell-Aufrufe (`dotnet test`, `ng test` …): hart blocken, nur warnen oder Mittelweg? Hängt von Gruppe 2 ab.
- [ ] Wo liegen die Hooks: in dv-forge oder in einem eigenen Plugin?
