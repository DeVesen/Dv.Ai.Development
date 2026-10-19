'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { failedInstances } = require('./attempts');
const { openGroupsOf, writeClosing } = require('./closing');
const { buildInput } = require('./report-data');
const { renderReportText, summaryOf } = require('./report-text');
const { ROUND_ONE, ROUND_TWO, CLOSING, FlowError, readText, readJson, writeText, writeJson } = require('./flow-files');

const FORMAT = 1;
const RESULT_PREFIX = '**Ergebnis:** ';

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

// Eingebetteter Lauf: Die Berichtsdaten gehen als JSON nach `reportFile`; stdout nennt Status, Ergebnis, Followup-Fähigkeit und Datei.
// orchestrator-report.js setzt daraus den einen Abschlussbericht des Orchestrators zusammen.
function embeddedOutput(options, input, status) {
  const { steps: _steps, ...summary } = summaryOf(input);
  const { chain: _chain, ...data } = input;
  writeJson(options.reportFile, { format: FORMAT, status, ...summary, ...data });
  return [
    `ENDE ${status}`, `ERGEBNIS ${summary.resultLine.replace(RESULT_PREFIX, '')}`, `FOLLOWUP ${summary.offersFollowup ? 'ja' : 'nein'}`, `BERICHT ${options.reportFile}`,
  ].join('\n');
}

// `options.reportFile` (optional): eingebetteter Lauf, siehe embeddedOutput.
function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  const open = openGroupsOf(options, data);
  const input = buildInput(options, data, status, open);
  const text = renderReportText(input);
  writeClosing(options, open);
  writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
  if (options.reportFile) return embeddedOutput(options, input, status);
  return [`ENDE ${status}`, '=== BERICHT ===', text].join('\n');
}

module.exports = { flowStatus, report };
