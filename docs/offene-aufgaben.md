# Offene Aufgaben

Laufende Arbeit, die noch nicht fertig ist. Erledigtes wird gestrichen.

## MCP-Server verschlanken (dev-mcp)

Ziel: Aufgaben des dev-mcp prüfen, was wegfallen oder als Skript ins Plugin wandern kann.
Der codebase-analyzer bleibt als Server, weil er warm läuft (Roslyn und ts-morph starten nicht jedes Mal neu).

| Nr | Gruppe | Stand |
|---|---|---|
| 1 | Tools, die Claude Code schon hat (Suchen, Lesen, Ersetzen, Umbenennen, Löschen, Ordner, Git, Prozesse) | **Entschieden:** 2–3 Retros messen, dann streichen oder behalten |
| 2 | Build, Test, Lint mit gefilterter Ausgabe, dazu build-log-filter | offen, als Nächstes besprechen |
| 3 | Scaffolding (`ng generate`, `dotnet new`, `dotnet ef`) | offen |
| 4 | Code gezielt lesen (`read_method`, `read_signatures_only` …) | offen |

## Retro-Skill

- [ ] Nach dem ersten echten dv-forge-Lauf mit Retro prüfen, ob die Agent-Namen in der MCP-Tabelle stimmen.
- [ ] Nach 2–3 Retros: Entscheidung zu Gruppe 1 treffen (siehe oben).

## Hooks für MCP-Regeln

- [ ] Hook gegen Shell-Aufrufe (`dotnet test`, `ng test` …): hart blocken, nur warnen oder Mittelweg? Hängt von Gruppe 2 ab.
- [ ] Wo liegen die Hooks: in dv-forge oder in einem eigenen Plugin?
