# dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

## Ablauf

1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie.
2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn. `plan-orchestrator` verkettet beides samt höchstens einem `review-followup` in einem Lauf und committet Spec und Plan am Ende.
3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab.

## Skills

| Skill | Wofür |
|---|---|
| `init` | dv-forge in einem Projekt einrichten, insbesondere den dv-forge-Abschnitt der Projekt-`CLAUDE.md` |
| `spec-whiteboarding`, `spec-whiteboarding-with-docs` | Aus Anfrage oder Idee eine Spec erarbeiten |
| `spec-review`, `plan-review`, `implementation-review` | Review durch parallele Reviewer, ein Rework, eine Verifikation |
| `review-followup` | Gewählte Scout-Vorschläge aus einem Review umsetzen |
| `plan-writing` | Spec in Plan überführen |
| `plan-orchestrator` | Plan schreiben, prüfen, einmal nacharbeiten und committen in einem Lauf; die Spec bleibt unverändert |
| `start-work`, `implementation`, `finish-work` | Arbeit vorbereiten, umsetzen, abschließen |
| `domain-modeling` | Unscharfe oder widersprüchliche Fachbegriffe klären, ADRs anstoßen |
| `merge-conflict-resolution` | Gestoppten Merge oder Rebase auflösen |
| `commit-message` | Commit-Message im Conventional-Commits-Stil schreiben (Text ausgeben, nicht committen); `init` trägt ihn als `Commit-Konvention` ein |

Das Modell darf alle Skills außer `init`, `start-work`, `finish-work` und `spec-whiteboarding-with-docs` selbst aufrufen, auch aus Sub-Agenten, damit ein Orchestrator Review-, Plan- und Umsetzungsabläufe verketten kann. Die vier gesperrten Skills tragen `disable-model-invocation: true`: Sie berühren Branches, Worktrees und Push bzw. führen einen Dialog mit dem Nutzer. Per `/dv-forge:<skill>` startet der Nutzer jeden Skill weiterhin selbst.

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
