---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed plan in one unattended run.
argument-hint: <spec.md> [workitem-nr] [--debug]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--debug` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
1. Ein Zug. `Frische Session` und `letzte Handlung` gelten nicht. plan-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 5 aus, genau einmal.
2. Skill fragt: Antwort abwarten, Skill fertig laufen lassen. Sonst Halt nur bei Blocker.
3. Spec-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben.

## Ablauf
0. Skill `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Planning <WI> <slug>`, ohne `<WI>` `Planning <slug>`; Fehler egal.
1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad; Exit 1 (Spec fehlt, detached HEAD) → stopp. Im Scratchpad, absolut: `<FK>` = `fakten.md`; bis Schritt 2 auch `<BR>` = `bericht-review.json` und `<AB>` = `abschluss.md`.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus der Ausgabe, absolut; mehrere → fragen. Spec-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art plan --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
3. `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.
4. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle`. Spec-Prüfung. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5.
5. Abschlussbericht, letzte Handlung:
   1. `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.
   2. Steht `<P>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
   3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief, `--fakten "<FK>"` nur wenn geschrieben.
   4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   5. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
   6. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
