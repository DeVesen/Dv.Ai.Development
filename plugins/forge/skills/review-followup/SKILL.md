---
name: review-followup
description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then verified once, without a fresh search by the reviewers.
argument-hint: <spec.md|plan.md> <alle|auswahl>
---

# Review-Followup (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Du orchestrierst wie in `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md`, Abschnitt Rolle: Du liest weder Artefakt, Spec noch Code, bewertest nichts und änderst nichts selbst; ein Hook blockt das. Plugin-Dateien liest du mit `Read`, jedes Skript startest du als einzelnen `node`-Aufruf ohne Verkettung. Die Einzelheiten jedes Schritts stehen in `${CLAUDE_PLUGIN_ROOT}/skills/review-followup/references/flow.md`; lies die Datei vor Schritt 1.

Auswahl: `alle` wählt den bevorzugten Vorschlag jeder offenen Gruppe; als Expertenformen gibt es `b`, `<n>` und `<g>:<n|b>,…`. `<n>` und `<g>:<n|b>,…` zählen die Gruppen in der Reihenfolge der gesicherten Abschlussdaten; der Bericht zeigt diese Nummern nicht, darum ist `alle` der Normalfall. Optional `--spec <pfad>` und `--base <ref>` wie beim Original-Review. Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.

## Ablauf
1. **Eingaben:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst Zeilen `<Name>=<Wert>` wie beim Original-Review, dazu `original` (die Art des Original-Reviews), `F`, `gruppen`, `offen` (nicht gewählte Gruppen), je Gruppe `WAHL` und bei `original=implementation-review` `FIX_BASE`. Bei Spec und Plan musst du die `WARN`-Zeilen nicht weitergeben (der Bericht enthält die Hinweise); bei `implementation-review` kommt jede `WARN`-Zeile in die Hinweise.
2. **Original lesen:** `Read` auf `${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md`. Von dort nimmst du die Eingabezeilen der Abschnitte Nacharbeiter, Nachprüfer und Scout und die Skript-Prüfungen. Bei `implementation-review` entfällt der Schritt: Implementer und Re-Reviewer bekommen ihre Eingaben aus `flow.md`, und es läuft kein Scout.
3. **Umsetzen:** bei `spec-review` und `plan-review` der Nacharbeiter des Original-Skills im Folge-Modus, bei `implementation-review` `dv-forge:implementation-implementer`, wie in `flow.md`.
4. **Nachprüfung, genau eine:** bei `spec-review` und `plan-review` der Nachprüfer des Original-Skills; kein Reviewer läuft. Bei `implementation-review` `dv-forge:implementation-re-reviewer` auf das Fix-Diff. Beides wie in `flow.md`.
5. **Bericht** mit Titel `Review-Followup (<original>)`, Artefakt das erste Argument und Status laut `flow.md`. Du committest nichts; die Formatregeln stehen in `flow.md`, Abschnitt Ende.
6. **Ende**, auch nach einem Fehler: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`. Im Chat steht als letzte Handlung die Review-Statuszeile aus Schritt 5.

Alle Agents laufen mit `run_in_background: false`.
