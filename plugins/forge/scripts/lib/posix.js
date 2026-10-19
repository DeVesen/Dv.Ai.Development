'use strict';

const path = require('node:path');

function toPosix(value) {
  return String(value).replace(/\\/g, '/');
}

// Vergleichsschlüssel für Pfade: absolut, mit `/`, auf Windows kleingeschrieben; ohne Symlink-Auflösung.
function normalizePath(value) {
  const resolved = toPosix(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

module.exports = { toPosix, normalizePath };
