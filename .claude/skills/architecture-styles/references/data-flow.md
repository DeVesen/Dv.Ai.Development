# Achse 3 — Data-Flow

Wie fließen Lesen und Schreiben? Diese Achse ist die am häufigsten überdrehte.

> CQRS ist **nicht** Event Sourcing. Event Sourcing ist **nicht** Event-Driven Integration.
> Drei verschiedene Dinge, die getrennt entschieden werden.

---

## CRUD / Ein Modell

Ein Modell für Lesen und Schreiben. Der Default.

| | |
|---|---|
| **Kosten** | Keine |
| **Preis** | Bei divergierenden Lese- und Schreibbedürfnissen wird das Modell zum Kompromiss aus beidem |
| **Sinnvoll bei** | Formularen, Stammdaten, allem ohne echte Invarianten |

Kein Aufrüsten „auf Verdacht". Aufrüsten, wenn ein Report ein Aggregat lädt, das er nicht braucht.

---

## CQRS — vier Stufen

CQRS heißt zunächst nur: **getrennte Modelle für Lesen und Schreiben.**
Die Stufen unterscheiden sich um Größenordnungen im Preis.

| Stufe | Was | Kosten | Wann |
|-------|-----|--------|------|
| **1 Getrennte Query-Pfade** | Reads gehen an Projektionen/DTOs vorbei am Aggregat (`AsNoTracking`, direkte Projektion, Dapper, SQL-Views) | sehr gering | Sobald ein Report ein Aggregat lädt |
| **2 Eigene Read-Modelle** | Read-Klassen teilen nichts mit den Domain-Entities; eigenes Schema oder eigene Views | gering | Reports ändern sich unabhängig von der Domäne |
| **3 Asynchrone Projektionen** | Read-Store wird per Event/Outbox befüllt; **eventual consistency** | hoch | Leselast stört die Schreibseite messbar |
| **4 Separater Read-Store** | Eigene Datenbank oder Suchindex (Elastic, Materialized Views) | sehr hoch | Andere Technologie nötig (Volltext, Analytik, Zeitreihen) |

**Stufe 1 und 2 sind fast immer richtig, sobald Reporting existiert.**
Stufe 3 und 4 brauchen einen Messwert als Begründung — Latenz, Locking, Lastprofil.
Ohne Zahl ist es eine Wette.

**CQRS braucht keinen Mediator.** Handler per DI mit expliziten Interfaces halten den
Aufrufgraphen lesbar. Ein Bus versteckt ihn und ist erst ab echtem Pipeline-Bedarf
(Logging, Validierung, Transaktion als Querschnitt) gerechtfertigt.

---

## Event Sourcing

Der Zustand wird nicht gespeichert, sondern aus der Ereignisfolge rekonstruiert.
Events sind die Wahrheit, jeder Zustand ist abgeleitet.

| | |
|---|---|
| **Kosten** | Sehr hoch — Schema-Evolution der Events, Snapshots, Reprojektion, Debugging, Datenschutz-Löschung |
| **Nutzen** | Vollständige, unstrittige Historie; Zustand zu jedem Zeitpunkt rekonstruierbar; fachliche Ereignisse als erstklassiges Konzept |
| **Sinnvoll bei** | Fachlich zwingender Historie: Buchhaltung, Audit, Versicherung, Handel, Regulierung |

**Ausschlusskriterien:** DSGVO-Löschpflichten auf Event-Daten ohne Krypto-Shredding-Konzept;
Team ohne Erfahrung damit; „wir wollen Historie" ohne fachliche Pflicht — dafür reicht
eine Audit-Tabelle.

**Event Sourcing impliziert CQRS** (der Lesezustand *muss* projiziert werden).
Die Umkehrung gilt nicht.

---

## Event-Driven Integration

Module oder Services reagieren auf Events statt sich direkt aufzurufen.
Das ist eine **Kopplungs**-Entscheidung, keine Persistenz-Entscheidung.

| | |
|---|---|
| **Kosten** | Mittel — Zustellgarantie, Idempotenz, Reihenfolge, Fehlerbehandlung |
| **Preis** | Der Kontrollfluss ist nicht mehr im Code ablesbar |
| **Sinnvoll bei** | Fachlichen Folgereaktionen über Kontextgrenzen: „Auftrag angelegt" löst Fakturierung aus |

**In-Process zuerst.** Innerhalb eines Modulithen genügt ein synchroner In-Process-Dispatch
nach `SaveChanges`. Eine **Outbox-Tabelle** ist von Anfang an billig und nachträglich teuer —
sie ist die einzige Vorleistung, die sich auch ohne Broker rechnet.

**Nicht für Abfragen.** Braucht Modul A einen Wert von B, ist das ein Aufruf über `Contracts`,
kein Event. Events transportieren Geschehenes, keine Fragen.

---

## Kombinationen

| Kombination | Bewertung |
|---|---|
| CRUD + CQRS-Stufe 1 für Reporting | Der häufigste sinnvolle Zuschnitt |
| CQRS ohne Event Sourcing | Völlig üblich und meist richtig |
| Event Sourcing ohne CQRS | Praktisch unmöglich |
| Event-Driven ohne Event Sourcing | Üblich — Events als Integration, Zustand klassisch gespeichert |
| CQRS Stufe 3/4 ohne Messwert | Warnzeichen — Komplexität ohne Beleg |
