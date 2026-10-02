# Ledger

Das Ledger ist dein Gedächtnis. Compaction und Neustart löschen deine Erinnerung, aber nicht das Ledger und nicht `git log`. Nach einer Unterbrechung gilt, was dort steht, nicht, was du zu wissen glaubst.

## Ort
`<W>/progress.md`. `<W>` ist der Arbeitsbereich aus `workspace.js create implementation <slug>`. Er gehört genau diesem Plan; fremde Arbeitsbereiche liest und schreibst du nicht.

## Identität
Die erste Zeile lautet `# Ledger — Plan: <pfad/plan.md>`, der Pfad relativ zur Checkout-Wurzel `R` und mit `/`. So erkennt auch ein anderer Rechner oder ein Worktree das Ledger wieder. Nennt ein vorhandenes Ledger einen anderen Plan, lässt du es unberührt und brichst ab mit `Arbeitsbereich gehört zu einem anderen Plan: <pfad>`.

## Zeilen
```text
Vorab-Scan: <Tabelle>
Urteil: <was> — <warum> — <was es kostet, falls falsch>
Task <n>: Bedenken: <Einzeiler>
Task <n>: zurückgestellt: <Einzeiler>
Task <n>: Fix-Runde <r>/5 (<x> behoben, <y> offen — <Einzeiler>; Commits <BASE>..<HEAD>)
Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>
Task <n>: fertig (Commits <BASE>..<HEAD>, Review sauber | <k> geparkt)
Gesamtlauf: <HEAD> grün (<n> Tests)
Final: sauber | Fix-Welle (Commits <BASE>..<HEAD>)
```
Jede Zeile schreibst du in derselben Nachricht, in der du den Schritt abschließt. `<BASE>` ist der Kurz-Hash vor dem Schritt, `<HEAD>` sein letzter Commit; `git log <BASE>..<HEAD>` zeigt dann genau die Commits des Schritts, auch bei nur einem. `Gesamtlauf:` schreibst du, wenn ein Umsetzer die komplette Suite auf `<HEAD>` grün belegt hat; Review und Abschluss sparen sich damit einen Lauf auf demselben Code.

## Nach der Umsetzung
Das Ledger bleibt nicht im Arbeitsbereich liegen: Der Abschluss legt Urteile, Bedenken, zurückgestellte und geparkte Punkte mit `ledger.js archive` neben Spec und Plan ab. Das Implementierungs-Review liest diese Datei.

## Wiederaufnahme
- Ein Task mit `fertig`-Zeile ist erledigt. Du startest ihn nie erneut.
- Du setzt beim ersten Task ohne `fertig`-Zeile fort.
- Ist die letzte Zeile eines Tasks eine `Fix-Runde`, setzt du die Schleife mit der nächsten Runde fort.
- Die Commits im Ledger existieren in Git, auch wenn du dich nicht erinnerst, sie erzeugt zu haben.
- Fehlt der Arbeitsbereich, rekonstruierst du den Stand aus `git log --oneline forge-base/<slug>..HEAD`.
