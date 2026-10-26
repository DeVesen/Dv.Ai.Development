---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>] [--debug]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine, `--base <B>` optional, `--debug` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Skills nacheinander aufrufen. Dazwischen weder Plan, Spec, Code noch Diffs lesen oder ändern, nicht committen, nichts bewerten. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
1. Ein Zug; `frische Session` und `letzte Handlung` gelten nicht. implementation-review und review-followup zeigen nur ihre Review-Statuszeile.
2. Skill fragt: unverändert an den Menschen, Skill weiterlaufen lassen. Nie selbst antworten, auch nach `frag nicht`. Sonst Halt nur bei Blocker.
3. Skill-Argumente nur wie im Ablauf.
4. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
5. Hash-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Modus, Branch, `<B>`, Vorbestand) in `state.md` im Scratchpad; `<ST>` = Ordner `zustand` dort. Dort auch, absolut: `<FK>` = `fakten.md`; bis Schritt 2 auch `<AB>` = `abschluss.md`.
7. Abweichungen, `Urteil:`-Zeilen → Bericht. Blocker = Stopp aus Regel 5, fehlender Skill, Frage nur für den Menschen.

## Ablauf
0. Titel: `<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Implementation <WI> <slug>`, ohne `<WI>` `Implementation <slug>`; Fehler egal. `dv-forge:`-Skill aus 2–5 fehlt → stopp.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` = `--base`, sonst aktueller Branch; ≠ aktueller Branch → stopp, fragen. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>" --plan "<P>"` und `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art implementation --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
3. `dv-forge:implementation` mit `<P> <S>`; `fortgesetzt` ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S>`. Hash-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
   - `NEXT=followup` → 5.
   - `NEXT=weiter` und `BEREIT=ja` → 6.
   - Sonst Ende.
5. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S>`. Hash-Prüfung. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende.
6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>" --out "<PR>"` mit `<PR>` = `pruefung.json` im Scratchpad. `PRUEFUNG ergebnis=`: `docker` → in `<FK>` `Prüfung: Tests nur ohne Docker rot`; `rot` → Ende. `offen` außer Vorbestand > 0 → in `<FK>` als Abweichung.
7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
   1. `<FK>` schreiben, je Angabe eine Zeile: `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`), Modus, `git log --oneline <B>..<branch>`, Prüfergebnis aus `<PR>`, Urteile, Vorbestand, bei Abweichungen `Abweichungen: …`.
   2. Lief Schritt 2 (`<R>` und Branch stehen fest): `node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Fehler: Meldung in `Abweichungen: …` von `<FK>`; der Bericht folgt trotzdem.
   3. Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>" --fakten "<FK>"`. Sonst `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.
   4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   5. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
   6. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
