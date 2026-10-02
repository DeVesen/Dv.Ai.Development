'use strict';

const { placeKey, decisionLines } = require('./places');
const { readText } = require('./flow-files');
const { plainProblem } = require('./plain-text');
const { isKnownReviewer } = require('./reviewer-names');

const R_QUESTION = /^- \*\*(R\d+) · (.+?)\*\* — frage an den menschen — (.*)$/;
const W_ENTRY = /^- \*\*W · (.+?)\*\*(.*)$/;
const R_NUMBER = /^- \*\*R(\d+) · /;
const PLACE_EDGE = '[\\p{L}\\p{N}_-]';
const PLAIN_FIELDS = ['title', 'affects', 'why', 'reason'];
const OPTION_LABELS = ['a', 'b', 'c', 'd'];

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

// Geltende W-Einträge: die des Dokuments plus, falls angegeben, die der Spec.
function wEntriesOf(options) {
  const spec = options.spec ? wEntryLines(readText(options.spec)) : [];
  return [...wEntryLines(readText(options.doc)), ...spec];
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

function optionProblem(option, index, at) {
  if (option === null || typeof option !== 'object') return `${at}: options[${index}] ist kein Objekt`;
  if (option.label !== OPTION_LABELS[index]) return `${at}: Labels der options müssen a, b, … lückenlos sein`;
  const field = ['text', 'consequence'].find((name) => plainProblem(option[name]));
  return field ? `${at}: options[${index}].${field}: ${plainProblem(option[field])}` : null;
}

function optionsProblem(options, at) {
  if (!Array.isArray(options) || options.length < 2 || options.length > OPTION_LABELS.length) return `${at}: options braucht 2 bis 4 Einträge`;
  return options.map((option, index) => optionProblem(option, index, at)).find(Boolean) ?? null;
}

function reviewersProblem(reviewers, at) {
  if (!isFilledList(reviewers)) return `${at}: reviewers fehlt`;
  const unknown = reviewers.find((name) => !isKnownReviewer('spec-review', name));
  return unknown ? `${at}: Reviewer unbekannt: ${unknown}` : null;
}

function bundleShapeProblem(bundle, index) {
  const at = `Frage ${index + 1}`;
  if (bundle === null || typeof bundle !== 'object') return `${at} ist kein Objekt`;
  if (Object.hasOwn(bundle, 'cases')) return 'rework.json im alten Format (cases); Lauf neu starten';
  const missing = PLAIN_FIELDS.find((field) => !isFilledText(bundle[field]));
  if (missing) return `${at}: ${missing} fehlt`;
  if (!isFilledList(bundle.places)) return `${at}: places fehlt`;
  const plain = PLAIN_FIELDS.find((field) => plainProblem(bundle[field]));
  if (plain) return `${at}: ${plain}: ${plainProblem(bundle[plain])}`;
  const problem = reviewersProblem(bundle.reviewers, at) ?? optionsProblem(bundle.options, at);
  if (problem) return problem;
  return bundle.options.some((option) => option.label === bundle.recommendation) ? null : `${at}: recommendation passt zu keiner Option`;
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

module.exports = {
  titleNamesPlace, openQuestions, documentQuestions, wEntryLines, wEntriesOf, nextEntryNumber, bundleShapeProblem, bundleProblem,
};
