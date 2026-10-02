# Domain-Driven Design (DDD)

> **Primat:** DDD-Sprache und Bounded-Context-Grenzen sind Architekturgesetz.
> Kein taktisches Prinzip (YAGNI, KISS) hebelt einen DDD-Schnitt aus.

---

## Ubiquitous Language

Die Sprache der Domäne **ist** der Code. Klassen, Methoden und Variablen tragen die Namen,
die Domain-Experten verwenden — ohne technisches Mapping dazwischen.

```csharp
// Schlecht: technische Benennung
class OrderProcessor { void Execute(Dto dto) { ... } }

// Gut: Domänensprache
class OrderFulfillment { void FulfillOrder(Order order) { ... } }
```

Wenn ein neues Domänenkonzept auftaucht: erst in die Ubiquitous Language aufnehmen, dann implementieren.

---

## Bounded Context

Eine explizite Grenze, innerhalb derer ein Domänenmodell eindeutig und konsistent gilt.
Dasselbe Wort kann in zwei Contexts eine andere Bedeutung haben — korrekt und gewollt.

**Merkmale:**
- Eigenes Domänenmodell — keine Durchgriffe in andere Contexts
- Eigene Persistenz oder Datenhaltung
- Kommunikation nach außen nur über definierte Schnittstellen (Anti-Corruption Layer, Events)

**Verbindung zu IOSP:** Bounded-Context-Grenzen sind IOSP auf Systemebene.
Integration zwischen Contexts = Integrationsmethode. Jeder Context selbst = geschlossene Operationseinheit.

---

## Strategische Muster

| Muster | Bedeutung |
|--------|-----------|
| **Bounded Context** | Explizite Modellgrenze |
| **Context Map** | Beziehungen und Abhängigkeiten zwischen Contexts dokumentieren |
| **Anti-Corruption Layer (ACL)** | Übersetzungsschicht an Bounded-Context-Grenze — schützt die Domänensprache |
| **Published Language** | Geteiltes Format für Context-zu-Context-Kommunikation (z.B. Events, DTOs) |
| **Shared Kernel** | Gemeinsam gepflegter Code-Kern zwischen zwei Contexts — sparsam einsetzen |

---

## Taktische Muster

### Entity

Hat eine **Identität** (ID), die sie über Zustandsänderungen hinweg eindeutig macht.

```csharp
public class Order
{
    public OrderId Id { get; }
    public OrderStatus Status { get; private set; }

    public void Confirm() { ... }
}
```

### Value Object

Keine eigene Identität — Gleichheit durch **Wert**, nicht durch Referenz. Immer immutable.

```csharp
public record Money(decimal Amount, Currency Currency);
```

Daumenregel: Wenn man ein Objekt kopieren kann, ohne die Bedeutung zu verlieren → Value Object.

### Aggregate

Eine Gruppe von Entities und Value Objects unter einer **Root Entity**.
Die Root kontrolliert den Zugriff auf alles innerhalb und schützt Invarianten.

```csharp
public class Order // Aggregate Root
{
    private readonly List<OrderLine> _lines = new();

    public void AddLine(Product product, Quantity quantity)
    {
        if (_lines.Count >= 50) throw new OrderLimitExceededException();
        _lines.Add(new OrderLine(product, quantity));
    }
}
```

**Regel:** Nur die Root wird von außen referenziert. Interne Objekte sind nicht direkt zugänglich.

**Verbindung zu IODA:** Die Aggregate Root ist die Integration-Methode ihres Kontexts — sie orchestriert,
die internen Entities und Value Objects sind die Operationen.

### Domain Event

Etwas ist in der Domäne passiert — ein Fakt, unveränderlich, Vergangenheitsform.

```csharp
public record OrderConfirmed(OrderId OrderId, DateTimeOffset ConfirmedAt);
public record PaymentReceived(OrderId OrderId, Money Amount, DateTimeOffset PaidAt);
```

Wann einsetzen: Wenn eine Zustandsänderung in einem Context andere Contexts informieren muss,
ohne direkte Kopplung.

**Verbindung zu PoMO:** Domain Events entkoppeln Contexts — kein Context kennt seinen Nachfolger.
Das ist PoMO auf Systemebene.

### Repository

Abstrahiert Persistenz für ein Aggregate. Spricht Domänensprache — kein SQL, keine Infrastruktur-Details.

```csharp
public interface IOrderRepository
{
    Task<Order?> FindById(OrderId id);
    Task Save(Order order);
}
```

**Regel:** Ein Repository pro Aggregate Root. Nicht für Value Objects oder nicht-root Entities.

**Verbindung zu Flow Design:** Repository = Provider-Rolle in Flow Design — dünne Adapter-Schicht,
keine Domänenlogik.

### Domain Service

Domänenlogik, die nicht natürlich zu einer Entity oder einem Value Object gehört.

```csharp
public class PricingService
{
    public Money CalculateOrderTotal(Order order, PricingPolicy policy) { ... }
}
```

Wann einsetzen: Wenn Logik mehrere Aggregates betrifft und in keinem natürlich „wohnt".

---

## DDD und die persönlichen Prinzipien

| DDD-Konzept | Verbindung |
|-------------|-----------|
| Ubiquitous Language | Direkte Entsprechung zu Persönliche Regel #1 — Lesbarkeit auf einen Blick |
| Bounded Context | IOSP auf Architekturebene — Context = geschlossene Operationseinheit |
| Aggregate Root | Integration-Component des Aggregats — orchestriert, rechnet nicht selbst |
| Domain Event | PoMO auf Systemebene — kein Context kennt seinen Nachfolger |
| Repository | Provider/Portal in Flow Design — dünne Adapter-Schicht |
| ACL | Guard an der Bounded-Context-Grenze — schützt Domänensprache vor Fremdmodellen |

---

## DDD in Angular und .NET

### Angular

| DDD-Konzept | Angular-Entsprechung |
|-------------|---------------------|
| Bounded Context | Feature-Modul (oder standalone Feature-Bereich) |
| Domain Service | Angular Service mit Domänenlogik (kein HTTP, kein State) |
| Repository | Service für HTTP-Kommunikation (Infrastructure-Ebene) |
| Application Service | Smart Component oder dedizierter Facade-Service |
| Integration-Component | Smart Component — orchestriert, keine eigene Render-Logik |
| Leaf-Component | Presentation Component — rendert, keine Domänenlogik |

### .NET

| Ebene | Inhalt |
|-------|--------|
| **Domain** | Entities, Aggregates, Value Objects, Domain Events, Repository-Interfaces, Domain Services |
| **Application** | Use Cases / Application Services — orchestrieren Domain-Objekte, kein Infrastruktur-Wissen |
| **Infrastructure** | Repository-Implementierungen, externe Adapter, ACL, EF Core Mappings |
| **Presentation** | Controller, Minimal API Endpoints — dünn, delegieren an Application |

Projekte/Assemblies nach Bounded Context schneiden, nicht nach technischer Ebene.
