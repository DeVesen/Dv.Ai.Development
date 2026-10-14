# Step-Check

Ein Step ist ein Step, wenn alle fuenf Punkte zutreffen. Verletzung: splitten oder die Ausnahme
unter „Annahmen/Offene Punkte" begruenden.

| # | Regel | Pruefrage |
|---|-------|------------|
| 1 | **Ein beobachtbares Ergebnis** | Kann ein Nutzer danach etwas Neues sehen oder tun? Genau eins? |
| 2 | **Einzeln pruefbar** | Hat der Step eigene Kriterien, die ohne die anderen Steps gruen/rot werden? |
| 3 | **Laesst das System lauffaehig** | Ist nach dem Step nichts halb fertig oder kaputt? |
| 4 | **Senkrecht geschnitten** | Liefert er Nutzerwert? Reine Schicht-Slices (erst Datenbank, dann API, dann UI) sind kein Step. |
| 5 | **Abhaengigkeit benannt** | Steht eine harte Voraussetzung als „Abhaengig von", statt nur in der Reihenfolge versteckt? |

## Leitplanken (aus `limits.json`, Abschnitt `step`)

- ein Ziel, hoechstens `zielSaetze` Saetze
- `acMin` bis `acMax` Kriterien, davon mindestens `negativeAcMin` negativ

Ueberschreitung ist ein Warnsignal, kein Verbot: splitten oder begruenden.

## Bezug zu INVEST

Regeln 1–5 decken Independent, Valuable, Estimable und Testable ab. Negotiable gilt weiter: Ein Step
beschreibt das *Was*; das *Wie* bleibt der Spezifikation des Steps ueberlassen. *Small* ersetzen die
Leitplanken.
