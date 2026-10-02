# Achse 1 — Layering

Wie verlaufen Abhängigkeiten innerhalb einer Deploy-Einheit?

> Diese Achse ist unabhängig von Deployment und Data-Flow.
> Ein Modulith kann hexagonal sein, ein Microservice layered.

---

## Layered (klassische Schichten)

```
Presentation → Application → Domain → Infrastructure
```

Abhängigkeiten zeigen nach unten. Die Domäne kennt die Datenbank.

| | |
|---|---|
| **Kernidee** | Technische Schichtung, jede Schicht ruft nur die darunter |
| **Kosten** | Sehr niedrig — jeder kennt es, kein Mapping-Overhead |
| **Preis** | Domäne hängt am Persistenz-Framework; Domänentests brauchen DB oder Mocks |
| **Sinnvoll bei** | CRUD-lastigen Anwendungen mit wenig Regeln, kurzer Lebensdauer, kleinem Team |
| **Kennzeichen im Code** | Ordner `Controllers/`, `Services/`, `Repositories/`; Entity-Klassen mit EF-Attributen, die auch die Domäne sind |

**Kein Antipattern.** Bei dünnem Fachmodell ist EF Core bereits Unit of Work + Repository —
eine zusätzliche Abstraktion darüber ist dann Zeremonie.

---

## Onion

Layered umgedreht: Abhängigkeiten zeigen **nach innen**, zur Domäne.

```
Infrastructure → Application → Domain
                 (Domain kennt niemanden)
```

Repository-*Interfaces* liegen in der Domäne, die *Implementierung* außen.
Umsetzung per Dependency Inversion (DIP).

| | |
|---|---|
| **Kernidee** | Domäne im Zentrum, alles Technische zeigt auf sie |
| **Kosten** | Niedrig bis mittel — ein Projekt mehr, Interface-Definitionen |
| **Preis** | Interfaces, die nur ein `DbSet<T>` durchreichen, erfüllen DIP formal und verletzen es faktisch |
| **Sinnvoll bei** | Fachmodell mit echten Regeln, das ohne Infrastruktur testbar sein soll |
| **Kennzeichen im Code** | `Domain` hat null Package-Referenzen; `IOrderRepository` in `Domain`, `OrderRepository` in `Infrastructure` |

---

## Clean Architecture (Martin)

Onion plus explizite Use-Case-Ebene und die **Dependency Rule**:
Quellcode-Abhängigkeiten zeigen ausschließlich nach innen.

```
Frameworks → Interface Adapters → Use Cases → Entities
```

| | |
|---|---|
| **Kernidee** | Onion + benannter Use Case als eigene Einheit (`ApproveInvoice`, `CancelOrder`) |
| **Kosten** | Mittel — mehr Klassen, Input-/Output-Ports, DTO-Mapping an jeder Grenze |
| **Preis** | Bei CRUD wird jeder Vorgang zu vier Dateien ohne Erkenntnisgewinn |
| **Sinnvoll bei** | Vielen unterscheidbaren Anwendungsfällen mit eigener Autorisierung/Validierung |
| **Kennzeichen im Code** | Eine Klasse pro Use Case statt Service-Klassen mit 40 Methoden |

Der Use-Case-Schritt allein — Logik aus Controllern in benannte Handler ziehen —
bringt den Großteil des Nutzens zu einem Bruchteil der Kosten. Guter erster Schritt
bei Bestandssystemen, unabhängig davon, ob der Rest je folgt.

---

## Hexagonal / Ports & Adapters (Cockburn)

Gleiche Abhängigkeitsrichtung wie Onion, andere Betonung: die Domäne hat **Ports**
(Schnittstellen), außen sitzen austauschbare **Adapter**.

```
Driving Adapter (REST, CLI, Test) → Port → Domäne → Port → Driven Adapter (DB, SMTP, ERP)
```

| | |
|---|---|
| **Kernidee** | Symmetrie — die HTTP-API ist kein Sonderfall, sondern ein Adapter wie jeder andere |
| **Kosten** | Mittel |
| **Preis** | Port-Inflation: ein Port ohne zweiten realen Adapter ist tote Abstraktion |
| **Sinnvoll bei** | Mehreren echten Ein-/Ausgängen: REST + Message Queue + Batch, oder austauschbaren Fremdsystemen |
| **Kennzeichen im Code** | Ordner `Adapters/In`, `Adapters/Out`; Domäne testbar ohne jeden Adapter |

**Faustregel:** Port nur dort, wo ein zweiter Adapter existiert oder absehbar ist —
Fremdsysteme, Mail, Zahlung, Dateiablage. Für die eigene Datenbank erst, wenn sie
tatsächlich ausgetauscht oder wegtestbar sein soll.

Onion, Clean und Hexagonal sind **Varianten derselben Idee** (Abhängigkeiten nach innen).
Sie in einem Projekt zu vermischen ist kein Fehler; sie als drei konkurrierende
Entscheidungen zu behandeln schon.

---

## Vertical Slice

Quer zu allen dreien: Schnitt nach **Feature**, nicht nach technischer Schicht.
Request, Handler, Validierung, Persistenzzugriff und Response eines Vorgangs liegen in *einem* Ordner.

| | |
|---|---|
| **Kernidee** | Änderungen sind lokal — ein Feature, ein Ordner |
| **Kosten** | Niedrig |
| **Preis** | Duplikation zwischen Slices; ohne Disziplin driften ähnliche Slices auseinander |
| **Sinnvoll bei** | Vielen unabhängigen Features, parallel arbeitenden Entwicklern |
| **Kennzeichen im Code** | `Features/Orders/CancelOrder/{Command,Handler,Validator,Endpoint}.cs` |

Kombinierbar mit Onion/Clean/Hexagonal: der Slice ist die Ordnung *innerhalb* eines Moduls,
die Abhängigkeitsrichtung bleibt davon unberührt.

---

## Kurzvergleich

| Stil | Domäne kennt Infrastruktur | Mehraufwand | Bester Anlass |
|------|---------------------------|-------------|---------------|
| Layered | ja | keiner | dünnes Fachmodell |
| Onion | nein | gering | testbare Domänenregeln |
| Clean | nein | mittel | viele Use Cases |
| Hexagonal | nein | mittel | mehrere reale Adapter |
| Vertical Slice | orthogonal | gering | viele parallele Features |
