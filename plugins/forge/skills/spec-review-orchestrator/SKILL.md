---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
argument-hint: <spec.md> [workitem-nr] [--whiteboarding] [--debug]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette. `--debug` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Den Inhalt der Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
1. Ein Zug. `Letzte Handlung` gilt nicht. spec-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 7 aus, genau einmal.
2. Skill fragt: unverändert an den Menschen, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen. Nie selbst antworten.
3. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach.
4. Stopp = Schritt 7 mit dem Grund; nach dem Bericht nichts weiter.

## Ablauf
0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad. Stopp bei Exit 1, `SPEC-IM-CHECKOUT=nein` oder `WORKTREE=ja`. Vorbestand = Zeilen `VORBESTAND-DATEI`. `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren. `<FK>` = `fakten.md` im Scratchpad, absolut.
2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Spec-Review <WI> <slug>`, ohne `<WI>` `Spec-Review <slug>`. Fehler egal.
3. Ablage des Laufs: `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art spec --spec "<S>"`, mit `--whiteboarding` dazu `--whiteboarding`. Exit 1 → stopp. `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
4. `dv-forge:spec-review` mit `<S>`, mit `--whiteboarding` dazu `--whiteboarding`, sonst kein Argument. `### Frage …` = Pause (Regel 2). Danach `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
   - `NEXT=ende` → kein Commit, 7.
   - `NEXT=followup`, auch für Hinweise, `⛔` und `❓` → 5, sonst 6.
5. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<S> alle`, mit `--whiteboarding` dazu `--whiteboarding`. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=ende` → kein Commit, 7; `NEXT=followup` → nächste Runde; sonst 6.
6. Commit, auch bei `⛔` oder `❓`. Mit `--whiteboarding` kein Commit: `Commit` = `kein Commit (Whiteboarding)`, weiter mit 7. Sonst `node "<PLUGIN>/scripts/spec-commit.js" preflight --spec "<S>" --state "<ST>"`; Exit 1 (anderer Ort) → stopp, `SPEC-VORBESTAND=ja` → `Abweichungen:`. Dann `node "<PLUGIN>/scripts/spec-commit.js" commit --spec "<S>" --slug "<slug>"`, dazu `--wi <WI>` nur wenn gegeben. Ausgabe `COMMIT=<hash>`, `nichts` oder `ignoriert`. Exit 1 → Meldung, Spec bleibt gestaged (nennen), 7.
   - `COMMIT=frei`: das Projekt setzt eine Konvention (`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`). Betreff danach, eine Zeile, ein `-m`, kein Body; `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`.
7. Abschlussbericht, letzte Handlung:
   1. `Commit` = Hash aus `COMMIT=`, `nichts zu committen`, `ignoriert` oder Grund dagegen.
   2. `<FK>` schreiben: eine Zeile `Commit: <Commit>`, bei Abweichungen dazu eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.
   3. Steht `<S>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen; der Bericht folgt trotzdem.
   4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.
   5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   6. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
   7. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
