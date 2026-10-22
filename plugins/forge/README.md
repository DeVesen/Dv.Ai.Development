# dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

## Ablauf

1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie. `spec-review-orchestrator` verkettet `spec-review` mit bis zu zwei Followup-Runden (`review-followup`) und committet die Spec einmal im aktuellen Branch.
2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn. `plan-orchestrator` verkettet beides samt bis zu zwei Followup-Runden in einem Lauf; er committet nicht, der Abschlussbericht nennt den Commit-Stand.
3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab. `implementation-orchestrator` verkettet `start-work`, `implementation` und `implementation-review` samt bis zu zwei Followup-Runden in einem Lauf und endet mit einem Abschlussbericht; `finish-work` empfiehlt er nur, der Worktree bleibt, nichts wird gepusht.
4. **Session-Kette:** `session-orchestrator` führt Whiteboarding, Grill (`spec-grilling`), Spec-Review, Planning, Plan-Review, Umsetzung und Abschluss je in einer eigenen Etappen-Session. Die Leit-Session startet die Etappen, prüft jedes `final` gegen git, hält am Spec- und am GO-Haltepunkt und führt den Zustand je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`: Ketten-Regeln und Gesprächsstil.

Alle drei Orchestratoren enden mit genau einem Abschlussbericht in vier Abschnitten (`# Abschlussbericht`, `# Was sich … geändert hat`, `# Was ist noch offen`, `# Wie es weitergeht`). Review und Followup laufen dabei eingebettet (`--bericht <datei>`) ohne eigenen Bericht; `orchestrator-report.js` setzt den Endstand aus ihren Berichtsdaten zusammen. Alleinstehend aufgerufen zeigen Review und Followup ihre Berichte wie bisher.

Eine Followup-Runde startet, sobald das Review einen Followup anbietet (`FOLLOWUP ja`), unabhängig von ✅, ⛔ oder ❓; nur ⚠️ und ein Abbruch stoppen. Es gibt höchstens zwei Runden je Lauf. 🟢 arbeitet keine Runde ein; sie stehen nur im Abschlussbericht unter „Was ist noch offen“.

Jeder Orchestrator vermerkt am Ende einen **Ketten-Eintrag** je Slug (Stufe, Spec, Plan, Workitem, Worktree, Branch) mit `scripts/chain.js`, abgelegt unter `<git-common-dir>/dv-forge/chain/`, gemeinsam für den Haupt-Checkout und alle Worktrees. Ruft der Mensch danach für dasselbe Artefakt `spec-review`, `plan-review`, `implementation-review` oder `review-followup` auf, nennt deren Bericht den Orchestrator-Schritt der nächsten Stufe statt des Einzel-Skills; `finish-work` entfernt den Eintrag. Ohne Eintrag bleiben die Berichte wie bisher.

Mit `--ablage <etappe>` legen die drei Orchestratoren, `plan-review` und `review-followup` Abschlussbericht und Bericht-Daten zusätzlich unter `<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/` ab, gemeinsam für den Haupt-Checkout und alle Worktrees. Ohne die Option bleibt alles wie bisher.

## Skills

| Skill | Wofür |
|---|---|
| `init` | dv-forge in einem Projekt einrichten, insbesondere den dv-forge-Abschnitt der Projekt-`CLAUDE.md` |
| `spec-whiteboarding`, `spec-whiteboarding-with-docs` | Aus Anfrage oder Idee eine Spec erarbeiten |
| `spec-review`, `plan-review`, `implementation-review` | Review durch parallele Reviewer, ein Rework, eine Verifikation |
| `review-followup` | Gewählte Scout-Vorschläge aus einem Review umsetzen |
| `spec-review-orchestrator` | Spec prüfen, bis zu zweimal nacharbeiten und committen in einem Lauf; kein Worktree, kein Branch-Wechsel |
| `plan-writing` | Spec in Plan überführen |
| `plan-orchestrator` | Plan schreiben, prüfen und bis zu zweimal nacharbeiten in einem Lauf; kein Commit, die Spec bleibt unverändert |
| `start-work`, `implementation`, `finish-work` | Arbeit vorbereiten, umsetzen, abschließen |
| `implementation-orchestrator` | Umsetzen, prüfen und bis zu zweimal nacharbeiten in einem Lauf; Worktree bleibt, `finish-work` manuell, Plan und Spec bleiben unverändert, kein Push |
| `spec-grilling` | Geschriebene Spec auf Grenzfälle, Widersprüche und Lücken prüfen; W-Einträge gelten als beantwortet |
| `session-orchestrator` | Session-Kette führen: jede Etappe in eigener Session, Haltepunkte, Prüfung gegen git, Schlussbericht |
| `domain-modeling` | Unscharfe oder widersprüchliche Fachbegriffe klären, ADRs anstoßen |
| `merge-conflict-resolution` | Gestoppten Merge oder Rebase auflösen |
| `commit-message` | Commit-Message im Conventional-Commits-Stil schreiben (Text ausgeben, nicht committen); `init` trägt ihn als `Commit-Konvention` ein |

Das Modell darf alle Skills außer `init` selbst aufrufen, auch aus Sub-Agenten, damit ein Orchestrator Review-, Plan- und Umsetzungsabläufe verketten kann. `init` trägt `disable-model-invocation: true`, weil es einen Dialog mit dem Nutzer führt. Per `/dv-forge:<skill>` startet der Nutzer jeden Skill weiterhin selbst.

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
