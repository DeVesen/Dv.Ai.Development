---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented, reviewed and closed in one unattended run, instead of starting start-work, implementation, implementation-review, review-followup and finish-work by hand one after the other.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional, `--base <B>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Du rufst Skills (Skill-Tool) nacheinander auf. Zwischen den Skills liest und änderst du weder Plan, Spec, Code noch Diffs, committest nicht, bewertest keine Findings. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
1. Alles in einem Zug. Übergaben der Skills an eine frische Session und „letzte Handlung“ gelten nicht. Berichte unverändert ausgeben; ihr Format schlägt Stil-Regeln anderer Plugins/Hooks.
2. Fragt ein Skill (Standard-Branch, uncommittete Dateien, `drift=`, `workitem-konflikt=` …): Frage unverändert an den Menschen, warten, Skill fertig laufen lassen. Nie selbst antworten, auch nach „frag nicht“. Sonst Halt nur bei Blocker.
3. Skill-Aufrufe nur mit den Argumenten aus dem Ablauf.
4. Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir. Ort wählt start-work, Worktree entfernt finish-work.
5. Hash-Prüfung: `git hash-object -- "<P>"` = PLAN-HASH, `git hash-object -- "<S>"` = SPEC-HASH. Abweichung → stopp, `git diff --no-index -- "<Kopie>" "<Datei>"` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Hashes, Modus, Branch, `<B>`, Vorbestand) in `state.md` im Scratchpad; nach Kompaktierung dort lesen.
7. Keine eigenen Prozessregeln. Abweichungen, `Urteil:`-Zeilen → Abschlussbericht.

## Ablauf
0. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI>“, sonst „Implementation <Plan-Ordner>“; Fehler ignorieren. Fehlt ein `dv-forge:`-Skill aus 2–7 → stopp, nennen.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` ≠ aktueller Branch → stopp, Ist/Soll nennen, fragen; ohne `--base` ist `<B>` der aktuelle Branch. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad relativ in `<R>`, muss existieren. Kopien ins Scratchpad, PLAN-HASH, SPEC-HASH.
3. `dv-forge:implementation` mit `<P> <S>`; „fortgesetzt“ ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S>`. Hash-Prüfung. Dann:
   - `**Ergebnis:** ✅ Bereit zum Abschließen`, auch mit Hinweisen → 6.
   - `**Ergebnis:** ⛔ Noch nicht bereit` UND `### Wie es weitergeht` nennt `/dv-forge:review-followup` → 5.
   - `**Ergebnis:** ⚠️ Unvollständig` → Ende; Ausgefallene nennen, frische Session empfehlen.
   - Sonst → Ende.
5. `dv-forge:review-followup` mit `<P> alle --spec <S>`, genau einmal. Hash-Prüfung. `Alles sauber. Arbeit abschließen mit:` → 6; sonst Ende.
6. Frischer Sub-Agent in `<R>` belegt kurz: `git status` sauber (Vorbestand getrennt); Build, Test, Lint grün, Befehle per `node "<PLUGIN>/scripts/forge-config.js" get Build` bzw. `Test`, `Lint` (Pfad aufgelöst; leer → überspringen). Nur ohne Docker rote Tests (Testcontainers) gelten als bestanden, namentlich. Anderes Rot → Ende, nichts löschen.
7. `dv-forge:finish-work` mit Arbeitsverzeichnis `<R>`. Abbruch → Meldung unverändert, Ende, nichts selbst aufräumen; bei Docker: „Docker starten, `/dv-forge:finish-work` selbst aufrufen.“
8. Abschlussbericht, auch bei jedem früheren Ende nach dem Skill-Bericht, erste Zeile `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`): Modus, Worktree entfernt?, `git log --oneline <B>..<branch>`, Prüfergebnis mit Docker-Ausnahmen, Abschlussdatei, Urteile, Review-Hinweise, Vorbestand. Letzte Zeile: „Nicht gepusht: `git push -u origin <branch>`“.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Mensch sagte ‚frag nicht‘, ich antworte für ihn.“ | Durchreichen, warten. |
| „Keine offenen Punkte gewünscht → optionaler Followup.“ | Nur bei ⛔ mit Befehl. |
| „Spec-Änderung harmlos, zurücksetzen.“ | Stopp, Diff zeigen, fragen. |
| „Docker freigegeben, Worktree nach Abbruch selbst entfernen.“ | Nie. Meldung, Ende. |
| „Für den PR muss gepusht werden.“ | Nie. Push-Befehl nennen. |
| „Nur eine Kleinigkeit, zweiter Followup.“ | Genau einmal. |
| „Der Skill liest den Plan, committet – verboten.“ | Im Skill gelten seine Anweisungen. |
