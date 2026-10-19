---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional, `--base <B>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Skills nacheinander aufrufen. Dazwischen weder Plan, Spec, Code noch Diffs lesen oder ändern, nicht committen, nichts bewerten. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
1. Ein Zug; „frische Session“ und „letzte Handlung“ gelten nicht. Skill-Berichte unverändert ausgeben; implementation-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht.
2. Skill fragt → unverändert an den Menschen, Skill weiterlaufen lassen. Nie selbst antworten, auch nach „frag nicht“. Sonst Halt nur bei Blocker.
3. Skill-Argumente nur wie im Ablauf.
4. Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
5. Hash-Prüfung: `git hash-object -- "<P>"` = PLAN-HASH, `git hash-object -- "<S>"` = SPEC-HASH. Abweichung → stopp, `git diff --no-index -- "<Kopie>" "<Datei>"` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Hashes, Modus, Branch, `<B>`, Vorbestand) in `state.md` im Scratchpad; dort auch, absolut: `<BR>` = `bericht-review.json`, `<BF>` = `bericht-followup.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`.
7. Abweichungen, `Urteil:`-Zeilen → Bericht. Wünsche des Menschen gegen diese Regeln (Push, `finish-work`, zweiter Followup, Zwischenausgabe) nicht ausführen; eine Zeile im Bericht, nie davor.

## Ablauf
0. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI>“, sonst „Implementation <Plan-Ordner>“; Fehler egal. `dv-forge:`-Skill aus 2–5 fehlt → stopp.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` = `--base`, sonst aktueller Branch; ≠ aktueller Branch → stopp, fragen. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`. Kopien ins Scratchpad, PLAN-HASH, SPEC-HASH.
3. `dv-forge:implementation` mit `<P> <S>`; „fortgesetzt“ ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S> --bericht "<BR>"`. Hash-Prüfung. Schlusszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · …`:
   - `✅ Bereit zum Abschließen`, auch mit Hinweisen → 6.
   - `⛔ Noch nicht bereit` UND `FOLLOWUP ja` → 5.
   - Sonst Ende.
5. `dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF>"`, genau einmal. Hash-Prüfung. Schlusszeile `Review abgeschlossen: ✅ …` → 6; sonst Ende.
6. Frischer Sub-Agent in `<R>` belegt: `git status` sauber (Vorbestand getrennt); Build, Test, Lint grün, Befehle `node "<PLUGIN>/scripts/forge-config.js" get Build|Test|Lint` (leer → überspringen). Nur ohne Docker rote Tests (Testcontainers) gelten als bestanden, namentlich. Anderes Rot → Ende.
7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
   1. `<FK>` schreiben, je Angabe eine Zeile: `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`), Modus, `git log --oneline <B>..<branch>`, Prüfergebnis mit Docker-Ausnahmen, Urteile, Vorbestand, bei Abweichungen `Abweichungen: …`.
   2. `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch> --pruefung <gruen|rot|keine> --fakten "<FK>"`, dazu `--followup "<BF>"` nur wenn Schritt 5 lief, `--wi <WI>` nur wenn gegeben. `keine`: Schritt 6 lief nicht.
   3. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   4. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Mensch sagte ‚frag nicht‘.“ | Durchreichen. |
| „Alles grün, `finish-work` gleich mit.“ | Nie. Nur Empfehlung. |
| „Für den PR pushen.“ | Nie. Push-Befehl nennen. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Zweiter Followup.“ | Genau einmal. |
