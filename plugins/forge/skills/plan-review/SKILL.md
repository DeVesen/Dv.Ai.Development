---
name: plan-review
description: Use when a dv-forge plan.md should run through the review loop of parallel reviewers against its spec and the code, mechanical aggregation and rework until it is clean, the round cap is reached or only a spec change could help.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--rounds N]
---

# Plan-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für den Plan gilt. Du liest weder Plan noch Spec.

## Eingaben
1. Das erste Argument ist der Plan (`P`, absolut machen). Ein weiteres Argument ohne `--` ist die Spec (`S`); fehlt es, ist `S` die Datei `spec.md` im Ordner von `P`. `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3. Ein führendes `@` am Pfad entfernen.
2. Für `P` und für `S`: `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<pfad>"`. Ist der Exit ≠ 0: melden „Datei nicht gefunden: <pfad>“ und Ende.
3. `git rev-parse --show-toplevel` ausführen; die Ausgabe ist das Repo `R`.
4. `aktiv = coverage,feasibility,architecture,risks,buildability`; `spec_rueckfragen` ist eine leere Liste.

## Reviewer
- `dv-forge:plan-review-coverage` — `Plan: <P>`, `Spec: <S>`
- `dv-forge:plan-review-feasibility` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-architecture` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-risks` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`
- `dv-forge:plan-review-buildability` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Nacharbeiter
`dv-forge:plan-rework` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Fortschritts-Skript
`node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<P>"`

## Zusatz-Stopps
1. Die Aggregation dieser Runde und den letzten JSON-Block des Nacharbeiters übergeben:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status spec-question <<'DV_FORGE_EOF'
   === AGGREGATE ===
   <komplette Ausgabe von aggregate-findings.js dieser Runde>
   === REWORK-RESULT ===
   <letzter JSON-Block des Nacharbeiters>
   DV_FORGE_EOF
   ```
2. Exit 1: den Nacharbeiter einmal per `SendMessage` bitten, nur seinen JSON-Block im vereinbarten Format nachzuliefern, und Schritt 1 wiederholen. Wieder Exit 1: alle Stellen gelten als `unchanged`; weiter mit der Fortschrittsprüfung.
3. Jede Zeile `ESCALATED <Stelle>` an `spec_rueckfragen` anhängen, ohne Doppelte.
4. `OUTCOME all-red-escalated=true` → Ende „Spec-Rückfrage in Runde r“.

## Abschluss-Scout
`dv-forge:plan-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>`

## Bericht
Titel „Plan-Review“, Artefakt `<P>`, Zusatz-Status „Spec-Rückfrage in Runde r“. Ist `spec_rueckfragen` nicht leer, folgt als Zusatz-Abschnitt:

```markdown
### Spec-Rückfragen
- <Stelle>
```

Nächster Schritt:
- mit Spec-Rückfragen: „Spec anpassen, dann `/dv-forge:spec-review <S>`, danach `/dv-forge:plan-review <P>` erneut.“
- sauber: „`spec.md` und `plan.md` vor dem Start committen, sonst sieht sie ein Worktree nicht. Dann in einer frischen Session:“ und darunter in einem Code-Block `/dv-forge:implementation <P>`.
- sonst: „Plan, Abschnitt „Entscheidungen“ und Scout-Vorschläge lesen, dann selbst committen.“
