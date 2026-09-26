# Entscheidungen zu new-wishes-intern

Stand der Besprechung. Umsetzung gebündelt nach Durchsprache aller Punkte.

- **Q1** Auflösung Spec/Plan als Node-Script (Reihenfolge: Argument, `**Spec:**`-Zeile, `spec.md` im Plan-Ordner, Abbruch mit Kandidaten). Zweites Argument ohne Flag in implementation-review = Spec. Projekt-`CLAUDE.md` hat Vorrang bei Ablage; plan-writing bekommt optionalen Zielpfad.
- **Q2** Reviewer schreiben Ergebnis nach `<W>/<reviewer>.json`. Reviewer bekommen `Write`, ein Node-Hook erlaubt Schreiben nur im Workspace. Scripts nehmen `--input`/Workspace statt stdin, halten Rundenstand selbst. Profil-Liste als Datei. Plattformneutral (Node), kein PowerShell.
- **Q3** Alle drei Teile: wörtliches Leer-Beispiel + Pflichtsatz in jeder Reviewer-Definition; bei Formatfehler per `SendMessage` nachfordern, erst dann Neustart mit Hinweis; `SubagentStop`-Hook (Node) prüft Ergebnisdatei.
- **Q4** `summary` je Reviewer; Abschnitt „Hinweise des Orchestrators“; Ausfälle mit Grund, Runde, nächstem Schritt; Status/nächster Schritt aus Ergebnis abgeleitet; Logikfehler `N = 0` beheben. Grobheit: Variante A (Anzahl + alle Konsequenzen je Stelle).
- **Q5** Statuszeile vor jedem Dispatch und nach jedem Review/jeder Nacharbeit. Reviewer parallel im Hintergrund, Umsetzer im Vordergrund.
