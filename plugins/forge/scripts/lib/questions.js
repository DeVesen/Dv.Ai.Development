'use strict';

const { placeKey, decisionLines } = require('./places');

const R_QUESTION = /^- \*\*(R\d+) · (.+?)\*\* — frage an den menschen — (.*)$/;
const W_ENTRY = /^- \*\*W · (.+?)\*\*(.*)$/;
const R_NUMBER = /^- \*\*R(\d+) · /;
const PLACE_EDGE = '[\\p{L}\\p{N}_-]';
const TEXT_FIELDS = ['rule', 'question', 'recommendation'];

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleNamesPlace(title, place) {
  return new RegExp(`(?<!${PLACE_EDGE})${escapeRegex(place)}(?!${PLACE_EDGE})`, 'u').test(title);
}

// Schreibwerkzeuge machen aus “…” gern "…" oder „…”; jede dieser Formen nennt den R-Eintrag.
function textNamesEntry(text, id, place) {
  return new RegExp(`["„]${escapeRegex(`${id} · ${place}`)}["“”]`, 'u').test(text);
}

function wEntries(lines) {
  return lines.map((line) => W_ENTRY.exec(line)).filter(Boolean).map(([, title, text]) => ({ title, text }));
}

function isAnswered(question, entries) {
  return entries.some((entry) => titleNamesPlace(entry.title, question.place) && textNamesEntry(entry.text, question.id, question.place));
}

function openQuestions(text) {
  const lines = decisionLines(text);
  const entries = wEntries(lines);
  return lines.map((line) => R_QUESTION.exec(line)).filter(Boolean)
    .map(([, id, place, question]) => ({ id, place, key: placeKey(place), question }))
    .filter((question) => !isAnswered(question, entries));
}

// Offene Fragen aus dem Dokument zählen nur im Spec-Review; Spec-Rückfragen früherer Läufe wertet das Plan-Review nicht aus.
function documentQuestions(options, text) {
  return options.review === 'spec-review' ? openQuestions(text) : [];
}

function wEntryLines(text) {
  return decisionLines(text).filter((line) => W_ENTRY.test(line));
}

function nextEntryNumber(text) {
  const numbers = decisionLines(text).map((line) => R_NUMBER.exec(line)).filter(Boolean).map((match) => Number(match[1]));
  return Math.max(0, ...numbers) + 1;
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isFilledList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isFilledText);
}

function bundleShapeProblem(bundle, index) {
  if (bundle === null || typeof bundle !== 'object') return `Frage ${index + 1} ist kein Objekt`;
  const missing = TEXT_FIELDS.find((field) => !isFilledText(bundle[field]));
  if (missing) return `Frage ${index + 1}: ${missing} fehlt`;
  if (!isFilledList(bundle.places)) return `Frage ${index + 1}: places fehlt`;
  if (!isFilledList(bundle.cases)) return `Frage ${index + 1}: cases fehlt`;
  return null;
}

// Jede Stelle mit Frage steht in genau einer gebündelten Frage.
function bundleProblem(bundles, questionKeys) {
  const named = bundles.flatMap((bundle) => bundle.places.map(placeKey));
  const count = (key) => named.filter((item) => item === key).length;
  const missing = questionKeys.filter((key) => count(key) === 0);
  if (missing.length > 0) return `Stelle fehlt in den Fragen: ${missing.join(', ')}`;
  const doubled = questionKeys.filter((key) => count(key) > 1);
  return doubled.length > 0 ? `Stelle doppelt in den Fragen: ${doubled.join(', ')}` : null;
}

function renderBundle(bundle, index) {
  return [
    `**Frage ${index + 1} — ${bundle.rule}**`,
    bundle.question,
    `Stellen: ${bundle.places.join(', ')}`,
    `Unterfälle: ${bundle.cases.join(' ')}`,
    `Empfehlung: ${bundle.recommendation}`,
  ].join('\n');
}

function renderQuestions(bundles) {
  return ['### Fragen an den Menschen', ...bundles.map(renderBundle)].join('\n\n');
}

module.exports = {
  titleNamesPlace, openQuestions, documentQuestions, wEntryLines, nextEntryNumber, bundleShapeProblem, bundleProblem, renderQuestions,
};
