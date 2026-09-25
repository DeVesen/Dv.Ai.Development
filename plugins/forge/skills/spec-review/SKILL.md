---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review loop of parallel reviewers, mechanical aggregation and rework until it is clean or the round cap is reached.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--rounds N]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS`

## Rolle
Du orchestrierst, sonst nichts. Du liest die Spec nicht, bewertest keine Findings und änderst die Spec nicht. Jede Entscheidung ist mechanisch: Zähler, `STATUS`-Zeile, Hash-Vergleich. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Loop fort. Ein Hook blockt deine Zugriffe auf die Spec.

## Start
1. Das erste Argument ist die Spec (`S`, absolut machen). Ein weiteres Argument ohne `--` ist die Quelle (`Q`). `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3. Ein führendes `@` am Pfad entfernen.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"` ausführen. Ist der Exit ≠ 0: melden „Spec nicht gefunden: <S>“ und Ende.
3. Profile per Glob suchen: `<glossar>/*.md` (Ort aus der Projekt-CLAUDE.md, sonst `docs/glossary`) und `docs/application/**/*.md`. Gibt es Treffer, ist `profiles` aktiv und `P` = Trefferliste. Du liest diese Dateien nicht.
4. `r = 1`, `nacharbeiten = 0`, `aktiv = completeness,consistency,feasibility,clarity[,profiles]`.

## Runde r
1. **Review:** In EINER Nachricht je aktiven Reviewer einen `Agent`-Call mit `run_in_background: false` absetzen, jeder als frische Instanz, ohne Findings früherer Runden:
   - `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
   - `dv-forge:spec-review-consistency` — `Spec: <S>`
   - `dv-forge:spec-review-feasibility` — `Spec: <S>`
   - `dv-forge:spec-review-clarity` — `Spec: <S>`
   - `dv-forge:spec-review-profiles` — `Spec: <S>` und `Profile: <P>`, nur wenn aktiv
2. **Aggregieren:** Den letzten JSON-Block jedes Reviewers wörtlich übergeben, jeweils inklusive seiner ```json-Zeile und der schließenden ```-Zeile:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/aggregate-findings.js" --expect <aktiv> <<'DV_FORGE_EOF'
   <JSON-Blöcke>
   DV_FORGE_EOF
   ```
3. Nennt `STATUS` unter `failed=` Reviewer: diese einmal neu starten, dann erneut aggregieren, mit allen Blöcken plus den neuen. Wer danach noch fehlt, gilt als ausgefallen.
4. **Stopp**, in dieser Reihenfolge:
   - `clean=true` → Ende „sauber nach Review r“
   - `r = N+1` → Ende „Cap erreicht“
   - `red=0` (nur Ausfall) → `r = r+1`, weiter mit Schritt 1 ohne Nacharbeit
5. **Nacharbeit:** Hash von S merken. Dann `dv-forge:spec-rework` mit `run_in_background: false` starten, Inhalt: `Spec: <S>`, `Runde: <r>`, `Findings:` und den REWORK-Abschnitt unverändert. Danach `nacharbeiten + 1` und den Hash erneut bilden. Ist er gleich, Ende „Stillstand in Runde r“. Sonst `r = r+1`, weiter mit Schritt 1.

## Abschluss
1. Bericht im Chat nach `references/report-format.md`, mit dem REPORT-Abschnitt der letzten Aggregation. Keine Dateien schreiben, nichts committen.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`
