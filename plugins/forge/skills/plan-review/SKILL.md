---
name: plan-review
description: Use when a dv-forge plan.md should run through the review of parallel reviewers against its spec and the code, one rework and one verification round, with a script deciding colors, stops and status.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--only <reviewer,...>]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv`, die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`. Dokument `<DOC>` = `<P>`, Rolle `plan-review`.

## Reviewer
Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.

- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`, `Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`

## Beratend
Keine.

## Skript-Prüfungen
`node "${CLAUDE_PLUGIN_ROOT}/scripts/review-flow.js" script-checks <FLAGS> --runde <runde>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nach der Nacharbeit
Gibt es `A`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`.

## Nachprüfer
`dv-forge:plan-review-verifier` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Bericht
Titel `Plan-Review`, Artefakt `<P>`. Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen.

Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

Nächster Schritt:
- `Fragen offen`: `Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `sauber nach Runde 1` und `sauber nach Nachprüfung`: Zeigt der Bericht Scout-Vorschläge, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis. Nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: keine Frage, beide sind committet; weiter mit dem Code-Block `/dv-forge:implementation <P>` wie unten. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`. Bei Nein oder ohne Antwort: kein Commit und kein weiterer Schritt. Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben, kein `/dv-forge:implementation <P>`.
- `nicht bereit, …`: `Plan nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.` und der Auswahl-Hinweis.
- `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
