## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Pfad zum Frontend-Projekt innerhalb von `{code-root}` |
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |

# Akzeptanzkriterien in Task-Markdown

Jede `tasks/task-*.md` führt **`## Akzeptanzkriterien`** als menschlich lesbare Bullet-Liste. **Nicht** in ADO `System.Description` / Acceptance Criteria schreiben — nur lokal.

## Inhalt

- Kurze, für Menschen scanbare Bullets — **keine IDs**, **keine Unterabschnitte**.
- Formulierung: Was soll sichtbar / messbar funktionieren? (kein technisches Vorgehen).
- Mindestinhalt: ≥1 Bullet sobald `## Anforderung` substanziell ist.

**Block-Sync bei `prüfe`:** Den **gesamten** `## Akzeptanzkriterien`-Block schreibt der **[Task-SubAgent](task-pruefe-subagent.md)** (idempotent), abgeleitet aus `## Anforderung` und `## Story-Bezug`. Die **Story-Phase** schreibt **keine** ACs. Discussion-closed: Block **unverändert** ([task-overview.md](task-overview.md)).

**Block-Sync bei `Task … verfeinern`:** Gesamten `## Akzeptanzkriterien`-Block aus freigegebener Anforderung schreiben — **nur Phase 5 nach Nutzer-Freigabe** — siehe [task-verfeinern.md](task-verfeinern.md).

**Ausnahme — effektives `TASK-CLOSED`:** Bei `prüfe` den Block **nicht** ersetzen; bestehenden Inhalt beibehalten ([task-overview.md](task-overview.md)).

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
| `plane Task …` | [planning-workflow](../../planning-workflow/SKILL.md): Planpaket **im Chat** referenziert Kriterien aus der Task-MD |
| Implementierung | DoD an `## Akzeptanzkriterien`; Abschluss mit `### Lösung` und `TASK-CLOSED` |
| `prüfe` | [task-pruefe-subagent.md](task-pruefe-subagent.md) schreibt AC-Block für **offene** Tasks; discussion-geschlossene: unverändert (kein Task-SubAgent) |

## Platzhalter (neue Task-Datei)

```markdown
## Akzeptanzkriterien

- _(aus Anforderung ableiten)_
```
