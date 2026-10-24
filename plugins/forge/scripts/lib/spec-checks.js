'use strict';

const { lintSpec } = require('./spec-lint');

// Skript-Prüfung des Spec-Reviews: das Spec-Format aus spec-lint.js.
// Formfehler im Inhalt sind 🔴, weil Plan und Review die Spec danach zerlegen; Kopfzeilen und Warnungen sind 🟡 Kandidaten,
// denn die Nacharbeit ändert den Kopf nicht und eine Heuristik soll nie allein blockieren.
function isBlocking(entry) {
  return entry.severity === 'fehler' && !entry.rule.startsWith('kopf-') && entry.rule !== 'titel';
}

function specFormatFindings(text) {
  return lintSpec(text).issues.map((entry) => ({
    location: entry.location,
    quote: entry.quote,
    category: 'detail',
    consequence: entry.message,
    rationale: `Skript-Prüfung Spec-Format, Regel ${entry.rule}`,
    color: isBlocking(entry) ? 'red' : 'yellow',
  }));
}

const SPEC_CHECKS = [{ name: 'spec-format', run: (text) => specFormatFindings(text) }];

module.exports = { SPEC_CHECKS, specFormatFindings };
