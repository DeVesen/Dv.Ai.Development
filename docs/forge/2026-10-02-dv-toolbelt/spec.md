# Werkzeug-Plugin dv-toolbelt

Status: bestätigt am 2026-10-02
Art: frei
Basis: 0ca14f3

## Was, wie, wo, warum
Es entsteht ein neues Plugin `dv-toolbelt` im Marketplace-Repo. Es sammelt Werkzeug-Skills, die unabhängig von einem Projekt und von anderen Plugins funktionieren. · Aussage

Das Plugin enthält drei Skills: `claude-md-audit` prüft, kürzt und erweitert eine CLAUDE.md. `writing-skills` hilft, Skills zu erstellen, zu testen und zu validieren. `prozess-retrospektive` erzeugt einen Erfahrungsbericht über den Ablauf einer Session. · Aussage

`claude-md-audit` ist die allgemein gehaltene Fassung eines vorhandenen eigenen Skills des Menschen. Er hält die CLAUDE.md kurz: Sie ist ein Rahmenkorn für Agenten und Subagenten, kein Dokument für Menschen. Ausführliches gehört in einen Skill oder eine Referenz, die CLAUDE.md zeigt nur darauf. · Anhang

`writing-skills` sagt inhaltlich dasselbe wie der Skill gleichen Namens aus dem Plugin `superpowers`, ist aber mit eigenen Worten und eigener Gliederung neu geschrieben. Ergänzt um einen Validator für den Kopf einer Skill-Datei, um ein Referenzdokument zum Test der Auslöse-Beschreibung und um zwei Hinweise aus dem Skill `skill-creator`. · Aussage

`prozess-retrospektive` zieht aus `dv-forge` in dieses Plugin um, mit allen zugehörigen Skripten, Referenzen und Tests, und wird von `dv-forge` entkoppelt. · Aussage

Autonom heißt: Kein Skill, Skript oder Hook des Plugins setzt voraus, dass ein anderes Plugin oder ein anderer Skill installiert ist. Eine Erwähnung der Inspirationsquellen in der README ist davon ausgenommen. · Aussage

## Theoretisches Verhalten nach Umsetzung
Der Mensch installiert nur `dv-toolbelt` und kann alle drei Skills ohne weitere Plugins nutzen. · Aussage

`claude-md-audit` fragt zu Beginn, ob ein Backup angelegt werden soll, und führt dann gemeinsam mit dem Menschen durch Befunde, Vorschläge und Freigabe. Geändert wird nur nach Freigabe, committet wird nie. · Aussage

`writing-skills` führt durch das Erstellen eines Skills nach dem Test-zuerst-Gedanken und prüft den Skill-Kopf mit dem Validator. · Aussage

`prozess-retrospektive` erzeugt den Erfahrungsbericht mit unverändertem Inhalt und Ablauf; der Umzug bringt außer der Entkopplung keine inhaltliche Änderung, und AC-39 sichert das über die mitgezogenen Tests ab. Der Skill liest keine Einstellungen von `dv-forge`. Erwartete MCP-Server nennt der Mensch beim Aufruf, Commit-Konvention und Workitem-Kennung fragt der Skill vor einem Commit ab. · Aussage

`dv-forge` enthält die Retrospektive nach dem Umzug nicht mehr. · Aussage

