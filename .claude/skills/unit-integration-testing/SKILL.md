---
name: unit-integration-testing
description: >
  Use when writing or reviewing unit or integration tests: naming test projects,
  classes, or methods; structuring test bodies with Arrange-Act-Assert; applying
  general testing best practices. Triggers: @unit-integration-testing, test naming,
  AAA pattern, unit test, integration test, Testprojekt, Testklasse, Testmethode,
  Arrange Act Assert, UnitTests, IntegrationTests.
  Opt-out: ohne unit-integration-testing.
---

# Unit & Integration Testing

Konventionen gelten sprachübergreifend — Beispiele in C#.
Für JavaScript/TypeScript: [references/js-ts.md](references/js-ts.md)

---

## Projekt-Naming

Trennung von Unit- und Integrationstests ist Pflicht — unterschiedliche CI-Anforderungen.

| Typ | Projekt-Suffix | Beispiel |
|-----|---------------|---------|
| Unit | `.UnitTests` | `Acme.OrderService.UnitTests` |
| Integration | `.IntegrationTests` | `Acme.OrderService.IntegrationTests` |

Unit-Testprojekte dürfen keine Infrastruktur-Pakete referenzieren (kein EF Core, kein HttpClient).

---

## Klassen-Naming

```
[Klasse]Tests
```

Bei vielen Methoden: Nested Classes als Gruppierung nach Methoden-Name.

```csharp
public class OrderServiceTests
{
    public class PlaceOrder { ... }
    public class CancelOrder { ... }
}
```

---

## Methoden-Naming — Convention A

```
[Methode]_[Situation]_[ErwartetesErgebnis]
```

```csharp
PlaceOrder_ValidOrder_ReturnsOrderId()
PlaceOrder_OutOfStockItem_ThrowsInsufficientStockException()
CalculateTotal_AppliedDiscount_ReducesTotalByPercentage()
ValidateEmail_EmptyString_ReturnsFalse()
```

Konvention einmal festlegen, dann im gesamten Projekt konsequent durchhalten.

---

## AAA-Aufbau

Drei Phasen, durch Kommentar-Blöcke getrennt, Leerzeile zwischen den Blöcken.

```csharp
[Fact]
public void PlaceOrder_ValidOrder_ReturnsOrderId()
{
    // Arrange
    var repository = new InMemoryOrderRepository();
    var service    = new OrderService(repository);
    var order      = new Order(customerId: 42, items: [new OrderItem("SKU-1", qty: 2)]);

    // Act
    var result = service.PlaceOrder(order);

    // Assert
    Assert.NotNull(result.OrderId);
    Assert.Equal(OrderStatus.Confirmed, result.Status);
}
```

**Exception-Tests:** `Act` und `Assert` dürfen zusammenstehen.

```csharp
// Act & Assert
Assert.Throws<InsufficientStockException>(() => service.PlaceOrder(order));
```

**Act ist genau eine Zeile.** Mehr Zeilen = zu viel auf einmal getestet.

---

## Leitsätze

- **Ein Test, eine Behauptung.** Mehrere Asserts nur wenn sie zusammen ein einziges Verhalten prüfen.
- **Tests sind unabhängig.** Reihenfolge darf keine Rolle spielen — kein geteilter Zustand.
- **Lesbarkeit > Kürze.** Test-Code darf duplizieren; kleine Factories ja, abstrakte Basis-Klassen mit Logik nein.
- **Verhalten testen, nicht Implementierung.** Öffentliche API ist die Testoberfläche — interne Methoden nicht direkt ansteuern.
- **Integrationstests brauchen Cleanup.** DB-Zustand nach jedem Test zurücksetzen (Transaction-Rollback oder TestContainers-Neustart).
- **Keine geteilte Infrastruktur zwischen Tests.** Nie gegen geteilte Daten testen.

---

## Verweise

| Thema | Datei |
|-------|-------|
| JavaScript / TypeScript — `describe`/`it`-Hierarchie als Naming-Ersatz | [references/js-ts.md](references/js-ts.md) |
