'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { failedInstances } = require('./attempts');
const { openGroupsOf, writeClosing } = require('./closing');
const { buildInput } = require('./report-data');
const { renderReportText, summaryOf } = require('./report-text');
const { ROUND_ONE, ROUND_TWO, FOLLOWUP, FlowError, readText, readJson } = require('./flow-files');
const { storeReviewReport } = require('./session-chain-ablage');
const { reviewStatusLine } = require('./review-status');
const { REPORT_FORMAT } = require('./report-format');
const { readContext } = require('../workspace');
const { appendMetric, flowReviewRecord } = require('./metrics');

// Rangfolge: unvollständig → Fragen offen → nicht bereit → sauber.
function flowStatus({ failed, openQuestions: questions, openRed, reworked }) {
  if (failed.length > 0) return `unvollständig, ausgefallen: ${failed.join(', ')}`;
  if (questions > 0) return 'Fragen offen';
  if (openRed > 0) return `nicht bereit, ${openRed} × 🔴 offen`;
  return reworked ? 'sauber nach Nachprüfung' : 'sauber nach Runde 1';
}

function questionsAtEnd(options) {
  if (options.review === 'plan-review') return readJson(path.join(options.workspace, options.source, 'fragen.json'), []);
  return openQuestions(readText(options.doc));
}

function redGroupCount(one) {
  return (one?.groups ?? []).filter((group) => group.color === 'red').length;
}

// Offene 🔴: aus der Nachprüfung; ohne Nacharbeit die 🔴-Gruppen aus Runde 1. Eine Nacharbeit ohne Nachprüfung
// und ohne Ausfall ist ein fehlender Schritt und darf den Status nicht ins Positive kippen.
function openRedOf(one, two, reworked, failed) {
  if (two) return two.openRed;
  if (reworked && failed.length === 0) throw new FlowError('Nachprüfung fehlt: runde-2/einstufung.json');
  return redGroupCount(one);
}

function collect(options) {
  const failed = failedInstances(options.workspace).filter((name) => !name.startsWith('scout'));
  const one = readJson(path.join(options.workspace, ROUND_ONE, 'einstufung.json'), null);
  const two = readJson(path.join(options.workspace, ROUND_TWO, 'einstufung.json'), null);
  const reworked = fs.existsSync(path.join(options.workspace, options.source, 'rework.json'));
  return {
    one, two, reworked, failed,
    openRed: openRedOf(one, two, reworked, failed),
    checked: fs.existsSync(path.join(options.workspace, ROUND_TWO, 'pruefliste.json')),
    questions: questionsAtEnd(options),
  };
}

// Bericht und Bericht-Daten gehen in die Ablage der Etappe, die prepare.js im Arbeitsbereich festgelegt hat: Ein Review beginnt die
// Ablage seiner Etappe neu (`bericht-review`), ein Followup legt die nächste Runde daneben (`bericht-followup-<n>`).
function storeReport(options, data, text) {
  const { ablage } = readContext(options.workspace);
  if (typeof ablage !== 'string' || ablage === '') throw new FlowError('Ablage fehlt im Arbeitsbereich: prepare.js legt sie in kontext.json fest');
  return storeReviewReport({ target: path.resolve(ablage), followup: options.source === FOLLOWUP, data, text });
}

// Ausgabe: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`; der Bericht liegt in der Ablage, nicht im Chat.
function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  const open = openGroupsOf(options, data);
  const input = buildInput(options, data, status, open);
  const text = renderReportText(input);
  const summary = summaryOf(input);
  writeClosing(options, open);
  appendMetric(path.dirname(path.resolve(options.doc)), 'reviews', flowReviewRecord(options, data, status));
  const stored = storeReport(options, { format: REPORT_FORMAT, status, ...summary, ...input }, text);
  const line = reviewStatusLine({ resultLine: summary.resultLine, followup: summary.offersFollowup, report: stored.md });
  return [`ENDE ${status}`, `STATUSZEILE ${line}`].join('\n');
}

module.exports = { flowStatus, report };
