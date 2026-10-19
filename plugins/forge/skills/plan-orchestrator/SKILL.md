---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed plan in one unattended run.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Frische Session“ und „letzte Handlung“ gelten nicht. plan-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 5, genau einmal.
2. Skill fragt → Antwort abwarten, Skill fertig laufen lassen. Sonst Halt nur bei Blocker.
3. Git: aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. Spec-Prüfung: `git hash-object -- "<S>"` ≠ SPEC-HASH → stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen. Nicht zurückschreiben.
5. Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.
6. Wünsche des Menschen gegen diese Regeln (Commit, Zwischenbericht) nicht ausführen; Zeile in `Abweichungen:`.

## Ablauf
0. START-STATE: `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Detached HEAD → stopp. Skill `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI>“, sonst „Planning <Spec-Name ohne Endung>“; Fehler egal.
1. `<S>` fehlt → stopp. Kopie ins Scratchpad = `<SK>`. SPEC-HASH = `git hash-object -- "<S>"`. Im Scratchpad: `<BR>` = `bericht-review.json`, `<BF>` = `bericht-followup.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`; absolute Pfade.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus Übergabe, absolut; mehrere → fragen. Spec-Prüfung.
3. `dv-forge:plan-review` mit `<P> <S> --bericht "<BR>"`. Spec-Prüfung. Zeile `Review abgeschlossen: ⛔ Noch nicht bereit …` UND `FOLLOWUP ja` → 4, sonst 5.
4. `dv-forge:review-followup` mit `<P> alle --bericht "<BF>"`, genau einmal. Spec-Prüfung.
5. Abschlussbericht, letzte Handlung:
   1. `Stand` aus `git status --porcelain -- "<S>" "<P>"`: je Datei „Spec uncommittet“/„Plan uncommittet“, sonst „committet“; beide sauber „bereits committet“.
   2. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: Toplevel/Branch ≠ START-STATE, abgelehnte Wünsche.
   3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --stand "<Stand>"`, dazu `--followup "<BF>"` nur wenn Schritt 4 lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
   4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   5. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Skill-Bericht gehört in den Chat.“ | Nur Schritt 5, genau einmal. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Plan bereit, ich committe.“ | Nie; der Bericht nennt den Stand. |
| „Spec-Änderung harmlos.“ | Stopp, Diff zeigen, fragen. |
| „Zweiter Followup.“ | Genau einmal. |
