# State-Mapping (`active` / `resolved`)

Nutzerbefehle sind **kleingeschrieben**; ADO-States sind **projektspezifisch**.

## Standard-Mapping (Beispiel)

| Nutzer sagt | `wit_update_work_item` Pfad | Zielwert |
|-------------|----------------------------|----------|
| `active` | `/fields/System.State` | `Active` |
| `resolved` | `/fields/System.State` | `Resolved` |

## Vor dem Update

1. `wit_get_work_item` — aktuellen `System.State` lesen.
2. Wenn Ziel-State im Projekt unbekannt wirkt (API-Fehler): **abbrechen**, Nutzer informieren — **nicht raten**.
3. Optional: erlaubte States aus Work-Item-Type-Dokumentation des Projekts (nicht in V1 automatisiert).

## Nebenwirkungen

| Befehl | ADO | Lokales Repo |
|--------|-----|----------------|
| `active` | State → Active | Story-MD Status aktualisieren; **Ordner bleibt** |
| `resolved` | State → Resolved | Nach **Bestätigung** und erfolgreichem ADO-Update: Ordner `{workspace-root}/requests/stories/UserStory-{id}-*` **löschen** |

## `resolved` — Sicherheit

- Nutzer **explizit** warnen: lokale Markdown inkl. `tasks/` geht verloren (Git-Historie bleibt).
- Erst ADO-Update, dann Löschen.
- Optional: `STORY-RESOLVED`-Kommentar in Discussion (siehe [markers.md](markers.md)).
