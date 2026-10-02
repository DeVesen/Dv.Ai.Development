# Achse 2 — Deployment-Schnitt

Was ist eine Deploy-Einheit? Diese Achse kostet am meisten und ist am schwersten umkehrbar.

> Der **fachliche** Schnitt (Bounded Contexts) ist eine DDD-Frage und steht *vor* dieser Achse.
> Hier wird nur entschieden, ob aus einer Kontextgrenze eine Prozessgrenze wird.

---

## Monolith

Eine Deploy-Einheit, keine erzwungenen Modulgrenzen im Inneren.

| | |
|---|---|
| **Kosten** | Minimal — ein Build, ein Deployment, eine Datenbank, ein Log |
| **Preis** | Ohne Disziplin wächst der große Schlammball; jede Änderung kann alles treffen |
| **Sinnvoll bei** | Kleinen Anwendungen, unklarer Domäne, Prototypen, sehr kleinem Team |

---

## Modularer Monolith (Modulith)

Eine Deploy-Einheit, aber **harte Modulgrenzen im Code**. Empfohlener Default für die
meisten Geschäftsanwendungen.

| | |
|---|---|
| **Kosten** | Gering — Aufwand steckt in der Grenzdisziplin, nicht im Betrieb |
| **Preis** | Grenzen erodieren ohne maschinelle Prüfung |
| **Sinnvoll bei** | Erkennbaren Bounded Contexts, 1–3 Teams, einer Deploy-Kadenz |

**Was einen Modulith von einem Monolithen unterscheidet:**

| Regel | Umsetzung |
|-------|-----------|
| Modul A greift nicht auf Interna von B zu | Nur `Contracts`-Projekt ist öffentlich referenzierbar |
| Keine Fremdschlüssel über Modulgrenzen | Referenz als `CustomerId`-Wert, keine Navigation Property |
| Eigene Persistenzgrenze je Modul | Ein DB-Schema und ein `DbContext` pro Modul |
| Fachliche Reaktion statt Direktaufruf | In-Process Domain Events |
| Grenze ist geprüft, nicht dokumentiert | Architekturtest in der CI (z. B. ArchUnitNET, `eslint-plugin-boundaries`) |

Der letzte Punkt entscheidet. Eine Grenze, die nur im Wiki steht, ist in Wochen weg.

**Migrationspfad:** Ein sauberer Modulith lässt sich modulweise herauslösen. Genau das ist
sein Wert — die teure Entscheidung wird verschoben, nicht verbaut.

---

## Microservices

Ein Bounded Context = ein Prozess = ein Deployment = eine Datenbank.

| | |
|---|---|
| **Kosten** | Hoch und dauerhaft — Betrieb, Observability, Contract-Versionierung, verteiltes Debugging |
| **Preis** | Verteilte Transaktionen entfallen; Konsistenz wird eventual und damit fachlich sichtbar |
| **Sinnvoll bei** | Mehreren Teams, die unabhängig deployen müssen; stark unterschiedlichen Skalierungs- oder Verfügbarkeitsprofilen; harten Compliance-Trennungen |

**Valide Gründe:**

- Teams blockieren sich gegenseitig beim Release (organisatorisch, nicht technisch)
- Ein Teilsystem braucht eine völlig andere Skalierung oder Laufzeit
- Regulatorische oder mandantenbedingte Datentrennung erzwingt getrennte Systeme

**Keine validen Gründe:** „moderner", „skalierbar", „damit man später kann", „Microservices
sind Best Practice". Teamgröße unter zwei Teams reicht praktisch nie aus.

**Was mitgekauft wird:** API-Gateway, Service Discovery, verteiltes Tracing, Idempotenz,
Retry/Backoff, Outbox oder Saga für Konsistenz, Contract-Tests, mehrfache Deployment-Pipelines.

---

## Entscheidungsfrage

Nicht *„Monolith oder Microservices?"*, sondern:

> **Gibt es zwei Gruppen, die heute unabhängig voneinander deployen müssen — und tun sie es nicht, weil das Deployment sie daran hindert?**

Nein → Modulith. Ja → Schnitt entlang der Teamgrenze, nicht entlang jeder Kontextgrenze.

---

## Kurzvergleich

| | Monolith | Modulith | Microservices |
|---|---|---|---|
| Deploy-Einheiten | 1 | 1 | n |
| Betriebsaufwand | minimal | minimal | hoch |
| Grenzverletzung möglich | ja | nur bei fehlender CI-Prüfung | nein |
| Transaktionen | lokal | lokal | verteilt (Saga/Outbox) |
| Umkehrbar | — | ja, modulweise | teuer |
