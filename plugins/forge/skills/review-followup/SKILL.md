---
name: review-followup
description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then only verified once, without any reviewer searching again.
disable-model-invocation: true
argument-hint: <spec.md|plan.md> <auswahl>
---

# Review-Followup (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Du orchestrierst wie in `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md`, Abschnitt Rolle: Du liest weder Artefakt, Spec noch Code, bewertest nichts und änderst nichts selbst; ein Hook blockt das. Plugin-Dateien liest du mit `Read`, jedes Skript startest du als einzelnen `node`-Aufruf ohne Verkettung. Die Einzelheiten jedes Schritts stehen in `${CLAUDE_PLUGIN_ROOT}/skills/review-followup/references/flow.md`; lies die Datei vor Schritt 1.

Auswahl: `b` = bevorzugter Vorschlag je Gruppe, `<n>` = Vorschlag n überall, `<g>:<n|b>,…` = je Gruppe; die Gruppen-Nummern stehen im Scout-Abschnitt des letzten Berichts. Optional `--spec <pfad>` und `--base <ref>` wie beim Original-Review.

## Ablauf
1. **Eingaben:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst Zeilen `<Name>=<Wert>` wie beim Original-Review, dazu `original` (die Art des Original-Reviews), `F`, `gruppen`, `offen` (nicht gewählte Gruppen), je Gruppe `WAHL` und bei `original=implementation-review` `FIX_BASE`. Jede `WARN`-Zeile kommt in die Hinweise.
2. **Original lesen:** `Read` auf `${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md`. Von dort nimmst du die Eingabezeilen der Abschnitte Reviewer, Nacharbeiter, Zusatz-Stopps und Nachprüfer, Scout sowie die Texte für `Nächster Schritt`.
3. **Umsetzen:** bei `spec-review` und `plan-review` der Nacharbeiter des Original-Skills im Folge-Modus, bei `implementation-review` `dv-forge:implementation-implementer`, wie in `flow.md`.
4. **Nachprüfung, genau eine Runde:** bei `spec-review` und `plan-review` der Nachprüfer des Original-Skills auf die gewählten Stellen und die geänderten Bereiche, bei `implementation-review` `dv-forge:implementation-re-reviewer` auf das Fix-Diff, wie in `flow.md`. Kein Reviewer läuft.
5. **Bericht** nach `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/report-format.md` mit Titel `Review-Followup (<original>)`, Artefakt das erste Argument, Status, Abschnitten und nächstem Schritt laut `flow.md`. Du committest nichts.
6. **Ende**, auch nach einem Fehler: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`.

Alle Agents laufen mit `run_in_background: false`.
