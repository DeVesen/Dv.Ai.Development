---
name: implementation
description: Use when a reviewed dv-forge plan.md should be implemented task by task with a fresh subagent per task, a task review with fix loop after each task and one final review, strictly sequential.
argument-hint: <plan.md>
---

# Umsetzung (Controller)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du beauftragst SubAgents, lässt prüfen und führst Buch. Code schreibst du nie selbst. Lies vor dem Start im Ordner `${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/` die Dateien `ledger.md`, `task-loop.md`, `final-review.md` und `model-selection.md`.

## Durchlaufen
Zwischen den Tasks fragst du nicht. Konflikte, Mehrdeutigkeiten, Plan-Fehler entscheidest du selbst: Die Spec ist bindend, der Plan ihre Begründung, dein Urteil entscheidet den Rest, als `Urteil: <was> — <warum> — <was es kostet, falls falsch>` ins Ledger.

## Stopp-Gründe
Du hältst nur an und fragst bei
1. irreversiblen oder destruktiven Operationen, sicherheitskritischen Aktionen oder Nebenwirkungen außerhalb des Checkouts (Merge, Push, Veröffentlichen),
2. einem Plan, bei dem jeder Weg geraten wäre,
3. einem Urteil gegen einen W-Eintrag in Spec oder Plan,
4. den Fragen aus Start 2 und 3,
5. einer gescheiterten Prüfung beim Start.

## Start
1. `node "<PLUGIN>/scripts/prepare.js" implementation $ARGUMENTS` (nur Pfade); Exit ungleich 0: Meldung ausgeben, Ende. Liefert `P`, `S` und `slug`.
2. `node "<PLUGIN>/scripts/work.js" start <slug> --spec "<S>" --plan "<P>"`; Exit ungleich 0: Meldung ausgeben, Ende. Ab jetzt gelten die ausgegebenen `R`, `P` und `S`; lies Plan und Spec. Bei `modus=worktree`: `cd "<R>"`. Bei `modus=vor-ort` und `standard=true` fragst du einmal, ob auf dem Standard-Branch gearbeitet wird; bei Nein `node "<PLUGIN>/scripts/work.js" switch <vorschlag>`.
3. Bei `drift=` (Plan-Dateien seit der Basis geändert) oder `workitem-konflikt=` fragst du einmal, ob trotzdem umgesetzt wird.
4. `node "<PLUGIN>/scripts/base-tag.js" ensure <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "<PLUGIN>/scripts/workspace.js" create implementation <slug>`; Ledger nach `ledger.md` anlegen oder fortsetzen.
6. `node "<PLUGIN>/scripts/plan-tasks.js" scan "<P>" "<W>"`; Exit ungleich 0: Meldung ausgeben, Ende. Ausgabe: Task-Zeilen, `Offen:` mit Zeilen für dein Urteil.
7. **Vorab-Scan:** Je offener Zeile ein Urteil (`ok — warum` oder `Lücke — Folge`), ins Ledger als `Vorab-Scan: <Scan-Datei>; <k> offen — <Urteile>`.
8. **Basis-Lauf** nach `task-loop.md` Abschnitt 0.

## Tasks
Jeder Task bekommt einen frischen Umsetzer nach `task-loop.md`, streng nacheinander. Danach `final-review.md`. Hat der Plan genau einen Task, entfällt das Task-Review; es läuft nur das Final-Review.

## Abschluss
1. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>" --nur test`. Nur bei `ergebnis=gruen` ins Ledger: `Gesamtlauf: <head aus PRUEFUNG> grün (verify-run)`. `rot` oder `docker` ist ein offener Punkt im Bericht.
2. Bericht nach `<W>/abschluss.md`: Bereich `forge-base/<slug>..HEAD`, Anzahl Tasks, jede `Urteil:`-Zeile mit Kosten, offene Punkte.
3. `node "<PLUGIN>/scripts/ledger.js" archive "<P>" "<W>"` legt Bericht und Ledger-Auszug neben den Plan. Diese Datei committest du; kein Merge, kein Push.
4. Im Chat nur: Ergebnis, Zahl der Urteile, offene Punkte, Pfad der Datei, bei `modus=worktree` Worktree und Branch, und als Code-Block für eine frische Session dort `/dv-forge:implementation-review <P>`.
5. `node "<PLUGIN>/scripts/workspace.js" remove implementation <slug>`. Tag und Branch bleiben.

Dieses Berichtsformat hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.

## Ausreden
| Ausrede | Wirklichkeit |
|---|---|
| Das korrigiere ich schnell selbst | Ein eigener Fix belastet deinen Kontext und geht ungeprüft durch. |
| Noch eine Runde, dann passt es | Nach dem Cap konvergiert nichts mehr. Urteilen. |
| Das Finding ist offensichtlich falsch | Über Findings urteilst du erst am Cap, mit Ledger-Zeile. |
