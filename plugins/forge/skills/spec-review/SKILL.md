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
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, `N` (maximale Nacharbeiten) und, falls angegeben, die Quelle `Q`.
2. Profile per Glob suchen: `<glossar>/*.md` (Ort aus der Projekt-CLAUDE.md, sonst `docs/glossary`) und `docs/application/**/*.md`. Gibt es Treffer, ist `profiles` aktiv und `P` = Trefferliste. Du liest diese Dateien nicht.
3. `aktiv = completeness,consistency,feasibility,clarity[,profiles]`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>` und `Profile: <P>`, nur wenn aktiv

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Fortschritts-Skript
`node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"`

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und `Repo: <R>`

## Bericht
Titel „Spec-Review“, Artefakt `<S>`, keine Zusatz-Status und keine Zusatz-Abschnitte. Nächster Schritt: „Spec und Abschnitt „Entscheidungen“ lesen, dann selbst committen.“
