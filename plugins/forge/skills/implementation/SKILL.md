---
name: implementation
description: Use when a reviewed dv-forge plan.md should be implemented task by task with a fresh subagent per task, a task review with fix loop after each task and one final review, strictly sequential in the current checkout.
disable-model-invocation: true
argument-hint: <plan.md>
---

# Umsetzung (Controller)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du setzt den Plan um, indem du SubAgents beauftragst, prüfen lässt und Buch führst. Code schreibst du nie selbst. Lies vor dem Start im Ordner `${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/` die Dateien `ledger.md`, `task-loop.md`, `final-review.md` und `model-selection.md`.

## Durchlaufen
Zwischen den Tasks fragst du nicht nach. Konflikte, Mehrdeutigkeiten und Plan-Fehler entscheidest du selbst: Die Spec ist bindend, der Plan ihre Begründung, dein Urteil entscheidet den Rest. Jedes Urteil kommt als `Urteil: <was> — <warum> — <was es kostet, falls falsch>` ins Ledger. Ein falsches Urteil kostet sichtbare Nacharbeit, eine wartende Session den ganzen Tag.

## Stopp-Gründe
Du hältst nur an und fragst, wenn
1. eine Operation irreversibel oder destruktiv ist,
2. eine Aktion sicherheitskritisch ist,
3. eine Nebenwirkung außerhalb dieses Checkouts entstünde (Merge, Push, Veröffentlichen),
4. der Plan so fehlerhaft ist, dass jeder Weg geraten wäre,
5. ein Urteil einem W-Eintrag in Spec oder Plan widerspräche,
6. eine Prüfung beim Start scheitert.

## Start
1. `P` = erstes Argument, absolut. Lies den Plan; fehlt er: `Plan nicht gefunden: <P>`, Ende. `S` = `spec.md` im Ordner von `P`; lies sie, falls vorhanden, sonst Ledger-Notiz `keine Spec — Urteile vorläufig`. `R` = Ausgabe von `git rev-parse --show-toplevel`.
2. `slug` = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" slug "<P>"`.
3. Default-Branch = Ausgabe von `git symbolic-ref --short refs/remotes/origin/HEAD` ohne `origin/`, sonst `main` oder `master`. Steht `git branch --show-current` darauf, fragst du einmal, ob dort gearbeitet werden soll; bei Nein `git switch -c forge/<slug>`.
4. `node "<PLUGIN>/scripts/base-tag.js" ensure <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "<PLUGIN>/scripts/workspace.js" create implementation <slug>`; Ledger nach `ledger.md` anlegen oder fortsetzen.
6. `node "<PLUGIN>/scripts/plan-tasks.js" list "<P>"`; Exit ungleich 0: Meldung ausgeben, Ende.
7. **Vorab-Scan:** eine Zeile je Task-Paar mit gemeinsamer Datei oder Schnittstelle (was der eine produziert, was der andere konsumiert, Befund) und eine Zeile je Task (passen Tests, Code und Dateien zusammen). Tabelle und Urteile ins Ledger. "Scan sauber" ohne diese Zeilen zählt nicht.

## Tasks
Jeder Task bekommt einen frischen Umsetzer nach `task-loop.md`, streng nacheinander. Danach `final-review.md`.

## Abschluss
Bericht im Chat:
- Bereich `forge-base/<slug>..HEAD` und Anzahl Tasks
- **Meine Urteile:** jede `Urteil:`-Zeile des Ledgers in Reihenfolge, mit Kosten, vollständig
- zurückgestellte Punkte und Rest-Findings, die offen blieben
- Nächster Schritt in einer frischen Session, als Code-Block: `/dv-forge:implementation-review <P>`

Dann `node "<PLUGIN>/scripts/workspace.js" remove implementation <slug>`. Tag und Branch bleiben; kein Merge, kein Push.

## Ausreden
| Ausrede | Wirklichkeit |
|---|---|
| Parallel geht schneller | Zwei Umsetzer kollidieren. Streng nacheinander. |
| Das korrigiere ich schnell selbst | Ein eigener Fix belastet deinen Kontext und geht ungeprüft durch. |
| Noch eine Runde, dann passt es | Nach dem Cap konvergiert nichts mehr. Urteilen. |
| Das Finding ist offensichtlich falsch | Geurteilt wird nur am Cap, immer mit Ledger-Zeile. |