## Soll-Vorgaben
- Die Skill-Texte sind deutsch. Die Trigger-Wörter in den Beschreibungen sind deutsch und englisch. · Aussage
- Alle Skripte des Plugins laufen mit Node.js und brauchen keine weitere Laufzeit. · Aussage
- Jedes Skript des Plugins hat Tests. · Aussage
- `claude-md-audit` enthält keine Annahme über einen Memory-Pfad, über Git-Ignore der CLAUDE.md oder über einen Plugin-Abschnitt in der CLAUDE.md. Ob und wie gesichert wird, entscheidet der Mensch. · Aussage
- Für die Retrospektive gibt es in v1 keine Migration alter Berichte aus dem bisherigen Datenordner. · Aussage
- `dv-forge` erhält weder einen Hinweis auf den Umzug noch einen Versionssprung. · Aussage
- Das Plugin startet mit der Version 0.1.0. · Aussage
- Der Benchmark mit Viewer aus `skill-creator` ist nicht Teil von v1. · Aussage
- Der Validator ist ein Node-Skript, das einen Skill-Ordner prüft und sein Ergebnis über Exit-Code und Meldung zeigt. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben das Marketplace-Repo, wenn der Katalog der Plugins geöffnet wird, dann enthält er einen Eintrag `dv-toolbelt`. · Aussage
- **AC-02** Gegeben das Plugin `dv-toolbelt`, wenn seine Metadaten gelesen werden, dann lautet die Version 0.1.0. · Aussage
- **AC-03** Gegeben das installierte Plugin, wenn seine Skills aufgelistet werden, dann sind es genau `claude-md-audit`, `writing-skills` und `prozess-retrospektive`. · Aussage
- **AC-04** Gegeben nur `dv-toolbelt` ist installiert (ohne `superpowers`, `dv-forge` oder andere Plugins), wenn einer der drei Skills aufgerufen wird, dann läuft er ohne Meldung über ein fehlendes Plugin, einen fehlenden Skill oder eine fehlende Einstellung eines anderen Plugins. · Aussage
- **AC-05** Gegeben alle Dateien des Plugins außer der README, wenn nach den Namen `superpowers`, `skill-creator`, `grill-me`, `dv-forge` und `forge-config` gesucht wird, dann gibt es keinen Treffer. · Aussage
- **AC-06** Gegeben die README des Plugins, wenn sie gelesen wird, dann nennt sie die drei Skills und enthält je einen Satz, dass `writing-skills` von `superpowers:writing-skills` und von `skill-creator` inspiriert ist. · Aussage
- **AC-07** Gegeben ein Aufruf von `claude-md-audit` ohne Pfadangabe, wenn der Skill startet, dann prüft er die CLAUDE.md des aktuellen Projekts. · Aussage
- **AC-08** Gegeben ein Aufruf von `claude-md-audit` mit einem Dateipfad, wenn der Skill startet, dann prüft er genau diese Datei. · Aussage
- **AC-09** Gegeben ein gestarteter `claude-md-audit`, wenn noch nichts geprüft oder geändert wurde, dann hat der Skill gefragt, ob ein Backup angelegt werden soll. · Aussage
- **AC-10** Gegeben die Antwort „Ja“ ohne Pfadangabe, wenn der Skill das Backup anlegt, dann liegt es im temporären Verzeichnis des Systems, Datum und Dateiname stehen im Namen, und der Skill nennt den Pfad. · Aussage
- **AC-11** Gegeben die Antwort „Ja“ mit Pfadangabe, wenn der Skill das Backup anlegt, dann liegt es am genannten Pfad. · Aussage
- **AC-12** Gegeben die Antwort „Nein“, wenn der Umbau abgeschlossen ist, dann existiert kein Backup, der Skill zeigt keinen Diff und nennt nur die Zeichenzahl vor und nach dem Umbau. · Aussage
- **AC-13** Gegeben ein angelegtes Backup, wenn der Umbau abgeschlossen ist, dann zeigt der Skill den Diff gegen das Backup und nennt die Zeichenzahl vor und nach dem Umbau. · Aussage
- **AC-14** Gegeben eine CLAUDE.md mit mehr als fünf Edit-Befunden, wenn der Skill meldet, dann nennt er höchstens fünf Befunde pro Nachricht, die wichtigsten zuerst, und den Rest nur als Anzahl. · Anhang
- **AC-15** Gegeben ein gemeldeter Befund, wenn er gelesen wird, dann enthält er das Zitat, das Problem und einen Vorschlag (neuer Wortlaut, Ziel-Skill oder Löschen). · Anhang
- **AC-16** Gegeben gemeldete Befunde ohne Freigabe des Menschen, wenn die Datei danach geprüft wird, dann ist sie unverändert; nach einer Freigabe ändert der Skill nur die freigegebenen Stellen und legt keinen Commit an. · Anhang
- **AC-17** Gegeben der Mensch hat Marker-Blöcke der CLAUDE.md als geschützt benannt, wenn der Umbau abgeschlossen ist, dann sind die Zeilen jedes Blocks einschließlich der Marker vorher und nachher gleich (Hash-Vergleich durch ein Skript), und Befunde darin erscheinen nur als Vorschlag. · Aussage
- **AC-18** Gegeben eine CLAUDE.md, wenn der Skill sie prüft, dann bewertet er jeden Eintrag nach den Kriterien Länge, Dokument statt Rahmenkorn, Doppelung, Widerspruch, Ableitbarkeit, Krücke für alte Modelle, Mehrdeutigkeit, für Menschen geschrieben und fehlender Auslöser. · Anhang
- **AC-19** Gegeben der Mensch will eine neue Regel aufnehmen, wenn der Skill sie prüft, dann klärt er, ob jeder Agent sie in jeder Session braucht, ob sie schon steht und ob sie einem Eintrag widerspricht, und lässt den Wortlaut vom Menschen bestätigen. · Anhang
- **AC-20** Gegeben ein beliebiges Projekt, wenn `claude-md-audit` läuft, dann prüft er keine Memory-Dateien und verlangt weder einen Git-Ignore-Eintrag noch einen Plugin-Abschnitt in der CLAUDE.md. · Aussage
- **AC-21** Gegeben die Anleitung von `writing-skills`, wenn sie gelesen wird, dann beschreibt sie den Ablauf: Verhalten ohne Skill beobachten, minimalen Skill schreiben, Verhalten mit Skill prüfen, Lücken schließen. · Aussage
- **AC-22** Gegeben die Anleitung von `writing-skills`, wenn sie gelesen wird, dann erklärt sie den Test-zuerst-Gedanken selbst und nennt kein anderes Plugin als Voraussetzung. · Aussage
- **AC-23** Gegeben die Anleitung von `writing-skills`, wenn sie gelesen wird, dann legt sie fest, dass die Beschreibung eines Skills nur den Auslöser nennt und den Ablauf nicht zusammenfasst. · Aussage
- **AC-24** Gegeben das Referenzdokument zum Auslöse-Test, wenn es gelesen wird, dann beschreibt es etwa 20 Testanfragen, je zur Hälfte „soll auslösen“ und „soll nicht auslösen“, knappe Fehlgriffe als Negativfälle und die Aufteilung in Trainings- und Testmenge. · Aussage
- **AC-25** Gegeben die Anleitung von `writing-skills`, wenn sie gelesen wird, dann enthält sie die Hinweise, wiederkehrende Hilfsskripte aus Testläufen in den Skill aufzunehmen und vor dem Ändern eines bestehenden Skills einen Snapshot als Vergleich anzulegen. · Aussage
- **AC-26** Gegeben die Begleitdateien von `writing-skills`, wenn sie aufgelistet werden, dann gibt es eigene Dokumente zum Testen mit Subagents und zu Überzeugungsprinzipien, und es gibt keine Kopie des Best-Practices-Dokuments, keine Graphviz-Regeln, kein Render-Skript und kein CLAUDE.md-Testbeispiel. · Aussage
- **AC-27** Gegeben ein Skill-Ordner mit gültigem Kopf (Name nur aus Kleinbuchstaben, Ziffern und Bindestrichen mit höchstens 64 Zeichen, Beschreibung mit höchstens 1024 Zeichen, beide Pflichtfelder vorhanden, genau eine `SKILL.md`), wenn der Validator aufgerufen wird, dann endet er mit Exit-Code 0 und meldet den Skill als gültig. · Aussage
- **AC-28** Gegeben ein Skill-Ordner mit dem Namen `My_Skill`, wenn der Validator aufgerufen wird, dann endet er mit Exit-Code ungleich 0 und nennt den Namen und die verletzte Regel. · Aussage
- **AC-29** Gegeben ein Skill-Ordner mit einer Beschreibung von 1025 Zeichen, wenn der Validator aufgerufen wird, dann endet er mit Exit-Code ungleich 0 und nennt die Länge. · Aussage
- **AC-30** Gegeben ein Skill-Ordner ohne `SKILL.md`, ohne Kopf, ohne `name` oder ohne `description`, wenn der Validator aufgerufen wird, dann endet er mit Exit-Code ungleich 0 und nennt das Fehlende. · Aussage
- **AC-31** Gegeben ein Skill-Ordner mit zwei `SKILL.md`-Dateien, wenn der Validator aufgerufen wird, dann endet er mit Exit-Code ungleich 0 und nennt die zusätzliche Datei. · Aussage
- **AC-32** Gegeben ein Skill-Ordner mit einem unbekannten Schlüssel im Kopf, wenn der Validator aufgerufen wird, dann gibt er eine Warnung mit dem Schlüssel aus und endet mit Exit-Code 0. · Aussage
- **AC-33** Gegeben ein Skill-Ordner mit `<` oder `>` in der Beschreibung, wenn der Validator aufgerufen wird, dann gibt er eine Warnung aus und endet mit Exit-Code 0. · Aussage
- **AC-34** Gegeben nur `dv-toolbelt` ist installiert und es gibt keinen `dv-forge`-Abschnitt in der CLAUDE.md, wenn `/dv-toolbelt:prozess-retrospektive` aufgerufen wird, dann entsteht der Erfahrungsbericht ohne Fehlermeldung über fehlende Einstellungen. · Aussage
- **AC-35** Gegeben ein Aufruf der Retrospektive mit Angabe erwarteter MCP-Server, wenn der Bericht erzeugt wird, dann meldet er ungenutzte Server als „erwartet, ungenutzt“; ohne Angabe enthält der Bericht diese Meldung nicht. · Aussage
- **AC-36** Gegeben ein fertiger Bericht, wenn der Mensch einen Commit bejaht, dann fragt der Skill vor dem Commit nach Commit-Konvention und Workitem-Kennung und committet erst nach deren Klärung. · Aussage
- **AC-37** Gegeben die Retrospektive legt Daten ab, wenn der Datenordner geprüft wird, dann liegen sie unter `~/.dv-toolbelt/retro` und es entsteht nichts Neues unter `~/.dv-forge`. · Aussage
- **AC-38** Gegeben nach dem Umzug, wenn die Dateien von `dv-forge` durchsucht werden, dann enthalten sie weder den Skill `prozess-retrospektive` noch dessen Skripte, Referenzen oder Tests, und weder die README noch der Einrichtungs-Skill nennen die Retrospektive oder den Schlüssel `MCP-Erwartet`. · Aussage
- **AC-39** Gegeben nach dem Umzug, wenn die Tests ausgeführt werden, dann laufen die bisherigen Retrospektive-Tests im neuen Plugin grün und die übrigen Tests von `dv-forge` ebenfalls. · Aussage
- **AC-40** Gegeben jedes Skript des Plugins, wenn die Testdateien geprüft werden, dann hat jedes Skript mindestens eine Testdatei und alle Tests laufen grün. · Aussage
- **AC-41** Gegeben die Beschreibungen und Texte der drei Skills, wenn sie gelesen werden, dann sind die Texte deutsch und die Trigger-Wörter der Beschreibungen enthalten deutsche und englische Begriffe. · Aussage

