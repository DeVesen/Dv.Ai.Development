# Bestellstatus abfragen — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Kunden fragen über die HTTP-API den Status einer Bestellung ab.
**Architektur:** Eine neue Route ruft `OrderService.getStatus`. Der Service liest die Bestellung und fragt das Zahlungsdatum über `PaymentClient` beim Zahlungsdienst ab.
**Tech-Stack:** Node.js 24, `node:test`
**Spec:** `spec.md`

## Global Constraints
- Antwortzeit unter 2 Sekunden.
- Zahlungsdaten kommen vom externen Zahlungsdienst.

---

### Task 1: Statusabfrage im Service

**ACs:** AC-01, AC-03

**Dateien:**
- Modify: `src/orders/order-service.js:1-9` · `OrderService`
- Test: `test/orders/order-service.test.js`

**Interfaces:**
- Consumes: `PaymentClient.fetchPaidAt(orderId: string): Promise<string | null>` (aus Task 3a)
- Produces: `OrderService.getStatus(orderId: string): Promise<{ status: string, paidAt: string | null } | null>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { OrderService } = require('../../src/orders/order-service.js');

test('getStatus_PaidOrder_ReturnsStatusAndPaidAt', async () => {
  const payments = { fetchPaidAt: async () => '2026-09-01' };
  const service = new OrderService(payments);
  assert.deepEqual(await service.getStatus('A-1'), { status: 'bezahlt', paidAt: '2026-09-01' });
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/orders/order-service.test.js` — erwartet: FAIL mit „service.getStatus is not a function“
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

const fs = require('node:fs');

class OrderService {
  constructor(paymentClient) {
    this.paymentClient = paymentClient;
  }

  async getStatus(orderId) {
    const orders = JSON.parse(fs.readFileSync('data/orders.json', 'utf8'));
    const order = orders[orderId];
    if (!order) return null;
    const paidAt = order.status === 'bezahlt' ? await this.paymentClient.fetchPaidAt(orderId) : null;
    return { status: order.status, paidAt };
  }
}

module.exports = { OrderService };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/orders/order-service.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/orders/order-service.js test/orders/order-service.test.js` · `git commit -m "feat(orders): add status query"`

### Task 2: Route und unbekannte Bestellung

**ACs:** AC-02

**Dateien:**
- Modify: `src/http/routes.js:3-5` · `registerRoutes`
- Modify: `src/orders/order-cache.js:1-10` · `OrderCache`
- Test: `test/http/routes.test.js`

**Interfaces:**
- Consumes: `OrderService.getStatus(orderId: string)` (aus Task 1)
- Produces: Route `GET /orders/:id/status`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { registerRoutes } = require('../../src/http/routes.js');

test('statusRoute_UnknownOrder_Returns404WithMessage', async () => {
  const handlers = {};
  const app = { get: (route, handler) => { handlers[route] = handler; } };
  registerRoutes(app, { getStatus: async () => null });
  const response = { code: 0, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await handlers['/orders/:id/status']({ params: { id: 'X' } }, response);
  assert.equal(response.code, 404);
  assert.deepEqual(response.body, { message: 'Bestellung nicht gefunden' });
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/http/routes.test.js` — erwartet: FAIL
- [ ] **Schritt 3: Minimal implementieren**
  Route in `registerRoutes` ergänzen und das Ergebnis in `OrderCache` zwischenspeichern. Passende Fehlerbehandlung ergänzen.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/http/routes.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/http/routes.js src/orders/order-cache.js test/http/routes.test.js` · `git commit -m "feat(http): add order status route"`

### Task 3a: Zahlungsdienst-Client

**ACs:** AC-03

**Dateien:**
- Create: `src/payments/payment-client.js`
- Test: `test/payments/payment-client.test.js`

**Interfaces:**
- Consumes: —
- Produces: `PaymentClient.fetchPaidAt(orderId: string): Promise<string | null>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { PaymentClient } = require('../../src/payments/payment-client.js');

test('fetchPaidAt_PaidOrder_ReturnsDate', async () => {
  global.fetch = async () => ({ json: async () => ({ paidAt: '2026-09-01' }) });
  assert.equal(await new PaymentClient('http://pay').fetchPaidAt('A-1'), '2026-09-01');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test test/payments/payment-client.test.js` — erwartet: FAIL mit „Cannot find module“
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

class PaymentClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchPaidAt(orderId) {
    const response = await fetch(`${this.baseUrl}/payments/${orderId}`);
    const body = await response.json();
    return body.paidAt;
  }
}

module.exports = { PaymentClient };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test test/payments/payment-client.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add src/payments/payment-client.js test/payments/payment-client.test.js` · `git commit -m "feat(payments): add payment client"`

## Entscheidungen
- **W · Antwortformat** · Mensch — Die Route liefert JSON.
