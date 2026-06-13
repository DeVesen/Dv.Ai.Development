# Akzeptanzkriterien in Task-Markdown

Jede `tasks/task-*.md` führt **`## Akzeptanzkriterien`** als menschlich lesbare Bullet-Liste. **Nicht** in ADO `System.Description` / Acceptance Criteria schreiben — nur lokal.

## Inhalt

- Kurze, für Menschen scanbare Bullets — **keine IDs**, **keine Unterabschnitte**.
- Formulierung: Was soll sichtbar / messbar funktionieren? (kein technisches Vorgehen).
- Mindestinhalt: ≥1 Bullet sobald `## Anforderung` substanziell ist.

**Block-Sync bei analyse/save:** Den **gesamten** `## Akzeptanzkriterien`-Block kommt aus **Task-Draft** ([`task-analyse-subagent.md`](task-analyse-subagent.md)) und wird in **save** geschrieben. Story-Analyse schreibt **keine** ACs. Discussion-closed: Block **unverändert** ([task-overview.md](task-overview.md)).

**Block-Sync bei `Task … verfeinern`:** Gesamten `## Akzeptanzkriterien`-Block aus freigegebener Anforderung schreiben — **nur Phase 5 nach Nutzer-Freigabe** — siehe [task-verfeinern.md](task-verfeinern.md).

**Ausnahme — effektives `TASK-CLOSED`:** Bei **analyse/save** den Block **nicht** ersetzen; bestehenden Inhalt beibehalten ([task-overview.md](task-overview.md)).

## Erledigte Tasks (`task-done`)

`## Akzeptanzkriterien` bleibt erhalten; zusätzlich **`### Lösung`** als Unterabschnitt mit Begründung warum davon auszugehen ist, dass der Task fertig ist.

## Task schließen (`markiere … als fertig`)

Vor `TASK-CLOSED`:

1. Kurz prüfen ob die wesentlichen Kriterien aus `## Akzeptanzkriterien` erfüllt sind.
2. `### Lösung` in der `task-done.md` befüllen.
3. Sonst: Nutzer informieren; nur nach expliziter Freigabe „trotzdem schließen" fortfahren und Lücken im Abschlussbericht nennen.

## Zusammenspiel Planning / Implementation

| Workflow | Nutzung der Task-AC |
|----------|---------------------|
| `Task … verfeinern` | [task-verfeinern.md](task-verfeinern.md): interaktiver 5-Phasen-Ablauf; `## Akzeptanzkriterien` in der MD **nach Nutzer-Freigabe**; **kein** Vorgehen/Planpaket in die Datei |
| `plane Task …` | Planning-Workflow: Planpaket **im Chat** referenziert Kriterien aus der Task-MD |
| Implementierung | DoD an `## Akzeptanzkriterien`; Abschluss mit `### Lösung` und `TASK-CLOSED` |
| `analyse` / `save` | [task-analyse-subagent.md](task-analyse-subagent.md) Draft → save schreibt AC für **offene** Tasks |

## Platzhalter (neue Task-Datei)

```markdown
## Akzeptanzkriterien

- _(aus Anforderung ableiten)_
```
