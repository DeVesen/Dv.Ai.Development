# IODA & IOSP (Ralf Westphal)

---

## IODA — Integration Operation Decomposition Architecture

Architekturprinzip für klaren Bausteinschnitt und Dekomposition.

- **Integration-Methoden** orchestrieren: sie rufen andere Methoden auf, enthalten aber selbst keine fachliche Logik.
- **Operation-Methoden** verarbeiten: sie enthalten Logik (Transformationen, Berechnungen, Entscheidungen), rufen aber keine anderen Methoden innerhalb derselben Klasse auf.
- **Decomposition** beschreibt den Prozess, Klassen und Methoden in Integration- und Operation-Einheiten aufzuteilen.
- **PoMO (Point of Maximum Opportunity):** die höchste sinnvolle Abstraktionsebene je Klasse — wo Integration und Operationen klar getrennt sind.

**Wann verletzt:** eine Methode delegiert UND verarbeitet gleichzeitig.  
**Symptom:** schwer testbar, hohe Kopplung.

---

## IOSP — Integration Operation Segregation Principle

Keine Methode mischt Integration und Operation. Eine Methode macht **entweder** interne Aufrufe **oder** Logik/Ausdrücke — nicht beides.

- Deterministische IOSP-Prüfung via `codebase-analyzer analyze_iosp_compliance` (Strang 5 .NET / Strang 6 Angular).
- ArchUnit-IOSP-Regel bleibt als **Backstop** aktiv — fängt grobe Verstöße auf Klassenebene.
- IOSP ist die operative Konkretisierung von IODA auf Methoden-Ebene.

---

## Verbindung zu persönlichen Regeln

IODA/IOSP und die persönlichen Code-Regeln aus dem Mantra ergänzen sich direkt:

- Eine Integration-Methode, die selbst rechnet, ist fast immer auch tief verschachtelt (Nesting-Regel verletzt)
- Eine Operation-Methode, die delegiert, verliert ihre Lesbarkeit auf einen Blick

→ Wer IOSP einhält, erfüllt automatisch einen Großteil der Nesting- und Lesbarkeitsregeln.

---

## PoMO — Principle of Mutual Oblivion (Kap. 32.4)

Ergänzungsprinzip zu IOSP — wirkt **horizontal** (zwischen Operationen), während IOSP
**vertikal** (zwischen Integration und Operation) wirkt.

> **Definition:** Operationen kennen weder ihren Vorgänger noch ihren Nachfolger.
> Die Integration geschieht ausschließlich durch eine übergeordnete Funktionseinheit.

```
// FALSCH: Operation ruft Nachfolger direkt auf → PoMO-Verstoß
void f1(x) { var y = ...; f2(y); }   // f1 kennt f2

// RICHTIG: Integration verdrahtet
void f(x) { var y = f1(x); var z = f2(y); var w = f3(z); }
```

**Warum es wichtig ist:** Änderungen am Datenfluss (z.B. Reihenfolge, neuer Schritt) berühren
nur die Integrationsmethode — die Operationen bleiben unverändert und unabhängig voneinander.

---

## IOSP und Testbarkeit — die Testpyramide (Kap. 32.3)

IOSP hat eine direkte Konsequenz für die Teststrategie:

| Ebene | Testobjekt | Kategorie |
|-------|-----------|---------|
| Blätter (Operationen) | Domänenlogik, reine Berechnungen | **Unit Tests** — kein Mock nötig |
| Knoten (Integrationen) | Zusammenspiel der Operationen | **Integrationstests** — kein Mock nötig, weil kein eigenes Verhalten |
| System | Gesamtsystem inkl. UI + Ressourcen | **Systemtests** — wenige |

**Schlüsselerkenntnis:** Bei konsequentem IOSP entfällt eine ganze Testkategorie —
Unit Tests auf Knoten. Ein Knoten enthält keine Domänenlogik → nichts isoliert zu testen.

> Der Einsatz von Interfaces, Dependency Injection und Attrappen (Mocks) wird bis auf wenige
> Randfälle überflüssig. (Lieser, Kap. 32.3)

Interfaces und Mocks sind dann nötig, wenn ein Knoten Logik enthält — das ist aber ein
IOSP-Verstoß. Konsequent: erst IOSP einhalten, dann verschwindet der Bedarf nach Mocks.

---

## Verbindung zu Flow Design

Flow Design formalisiert IODA auf Entwurfsebene:

- **Integration** im Entwurf = Integrationsmethode im Code (orchestriert Datenfluss)
- **Operation** im Entwurf = Operationsmethode im Code (blattförmig, kein weiteres Verfeinern)

→ Ein korrekt verfeinertes Flow Design Diagramm erzwingt automatisch IOSP-konformen Code.
→ PoMO ist im Diagramm immer eingehalten: Funktionseinheiten zeigen nie auf Geschwister.
