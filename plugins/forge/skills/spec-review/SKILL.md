---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review loop of parallel reviewers, mechanical aggregation and rework until it is clean or the round cap is reached.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--rounds N] [--only <reviewer,...>]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Spec gilt. Du liest die Spec nicht.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Spec `S`, Projektwurzel `R`, `N` (maximale Nacharbeiten), Arbeitsbereich `W`, `slug`, `art` (`frei`/`verankert`), `profile` (`ja`/`nein`), `aktiv`, bei `ja` den Profil-Index `PI` und den Pfad des Profil-Auszugs `PA`, falls angegeben die Quelle `Q` und je Warnung eine Zeile `WARN`.
2. Jede `WARN`-Zeile kommt in die Hinweise des Orchestrators. Du liest weder Profile noch Index.
3. `aktiv` kommt aus `prepare.js`: alle Reviewer, mit `--only` nur die genannten; `profiles` nur bei `profile=ja`. Du startest genau die Reviewer aus `aktiv`. Rolle des Arbeitsbereichs: `spec-review`.

## Reviewer
- `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
- `dv-forge:spec-review-consistency` — `Spec: <S>`
- `dv-forge:spec-review-feasibility` — `Spec: <S>`
- `dv-forge:spec-review-clarity` — `Spec: <S>`
- `dv-forge:spec-review-profiles` — `Spec: <S>`, `Profil-Index: <PI>`, `Profil-Auszug: <PA>`, `Repo: <R>`; nur bei `profile=ja`

Bei `art=frei` prüfen alle Reviewer nur die innere Stimmigkeit; `profile` ist dann immer `nein`.

## Nacharbeiter
`dv-forge:spec-rework` — `Spec: <S>`

## Zusatz-Stopps
`fragen` ist zu Beginn eine leere Liste.
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status human-question --dir "<W>/runde-<r>"`
2. Exit 1: den Nacharbeiter einmal per `SendMessage` bitten, nur sein Ergebnis nach `<W>/runde-<r>/rework.json` zu schreiben, und Schritt 1 wiederholen. Wieder Exit 1: weiter ohne Fragen.
3. Jede Zeile `ESCALATED <Stelle>` an `fragen` anhängen, ohne Doppelte.
4. `OUTCOME all-red-escalated=true` → Ende `Fragen an den Menschen in Runde r`.

## Abschluss-Scout
`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`

## Bericht
Titel `Spec-Review`, Artefakt `<S>`, Zusatz-Status `Fragen an den Menschen in Runde r`. Ist `fragen` nicht leer, folgt als Zusatz-Abschnitt, die Fragen stehen im Abschnitt Entscheidungen der Spec:

```markdown
### Fragen an den Menschen
- <Stelle>
```

Nächster Schritt:
- mit Fragen: `Die Fragen in den R-Einträgen der Spec beantworten und als W-Einträge festhalten, dann /dv-forge:spec-review <S> erneut.`
- `sauber`: `Spec ist bereit. Spec committen, dann in einer frischen Session:` und darunter in einem Code-Block `/dv-forge:plan-writing <S>`.
- sonst: `Spec nicht bereit. Findings, Abschnitt Entscheidungen und Scout-Vorschläge lesen, Spec anpassen, dann /dv-forge:spec-review <S> erneut.`
