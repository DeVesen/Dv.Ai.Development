---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review loop of parallel reviewers, mechanical aggregation and rework until it is clean or the round cap is reached.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--rounds N]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, `N` (maximale Nacharbeiten), Arbeitsbereich `W`, `slug`, `profile` (`ja`/`nein`), bei `ja` den Profil-Index `PI`, falls angegeben die Quelle `Q` und je Warnung eine Zeile `WARN`.
2. Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators. Du liest weder Profile noch Index.
3. `aktiv = completeness,consistency,feasibility,clarity`, bei `profile=ja` zusätzlich `profiles`. Rolle des Arbeitsbereichs: `spec-review`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>`, `Profil-Index: <PI>`, `Repo: <R>`; nur bei `profile=ja`

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und `Repo: <R>`

## Bericht
Titel `Spec-Review`, Artefakt `<S>`, keine Zusatz-Status und keine Zusatz-Abschnitte. Nächster Schritt:
- `sauber`: `Spec ist bereit. Spec committen, dann in einer frischen Session:` und darunter in einem Code-Block `/dv-forge:plan-writing <S>`.
- sonst: `Spec nicht bereit. Findings, Abschnitt Entscheidungen und Scout-Vorschläge lesen, Spec anpassen, dann /dv-forge:spec-review <S> erneut.`
