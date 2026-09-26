# Entscheidungen zu new-wishes-intern

Stand der Besprechung. Umsetzung gebündelt nach Durchsprache aller Punkte.

- **Q1** Auflösung Spec/Plan als Node-Script (Reihenfolge: Argument, `**Spec:**`-Zeile, `spec.md` im Plan-Ordner, Abbruch mit Kandidaten). Zweites Argument ohne Flag in implementation-review = Spec. Projekt-`CLAUDE.md` hat Vorrang bei Ablage; plan-writing bekommt optionalen Zielpfad.
- **Q2** Reviewer schreiben Ergebnis nach `<W>/<reviewer>.json`. Reviewer bekommen `Write`, ein Node-Hook erlaubt Schreiben nur im Workspace. Scripts nehmen `--input`/Workspace statt stdin, halten Rundenstand selbst. Profil-Liste als Datei. Plattformneutral (Node), kein PowerShell.
- **Q3** Alle drei Teile: wörtliches Leer-Beispiel + Pflichtsatz in jeder Reviewer-Definition; bei Formatfehler per `SendMessage` nachfordern, erst dann Neustart mit Hinweis; `SubagentStop`-Hook (Node) prüft Ergebnisdatei.
- **Q4** `summary` je Reviewer; Abschnitt „Hinweise des Orchestrators“; Ausfälle mit Grund, Runde, nächstem Schritt; Status/nächster Schritt aus Ergebnis abgeleitet; Logikfehler `N = 0` beheben. Grobheit: Variante A (Anzahl + alle Konsequenzen je Stelle).
- **Q5** Statuszeile vor jedem Dispatch und nach jedem Review/jeder Nacharbeit. Reviewer parallel im Hintergrund, Umsetzer im Vordergrund.
- **Q6** spec-review: bei „sauber“ Folgebefehl, sonst „Spec nicht bereit“. plan-writing warnt bei ungetrackter/geänderter Spec, nennt Commit als Schritt. plan-review bietet Commit mit Workitem-Nummer an, Ausführung erst nach Ja. Whiteboarding-Übergabe mit echtem Pfad und Branch.
- **Q7** Plugin-Dateien und vorgeschriebene Script-Aufrufe auch für Shell-Tools frei; Deny-Meldung nennt Befehl und erlaubten Weg. Freigabe nicht mehr bei `Stop` (feuert jedes Turn-Ende, bestätigt), sondern bei Skill-Abschluss/`SessionEnd`, mit Test. Aufräumen auf jedem Ausstiegspfad.
- **Q8** Alle Scripts geben Pfade mit `/` aus.
- **Q9** implementation-Abschlussbericht als Datei neben Ledger, Chat nur Kurzfassung. Vorrang-Satz für eigene Formate in jedem Skill mit festem Format.
- **Q10** spec-review: Profil-Index (Titel + Zeile) statt ganzer Liste, kein „kleine Spec“-Modus vorerst. plan-review: Prüfbereiche schärfer abgrenzen. implementation mit einem Task: nur Final-Review, Vorab-Scan eine Zeile je Task.
- **Q11** Fortschritt = mindestens eine rote Stelle `changed` und im nächsten Review nicht wieder da.
- **S1** Spec entsteht im aktuellen Checkout; kein Branch, kein Worktree beim Whiteboarding.
- **S10 (neu)** Auf Ansage „trenn das auf“ zerlegt der Skill die Spec in mehrere Specs; abgetrennte Teile als offen markiert für eigenes Whiteboarding.
- **S2** Unklare Antwort → ein Satz Rückfrage vor Verbuchung. Durch Fakt ausgeschlossene Optionen nicht anbieten, Fakt als Voraussetzung. Feste Zeile „Begriffe: <Wort> → <Glossar-Begriff>“ vor den Fragen.
- **S3** Rahmenfragen (Workitem, Ablage) einmal vor Runde 1, kein W-Eintrag. Metadaten-Kopf: Workitem-Nummer, Datum, Basis-Commit, Spec-Art.
- **S4** Entwurf erst bei leerer Frontier; Datei wortgleich; spätere Änderung als Vorher/Nachher zur Bestätigung.
- **S5** Skizze ab drei Schritten oder zwei Varianten, sonst Text.
- **S6** Ein Tag je Zeile, Rangfolge: Aussage > Anhang > Historie > Git. Bestätigte Empfehlung = Aussage.
- **S7 + Neuschnitt** `spec-whiteboarding` arbeitet nur mit Gesprächsinhalt und übergebenen Anhängen (keine Code-/Git-/Historie-/Glossar-Suche, fragt direkt; Tags: Aussage, Anhang, ungeklärt). `spec-whiteboarding-with-docs` ist die verankerte Variante mit Code, Git, Historie, Glossar. Metadaten-Kopf trägt Spec-Art `frei` / `verankert`; spec-review prüft `frei` nur auf innere Stimmigkeit (ohne Code-/Profil-Reviewer). Verbund: Variante B, je Schritt benennen, welche Referenz zu lesen ist, Pfad ab Plugin-Wurzel.
