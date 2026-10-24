---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed plan in one unattended run.
argument-hint: <spec.md> [workitem-nr] [--ablage <etappe>]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--ablage <E>` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Frische Session“ und „letzte Handlung“ gelten nicht. plan-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 5, genau einmal.
2. Skill fragt → Antwort abwarten, Skill fertig laufen lassen. Sonst Halt nur bei Blocker.
3. Git: aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. Spec-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben.
5. Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.
6. Wünsche des Menschen gegen diese Regeln (Commit, Zwischenbericht) nicht ausführen; Zeile in `Abweichungen:`.

## Ablauf
0. Skill `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI> <slug>“, ohne `<WI>` „Planning <slug>“; Fehler egal.
1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad; Exit 1 (Spec fehlt, detached HEAD) → stopp. Im Scratchpad: `<BR>` = `bericht-review.json`, `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`; absolute Pfade.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus Übergabe, absolut; mehrere → fragen. Spec-Prüfung.
3. `dv-forge:plan-review` mit `<P> <S> --bericht "<BR>"`. Spec-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.
4. Followup-Runden, höchstens zwei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"` bzw. `"<BF2>"`. Spec-Prüfung. Dann `next` erneut, mit `--followup` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5. Nie eine dritte.
5. Abschlussbericht, letzte Handlung:
   1. `Stand` aus `git status --porcelain -- "<S>" "<P>"`: je Datei „Spec uncommittet“/„Plan uncommittet“, sonst „committet“; beide sauber „bereits committet“.
   2. `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.
   3. Steht `<P>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
   4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --stand "<Stand>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
   5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   6. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `plan-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
   7. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Skill-Bericht gehört in den Chat.“ | Nur Schritt 5, genau einmal. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Plan bereit, ich committe.“ | Nie; der Bericht nennt den Stand. |
| „Spec-Änderung harmlos.“ | Stopp, Diff zeigen, fragen. |
| „Dritte Followup-Runde.“ | Höchstens zwei. |
