---
name: implementation
description: Use when a reviewed dv-forge plan.md should be implemented task by task with a fresh subagent per task, a task review with fix loop after each task and one final review, strictly sequential.
disable-model-invocation: true
argument-hint: <plan.md>
---

# Umsetzung (Controller)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du setzt den Plan um, indem du SubAgents beauftragst, prüfen lässt und Buch führst. Code schreibst du nie selbst. Lies vor dem Start im Ordner `${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/` die Dateien `ledger.md`, `task-loop.md`, `final-review.md` und `model-selection.md`.

## Durchlaufen
Zwischen den Tasks fragst du nicht nach. Konflikte, Mehrdeutigkeiten und Plan-Fehler entscheidest du selbst: Die Spec ist bindend, der Plan ihre Begründung, dein Urteil entscheidet den Rest, als `Urteil: <was> — <warum> — <was es kostet, falls falsch>` ins Ledger. Ein falsches Urteil kostet Nacharbeit, eine wartende Session den ganzen Tag.

## Stopp-Gründe
Du hältst nur an und fragst, wenn
1. eine Operation irreversibel oder destruktiv ist,
2. eine Aktion sicherheitskritisch ist,
3. eine Nebenwirkung außerhalb dieses Checkouts entstünde (Merge, Push, Veröffentlichen),
4. der Plan so fehlerhaft ist, dass jeder Weg geraten wäre,
5. ein Urteil einem W-Eintrag in Spec oder Plan widerspräche,
6. eine Prüfung beim Start scheitert.

## Start
1. `node "<PLUGIN>/scripts/prepare.js" implementation $ARGUMENTS`; Exit ungleich 0: Meldung ausgeben, Ende. Die Zeilen `<Name>=<Wert>` liefern `P`, `S` und `slug`.
2. `node "<PLUGIN>/scripts/work.js" start <slug> --spec "<S>" --plan "<P>"`; Exit ungleich 0: Meldung ausgeben, Ende. Ab jetzt gelten die ausgegebenen `R`, `P` und `S`; lies Plan und Spec. Bei `modus=worktree`: `cd "<R>"`. Bei `modus=vor-ort` und `standard=true` fragst du einmal, ob auf dem Standard-Branch gearbeitet wird; bei Nein `git switch -c <vorschlag>`.
3. Bei `drift=` (Plan-Dateien seit der Plan-Basis geändert) oder `workitem-konflikt=` (Branch trägt anderes Workitem) fragst du einmal, ob trotzdem umgesetzt wird.
4. `node "<PLUGIN>/scripts/base-tag.js" ensure <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "<PLUGIN>/scripts/workspace.js" create implementation <slug>`; Ledger nach `ledger.md` anlegen oder fortsetzen.
6. `node "<PLUGIN>/scripts/plan-tasks.js" list "<P>"`; Exit ungleich 0: Meldung ausgeben, Ende.
7. **Vorab-Scan:** je `MEHRFACH`-Zeile und je Paar aus `Produces` und `Consumes` eine Befundzeile, dazu eine Zeile je Task. Ins Ledger. "Scan sauber" ohne diese Zeilen zählt nicht.

## Tasks
Jeder Task bekommt einen frischen Umsetzer nach `task-loop.md`, streng nacheinander. Danach `final-review.md`. Hat der Plan genau einen Task, entfällt das Task-Review; es läuft nur das Final-Review.

## Abschluss
1. Vollständiger Bericht nach `<W>/abschluss.md`: Bereich `forge-base/<slug>..HEAD`, Anzahl Tasks, jede `Urteil:`-Zeile mit Kosten, offene Punkte.
2. `node "<PLUGIN>/scripts/ledger.js" archive "<P>" "<W>"` legt Bericht und Ledger-Auszug neben den Plan. Diese Datei committest du; kein Merge, kein Push.
3. Im Chat nur: Ergebnis in einem Satz, Zahl der Urteile, offene Punkte, Pfad der Datei, bei `modus=worktree` Worktree und Branch, und als Code-Block für eine frische Session dort `/dv-forge:implementation-review <P>`.
4. `node "<PLUGIN>/scripts/workspace.js" remove implementation <slug>`. Tag und Branch bleiben.

Dieses Berichtsformat hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.

## Ausreden
| Ausrede | Wirklichkeit |
|---|---|
| Parallel geht schneller | Zwei Umsetzer kollidieren. Streng nacheinander. |
| Das korrigiere ich schnell selbst | Ein eigener Fix belastet deinen Kontext und geht ungeprüft durch. |
| Noch eine Runde, dann passt es | Nach dem Cap konvergiert nichts mehr. Urteilen. |
| Das Finding ist offensichtlich falsch | Geurteilt wird nur am Cap, immer mit Ledger-Zeile. |
