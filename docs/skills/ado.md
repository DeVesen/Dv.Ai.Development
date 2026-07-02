# ADO Skill

Azure DevOps Work Items mit Markdown synchronisieren. Lädt Stories, Features und Tasks als `.md`-Dateien, analysiert sie und speichert Änderungen zurück nach ADO.

**Trigger:** `load story`, `load feature`, `load task`, `analyse`, `save`, `markiere Task fertig`, `ToDo`, `active`, `resolved`, `Task verfeinern`, `schließe Task`, `@ado`  
**Opt-out:** `ohne ado-story-skill`  
**Voraussetzung:** MCP-Server `ado` (`@azure-devops/mcp`) erreichbar

---

## Phasen (Pflicht-Reihenfolge)

| Phase | Trigger | Beschreibung |
|-------|---------|--------------|
| **load** | `load story {id}` / `load task {id}` | ADO-Item via MCP laden, als `.md` speichern |
| **analyse** | `analyse` | Geladene Datei inhaltlich analysieren (kein `prüfe`) |
| **save** | `save` | Änderungen aus `.md` zurück nach ADO schreiben |

Schrittweise — niemals `load + analyse + save` in einem Schritt ohne User-Bestätigung zwischen den Phasen.

---

## Artefakt-Pfad

```
{Projektverzeichnis}/requests/stories/
├── story-{id}.md
├── feature-{id}.md
└── task-{id}.md
```

---

## Weitere Operationen

| Operation | Trigger |
|-----------|---------|
| Task als fertig markieren | `markiere Task fertig {id}` |
| Task auf ToDo setzen | `ToDo {id}` |
| Task aktivieren | `active {id}` |
| Task als resolved markieren | `resolved {id}` |
| Task verfeinern (Legacy) | `Task verfeinern {id}` |
| Task schließen | `schließe Task {id}` |

---

## Sub-Agents

| Agent | Rolle |
|-------|-------|
| `ado-agent` | Orchestrator — koordiniert load/analyse/save |
| `ado-story-pruefe-agent` | Prüft Story-Inhalt und ACs |
| `ado-task-pruefe-agent` | Prüft Task-Inhalt und Umsetzungsbereitschaft |

---

## Abgrenzung zu requirement-definition

`ado` = Work Items in ADO laden/speichern  
`requirement-definition` = Anforderungen erfassen/schneiden · `grill-me` = interaktiv schärfen (kein ADO-MCP)

Typischer Flow: `ado load` → `requirement-definition` / `grill-me` → `feature-delivery` (`plane`)

---

## Zusammenspiel mit anderen Skills

- **Vor der Planung:** `requirement-definition` (Anforderung schneiden) / `grill-me` (interaktiv schärfen)
- **Danach:** [`feature-delivery`](./feature-delivery.md) — `plane`
