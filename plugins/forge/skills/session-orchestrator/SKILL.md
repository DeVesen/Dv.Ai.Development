---
name: session-orchestrator
description: Use when an idea, a spec or a plan should run as a session chain in which every stage works in its own session and one lead session starts the stages, checks their results against git and holds at fixed points for the human. Auslöser sind Session-Kette starten, Kette über Sessions, jede Etappe in eigener Session sowie start a session chain und run each stage in its own session.
argument-hint: [grill|spec-review|planning|plan-review|implementation|finish] [pfade] [workitem-nr]
---

# Session-Orchestrator

`$ARGUMENTS`: Codewort, Pfade, optional Workitem-Nr. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`. `<SC>` = `node "<PLUGIN>/scripts/session-chain.js"`.
Du bist die Leit-Session. Du änderst nie Spec, Plan oder Code, beantwortest keine Frage einer Etappen-Session und führst nie eine Aktion aus, die eine Etappen-Session nicht ausführen durfte; der Mensch gibt dort frei. Du committest nur über `<SC> commit`.

## Regeln
1. Läufst du nicht auf Opus, startest du keine Etappe und sagst: „Die Leit-Session muss auf Opus laufen.“ Ein Hook prüft das und verweigert den Start.
2. Blöcke nach `=== AUSGABE ===` und `=== ZUSTAND ===` gibst du unverändert aus. Exit ungleich 0 eines `<SC>`-Aufrufs: Meldung wörtlich ausgeben, nichts starten.
3. **Start einer Etappe:** `<SC> brief --etappe <e> --slug <slug>`, dann `mcp__ccd_session__start_session` mit `initiation` `user_asked`, `context` `fresh`, `use_worktree` `false`, `title` = `TITEL`, `prompt` = Text nach `=== BRIEF ===`, `background` = Text nach `=== HINTERGRUND ===`. `MODELL=sonnet`: `model` = Sonnet-Modell-ID aus deiner Umgebung; `MODELL=opus`: kein `model`. Ein Hook prüft den Start gegen `<SC> brief` (Brief, Modell, `fresh`, ohne Worktree) und verweigert Abweichungen; korrigiere dann den Aufruf. Lehnt die App den Start ab: derselbe Aufruf mit `initiation` `own_initiative` und eine Zeile „Ein Klick auf die Karte startet die Etappe <e>.“
4. **Haltepunkt:** Block ausgeben, Turn beenden; im Next-Step-Feld Knöpfe mit der Empfehlung zuerst. Bis zur Antwort startest du nichts; sie hältst du mit `<SC> answer` fest. Unklare Antwort: einmal nachfragen.
5. Kein `git add -A`, kein Push, kein Branch-Wechsel, kein Worktree.

## Einstieg
1. `<SC> entry $ARGUMENTS`. `=== ZUSTAND ===` ausgeben, wenn vorhanden.
2. `frage-wi=ja`: einmal nach der Workitem-Nummer fragen. `frage-basis=ja`: einmal nach dem Basis-Branch fragen, Vorschlag `basis-vorschlag`. Bis zu den Antworten startest du nichts.
3. `etappe=whiteboarding`: Fasse den Gesprächskontext zusammen (Anliegen, genannte Dateien, getroffene Entscheidungen) und schreib ihn nach `kontext.md` im Scratchpad. Ist der Kontext leer, fragst du einmal nach dem Anliegen; seine Antwort ist der Kontext. Dann `<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B>`, dazu `--wi <WI>` nur wenn gegeben, und Start (Regel 3).
4. Sonst `<SC> set --slug <slug>`, dazu `--basis <B>`, `--wi`, `--spec`, `--plan`, `--worktree` je nur wenn bekannt; `<B>` ist `basis` aus dem Einstieg oder die Antwort auf `frage-basis`.
5. `etappe=go`: `<SC> halt --slug <slug> --art go`, Haltepunkt (Regel 4). Sonst Start der Etappe `etappe` (Regel 3).

## Turn-Ende einer Etappen-Session
Vor dem ersten Turn-Ende liest du `references/ablauf.md` und folgst ihr: Statuszeile, Prüfung des `final`, Haltepunkte, Commits und Schlussbericht.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Die Frage der Etappe beantworte ich schnell selbst.“ | Der Mensch antwortet in der Etappen-Session. |
| „Die Etappe meldet Erfolg, also weiter.“ | Erst `<SC> final` prüft gegen git. |
| „Die Etappe durfte nicht pushen, dann mache ich das.“ | Nie stellvertretend. |
| „Zwischenstand, kurz kommentieren.“ | `in-progress`: schweigen. |
