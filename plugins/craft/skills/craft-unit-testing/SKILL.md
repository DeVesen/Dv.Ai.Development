---
name: craft-unit-testing
description: >
  Use when writing or reviewing unit tests, naming unit test projects/classes/methods,
  structuring test bodies with Arrange-Act-Assert, or applying TDD. Triggers:
  @craft-unit-testing, unit test naming, AAA pattern, Testklasse, Testmethode,
  Arrange Act Assert, UnitTests-Projekt, TDD, Three Laws of TDD, F.I.R.S.T.,
  describe it Jest Vitest.
  Opt-out: ohne craft-unit-testing.
---

# Unit Testing

Konventionen gelten sprachübergreifend — Beispiele in C#.
Für JavaScript/TypeScript: [references/js-ts.md](references/js-ts.md)
Für Integrationstests: Skill `craft-integration-testing`

---

## Projekt-Naming

| Typ | Projekt-Suffix | Beispiel |
|-----|---------------|---------|
| Unit | `.UnitTests` | `Acme.OrderService.UnitTests` |

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

---

## TDD — Die drei Gesetze

1. Kein Produktionscode, bevor nicht ein fehlschlagender Unit-Test existiert.
2. Nicht mehr Testcode schreiben, als nötig ist, um fehlzuschlagen (Compile-Fehler zählen als Fehlschlag).
3. Nicht mehr Produktionscode schreiben, als nötig ist, um den fehlschlagenden Test zu bestehen.

## F.I.R.S.T.

**F**ast, **I**ndependent, **R**epeatable, **S**elf-Validating, **T**imely.

---

## Verweise

| Thema | Datei |
|-------|-------|
| JavaScript / TypeScript — `describe`/`it`-Hierarchie als Naming-Ersatz | [references/js-ts.md](references/js-ts.md) |
| Integrationstest-Ergänzungen (Cleanup, Testinfrastruktur) | Skill `craft-integration-testing` |
| Clean-Code-Detailregeln für Testcode (Naming, Comments) | Skill `craft-clean-code` |

---

## Opt-out

`ohne craft-unit-testing` → Skill nicht laden.
