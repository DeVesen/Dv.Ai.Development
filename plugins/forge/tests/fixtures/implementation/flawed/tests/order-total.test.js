'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { orderTotal, loadPositions } = require('../src/order-total.js');

test('orderTotal_TwoPositions_ReturnsSumInCents', () => {
  assert.equal(orderTotal([{ quantity: 2, unitPriceCents: 150 }, { quantity: 1, unitPriceCents: 99 }]), 400);
});

test('loadPositions_MissingFile_Runs', () => {
  loadPositions('fehlt.json');
});
