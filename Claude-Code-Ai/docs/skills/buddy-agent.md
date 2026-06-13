# Buddy Agent

Sparring-Partner vor der Planung. Schärft Anforderungen, diskutiert Optionen und erzeugt einen wasserdichten Plan-Prompt für den nächsten Agenten — ohne sofort in `plane` oder `implementiere` zu springen.

**Trigger:** `buddy intake`, `buddy repo-check`, `Sparring`, `Anforderung schärfen`, `plan-prompt`, `handoff`, `compress`  
**Opt-out:** `ohne buddy-agent`

---

## Phasen

| Phase | Trigger | Beschreibung |
|-------|---------|--------------|
| **intake** | `buddy intake {task}` | Lädt Task-Datei (`requests/stories/task-*.md`), liest Story-Kontext, stellt Klärungsfragen |
| **repo-check** | `buddy repo-check` | MCP-Scout-Recherche im Repo (via `repo-scout-protocol`) |
| **compress** | `compress` | Verdichtet den bisherigen Gesprächsstand |
| **diskussion** | — | Offene Diskussion: Optionen, Alternativen, Trade-offs |
| **plan-prompt** | `plan-prompt` | Erzeugt wasserdichten Handoff-Prompt für `planning-workflow` |

---

## Artefakt-Pfad

Task-Dateien liegen unter:
```
{Projektverzeichnis}/requests/stories/task-*.md
```

Kein ADO-MCP, keine `ado`-Pipeline im Buddy-Kontext — das ist der `ado`-Skill.

---

## Handoff zu Planning

Nach `plan-prompt` erzeugt Buddy einen Copy-Paste-fähigen Prompt. Dieser wird direkt an einen neuen Agenten mit `planning-workflow` übergeben — entweder per `describe-as-prompt` oder direkt als Eingabe.

---

## Zusammenspiel mit anderen Skills

- **ADO-Stories:** [`ado`](./ado.md) für `load` / `analyse` / `save`
- **Scout-Recherche:** [`repo-scout-protocol`](./repo-scout-protocol.md) für die MCP-Kette
- **Danach:** [`planning-workflow`](./planning-workflow.md) übernimmt den Plan-Prompt
- **Handoff erzeugen:** [`describe-as`](./utility-skills.md#describe-as) für Prompt-Artefakte
