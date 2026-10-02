'use strict';

const { placeKey, isHeaderKey, collapse } = require('./places');

const SPEC_CATEGORIES = {
  widerspruch: 'red', 'fehlendes-verhalten': 'red', unerfuellbar: 'red', detail: 'yellow', formulierung: 'green',
};
const CATEGORIES = {
  'spec-review': SPEC_CATEGORIES,
  'plan-review': { ...SPEC_CATEGORIES, 'ac-fehlt-im-plan': 'red', 'umsetzer-steckt-fest': 'red' },
};
const REQUIRED_FIELDS = ['location', 'quote', 'category', 'consequence', 'rationale'];
const COLOR_FIELDS = ['severity', 'color'];
const SPELLING_WORDS = /(?<!\p{L})(?:Großschreibung|Kleinschreibung|ß|Umlaut|Diakritik)(?!\p{L})/u;

function isReview(review) {
  return Object.hasOwn(CATEGORIES, review);
}

function findingProblem(finding, review) {
  if (finding === null || typeof finding !== 'object' || Array.isArray(finding)) return 'Finding ist kein Objekt';
  const where = String(finding.location ?? '?');
  if (COLOR_FIELDS.some((field) => Object.hasOwn(finding, field))) return `Farbe im Finding: ${where}`;
  const missing = REQUIRED_FIELDS.find((field) => typeof finding[field] !== 'string' || finding[field].trim() === '');
  if (missing) return `Pflichtfeld fehlt: ${missing} (${where})`;
  if (!Object.hasOwn(CATEGORIES[review], finding.category)) return `Kategorie unbekannt: ${finding.category} (${where})`;
  return null;
}

function resultProblem(result, review, name) {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) return 'Ergebnis ist kein JSON-Objekt';
  if (result.reviewer !== name) return `reviewer passt nicht zum Dateinamen: ${result.reviewer}`;
  if (!Array.isArray(result.findings)) return 'findings fehlt';
  return result.findings.map((finding) => findingProblem(finding, review)).find(Boolean) ?? null;
}

function isSpellingFinding(finding) {
  return Object.values(finding).some((value) => typeof value === 'string' && SPELLING_WORDS.test(value));
}

function isQuoteFromWEntry(quote, wEntries) {
  const needle = collapse(quote);
  return needle !== '' && wEntries.some((entry) => collapse(entry).includes(needle));
}

function isOutsideChecklist(finding, place, context) {
  if (context.phase !== 'nachpruefung' || context.checklistKeys.has(place.key)) return false;
  return !(finding.category === 'widerspruch' && context.changedKeys.has(place.key));
}

function capsAtYellow(finding, place, context) {
  return context.advisory.has(context.reviewer)
    || isQuoteFromWEntry(finding.quote, context.wEntries)
    || isSpellingFinding(finding)
    || isOutsideChecklist(finding, place, context);
}

// Farbe eines gültigen Findings der KI an seiner Stelle; `dropped` nennt den Grund, wenn es entfällt.
function rateFinding(finding, place, context) {
  if (isHeaderKey(placeKey(finding.location))) return { color: null, dropped: 'Kopfzeile' };
  if (context.openKeys.has(place.key)) return { color: null, dropped: 'offene Frage' };
  const color = CATEGORIES[context.review][finding.category];
  const capped = color === 'red' && capsAtYellow(finding, place, context);
  return { color: capped ? 'yellow' : color, dropped: null };
}

module.exports = { CATEGORIES, isReview, findingProblem, resultProblem, rateFinding };
