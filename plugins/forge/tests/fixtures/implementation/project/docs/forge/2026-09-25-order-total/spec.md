# Bestellsumme

Status: bestätigt am 2026-09-25

## Was, wie, wo, warum
Ein kleines Modul berechnet die Summe einer Bestellung, formatiert sie für die Anzeige und lädt Positionen aus einer Datei. · Aussage

## Theoretisches Verhalten nach Umsetzung
Aufrufer übergeben Positionen mit Menge und Einzelpreis in Cent und erhalten die Summe in Cent sowie einen Anzeigetext in Euro. Positionen lassen sich aus einer JSON-Datei laden. · Aussage

## Soll-Vorgaben
- Beträge werden als ganze Cent verarbeitet. · Aussage
- Keine externen Abhängigkeiten. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben die Positionen 2 × 150 Cent und 1 × 99 Cent, wenn die Summe berechnet wird, dann ist sie 399 Cent.
- **AC-02** Gegeben eine Position mit negativer Menge, wenn die Summe berechnet wird, dann wird ein Fehler mit der Meldung `Menge darf nicht negativ sein` geworfen.
- **AC-03** Gegeben die Summe 399 Cent, wenn sie formatiert wird, dann lautet der Text `3,99 €`.
- **AC-04** Gegeben ein Pfad zu einer Datei, die nicht lesbar ist, wenn Positionen daraus geladen werden, dann wird ein Fehler geworfen, dessen Meldung den Pfad nennt.

## Entscheidungen
- **W · Cent statt Kommazahl** · Aussage — Beträge sind ganze Cent, nie Kommazahlen.
