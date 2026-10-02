# Flow Design (Stefan Lieser & Ralf Westphal)

Leichtgewichtige Entwurfsmethode für funktionale Anforderungen.  
Schließt den **Requirements-Logic-Gap**: die Lücke zwischen Anforderung und Code.

→ **Notation:** [notation.md](notation.md)  
→ **Vorgehensmodell:** [process.md](process.md)  
→ **Zustand:** [state-management.md](state-management.md)  
→ **Fehlerbehandlung:** [error-handling.md](error-handling.md)

---

## Warum Flow Design? — Die drei Anforderungskategorien (Kap. 2–3)

Auftraggeber haben drei Kategorien von Anforderungen:

| Kategorie | Beispiele | Status |
|-----------|-----------|--------|
| **Funktionale Anforderungen** | "Benutzer kann Bestellung anlegen" | Explizit |
| **Nicht-funktionale Anforderungen** | Antwortzeit < 2s, Datenmenge, Sicherheit | Explizit |
| **Investitionsschutz** | Wandelbarkeit über Jahre/Jahrzehnte | **Implizit — nie ausgesprochen** |

Der Investitionsschutz ist die implizite Daueranforderung: kein Auftraggeber spricht davon,
aber jeder erwartet, dass das System langfristig geändert werden kann.

**Ziel von Flow Design:** Den Aufwand für Features **linearisieren** statt exponentiell
wachsen zu lassen. Software ohne guten Entwurf wird mit der Zeit immer schwerer zu ändern —
Flow Design bricht diesen Trend durch konsequente Aspekttrennung vor der Codierung.

---

## Kernprinzip

Entwurf und Implementation sind zwei klar getrennte Phasen.  
**Erst entwerfen (grafisch), dann codieren.**

```
Anforderungen → Interaktionsdiagramm → Datenflussdiagramm → Klassenzuordnung → Code
```

---

## Die drei Aspekte

| Symbol | Aspekt | Regel |
|--------|--------|-------|
| `□` Portal | Ui, API, Konsole | Dünn — keine Domänenlogik |
| `○` Domänenlogik | Interaktoren, reine Logik | Frei von UI und Ressourcen |
| `△` Provider | DB, Dateien, externe APIs | Dünn — Suffix `Provider` |

**Niemals vermischen.**

---

## Verbindung zu den anderen Prinzipien

**Flow Design → IODA/IOSP:**  
Ein korrekt verfeinertes Flow Design Diagramm erzwingt IOSP-konformen Code automatisch:
- Integration im Diagramm = Integrationsmethode im Code
- Operation im Diagramm = Operationsmethode im Code (Blatt, kein weiteres Verfeinern)

**Flow Design → Mantra:**  
- *Sauber*: Aspekte sind im Entwurf getrennt, bevor Code entsteht
- *Funktional*: jede Funktionseinheit hat einen klar definierten Ein- und Ausgang
- *Getestet*: Domänenlogik ist frei von Portal und Provider → direkt testbar
- *Wartbar*: Aspekttrennung = Änderungen bleiben lokalisiert
- *Nachhaltig*: Linearisierung des Aufwands — das Kernziel von Flow Design

**Flow Design → Persönliche Regeln:**  
Verfeinerungskriterium "max. 4h je Funktionseinheit" und Aspekttrennung erzwingen automatisch kleine, übersichtliche Methoden ohne tiefe Verschachtelung.
