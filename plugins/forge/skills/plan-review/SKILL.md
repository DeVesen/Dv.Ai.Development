---
name: plan-review
description: Use when a dv-forge plan.md should run through the review flow of one search round with parallel reviewers against its spec and the code, script-based classification, at most one rework and one verification round.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--only <reviewer,...>]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm mit `<art>` = `plan-review`, `<DOK>` = `<P>`, Titel `Plan-Review` und Rolle `plan-review`. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv`, die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`.

## Reviewer
Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.

- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`, `Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

Eine Frage an den Menschen ist hier eine Spec-Rückfrage; der Lauf hält dafür nicht an.

## Nach der Nacharbeit
Gibt es `A`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"`.

## Nachprüfer
`dv-forge:plan-review-verifier` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nächster Schritt
Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

- `sauber …`: Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis. Nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: keine Frage, beide sind committet; weiter mit dem Code-Block `/dv-forge:implementation <P>` wie unten. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.
- `Fragen offen`: `Spec-Rückfragen offen. Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `nicht bereit …`: `Plan nicht bereit. Nachprüfung und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut.` und der Auswahl-Hinweis.
- `unvollständig …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
