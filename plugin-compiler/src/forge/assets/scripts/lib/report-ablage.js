'use strict';

// Ablage-Ordner, den prepare.js für den Lauf im Arbeitsbereich festgelegt hat (kontext.json): Reviews und Followups
// bekommen Etappe und Ablage nie aus einem Parameter.

const path = require('node:path');
const { FlowError } = require('./flow-error');
const { readContext } = require('../workspace');

function ablageOf(workspace) {
  const { ablage } = readContext(workspace);
  if (typeof ablage !== 'string' || ablage === '') throw new FlowError('Ablage fehlt im Arbeitsbereich: prepare.js legt sie in kontext.json fest');
  return path.resolve(ablage);
}

module.exports = { ablageOf };
