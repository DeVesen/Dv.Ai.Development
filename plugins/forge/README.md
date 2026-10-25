# dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

## Ablauf

1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie. `spec-review-orchestrator` verkettet `spec-review` mit bis zu zwei Followup-Runden (`review-followup`) und committet die Spec einmal im aktuellen Branch.
2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn. `plan-orchestrator` verkettet beides samt bis zu zwei Followup-Runden in einem Lauf; er committet nicht, der Abschlussbericht nennt den Commit-Stand.
3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab. `implementation-orchestrator` verkettet `start-work`, `implementation` und `implementation-review` samt bis zu zwei Followup-Runden in einem Lauf und endet mit einem Abschlussbericht; `finish-work` empfiehlt er nur, der Worktree bleibt, nichts wird gepusht.
4. **Session-Kette:** `session-orchestrator` führt Whiteboarding, Grill (`spec-grilling`), Spec-Review, Planning, Plan-Review, Umsetzung und Abschluss je in einer eigenen Etappen-Session. Die Leit-Session startet die Etappen, prüft jedes `final` gegen git, hält am Spec- und am GO-Haltepunkt und führt den Zustand je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`: Ketten-Regeln und Gesprächsstil.

**Spec-Format:** `scripts/spec-lint.js <spec.md>` prüft das Spec-Format ohne KI (Abschnitte, Kopf, lückenlose AC-IDs, Gegeben/wenn/dann, Beleg-Tags, W-Einträge, Abbruch). Whiteboarding und Grill rufen es nach dem Schreiben auf, der Spec-Review nutzt es als Skript-Prüfung (Formfehler 🔴, Kopf und Warnungen 🟡), und die Session-Kette hält bei Formfehlern nach Whiteboarding, Grill und Spec-Nacharbeit.

**Prüfläufe:** `scripts/verify-run.js --repo <R>` führt `Build`, `Test` und `Lint` aus den Projekt-Einstellungen aus und schreibt Exit-Codes, Ausgabe-Ende und HEAD als JSON (`ergebnis` gruen, rot, docker oder keine). `finish-work`, der Implementierungs-Orchestrator, der Abschluss der Umsetzung (Zeile `Gesamtlauf:`) und der Implementierungs-Review nutzen es statt eigener Läufe. `scripts/implementation-checks.js` gleicht dort zusätzlich die Dateien des Plans mit dem Diff ab (geplant, aber nicht geändert: 🔴; ungeplant geändert: 🟡) und liefert das Ergebnis als Reviewer `skript`.

**Messdaten:** Jeder Spec-, Plan- und Implementierungs-Review hängt eine Zeile an `<git-common-dir>/dv-forge/metrics/reviews.jsonl` (Farben je Runde, verworfene Findings, Nacharbeit, Fragen, Ausfälle, Nachforderungen, Belege je Reviewer). Die Session-Kette schreibt je Slug `events.jsonl` neben `zustand.json` (Start, final mit Dauer und offenen Punkten, Haltepunkt, Antwort, Commit, Schluss). dv-forge liefert nur die Rohdaten; die Auswertung gehört nach `toolbelt`.

**Golden-Sets:** `evals/` hält je Review einen Fall mit eingebauten Mängeln und den Befunden, die gefunden werden sollen. `scripts/eval-review.js` misst Läufe daraus (Recall, Precision, Belegquote, Stabilität über mehrere Läufe), siehe `evals/README.md`.

**Nacharbeit-Werkzeuge:** `scripts/followup.js next` liefert den nächsten Schritt nach einem Followup, `implementation-report.js followup --artefakt` den Bericht eines einzeln laufenden Implementierungs-Followups. Die Prüfung nach Grill und Spec-Nacharbeit vergleicht die Spec mit der Kopie `spec-vor-<etappe>.md` vom Etappenstart, `spec-commit.js` committet die Spec des Spec-Reviews, und `review-flow.js report` gibt für den Plan-Review die Zeile `COMMIT-PRUEFUNG` aus. Die fünf Implementierungs-Reviewer vergeben nur Kategorien (`scripts/lib/implementation-categories.js`), die Farbe setzt der Code; `implementation-verdict.js` liest das Urteil aus ihrem Bericht. `verify-run.js --basis` hält den Basis-Lauf vor Task 1 fest, `ledger.js check|next|tdd` prüft das Ledger, nennt den nächsten Schritt und weist auf Tests nach dem Produktivcode hin. `spec-lint.js --runde` prüft die Form einer Grill-Runde, die Skript-Prüfung `spec-terms` meldet verworfene Synonyme des Glossars, `spec-path.js` bestimmt den Zielpfad der Spec beim Whiteboarding, und `implementation-checks.js` liefert zusätzlich mechanische Code-Hinweise (verschluckte Fehler, Secret-Muster, sehr große Zuwächse) als 🟡.

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
