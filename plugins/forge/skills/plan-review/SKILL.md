---
name: plan-review
description: Use when a dv-forge plan.md should run through the review loop of parallel reviewers against its spec and the code, mechanical aggregation and rework until it is clean, the round cap is reached or only a spec change could help.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--rounds N] [--only <reviewer,...>]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: Plan `P`, Spec `S`, Repo `R`, Arbeitsbereich `W`, `slug`, `aktiv` und `N`, die maximale Zahl an Nacharbeiten.
2. `aktiv` kommt aus `prepare.js`: alle fünf Reviewer, mit `--only` nur die genannten. Du startest genau die Reviewer aus `aktiv`. `spec_rueckfragen` ist eine leere Liste. Rolle des Arbeitsbereichs: `plan-review`.

## Reviewer
- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Zusatz-Stopps
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status spec-question --dir "<W>/runde-<r>"`
2. Exit 1: den Nacharbeiter einmal per `SendMessage` bitten, nur sein Ergebnis nach `<W>/runde-<r>/rework.json` zu schreiben, und Schritt 1 wiederholen. Wieder Exit 1: weiter ohne Eskalation.
3. Jede Zeile `ESCALATED <Stelle>` an `spec_rueckfragen` anhängen, ohne Doppelte.
4. `OUTCOME all-red-escalated=true` → Ende `Spec-Rückfrage in Runde r`.

## Abschluss-Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Bericht
Titel `Plan-Review`, Artefakt `<P>`, Zusatz-Status `Spec-Rückfrage in Runde r`. Ist `spec_rueckfragen` nicht leer, folgt als Zusatz-Abschnitt:

```markdown
### Spec-Rückfragen
- <Stelle>
```

Nächster Schritt:
- mit Spec-Rückfragen: `Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `sauber`: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja und erst nach dem Freigeben des Guards committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.
- sonst: `Plan nicht bereit. Plan, Abschnitt Entscheidungen und Scout-Vorschläge lesen, dann /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.`
