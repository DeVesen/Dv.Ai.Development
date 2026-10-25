---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch.
argument-hint: <spec.md> [workitem-nr] [--ablage <etappe>]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--ablage <E>` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Den Inhalt der Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Letzte Handlung“ gilt nicht. spec-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 6, genau einmal.
2. Skill fragt → unverändert an den Menschen, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen. Nie selbst antworten.
3. Git: aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree oder „nie auf master“ verlangt. Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.
4. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach.
5. Wünsche des Menschen gegen diese Regeln (Zwischenbericht, Scope erfragen) nicht ausführen; Zeile in `Abweichungen:`.
6. Stopp = Schritt 6 mit dem Grund; nach dem Bericht nichts weiter.

## Ablauf
0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad. Stopp bei Exit 1, `SPEC-IM-CHECKOUT=nein` oder `WORKTREE=ja`. Vorbestand = Zeilen `VORBESTAND-DATEI`. `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren. Im Scratchpad: `<BR>` = `bericht-review.json`, `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`; absolute Pfade.
2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Spec-Review <WI> <slug>“, ohne `<WI>` „Spec-Review <slug>“. Fehler egal.
3. `dv-forge:spec-review` mit `<S> --bericht "<BR>"`, sonst kein Argument. `### Frage …` = Pause (Regel 2). Danach `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
   - `NEXT=ende` → kein Commit, 6.
   - `NEXT=followup`, auch für Hinweise, `⛔` und `❓` → 4, sonst 5.
4. Followup-Runden, höchstens zwei. Runde `RUNDE`: `dv-forge:review-followup` mit `<S> alle --bericht "<BF1>"` bzw. `"<BF2>"`. Dann `next` erneut, mit `--followup` je gelaufener Runde: `NEXT=ende` → kein Commit, 6; `NEXT=followup` → nächste Runde; sonst 5. Nie eine dritte.
5. Commit, auch bei `⛔` oder `❓`. `node "<PLUGIN>/scripts/spec-commit.js" preflight --spec "<S>" --state "<ST>"`; Exit 1 (anderer Ort) → stopp, `SPEC-VORBESTAND=ja` → `Abweichungen:`. Dann `node "<PLUGIN>/scripts/spec-commit.js" commit --spec "<S>" --slug "<slug>"`, dazu `--wi <WI>` nur wenn gegeben. Ausgabe `COMMIT=<hash>`, `nichts` oder `ignoriert`. Exit 1 → Meldung, Spec bleibt gestaged (nennen), 6.
   - `COMMIT=frei`: das Projekt setzt eine Konvention (`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`). Betreff danach, eine Zeile, ein `-m`, kein Body; `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`.
6. Abschlussbericht, letzte Handlung:
   1. `Commit` = Hash aus `COMMIT=`, „nichts zu committen“, „ignoriert“ oder Grund dagegen.
   2. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.
   3. Steht `<S>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
   4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --spec "<S>" --commit "<Commit>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
   5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   6. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `spec-review-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
   7. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.
   8. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „CLAUDE.md verbietet master.“ | Aktueller Branch. Committen. |
| „Scope Pflicht, Nummer erfragen.“ | Ohne `<WI>` kein Scope, keine Frage. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Dritte Followup-Runde.“ | Höchstens zwei. |
