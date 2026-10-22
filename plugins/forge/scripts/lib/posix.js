'use strict';

const fs = require('node:fs');
const path = require('node:path');

function toPosix(value) {
  return String(value).replace(/\\/g, '/');
}

// Vergleichsschlüssel für Pfade: absolut, mit `/`, auf Windows kleingeschrieben; ohne Symlink-Auflösung.
function normalizePath(value) {
  const resolved = toPosix(path.resolve(value));
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

// Echter Pfad (Windows: ohne 8.3-Kurznamen), damit Pfade aus git und aus Aufrufen vergleichbar sind. Fehlt der Pfad, gilt der
// echte Pfad des nächsten bestehenden Elternordners mit dem fehlenden Rest.
function realPath(value) {
  let existing = path.resolve(value);
  const missing = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return path.resolve(value);
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(fs.realpathSync.native(existing), ...missing);
}

module.exports = { toPosix, normalizePath, realPath };
