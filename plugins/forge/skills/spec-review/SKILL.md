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
1. Das erste Argument ist die Spec (`S`, absolut machen). Ein weiteres Argument ohne `--` ist die Quelle (`Q`). `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3. Ein führendes `@` am Pfad entfernen.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"` ausführen. Ist der Exit ≠ 0: melden „Spec nicht gefunden: <S>“ und Ende.
3. Profile per Glob suchen: `<glossar>/*.md` (Ort aus der Projekt-CLAUDE.md, sonst `docs/glossary`) und `docs/application/**/*.md`. Gibt es Treffer, ist `profiles` aktiv und `P` = Trefferliste. Du liest diese Dateien nicht.
4. `aktiv = completeness,consistency,feasibility,clarity[,profiles]`.

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
`dv-forge:spec-review-scout` — `Spec: <S>` und `Repo: <Projektwurzel>`

## Bericht
Titel „Spec-Review“, Artefakt `<S>`, keine Zusatz-Status und keine Zusatz-Abschnitte. Nächster Schritt: „Spec und Abschnitt „Entscheidungen“ lesen, dann selbst committen.“
