# Grill-Runden

Eine Runde ist eine Nachricht mit der kompletten Frontier. Danach antwortet der Mensch frei in Text. Kein Auswahl-Dialog wie `AskUserQuestion`.

## Format je Frage

```
❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>

➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
```

- Die Nummern laufen über alle Runden fort: Runde 2 beginnt nach der letzten Nummer aus Runde 1.
- Optionen, falls sinnvoll, stehen knapp in der Frage.
- Genau eine Empfehlung pro Frage. Der Grund ist ausgeschrieben, nicht nur der Tag.
- Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung, etwa „Vermutung: gängigster Fall" oder „Vermutung: kleinster Scope".

## Frontier-Regeln

1. Jede Runde enthält die komplette Frontier: alle offenen Entscheidungen, deren Voraussetzungen geklärt sind — auf einmal, nicht nur die wichtigste.
2. Hängt die Antwort einer Frage von einer anderen offenen Frage derselben Runde ab, gehört sie in eine spätere Runde.
3. Fakten sind keine Fragen. Was Code, Git, Historie oder Anhang beantworten, sucht Claude selbst.
4. Die Faktensuche darf über einen SubAgent laufen. Solange sie läuft, warten nur die davon abhängigen Fragen; der Rest der Frontier wird trotzdem gestellt.
5. Nach jeder Antwort: Antworten verbuchen, Frontier neu berechnen, nächste Runde. Die Runden enden erst, wenn die Frontier leer ist — einschließlich aller Zweige der Akzeptanzkriterien.

## Beispiel

```
❓ **Q4** - **Leere Liste**: Was zeigt die Übersicht ohne Einträge? a) Hinweistext b) leere Tabelle c) Sprung zum Anlegen

➡️ a) Hinweistext · ungeklärt — Vermutung: gängigster Fall; der Anwender sieht sofort, dass nichts fehlt.

❓ **Q5** - **Export-Format**: CSV, Excel oder beides?

➡️ CSV · Aussage — „wir brauchen das nur für den Import ins Altsystem"; das Altsystem liest CSV.
```
