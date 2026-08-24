# JavaScript / TypeScript — Naming & Struktur

In JS/TS übernimmt die `describe`/`it`-Hierarchie die Rolle des Methoden-Namings.
Convention A (`Methode_Situation_Ergebnis`) entfällt — der Kontext ergibt sich aus der Verschachtelung.

---

## Struktur

```
describe('[Klasse / Modul]')
  describe('[Methode / Feature]')
    it('[Situation → erwartetes Ergebnis]')
```

Der `it`-Text beantwortet: *Was passiert in dieser Situation?*

---

## Beispiel (Jest / Vitest)

```typescript
describe('OrderService', () => {
  describe('placeOrder', () => {
    it('returns an order ID for a valid order', () => {
      // Arrange
      const repository = new InMemoryOrderRepository();
      const service    = new OrderService(repository);
      const order      = { customerId: 42, items: [{ sku: 'SKU-1', qty: 2 }] };

      // Act
      const result = service.placeOrder(order);

      // Assert
      expect(result.orderId).toBeDefined();
    });

    it('throws InsufficientStockException for an out-of-stock item', () => {
      // Arrange
      const service = new OrderService(new AlwaysOutOfStockRepository());
      const order   = { customerId: 1, items: [{ sku: 'SKU-X', qty: 1 }] };

      // Act & Assert
      expect(() => service.placeOrder(order)).toThrow(InsufficientStockException);
    });
  });
});
```

---

## Gegenüberstellung

| Aspekt | C# (Convention A) | JS/TS (`describe`/`it`) |
|--------|------------------|------------------------|
| Methoden-Kontext | im Methoden-Namen kodiert | `describe`-Ebene |
| Situation | `_[Situation]_` | `describe` oder `it`-Text |
| Ergebnis | `_[ErwartetesErgebnis]` | `it`-Text |
| AAA im Test-Body | `// Arrange / Act / Assert` | identisch |

**AAA-Kommentare gelten auch in JS/TS** — der Aufbau des Test-Bodies ist identisch.

---

## Projekt-Naming

JavaScript/TypeScript-Projekte trennen Unit- und Integrationstests üblicherweise durch Ordner oder Datei-Suffix:

```
tests/
├── unit/
│   └── order-service.test.ts
└── integration/
    └── order-service.integration.test.ts
```

Alternativ konfiguriert das Test-Framework (Jest `projects`, Vitest `workspace`) separate Läufe.
