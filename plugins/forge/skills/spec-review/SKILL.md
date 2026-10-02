---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review of parallel reviewers, one rework and one verification round, with a script deciding colors, stops and status.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--only <reviewer,...>]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md` und folge ihm. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, Arbeitsbereich `W`, `slug`, `art` (`frei`/`verankert`), `profile` (`ja`/`nein`), `aktiv`, bei `ja` den Profil-Index `PI` und den Pfad des Profil-Auszugs `PA`, falls angegeben die Quelle `Q` und je Warnung eine Zeile `WARN`.
2. Die `WARN`-Zeilen musst du nicht weitergeben; der Bericht enthält die Hinweise. Du liest weder Profile noch Index.
3. `aktiv` kommt aus `prepare.js`: alle Reviewer, mit `--only` nur die genannten; `profiles` nur bei `profile=ja`. Du startest genau die Reviewer aus `aktiv`. Dokument `<DOC>` = `<S>`, Rolle `spec-review`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>`, `Profil-Index: <PI>`, `Profil-Auszug: <PA>`, `Repo: <R>`; nur bei `profile=ja`

Bei `art=frei` prüfen alle Reviewer nur die innere Stimmigkeit; `profile` ist dann immer `nein`.

## Beratend
Keine.

## Skript-Prüfungen
Keine.

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`

## Nachprüfer
`dv-forge:spec-review-verifier` — `Spec: <S>`

## Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`; bei `profile=ja` zusätzlich `Profil-Index: <PI>`

## Bericht
Titel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report` (Ergebnis, Entscheidungen, Offenes, Hinweise, nächste Schritte).
