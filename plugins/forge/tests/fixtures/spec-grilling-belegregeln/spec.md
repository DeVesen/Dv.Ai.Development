# Start Power und End Power in W oder Prozent

Status: bestätigt am 2026-10-27
Art: verankert
Basis: abc1234

## Was, wie, wo, warum
Der Anwender stellt Start Power und End Power einer Rampe wahlweise in Watt oder in Prozent ein. · Aussage

## Theoretisches Verhalten nach Umsetzung
Die Rampentabelle zeigt die Spalten Start Power und End Power. Je Spalte wählt der Anwender die Einheit W oder %. · Aussage

## Soll-Vorgaben
- Die Einheit gilt je Spalte. · Aussage
- Gespeichert wird weiterhin der Wert in Watt. · Aussage
- Alle übrigen Funktionen der Spalten bleiben wie bisher. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben die Einheit % für Start Power, wenn der Anwender die Rampentabelle betrachtet, dann zeigt die Spalte Start Power den Prozentwert. · Aussage
- **AC-02** Gegeben die Einheit W für End Power, wenn der Anwender die Rampentabelle betrachtet, dann zeigt die Spalte End Power den Wert in Watt. · Aussage

## Entscheidungen
- **W · Gespeicherter Wert** · Aussage — Watt.
- **W · Einheit je Spalte** · Aussage — Die Einheit wird je Spalte gewählt.
