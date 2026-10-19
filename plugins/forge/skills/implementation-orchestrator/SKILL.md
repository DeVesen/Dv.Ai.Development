---
name: implementation-orchestrator
description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run.
argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>]
---

# Implementierungs-Orchestrator

`$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional, `--base <B>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Skills nacheinander aufrufen. Dazwischen weder Plan, Spec, Code noch Diffs lesen oder ändern, nicht committen, nichts bewerten. Während ein Skill läuft, gelten seine Anweisungen.

## Regeln
1. Ein Zug; „frische Session“ und „letzte Handlung“ gelten nicht. Skill-Berichte unverändert ausgeben, außer dem Review-Bericht.
2. Skill fragt → unverändert an den Menschen, Skill weiterlaufen lassen. Nie selbst antworten, auch nach „frag nicht“. Sonst Halt nur bei Blocker.
3. Skill-Argumente nur wie im Ablauf.
4. Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
5. Hash-Prüfung: `git hash-object -- "<P>"` = PLAN-HASH, `git hash-object -- "<S>"` = SPEC-HASH. Abweichung → stopp, `git diff --no-index -- "<Kopie>" "<Datei>"` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
6. Zustand (Pfade, Hashes, Modus, Branch, `<B>`, `<BR>`, Vorbestand) in `state.md` im Scratchpad.
7. Abweichungen, `Urteil:`-Zeilen → Bericht. Wünsche des Menschen gegen diese Regeln (Push, `finish-work`, zweiter Followup, Zwischenausgabe) nicht ausführen; eine Zeile im Bericht, nie davor.

## Ablauf
0. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI>“, sonst „Implementation <Plan-Ordner>“; Fehler egal. `dv-forge:`-Skill aus 2–5 fehlt → stopp.
1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` = `--base`, sonst aktueller Branch; ≠ aktueller Branch → stopp, fragen. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`. Kopien ins Scratchpad, PLAN-HASH, SPEC-HASH.
3. `dv-forge:implementation` mit `<P> <S>`; „fortgesetzt“ ist erwartet. Hash-Prüfung.
4. `dv-forge:implementation-review` mit `<P> <S> --bericht "<BR>"`, `<BR>` = `bericht-review.md` im Scratchpad . Hash-Prüfung. `<BR>` lesen; `FOLLOWUP <ja|nein>` steht in der Schlusszeile des Skills. Dann:
   - `**Ergebnis:** ✅ Bereit zum Abschließen`, auch mit Hinweisen → 6.
   - `**Ergebnis:** ⛔ Noch nicht bereit` UND `FOLLOWUP ja` → 5.
   - `**Ergebnis:** ⚠️ Unvollständig` → Ende; Ausgefallene nennen, frische Session empfehlen.
   - Sonst Ende.
5. `dv-forge:review-followup` mit `<P> alle --spec <S>`, genau einmal. Hash-Prüfung. `Alles sauber. Arbeit abschließen mit:` → 6; sonst Ende.
6. Frischer Sub-Agent in `<R>` belegt: `git status` sauber (Vorbestand getrennt); Build, Test, Lint grün, Befehle `node "<PLUGIN>/scripts/forge-config.js" get Build|Test|Lint` (leer → überspringen). Nur ohne Docker rote Tests (Testcontainers) gelten als bestanden, namentlich. Anderes Rot → Ende.
7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
   - Erste Zeile `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`).
   - Teile aus `<BR>` unverändert, vor `### Wie es weitergeht`. Lief Schritt 5: `Nach dem Followup:` mit dessen Ergebnis-Zeile.
   - Modus, `Worktree bleibt: <R>`, `git log --oneline <B>..<branch>`, Prüfergebnis mit Docker-Ausnahmen, Urteile, Vorbestand.
   - `### Wie es weitergeht` schreibst du selbst, mit belegten Pfaden: lief Schritt 5 und war sauber → `/dv-forge:finish-work` in `<R>`, nur manuell; sonst bei `FOLLOWUP ja` `/dv-forge:review-followup <P> alle --spec <S>` (`<P>` in `<R>`), sonst selbst beheben, `/dv-forge:implementation-review <P> <S>`.
   - Letzte Zeile: „Nicht gepusht: `git push -u origin <branch>`“.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Mensch sagte ‚frag nicht‘.“ | Durchreichen. |
| „Alles grün, `finish-work` gleich mit.“ | Nie. Nur Empfehlung. |
| „Für den PR pushen.“ | Nie. Push-Befehl nennen. |
| „Zweiter Followup.“ | Genau einmal. |
