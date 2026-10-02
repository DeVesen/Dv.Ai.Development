# dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

## Ablauf

1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie.
2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn.
3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab.

## Skills

| Skill | Wofür |
|---|---|
| `init` | dv-forge in einem Projekt einrichten, insbesondere den dv-forge-Abschnitt der Projekt-`CLAUDE.md` |
| `spec-whiteboarding`, `spec-whiteboarding-with-docs` | Aus Anfrage oder Idee eine Spec erarbeiten |
| `spec-review`, `plan-review`, `implementation-review` | Review durch parallele Reviewer, ein Rework, eine Verifikation |
| `review-followup` | Gewählte Scout-Vorschläge aus einem Review umsetzen |
| `plan-writing` | Spec in Plan überführen |
| `start-work`, `implementation`, `finish-work` | Arbeit vorbereiten, umsetzen, abschließen |
| `domain-modeling` | Unscharfe oder widersprüchliche Fachbegriffe klären, ADRs anstoßen |
| `merge-conflict-resolution` | Gestoppten Merge oder Rebase auflösen |
| `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |

## Agents

Unter [`agents/`](agents) liegen die Spezialisten der Review-Loops, gruppiert nach Stufe:

- `spec-review-*`, `spec-rework`
- `plan-review-*`, `plan-rework`
- `implementation-*` (Implementer, Task-Reviewer, Re-Reviewer, Final-Reviewer) und `implementation-review-*`

Jede Stufe hat einen `*-scout`, der für offene Findings konkrete Lösungsvorschläge macht.

## Einrichten

```text
/plugin install dv-forge@dv-ai-development
```

Danach im Projekt `/dv-forge:init` ausführen.
