---
name: implementation-review
description: Use when a finished dv-forge implementation should be checked once by parallel reviewers against plan, spec and code, with mechanical aggregation and a scout that proposes solutions for every red or yellow finding.
disable-model-invocation: true
argument-hint: <plan.md> [spec.md] [--context <pfad>]... [--base <ref>]
---

# Implementierungs-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Umsetzung gilt. Du liest weder Plan, Spec, Kontext-Dateien noch Code; ein Hook blockt das für das ganze Repo.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" implementation-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: `P`, `S`, `R`, `slug`, `B`, `W`, `K`, `N`, `aktiv` und je Kontext-Datei eine Zeile `C`. Das zweite Argument ohne `--` ist die Spec.
2. `N = 0`: Es gibt keine Nacharbeit, der Loop endet nach Review 1. Rolle des Arbeitsbereichs: `review`.
3. An jeden Aggregations-Aufruf aus `loop.md` hängst du `--repo "<R>"` an.

## Reviewer
- `dv-forge:implementation-review-acceptance` — `Spec: <S>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-plan-fidelity` — `Plan: <P>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-design` — `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-tests` — `Plan: <P>`, `Spec: <S>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-risks` — `Paket: <K>`, `Repo: <R>`

## Nacharbeiter
Keiner.

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:implementation-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>` und je `C` eine Zeile `Context: <pfad>`

## Bericht
Titel `Implementierungs-Review`, Artefakt `<P>`. Status `sauber nach Review 1`; sonst statt `Cap erreicht` der Zusatz-Status `geprüft, k × 🔴 offen`. Zusatz-Abschnitt:

```markdown
### Bereich
`<B>..HEAD`
```

Nächster Schritt:
- `sauber`, `yellow=0`: `Alles sauber. Arbeit abschließen mit:` und darunter in einem Code-Block `/dv-forge:finish-work`.
- `sauber`, `yellow` > 0: `Keine roten Findings. Gelbe Findings und Scout-Vorschläge lesen, gewählte Änderungen selbst beauftragen, dann abschließen mit:` und der Code-Block `/dv-forge:finish-work`.
- `geprüft, k × 🔴 offen`: `k rote Findings offen. Findings und Scout-Vorschläge lesen, gewählte Änderungen selbst beauftragen, dann /dv-forge:implementation-review <P> erneut.`

