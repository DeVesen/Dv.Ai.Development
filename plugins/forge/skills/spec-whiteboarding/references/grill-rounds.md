# Grill-Runden

Eine Runde ist eine Nachricht mit der kompletten Frontier. Danach antwortet der Mensch frei in Text. Kein Auswahl-Dialog wie `AskUserQuestion`.

## Format je Frage

```
❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>

➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
```

- Die Nummern laufen über alle Runden fort: Runde 2 beginnt nach der letzten Nummer aus Runde 1.
- Optionen, falls sinnvoll, stehen knapp in der Frage.
- Eine unverändert offene Frage aus früherer Runde wiederholst du verkürzt: `Q<n> <Titel> — <Empfehlung>`. Ausgeschrieben wird sie nur, wenn sich die Lage geändert hat.
- Ändert der Mensch den Umfang, stellst du die Frontier komplett neu auf. Jede ersetzte Frage führst du als `Q<n> entfällt, ersetzt durch Q<m>`, nie als „weiterhin offen“.
- Genau eine Empfehlung pro Frage. Der Grund ist ausgeschrieben, nicht nur der Tag.
- Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung, etwa „Vermutung: gängigster Fall“ oder „Vermutung: kleinster Scope“.
- Was du nach der 85-%-Regel aus `<PLUGIN>/shared/dialog-rules.md` selbst entscheidest, steht im Block `Selbst entschieden` vor der ersten Frage, nicht als Frage.

## Rahmenfragen
Vor Runde 1 fragst du einmal, was nicht fachlich ist: nur die Workitem-Nummer, und nur wenn `Workitem` in den Projekt-Einstellungen nicht `keine` ist. Rahmenfragen sind keine W-Einträge; die Antwort kommt in den Kopf der Spec.

## Frontier-Regeln

1. Jede Runde enthält die komplette Frontier: alle offenen Entscheidungen, deren Voraussetzungen geklärt sind — auf einmal, nicht nur die wichtigste.
2. Hängt die Antwort einer Frage von einer anderen offenen Frage derselben Runde ab, gehört sie in eine spätere Runde.
3. Fakten und selbst Entschiedenes sind keine Fragen. Was ein übergebener Anhang beantwortet, liest Claude selbst. Im verankerten Whiteboarding gilt das auch für Code, Git, Historie und Glossar.
4. Schließt ein bekannter Fakt Optionen aus, bietest du sie nicht an. Der Fakt steht als Voraussetzung in der Frage; gefragt wird höchstens, ob er gelten soll.
5. Die Faktensuche darf über einen SubAgent laufen. Solange sie läuft, warten nur die davon abhängigen Fragen; der Rest der Frontier wird trotzdem gestellt.
6. Beantwortet der Mensch eine Frage nicht eindeutig, fragst du in einem Satz nach, bevor du einen W-Eintrag buchst oder etwas ausführst.
7. Nach jeder Antwort: Antworten verbuchen, Frontier neu berechnen, nächste Runde. Die Runden enden erst, wenn die Frontier leer ist — einschließlich aller Zweige der Akzeptanzkriterien.

## Belegregeln

1. **Verhalten belegen:** Eine Frage oder Option, die bestehendes Verhalten voraussetzt (Sortieren, Filtern, Export und Ähnliches), stellst du nur, wenn du das Verhalten an der konkreten Stelle belegt hast: Datei:Zeile, die es für genau dieses Element auslöst. Ein Modul-Import oder eine Fähigkeit des Frameworks belegt nur, was möglich wäre, nicht was es heute gibt. Fehlt der Beleg oder darf dein Skill nicht suchen, lässt du die Frage weg oder fragst „Gibt es das heute?“ mit Tag `ungeklärt`.
2. **Keine bedingte Empfehlung:** Eine Empfehlung hängt nie an einer ungeprüften Bedingung („falls …, sonst …“). Prüfe die Bedingung vorher und empfiehl eindeutig; lässt sie sich nicht prüfen, ist sie eine eigene Frage; die abhängige Frage folgt in einer späteren Runde.
3. **Kein neues Verhalten:** Ein Verhalten, das weder im Auftrag (Aussage oder Anhang) noch im Bestand steht und kein Grenzfall des beauftragten Verhaltens ist, führst du nicht als Option ein. Legt der Auftrag es nahe, fragst du, ob es dazugehört, mit der Empfehlung „nicht in diese Story“.

## Abbruch-Regel

„Reicht jetzt“ ist noch kein Abbruch.
1. **Einmal zurückfragen:** die offenen Zweige nennen und genau einmal eine verdichtete Abschlussrunde anbieten.
2. **Zweite, informierte Ablehnung:** Erst das ist ein Abbruch. Weiter mit Bestätigen und Schreiben, im Abbruch-Format aus `spec-format.md`.

Red Flag: „Der Mensch hat genug gesagt“ — erst die zweite, informierte Ablehnung ist ein Abbruch.

## Beispiel

```
Selbst entschieden:
- Export-Format: CSV · Aussage — „wir brauchen das nur für den Import ins Altsystem“; das Altsystem liest CSV.

❓ **Q4** - **Leere Liste**: Was zeigt die Übersicht ohne Einträge? a) Hinweistext b) leere Tabelle c) Sprung zum Anlegen

➡️ a) Hinweistext · ungeklärt — Vermutung: gängigster Fall; der Anwender sieht sofort, dass nichts fehlt.
```
