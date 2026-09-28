'use strict';

// Regelwerk des Spec- und Plan-Reviews: Die KI nennt die Kategorie, dieses Modul leitet Farbe, Herabstufung und Verwerfen ab.
const CATEGORY_COLOR = {
  widerspruch: 'red',
  'fehlendes-verhalten': 'red',
  unerfuellbar: 'red',
  'ac-fehlt-im-plan': 'red',
  'umsetzer-steckt-fest': 'red',
  detail: 'yellow',
  formulierung: 'green',
};
const SHARED_CATEGORIES = ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'detail', 'formulierung'];
const CATEGORIES = {
  'spec-review': SHARED_CATEGORIES,
  'plan-review': [...SHARED_CATEGORIES, 'ac-fehlt-im-plan', 'umsetzer-steckt-fest'],
};
// Beratende Reviewer je Review; keiner ist beratend, solange ein Review keinen nennt.
const ADVISORY = { 'spec-review': [], 'plan-review': [] };
const REQUIRED_FIELDS = ['location', 'quote', 'category', 'consequence', 'rationale'];
const COLOR_FIELDS = ['severity', 'color'];
const SPELLING_WORDS = ['Großschreibung', 'Kleinschreibung', 'ß', 'Umlaut', 'Diakritik'];
const COLOR_RANK = { green: 1, yellow: 2, red: 3 };
const COLOR_ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
const SCRIPT_CATEGORY = 'skript-pruefung';

function isText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function findingProblem(finding, kind) {
  if (finding === null || typeof finding !== 'object' || Array.isArray(finding)) return 'Finding ist kein Objekt';
  const where = isText(finding.location) ? finding.location.trim() : '?';
  const color = COLOR_FIELDS.find((field) => Object.hasOwn(finding, field));
  if (color) return `Finding an ${where} nennt eine Farbe (${color})`;
  const missing = REQUIRED_FIELDS.find((field) => !isText(finding[field]));
  if (missing) return `Finding an ${where} ohne Pflichtfeld ${missing}`;
  if (!CATEGORIES[kind].includes(finding.category)) return `Finding an ${where} hat eine unbekannte Kategorie: ${finding.category}`;
  return null;
}

// Grund, warum ein Reviewer-Ergebnis ungültig ist, oder null.
function reviewProblem(review, kind, name) {
  if (review === null || typeof review !== 'object' || Array.isArray(review)) return 'Ergebnis ist kein JSON-Objekt';
  if (review.reviewer !== name) return `reviewer ${String(review.reviewer)} passt nicht zu ${name}`;
  if (review.summary !== undefined && typeof review.summary !== 'string') return 'summary ist kein Text';
  if (!Array.isArray(review.findings)) return 'findings fehlt';
  for (const finding of review.findings) {
    const problem = findingProblem(finding, kind);
    if (problem) return problem;
  }
  return null;
}

function hasWholeWord(text, word) {
  return new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'u').test(String(text));
}

function mentionsSpelling(finding) {
  return REQUIRED_FIELDS.some((field) => SPELLING_WORDS.some((word) => hasWholeWord(finding[field], word)));
}

// ctx: { advisory, openKeys, quoteFromW(quote), verification: { checklist, changed } | null }; Mengen mit kanonischen Stellen.
function rateFinding(finding, reviewer, unit, ctx) {
  const script = finding.category === SCRIPT_CATEGORY;
  if (!script && unit.kind === 'header') return { dropped: 'Kopfzeile' };
  if (!script && ctx.openKeys.has(unit.canon)) return { dropped: 'offene Frage' };
  if (script) return { color: 'red', capped: [] };
  const capped = [];
  if (ctx.advisory.includes(reviewer)) capped.push('beratend');
  if (ctx.quoteFromW(finding.quote)) capped.push('Zitat aus W-Eintrag');
  if (mentionsSpelling(finding)) capped.push('Schreibweise');
  const verification = ctx.verification;
  const contradictionInChange = finding.category === 'widerspruch' && verification?.changed.has(unit.canon);
  if (verification && !verification.checklist.has(unit.canon) && !contradictionInChange) capped.push('außerhalb der Prüfliste');
  const color = CATEGORY_COLOR[finding.category];
  return { color: color === 'red' && capped.length > 0 ? 'yellow' : color, capped };
}

module.exports = {
  CATEGORY_COLOR, CATEGORIES, ADVISORY, COLOR_RANK, COLOR_ICON, SCRIPT_CATEGORY, reviewProblem, findingProblem, mentionsSpelling, rateFinding,
};