## Entscheidungen
- **W · Plugin** · Aussage — Name `dv-toolbelt`, im Marketplace-Repo, Startversion 0.1.0.
- **W · Skill A, Geltungsbereich** · Aussage — Der Mensch nennt, welche CLAUDE.md geprüft wird; ohne Angabe die des Projekts.
- **W · Skill A, geschützte Blöcke** · Aussage — Generisch behalten: Der Mensch nennt die Marker, Befunde darin sind nur Vorschläge.
- **W · Skill A, Skripte** · Aussage — Zeichenzahl vor und nach dem Umbau, Backup mit Diff, Hash-Vergleich der geschützten Blöcke. Ein Zeiger-Check ist in v1 nicht enthalten.
- **W · Skill A, Backup** · Aussage — Der Skill fragt zu Beginn nach einem Backup; ohne Pfadangabe liegt es im temporären Verzeichnis des Systems. Ob und wie gesichert wird, entscheidet der Mensch.
- **W · Skill A, Projektbezug** · Aussage — Kein Git-Ignore-Hinweis, kein Memory-Pfad, kein Plugin-Abschnitt; alle Skills im Plugin sind projektunabhängig.
- **W · Sprache** · Aussage — Skill-Texte deutsch, Trigger-Wörter deutsch und englisch.
- **W · Skill B, Vorbild** · Aussage — `superpowers:writing-skills` ist der Master; `skill-creator` liefert Validator, Auslöse-Test-Konzept und zwei Hinweise.
- **W · Skill B, Validator** · Aussage — In Node neu geschrieben. Fehler: Name, Länge der Beschreibung, Pflichtfelder, mehrere `SKILL.md`. Warnung: unbekannte Schlüssel und `<` `>` in der Beschreibung.
- **W · Skill B, Auslöse-Test** · Aussage — Nur als Konzept in einer Referenzdatei; ein Skript dafür später.
- **W · Skill B, Begleitdateien** · Aussage — Testen mit Subagents und Überzeugungsprinzipien neu formuliert; Best Practices nicht dupliziert; Graphviz, Render-Skript und CLAUDE.md-Beispiel entfallen.
- **W · Skill B, Eigenständigkeit** · Aussage — Der Test-zuerst-Gedanke steht im Skill selbst, ohne Pflicht-Abhängigkeit.
- **W · Skill B, Beschreibungsregel** · Aussage — Die Beschreibung nennt nur den Auslöser; das gilt vor der „pushy“-Empfehlung von `skill-creator`.
- **W · Zurückgestellt** · Aussage — Benchmark mit Viewer als eigener späterer Skill.
- **W · Skill C, Umzug** · Aussage — `prozess-retrospektive` mit Skripten, Referenzen und Tests zieht aus `dv-forge` um, ohne `forge-config`.
- **W · Skill C, Entkopplung** · Aussage — Erwartete MCP-Server als Argument; Commit-Konvention und Workitem fragt der Skill ab; Datenordner `~/.dv-toolbelt/retro`; Aufruf `/dv-toolbelt:prozess-retrospektive`.
- **W · Skill C, Migration** · Aussage — Keine Migration alter Berichte in v1.
- **W · forge** · Aussage — Kein Umzugshinweis und kein Versionssprung; Zeile in README und Schlüssel `MCP-Erwartet` im Einrichtungs-Skill entfallen.
- **W · Autonomie** · Aussage — Keine Voraussetzung auf andere Plugins oder Skills; Inspirations-Erwähnung in der README ist erlaubt.
- **W · Herkunftshinweis** · Aussage — Die README nennt `superpowers:writing-skills` und `skill-creator` als Inspiration, ein Satz je Quelle.
- **W · Tests** · Aussage — Jedes Skript hat Tests.
- **R1 · Theoretisches Verhalten nach Umsetzung** — frage an den menschen — Was enthält der Erfahrungsbericht von `prozess-retrospektive`, und wie läuft der Skill ab? Die Spec sagt bisher nur „wie bisher“. Naheliegende Antworten: a) Die Spec beschreibt Inhalt und Ablauf selbst, mit einem neuen AC und einer Liste der Abschnitte, die der Mensch nennt (etwa: was die Session getan hat, was gut lief, was schlecht lief, Lehren; danach Anzeige und auf Wunsch Ablage oder Commit). b) Die Spec legt nur fest, dass Inhalt und Ablauf beim Umzug unverändert bleiben, und AC-39 sichert das über die mitgezogenen Tests ab.
- **W · Theoretisches Verhalten nach Umsetzung** · Aussage — Antwort auf „R1 · Theoretisches Verhalten nach Umsetzung“: B — Die Spec legt nur fest, dass Inhalt und Ablauf der Retrospektive beim Umzug unverändert bleiben; AC-39 sichert das über die mitgezogenen Tests ab.
- **F · Theoretisches Verhalten nach Umsetzung** — nicht geändert — Vorschlag 1: W-Eintrag ist bindend. „W · Theoretisches Verhalten nach Umsetzung“ legt fest, dass die Spec nur die Unveränderlichkeit von Inhalt und Ablauf der Retrospektive festhält und AC-39 sie absichert; eine eigenständige Beschreibung mit Abschnittsliste und neuem AC widerspräche dieser Entscheidung.
- **F · AC-27** — geändert — Vorschlag 2: AC-27 bis AC-33 nennen statt des Dateinamens nur noch „den Validator“; die Soll-Vorgaben beschreiben ihn einmal als Node-Skript, das einen Skill-Ordner prüft und sein Ergebnis über Exit-Code und Meldung zeigt (im Einklang mit „W · Skill B, Validator“).
