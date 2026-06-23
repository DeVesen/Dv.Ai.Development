# Prüfkatalog — „testbares Akzeptanzkriterium"

Ein Akzeptanzkriterium gilt als **testbar**, wenn es alle fünf Kriterien erfüllt.
Fehlt eines → schärfen oder Rückfrage.

## Die fünf Kriterien

| # | Kriterium | Leitfrage | Anti-Pattern |
|---|-----------|-----------|--------------|
| **1** | **Messbares Ergebnis** | Ist das Ergebnis eindeutig grün/rot prüfbar — nicht subjektiv oder interpretierbar? | „sollte besser sein", „funktioniert korrekt", „angemessen schnell" |
| **2** | **Atomar** | Prüft das Kriterium genau ein Verhalten? Keine `und`/`oder`-Ketten. | „Nutzer kann sich einloggen und wird zum Dashboard weitergeleitet und sieht seine Daten" |
| **3** | **Beobachtbar** | Ist das Ergebnis über API-Response, UI-State, Event, DB-Zustand oder Fehlermeldung prüfbar? | Interne Zustände, Implementierungsdetails, Logs ohne definierten Kanal |
| **4** | **AAA-fähig** | Lassen sich Vorbedingung (Arrange), Aktion (Act) und erwartetes Ergebnis (Assert) klar benennen? | Kein klares „Wann" oder „Womit"; fehlendes Subjekt oder fehlende Aktion |
| **5** | **Lösungswegfrei** | Beschreibt das Kriterium WAS (Verhalten), nicht WIE (Implementierung)? | „der Service soll intern einen Cache nutzen", „via Redis speichern" |

## Schärfungs-Heuristiken

**Kriterium 1 — Messbares Ergebnis:**
- Subjektive Adjektive (`schnell`, `gut`, `korrekt`) durch Schwellenwerte oder binäre Zustände ersetzen.
- Wenn kein Schwellenwert definierbar ist → Rückfrage.

**Kriterium 2 — Atomar:**
- `und`/`oder` im Kriterium → in separate Kriterien aufteilen.
- Jedes Teilverhalten bekommt einen eigenen Testnamen.

**Kriterium 3 — Beobachtbar:**
- Prüfen, ob der Kanal eindeutig ist: HTTP-Status, JSON-Feld, DOM-Element, Signal-Wert, DB-Zeile.
- Interne Details (Thread, Cache-Miss, interner State) → auf beobachtbares Äquivalent umformulieren oder Rückfrage.

**Kriterium 4 — AAA-fähig:**
- Template anwenden: „Gegeben [Vorbedingung], wenn [Aktion], dann [Ergebnis]."
- Fehlt die Vorbedingung → Rückfrage (Welcher User? Welcher Zustand?).

**Kriterium 5 — Lösungswegfrei:**
- Implementierungsdetail streichen, Verhalten beschreiben.
- Beispiel: „via Redis" → „innerhalb von 50 ms ohne DB-Anfrage" (wenn das Ziel Latenz ist).

## Schweregrade

| Schwere | Bedeutung | Konsequenz |
|---------|-----------|------------|
| **Untestbar** | Kriterium verletzt ≥ 1 Kriterium und kann nicht ohne Info-Gewinn geschärft werden | Rückfrage pflicht |
| **Schärfbar** | Kriterium verletzt ≤ 2 Kriterien, Schärfung ist aus Kontext ableitbar | Direkt schärfen + im Befund dokumentieren |
| **Testbar** | Alle 5 Kriterien erfüllt | In F1-Format übersetzen |
