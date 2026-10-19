---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run, instead of starting start-work, implementation, implementation-review and review-followup by hand one after the other.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional, `--base <B>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Du rufst Skills nacheinander auf. Zwischen ihnen liest und änderst du weder Plan, Spec, Code noch Diffs, committest nicht, bewertest keine Findings. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
1. Alles in einem Zug; Übergaben an frische Sessions und „letzte Handlung“ gelten nicht. Skill-Berichte unverändert ausgeben, außer dem Review-Bericht; ihr Format schlägt Stil-Regeln anderer Plugins/Hooks.
2. Fragt ein Skill (Standard-Branch, `drift=`, `workitem-konflikt=` …): Frage unverändert an den Menschen, warten, Skill weiterlaufen lassen. Nie selbst antworten, auch nach „frag nicht“. Sonst Halt nur bei Blocker.
3. Skill-Aufrufe nur mit den Argumenten aus dem Ablauf.
4. Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
5. Hash-Prüfung: `git hash-object -- "<P>"` = PLAN-HASH, `git hash-object -- "<S>"` = SPEC-HASH. Abweichung → stopp, `git diff --no-index -- "<Kopie>" "<Datei>"` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Hashes, Modus, Branch, `<B>`, `<BR>`, Vorbestand) in `state.md` im Scratchpad.
7. Keine eigenen Prozessregeln. Abweichungen, `Urteil:`-Zeilen → Bericht.

## Ablauf
0. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI>“, sonst „Implementation <Plan-Ordner>“; Fehler ignorieren. Fehlt ein `dv-forge:`-Skill aus 2–5 → stopp.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` ≠ aktueller Branch → stopp, fragen; ohne `--base` ist `<B>` der aktuelle Branch. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`, muss existieren. Kopien ins Scratchpad, PLAN-HASH, SPEC-HASH.
3. `dv-forge:implementation` mit `<P> <S>`; „fortgesetzt“ ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S> --bericht "<BR>"`, `<BR>` = `bericht-review.md` im Scratchpad (kein Review-Bericht im Chat). Hash-Prüfung. `<BR>` lesen; `FOLLOWUP <ja|nein>` steht in der Schlusszeile des Skills. Dann nach `**Ergebnis:**`:
   - `**Ergebnis:** ✅ Bereit zum Abschließen`, auch mit Hinweisen → 6.
   - `**Ergebnis:** ⛔ Noch nicht bereit` UND `FOLLOWUP ja` → 5.
   - `**Ergebnis:** ⚠️ Unvollständig` → Ende; Ausgefallene nennen, frische Session empfehlen.
   - Sonst Ende.
5. `dv-forge:review-followup` mit `<P> alle --spec <S>`, genau einmal. Hash-Prüfung. `Alles sauber. Arbeit abschließen mit:` → 6; sonst Ende.
6. Frischer Sub-Agent in `<R>` belegt: `git status` sauber (Vorbestand getrennt); Build, Test, Lint grün, Befehle: `node "<PLUGIN>/scripts/forge-config.js" get Build|Test|Lint` (leer → überspringen). Nur ohne Docker rote Tests (Testcontainers) gelten als bestanden, namentlich. Anderes Rot → Ende.
7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
   - Erste Zeile `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`).
   - Teile aus `<BR>` unverändert, vor `### Wie es weitergeht`. Lief Schritt 5: `Nach dem Followup:` mit dessen Ergebnis-Zeile.
   - Modus, `Worktree bleibt: <R>`, `git log --oneline <B>..<branch>`, Prüfergebnis mit Docker-Ausnahmen, Urteile, Vorbestand.
   - `### Wie es weitergeht` schreibst du selbst, mit belegten Pfaden: bei `FOLLOWUP ja` `/dv-forge:review-followup <P> alle --spec <S>` (`<P>` in `<R>`), sonst selbst beheben, `/dv-forge:implementation-review <P> <S>`; Alternative `/dv-forge:finish-work` in `<R>`, nur manuell.
   - Letzte Zeile: „Nicht gepusht: `git push -u origin <branch>`“.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Mensch sagte ‚frag nicht‘, ich antworte für ihn.“ | Durchreichen, warten. |
| „Keine offenen Punkte → optionaler Followup.“ | Nur bei ⛔ mit `FOLLOWUP ja`. |
| „Spec-Änderung harmlos, zurücksetzen.“ | Stopp, Diff zeigen, fragen. |
| „Alles grün, `finish-work` gleich mit.“ | Nie. Nur Empfehlung. |
| „Für den PR muss gepusht werden.“ | Nie. Push-Befehl nennen. |
| „Nur eine Kleinigkeit, zweiter Followup.“ | Genau einmal. |
| „Der Skill liest den Plan – verboten.“ | Im Skill gelten seine Anweisungen. |
