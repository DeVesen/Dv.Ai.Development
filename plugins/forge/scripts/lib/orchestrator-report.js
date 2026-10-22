'use strict';

// Führt die Berichtsdaten eines eingebetteten Reviews und seiner Followup-Runden (JSON aus `--bericht`) zum Endstand zusammen.
// Schlüssel einer Änderung oder offenen Gruppe ist `key` (placeKey der Stelle): Eine spätere Runde ersetzt den Eintrag der früheren
// an dessen Platz, neue Einträge kommen ans Ende. Offen bleibt, was die letzte Runde offen meldet, und jede offene Gruppe einer
// früheren Runde ohne Scout-Vorschlag; die erreicht keine Runde, und ihre Daten kennen sie nicht.
// 🟢 (`green`) aus allen Teilen stehen je Stelle einmal im Endstand, außer die Stelle ist dort offen.

const fs = require('node:fs');
const { resultLine } = require('./report-text');
const { FlowError } = require('./flow-error');

const REVIEW_OF_ART = { spec: 'spec-review', plan: 'plan-review', implementation: 'implementation-review' };
const RANK = { red: 0, yellow: 1 };
const MISSING_REVIEW = '**Ergebnis:** ⚠️ Unvollständig · Review ohne Bericht';
const MISSING_FOLLOWUP = 'Der Followup hat keinen Bericht geliefert; es gilt der Stand vor dieser Runde.';

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

function mergeByKey(parts, field, name) {
  const byKey = new Map();
  parts.forEach((part, round) => (part?.[field] ?? []).forEach((entry, index) => byKey.set(keyOf(entry, index, `${name}${round}`), entry)));
  return [...byKey.values()];
}

// `parts`: Review, dann die gelieferten Followup-Runden in Reihenfolge.
function mergeOpen(parts) {
  let open = parts[0]?.open ?? [];
  for (const part of parts.slice(1)) {
    const unreachable = open.filter((entry) => !entry.hasProposal);
    open = [...unreachable, ...(part.open ?? [])];
  }
  const byKey = new Map();
  open.forEach((entry, index) => byKey.set(`${entry.color}:${keyOf(entry, index, 'open')}`, entry));
  return [...byKey.values()].filter((entry) => Object.hasOwn(RANK, entry.color)).sort((a, b) => RANK[a.color] - RANK[b.color]);
}

// Liste der Leit-Session einer Session-Kette (session-chain-points.js), nicht für den Abschlussbericht: Anders als mergeOpen
// bleibt ein Eintrag offen, bis eine spätere Runde ihn als Änderung mit `ok: true` meldet. Ein Followup, der eine gewählte
// Gruppe nicht ändert, lässt sie damit offen. 🟢 (`green`) gehören dazu. mergeOpen und der Abschlussbericht bleiben unverändert.
function mergeOpenKeepUnchanged(parts) {
  const byKey = new Map();
  parts.forEach((part, round) => {
    for (const change of part?.changes ?? []) {
      if (change?.ok === true && typeof change.key === 'string') change.key.split('|').forEach((key) => byKey.delete(key));
    }
    [...(part?.open ?? []), ...(part?.green ?? [])].forEach((entry, index) => byKey.set(keyOf(entry, index, `open${round}`), entry));
  });
  return [...byKey.values()];
}

function mergeGreen(parts, open) {
  const openKeys = new Set(open.map((entry) => entry.key));
  return mergeByKey(parts, 'green', 'green').filter((entry) => !openKeys.has(entry.key));
}

function kindOf(state) {
  if (state.failedLabels.length > 0) return 'incomplete';
  if (state.questions.length > 0) return 'questions';
  if (state.openRed > 0) return 'blocked';
  return state.open.some((entry) => entry.color === 'yellow') ? 'hints' : 'ready';
}

// Eine Runde: `Followup: …`; zwei Runden: `Followup 1: …`, `Followup 2: …`.
function flowLines(review, followups) {
  const label = (index) => (followups.length > 1 ? `Followup ${index + 1}: ` : 'Followup: ');
  return [review?.flowLine, ...followups.map((part, index) => part.flowLine?.replace(/^Ablauf: /, label(index)))].filter(Boolean);
}

// `art`: spec | plan | implementation; `reviewFile`; `followupFiles` (optional, höchstens zwei): Dateien aus `--bericht`.
function mergeReports({ art, reviewFile, followupFiles = [] }) {
  const reviewName = REVIEW_OF_ART[art];
  if (!reviewName) throw new FlowError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}; nicht ${art}`);
  const review = readPart(reviewFile);
  const read = review ? followupFiles.map(readPart) : [];
  const followups = read.filter(Boolean);
  const parts = [review, ...followups];
  const final = parts[parts.length - 1];
  const open = mergeOpen(parts);
  const listedRed = open.filter((entry) => entry.color === 'red').length;
  const state = {
    art, review: reviewName, open, questions: final?.questions ?? [], failedLabels: final?.failedLabels ?? [],
    openRed: Math.max(final?.openRed ?? 0, listedRed),
  };
  const kind = review ? kindOf(state) : 'incomplete';
  const hints = open.filter((entry) => entry.color === 'yellow').length;
  return {
    ...state, kind, followupRan: followups.length > 0, followupRounds: followups.length,
    resultLine: review ? resultLine(state, kind, hints) : MISSING_REVIEW,
    flowLines: flowLines(review, followups),
    checked: review?.checked ?? [], found: review?.found ?? [],
    changes: mergeByKey(parts, 'changes', 'change'),
    green: mergeGreen(parts, open),
    decisions: parts.flatMap((part) => part?.decisions ?? []),
    notes: unique([...parts.flatMap((part) => part?.notes ?? []), ...(review && read.includes(null) ? [MISSING_FOLLOWUP] : [])]),
  };
}

module.exports = { mergeReports, mergeOpenKeepUnchanged, readPart, keyOf, REVIEW_OF_ART };
