'use strict';

const fs = require('node:fs');

function orderTotal(positions) {
  return positions.reduce((sum, position) => sum + position.quantity * position.unitPriceCents, 0);
}

function loadPositions(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

module.exports = { orderTotal, loadPositions };
