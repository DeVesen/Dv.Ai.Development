---
name: implementation-review
description: Use when a finished dv-forge implementation should be checked once by parallel reviewers against plan, spec and code, with mechanical aggregation and a scout that proposes solutions for every red or yellow finding.
disable-model-invocation: true
argument-hint: <plan.md> [--spec <pfad>] [--context <pfad>]... [--base <ref>]
---

# Implementierungs-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Umsetzung gilt. Du liest weder Plan, Spec, Kontext-Dateien noch Code; ein Hook blockt das für das ganze Repo.

## Eingaben
1. Das erste Argument ohne `--` ist der Plan (`P`, absolut machen). `--spec <pfad>` ist die Spec (`S`); fehlt es, ist `S` die Datei `spec.md` im Ordner von `P`. Jedes `--context <pfad>` kommt in die Liste `C`. `--base <ref>` ist die Basis `B`.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<P>"`; Exit ungleich 0: `Datei nicht gefunden: <P>`, Ende. Für `S` ebenso: Exit ungleich 0 bei angegebenem `--spec` ist dieselbe Meldung und Ende, bei der Pfadregel entfällt `S`.
3. `R` = Ausgabe von `git rev-parse --show-toplevel`. `slug` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" slug "<P>"`.
4. Ohne `B`: `B` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/base-tag.js" resolve <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" create review <slug>`. `K` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/review-package.js" <B> HEAD "<W>"`; Exit ungleich 0: Meldung ausgeben, Ende.
6. `N = 0`: Es gibt keine Nacharbeit, der Loop endet nach Review 1. `aktiv = acceptance,plan-fidelity,design,tests,risks`; ohne `S` entfällt `acceptance`.
7. An jeden Aggregations-Aufruf aus `loop.md` hängst du `--repo "<R>"` an.

## Reviewer
- `dv-forge:implementation-review-acceptance` — `Spec: <S>`, `Paket: <K>`, `Repo: <R>`; nur mit `S`
- `dv-forge:implementation-review-plan-fidelity` — `Plan: <P>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-design` — `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-tests` — `Plan: <P>`, `Spec: <S>` (nur mit `S`), `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-risks` — `Paket: <K>`, `Repo: <R>`

## Nacharbeiter
Keiner.

## Fortschritts-Skript
Keines.

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:implementation-review-scout` — `Plan: <P>`, `Spec: <S>` (nur mit `S`), `Repo: <R>` und je Datei aus `C` eine Zeile `Context: <pfad>`

## Bericht
Titel `Implementierungs-Review`, Artefakt `<P>`. Status `sauber nach Review 1`; sonst statt `Cap erreicht` der Zusatz-Status `geprüft, k × 🔴 offen`. Zusatz-Abschnitt:

```markdown
### Bereich
`<B>..HEAD` · acceptance: gelaufen | entfallen (keine Spec)
```

Nächster Schritt: `Findings und Scout-Vorschläge lesen; gewählte Änderungen selbst beauftragen.` Danach `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove review <slug>`.
