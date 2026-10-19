'use strict';

// Führt die Berichtsdaten eines eingebetteten Reviews und seines Followups (JSON aus `--bericht`) zum Endstand zusammen.
// Schlüssel einer Änderung oder offenen Gruppe ist `key` (placeKey der Stelle): Der Followup ersetzt den Eintrag des Reviews
// an dessen Platz, neue Einträge kommen ans Ende. Offen bleibt, was der Followup offen meldet, und jede offene Gruppe des
// Reviews ohne Scout-Vorschlag; die erreicht der Followup nicht, und seine Daten kennen sie nicht.

const fs = require('node:fs');
const { resultLine } = require('./report-text');
const { FlowError } = require('./flow-error');

const REVIEW_OF_ART = { spec: 'spec-review', plan: 'plan-review', implementation: 'implementation-review' };
const RANK = { red: 0, yellow: 1 };
const MISSING_REVIEW = '**Ergebnis:** ⚠️ Unvollständig · Review ohne Bericht';
const MISSING_FOLLOWUP = 'Der Followup hat keinen Bericht geliefert; es gilt der Stand nach dem Review.';

function readPart(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
  }
}

function unique(list) {
  return [...new Set(list)];
}

// Einträge ohne Schlüssel (ältere Daten) bleiben einzeln stehen.
function keyOf(entry, index, part) {
  return typeof entry.key === 'string' && entry.key !== '' ? entry.key : `${part}#${index}`;
}

function mergeChanges(review, followup) {
  const byKey = new Map();
  (review?.changes ?? []).forEach((entry, index) => byKey.set(keyOf(entry, index, 'review'), entry));
  (followup?.changes ?? []).forEach((entry, index) => byKey.set(keyOf(entry, index, 'followup'), entry));
  return [...byKey.values()];
}

function mergeOpen(review, followup, final) {
  const unreachable = followup ? (review?.open ?? []).filter((entry) => !entry.hasProposal) : [];
  const byKey = new Map();
  [...unreachable, ...(final?.open ?? [])].forEach((entry, index) => byKey.set(`${entry.color}:${keyOf(entry, index, 'open')}`, entry));
  return [...byKey.values()].filter((entry) => Object.hasOwn(RANK, entry.color)).sort((a, b) => RANK[a.color] - RANK[b.color]);
}

function kindOf(state) {
  if (state.failedLabels.length > 0) return 'incomplete';
  if (state.questions.length > 0) return 'questions';
  if (state.openRed > 0) return 'blocked';
  return state.open.some((entry) => entry.color === 'yellow') ? 'hints' : 'ready';
}

function flowLines(review, followup) {
  return [review?.flowLine, followup?.flowLine?.replace(/^Ablauf: /, 'Followup: ')].filter(Boolean);
}

// `art`: spec | plan | implementation; `reviewFile`, `followupFile` (optional): Dateien aus `--bericht`.
function mergeReports({ art, reviewFile, followupFile }) {
  const reviewName = REVIEW_OF_ART[art];
  if (!reviewName) throw new FlowError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}; nicht ${art}`);
  const review = readPart(reviewFile);
  const followup = review ? readPart(followupFile) : null;
  const final = followup ?? review;
  const open = mergeOpen(review, followup, final);
  const listedRed = open.filter((entry) => entry.color === 'red').length;
  const state = {
    art, review: reviewName, open, questions: final?.questions ?? [], failedLabels: final?.failedLabels ?? [],
    openRed: Math.max(final?.openRed ?? 0, listedRed),
  };
  const kind = review ? kindOf(state) : 'incomplete';
  const hints = open.filter((entry) => entry.color === 'yellow').length;
  return {
    ...state, kind, followupRan: followup !== null,
    resultLine: review ? resultLine(state, kind, hints) : MISSING_REVIEW,
    flowLines: flowLines(review, followup),
    checked: review?.checked ?? [], found: review?.found ?? [],
    changes: mergeChanges(review, followup),
    decisions: [...(review?.decisions ?? []), ...(followup?.decisions ?? [])],
    notes: unique([...(review?.notes ?? []), ...(followup?.notes ?? []), ...(review && followupFile && !followup ? [MISSING_FOLLOWUP] : [])]),
  };
}

module.exports = { mergeReports, REVIEW_OF_ART };
