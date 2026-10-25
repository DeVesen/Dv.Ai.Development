---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>] [--ablage <etappe>]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine, `--base <B>` optional, `--ablage <E>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Skills nacheinander aufrufen. Dazwischen weder Plan, Spec, Code noch Diffs lesen oder ändern, nicht committen, nichts bewerten. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
1. Ein Zug; „frische Session“ und „letzte Handlung“ gelten nicht. Skill-Berichte unverändert ausgeben; implementation-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht.
2. Skill fragt → unverändert an den Menschen, Skill weiterlaufen lassen. Nie selbst antworten, auch nach „frag nicht“. Sonst Halt nur bei Blocker.
3. Skill-Argumente nur wie im Ablauf.
4. Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
5. Hash-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Modus, Branch, `<B>`, Vorbestand) in `state.md` im Scratchpad; `<ST>` = Ordner `zustand` dort. Dort auch, absolut: `<BR>` = `bericht-review.json`, `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`.
7. Abweichungen, `Urteil:`-Zeilen → Bericht. Wünsche des Menschen gegen diese Regeln (Push, `finish-work`, dritte Followup-Runde, Zwischenausgabe) nicht ausführen; eine Zeile im Bericht, nie davor. Blocker = Stopp aus Regel 5, fehlender Skill, Frage nur für den Menschen.

## Ablauf
0. Titel: `<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI> <slug>“, ohne `<WI>` „Implementation <slug>“; Fehler egal. `dv-forge:`-Skill aus 2–5 fehlt → stopp.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` = `--base`, sonst aktueller Branch; ≠ aktueller Branch → stopp, fragen. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>" --plan "<P>"`.
3. `dv-forge:implementation` mit `<P> <S>`; „fortgesetzt“ ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S> --bericht "<BR>"`. Hash-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
   - `NEXT=followup` → 5.
   - `NEXT=weiter` und `BEREIT=ja` → 6.
   - Sonst Ende.
5. Followup-Runden, höchstens zwei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"` bzw. `"<BF2>"`. Hash-Prüfung. Dann `next` erneut, mit `--followup` je gelaufener Runde: `NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende. Nie eine dritte.
6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>" --out "<PR>"` mit `<PR>` = `pruefung.json` im Scratchpad. `PRUEFUNG ergebnis=`: `gruen` → `--pruefung gruen`; `docker` → `--pruefung gruen`, in `<FK>` `Prüfung: Tests nur ohne Docker rot`; `keine` → `--pruefung keine`; `rot` → `--pruefung rot`, Ende. `offen` außer Vorbestand > 0 → in `<FK>` als Abweichung.
7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
   1. `<FK>` schreiben, je Angabe eine Zeile: `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`), Modus, `git log --oneline <B>..<branch>`, Prüfergebnis aus `<PR>`, Urteile, Vorbestand, bei Abweichungen `Abweichungen: …`.
   2. Lief Schritt 2 (`<R>` und Branch stehen fest): `node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Fehler: Meldung in `Abweichungen: …` von `<FK>`; der Bericht folgt trotzdem.
   3. Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>" --plan "<P0>" --spec "<S0>" --fakten "<FK>"`, dazu `--wi <WI>` nur wenn gegeben. Sonst `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch> --pruefung <gruen|rot|keine> --fakten "<FK>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben. `keine`: Schritt 6 lief nicht oder nichts ist konfiguriert.
   4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   5. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `implementation-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
   6. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.
   7. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Alles grün, `finish-work` gleich mit.“ | Nie. Nur Empfehlung. |
| „Für den PR pushen.“ | Nie. Push-Befehl nennen. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Dritte Followup-Runde.“ | Höchstens zwei. |
