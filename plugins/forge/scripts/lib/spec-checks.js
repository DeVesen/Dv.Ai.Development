'use strict';

const path = require('node:path');
const { lintSpec } = require('./spec-lint');
const { glossarySources, glossaryFiles, discardedTerms, termFindings } = require('./glossary-terms');
const { getValue, ConfigError } = require('../forge-config');

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

// Zweite Skript-Prüfung, nur bei `Art: verankert` (eine fehlende Zeile gilt wie im Review als verankert): verworfene Synonyme des Glossars.
// Ohne Repo im Kontext, ohne Glossar oder ohne Spalte „Nicht verwenden“ gibt es keine Befunde.
function glossaryFindings(text, context) {
  const art = /^Art:[ \t]*(.*?)[ \t]*$/m.exec(text)?.[1] ?? 'verankert';
  if (art !== 'verankert' || !context?.repo) return [];
  let glossaryDir;
  try {
    glossaryDir = getValue('Glossar', context.repo);
  } catch (error) {
    if (error instanceof ConfigError) return [];
    throw error;
  }
  const files = glossarySources(context.repo, glossaryDir).flatMap(glossaryFiles);
  const source = files.map((file) => path.relative(context.repo, file).replace(/\\/g, '/')).join(', ');
  return termFindings(text, discardedTerms(files), source || 'Glossar');
}

const SPEC_CHECKS = [
  { name: 'spec-format', run: (text) => specFormatFindings(text) },
  { name: 'spec-terms', run: glossaryFindings },
];

module.exports = { SPEC_CHECKS, specFormatFindings, glossaryFindings };
