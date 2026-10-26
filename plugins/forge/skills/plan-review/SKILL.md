---
name: plan-review
description: Use when a dv-forge plan.md should run through the review of parallel reviewers against its spec and the code, one rework and one verification round, with a script deciding colors, stops and status. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
argument-hint: <plan.md> [spec.md] [--only <reviewer,...>] [--debug]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv`, die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN` (der Bericht enthält die Hinweise).
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`. Dokument `<DOC>` = `<P>`, Rolle `plan-review`.

## Ablage
Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts. `--debug` reicht `prepare.js` selbst durch.

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

## Nachprüfer
`dv-forge:plan-review-verifier` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Bericht
Titel `Plan-Review`, Artefakt `<P>`; den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile. Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen. Du fragst nicht nach einem Commit.
