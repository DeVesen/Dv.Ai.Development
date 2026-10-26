---
name: implementation-review
description: Use when a finished dv-forge implementation should be checked once by parallel reviewers against plan, spec and code, with mechanical aggregation and a scout that proposes solutions for every red or yellow finding. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
argument-hint: <plan.md> [spec.md] [--context <pfad>]... [--base <ref>] [--only <reviewer,...>] [--debug]
---

# Implementierungs-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Umsetzung gilt. Du liest weder Plan, Spec, Kontext-Dateien noch Code; ein Hook blockt das für das ganze Repo.

## Eingaben
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" implementation-review $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst liefert jede Zeile `<Name>=<Wert>`: `P`, `S`, `R`, `slug`, `B`, `W`, `K`, `N`, `aktiv`, `Test`, je Kontext-Datei eine Zeile `C`, falls die Umsetzung sie abgelegt hat, `Z` und je Warnung eine Zeile `WARN`. Das zweite Argument ohne `--` ist die Spec. Die `WARN`-Zeilen musst du nicht weitergeben; der Bericht enthält die Hinweise.
2. `N = 0`: Es gibt keine Nacharbeit, der Loop endet nach Review 1. Rolle des Arbeitsbereichs: `review`.
3. Skript-Prüfungen, einmal vor Review 1: `node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-run.js" --repo "<R>" --nur test --out "<W>/testlauf.json"`, dazu `--seit-gruen "<Z>"`, wenn es `Z` gibt; Exit 1 (rot) ist erwartet. Dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/implementation-checks.js" --plan "<P>" --repo "<R>" --base "<B>" --out "<W>/skript.json" --testlauf "<W>/testlauf.json"`.
4. An jeden Aggregations-Aufruf aus `loop.md` hängst du `--repo "<R>" --skript "<W>/skript.json"` an.

## Ablage
Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts. `--debug` reicht `prepare.js` selbst durch.

## Reviewer
Jeder Reviewer und der Scout bekommen zusätzlich `Zurückgestellt: <Z>`, wenn es `Z` gibt.

- `dv-forge:implementation-review-acceptance` — `Spec: <S>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-plan-fidelity` — `Plan: <P>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-design` — `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-tests` — `Plan: <P>`, `Spec: <S>`, `Paket: <K>`, `Repo: <R>`, `Test: <Test>`, `Testlauf: <W>/testlauf.json`
- `dv-forge:implementation-review-risks` — `Paket: <K>`, `Repo: <R>`

## Nacharbeiter
Keiner.

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:implementation-review-scout` — `Plan: <P>`, `Spec: <S>`, `Repo: <R>` und je `C` eine Zeile `Context: <pfad>`

## Bericht
Titel `Implementierungs-Review`, Artefakt `<P>`; den Rest liefert `implementation-report.js`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile. `<P>`, `<B>` und `<K>` sind die Werte aus `prepare.js`. Status: `sauber nach Review 1`, `geprüft, k × 🔴 offen` oder `unvollständig nach Review 1, ausgefallen: <liste>`.
