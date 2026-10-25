# Ledger

Das Ledger ist dein Gedächtnis. Compaction und Neustart löschen deine Erinnerung, aber nicht das Ledger und nicht `git log`. Nach einer Unterbrechung gilt, was dort steht, nicht, was du zu wissen glaubst.

## Ort
`<W>/progress.md`. `<W>` ist der Arbeitsbereich aus `workspace.js create implementation <slug>`. Er gehört genau diesem Plan; fremde Arbeitsbereiche liest und schreibst du nicht.

## Identität
Die erste Zeile lautet `# Ledger — Plan: <pfad/plan.md>`, der Pfad relativ zur Checkout-Wurzel `R` und mit `/`. So erkennt auch ein anderer Rechner oder ein Worktree das Ledger wieder. Nennt ein vorhandenes Ledger einen anderen Plan, lässt du es unberührt und brichst ab mit `Arbeitsbereich gehört zu einem anderen Plan: <pfad>`.

## Zeilen
```text
Vorab-Scan: <Scan-Datei>; <k> offen — <Urteile>
Basis rot: keine | <Suite> :: <Name> (eine Zeile je Test)
Urteil: <was> — <warum> — <was es kostet, falls falsch>
Task <n>: Bedenken: <Einzeiler>
Task <n>: zurückgestellt: <Einzeiler>
Task <n>: Fix-Runde <r>/5 (<x> behoben, <y> offen — <Einzeiler>; Commits <BASE>..<HEAD>)
Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>
Task <n>: fertig (Commits <BASE>..<HEAD>, Review sauber | <k> geparkt)
Gesamtlauf: <HEAD> grün (verify-run)
Final: sauber | Fix-Welle (Commits <BASE>..<HEAD>)
```
Jede Zeile schreibst du in derselben Nachricht, in der du den Schritt abschließt. `<BASE>` ist der Kurz-Hash vor dem Schritt, `<HEAD>` sein letzter Commit; `git log <BASE>..<HEAD>` zeigt dann genau die Commits des Schritts, auch bei nur einem. `Gesamtlauf:` schreibst du nur aus der Ausgabe von `verify-run.js` mit `ergebnis=gruen`, nie aus dem Bericht eines Umsetzers; Review und Abschluss sparen sich damit einen Lauf auf demselben Code.

## Nach der Umsetzung
Das Ledger bleibt nicht im Arbeitsbereich liegen: Der Abschluss legt Urteile, Bedenken, zurückgestellte und geparkte Punkte mit `ledger.js archive` neben Spec und Plan ab. Das Implementierungs-Review liest diese Datei.

Vor `archive` prüfst du das Ledger: `node "<PLUGIN>/scripts/ledger.js" check "<W>" --plan "<P>" --repo "<R>"`. Exit 1 listet je Zeile `FEHLER <zeile>: <grund>`; diese Meldung kommt in den Abschlussbericht, und du archivierst trotzdem. `archive` fügt dem Archiv einen Abschnitt `## Kennzahlen` an, dort auch je fertigem Task die Zeile `TDD ok|danach|fehlt-test task <n>` von `node "<PLUGIN>/scripts/ledger.js" tdd "<P>" "<W>" --repo "<R>"` (Reihenfolge von Test und Code im Commit-Bereich; nur ein Hinweis, nie ein Abbruch).

## Wiederaufnahme
Den nächsten Schritt liefert `node "<PLUGIN>/scripts/ledger.js" next "<P>" "<W>"`: `NEXT=task <n>`, `NEXT=fixrunde <n> <r>`, `NEXT=urteil <n>`, `NEXT=final` oder `NEXT=abschluss`. Dahinter stehen diese Regeln:
- Ein Task mit `fertig`-Zeile ist erledigt. Du startest ihn nie erneut.
- Du setzt beim ersten Task ohne `fertig`-Zeile fort.
- Ist die letzte Zeile eines Tasks eine `Fix-Runde`, setzt du die Schleife mit der nächsten Runde fort; nach Runde 5 folgt das Urteil am Cap (`NEXT=urteil`).
- Sind alle Tasks `fertig` und gibt es keine `Final:`-Zeile, folgt das Final-Review (`NEXT=final`); mit `Final:`-Zeile der Abschluss.
- Die Commits im Ledger existieren in Git, auch wenn du dich nicht erinnerst, sie erzeugt zu haben.
- Fehlt der Arbeitsbereich, rekonstruierst du den Stand aus `git log --oneline forge-base/<slug>..HEAD`.
