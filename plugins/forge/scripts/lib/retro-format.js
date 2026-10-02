'use strict';

// Anzeigeformat von Zahlen in Fakten, Snapshot und Kurzfassung.

const THOUSAND = 1000;

// Tokens in Tausend, gerundet: eine Schreibweise für Fakten, Snapshot und Kurzfassung.
function thousands(value) {
  return `${Math.round(value / THOUSAND)}k`;
}

module.exports = { thousands };
