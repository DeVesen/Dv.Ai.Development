# Bestellsumme — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Summe, Anzeigetext und Laden von Bestellpositionen als drei kleine Node-Module.
**Architektur:** Je Verantwortung eine Datei unter `src/`, je Datei ein Test unter `tests/`. Keine Abhängigkeiten.
**Tech-Stack:** Node.js 24, CommonJS, `node:test`.
**Spec:** `docs/forge/2026-09-25-order-total/spec.md`

## Global Constraints
- Beträge werden als ganze Cent verarbeitet.
- Keine externen Abhängigkeiten, kein `package.json`.
- Testbefehl: `node --test` im Repo-Root.

---

### Task 1: Summe berechnen

**ACs:** AC-01, AC-02

**Dateien:**
- Create: `src/order-total.js`
- Test: `tests/order-total.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `orderTotal(positions: Array<{ quantity: number, unitPriceCents: number }>): number`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { orderTotal } = require('../src/order-total.js');

test('orderTotal_TwoPositions_ReturnsSumInCents', () => {
  assert.equal(orderTotal([{ quantity: 2, unitPriceCents: 150 }, { quantity: 1, unitPriceCents: 99 }]), 399);
});

test('orderTotal_NegativeQuantity_Throws', () => {
  assert.throws(() => orderTotal([{ quantity: -1, unitPriceCents: 100 }]), /Menge darf nicht negativ sein/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/order-total.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

function orderTotal(positions) {
  for (const position of positions) {
    if (position.quantity < 0) throw new Error('Menge darf nicht negativ sein');
  }
  return positions.reduce((sum, position) => sum + position.quantity * position.unitPriceCents, 0);
}

module.exports = { orderTotal };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/order-total.js tests/order-total.test.js` · `git commit -m "feat: order total in cents"`

### Task 2: Summe formatieren

**ACs:** AC-03

**Dateien:**
- Create: `src/format-total.js`
- Test: `tests/format-total.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `formatTotal(cents: number): string`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTotal } = require('../src/format-total.js');

test('formatTotal_399Cents_ReturnsEuroText', () => {
  assert.equal(formatTotal(399), '3,99 €');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/format-total.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

function formatTotal(cents) {
  const euros = Math.trunc(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${euros},${rest} €`;
}

module.exports = { formatTotal };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/format-total.js tests/format-total.test.js` · `git commit -m "feat: format total as euro text"`

### Task 3: Positionen laden

**ACs:** AC-04

**Dateien:**
- Create: `src/load-positions.js`
- Test: `tests/load-positions.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `loadPositions(filePath: string): Array<{ quantity: number, unitPriceCents: number }>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPositions } = require('../src/load-positions.js');

test('loadPositions_MissingFile_ThrowsWithPath', () => {
  assert.throws(() => loadPositions('fehlt.json'), /Positionen nicht lesbar: fehlt\.json/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/load-positions.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

const fs = require('node:fs');

function loadPositions(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Positionen nicht lesbar: ${filePath}`, { cause: error });
  }
}

module.exports = { loadPositions };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/load-positions.js tests/load-positions.test.js` · `git commit -m "feat: load positions from json file"`

## Entscheidungen
- **W · Eine Datei je Verantwortung** · Mensch — Summe, Format und Laden liegen in getrennten Dateien.
