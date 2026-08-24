# Fehlerbehandlung in Flow Design (Kap. 28)

Quelle: Stefan Lieser, "Mit Flow Design zu Clean Code"

---

## Grundregel: Fehlerbehandlung ist ein Feature

Fehlerbehandlung ist **kein technisches Querschnittsthema** — sie ist ein eigenes Feature der
Interaktion und wird **nach Abnahme der Kernfunktionalität** realisiert.

Vorgehen:
1. Kernfunktionalität entwerfen und implementieren
2. Product Owner nimmt die Kernfunktionalität ab
3. Erst dann: Fehlerbehandlung als weiteres Feature entwerfen und einbauen

Begründung: Änderungen an der Kernfunktionalität ziehen Anpassungen der Fehlerbehandlung
nach sich — frühes Einbauen erzeugt doppelten Aufwand.

---

## Drei Kategorien — klar unterscheiden

| Kategorie | Beispiele | Reaktion |
|-----------|-----------|---------|
| **Bedienfehler** (Anwender) | Pflichtfeld leer, ungültiges Datum, falsches Format | Eigener Ausgangsdatenfluss im Entwurf — kein Exception |
| **Technische Fehler** (Infrastruktur) | Datei nicht lesbar, Netzwerk weg, DB nicht erreichbar | Eigener Ausgangsdatenfluss im Entwurf — kein Exception nach oben |
| **Programmierfehler** (Entwickler) | NullPointer, Array-Index außerhalb, Logikfehler | Exception **nicht** fangen — global abhandeln, App ggf. neu starten |

Entscheidend: Bedienfehler und erwartbare technische Fehler sind **keine Ausnahmen** — sie
werden erwartet und müssen daher im Entwurf modelliert werden.

---

## Entwurf: Fehlerfall als benannter Ausgangsdatenfluss

Wenn eine Funktionseinheit einen Fehler erkennen kann, erhält sie einen **zusätzlichen
Ausgangsdatenfluss**, der den Fehlerfall repräsentiert:

```
         ──[Erfolg]──► NächsteFunktionseinheit
FE ──►  ValidiereBenutzereingabe
         ──[Fehler]──► FehlerAnzeigen
```

- Benannte Ausgänge (wie bei Fallunterscheidungen)
- Fehlerpfad wird in der Integration verdrahtet — nicht in der Operation versteckt
- Der Fehlerfall fließt durch den normalen Datenfluss → testbar

---

## Exceptions: Nur für nicht-erwartbare Programmierfehler

```
// Richtig: erwartbarer technischer Fehler → benannter Datenfluss
Result<string> LeseAusDatei(string pfad)   // Success oder Failure

// Falsch: erwartbaren Fehler als Exception nach oben reichen
string LeseAusDatei(string pfad)   // wirft bei fehlendem File
```

Exceptions, die die Laufzeitumgebung für unerwartete Programmierfehler auslöst:
- **Nicht** innerhalb einer Funktionseinheit fangen
- An einem globalen Handler auffangen
- Anwendung gezielt beenden oder Teilbereich neu starten

---

## Verbindung zu IOSP

Fehlerflüsse folgen denselben Regeln wie normale Flüsse:

- **Operation**: entdeckt den Fehler, liefert ihn als Ausgangswert
- **Integration**: verdrahtet den Fehlerpfad — ruft Fehlerbehandlungsoperation auf

Eine Operation, die eine Exception fängt und danach noch delegiert, verletzt IOSP.
