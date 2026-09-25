# Ledger

Das Ledger ist dein Gedächtnis. Compaction und Neustart löschen deine Erinnerung, aber nicht das Ledger und nicht `git log`. Nach einer Unterbrechung gilt, was dort steht, nicht, was du zu wissen glaubst.

## Ort
`<W>/progress.md`. `<W>` ist der Arbeitsbereich aus `workspace.js create implementation <slug>`. Er gehört genau diesem Plan; fremde Arbeitsbereiche liest und schreibst du nicht.

## Identität
Die erste Zeile lautet `# Ledger — Plan: <pfad/plan.md>`. Nennt ein vorhandenes Ledger einen anderen Plan, lässt du es unberührt und brichst ab mit `Arbeitsbereich gehört zu einem anderen Plan: <pfad>`.

## Zeilen
```text
Vorab-Scan: <Tabelle>
Urteil: <was> — <warum> — <was es kostet, falls falsch>
Task <n>: zurückgestellt: <Einzeiler>
Task <n>: Fix-Runde <r>/5 (<x> behoben, <y> offen — <Einzeiler>; Commits <a7>..<b7>)
Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>
Task <n>: fertig (Commits <a7>..<b7>, Review sauber | <k> geparkt)
Final: sauber | Fix-Welle (Commits <a7>..<b7>)
```
Jede Zeile schreibst du in derselben Nachricht, in der du den Schritt abschließt.

## Wiederaufnahme
- Ein Task mit `fertig`-Zeile ist erledigt. Du startest ihn nie erneut.
- Du setzt beim ersten Task ohne `fertig`-Zeile fort.
- Ist die letzte Zeile eines Tasks eine `Fix-Runde`, setzt du die Schleife mit der nächsten Runde fort.
- Die Commits im Ledger existieren in Git, auch wenn du dich nicht erinnerst, sie erzeugt zu haben.
- Fehlt der Arbeitsbereich, rekonstruierst du den Stand aus `git log --oneline forge-base/<slug>..HEAD`.
