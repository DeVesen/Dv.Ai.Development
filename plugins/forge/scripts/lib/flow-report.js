'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { failedInstances } = require('./attempts');
const { openGroupsOf, writeClosing } = require('./closing');
const { buildInput } = require('./report-data');
const { renderReportText, summaryOf } = require('./report-text');
const { ROUND_ONE, ROUND_TWO, FOLLOWUP, CLOSING, FlowError, readText, readJson, writeText, writeJson } = require('./flow-files');
const { SessionChainError, slugOfArtifact } = require('./session-chain-store');
const { ablageDir, nextFollowupName } = require('./session-chain-ablage');
const { appendMetric, flowReviewRecord } = require('./metrics');
const { commitCheckOf } = require('./followup-next');

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

// Berichtsdaten, wie sie ein eingebetteter Lauf und die Ablage schreiben.
function reportData(input, status) {
  const summary = summaryOf(input);
  return { summary, data: { format: FORMAT, status, ...summary, ...input } };
}

// Eingebetteter Lauf: Die Berichtsdaten gehen als JSON nach `reportFile`; stdout nennt Status, Ergebnis, Followup-Fähigkeit und Datei.
// orchestrator-report.js setzt daraus den einen Abschlussbericht des Orchestrators zusammen.
function embeddedOutput(options, input, status) {
  const { summary, data } = reportData(input, status);
  writeJson(options.reportFile, data);
  return [
    `ENDE ${status}`, `ERGEBNIS ${summary.resultLine.replace(RESULT_PREFIX, '')}`, `FOLLOWUP ${summary.offersFollowup ? 'ja' : 'nein'}`, `BERICHT ${options.reportFile}`,
  ].join('\n');
}

// Ablage (`options.storage` = Etappe): Bericht und Berichtsdaten gehen in die Ablage der Session-Kette je Slug. Ein Review
// beginnt die Ablage seiner Etappe neu (`bericht-review`), ein Followup legt die nächste Runde daneben (`bericht-followup-<n>`).
// Rückgabe: die Zeile `ABLAGE <datei> · FOLLOWUP <ja|nein>`.
function storeReport(options, input, status, text) {
  const { summary, data } = reportData(input, status);
  const artifact = options.review === 'spec-review' ? { spec: options.artifact } : { plan: options.artifact };
  try {
    const target = ablageDir(path.dirname(path.resolve(options.artifact)), slugOfArtifact(artifact), options.storage);
    const followup = options.source === FOLLOWUP;
    if (!followup) fs.rmSync(target, { recursive: true, force: true });
    const name = followup ? nextFollowupName(target) : 'bericht-review';
    const file = path.join(target, `${name}.json`);
    writeJson(file, data);
    writeText(path.join(target, `${name}.md`), text);
    return `ABLAGE ${file.replace(/\\/g, '/')} · FOLLOWUP ${summary.offersFollowup ? 'ja' : 'nein'}`;
  } catch (error) {
    if (error instanceof SessionChainError) throw new FlowError(`Ablage nicht möglich: ${error.message}`);
    throw error;
  }
}

// Nur der Einzellauf des Plan-Reviews: ob die Commit-Prüfung des Skills läuft (`sauber …` und `✅ Bereit zur Umsetzung`).
function commitCheckLines(review, status, input) {
  return review === 'plan-review' ? [`COMMIT-PRUEFUNG ${commitCheckOf({ status, ergebnis: summaryOf(input).resultLine })}`] : [];
}

// `options.reportFile` (optional): eingebetteter Lauf, siehe embeddedOutput. `options.storage` (optional): Ablage, siehe storeReport.
function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  const open = openGroupsOf(options, data);
  const input = buildInput(options, data, status, open);
  const text = renderReportText(input);
  writeClosing(options, open);
  writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
  appendMetric(path.dirname(path.resolve(options.doc)), 'reviews', flowReviewRecord(options, data, status));
  const stored = options.storage ? [storeReport(options, input, status, text)] : [];
  if (options.reportFile) return [embeddedOutput(options, input, status), ...stored].join('\n');
  return [`ENDE ${status}`, ...commitCheckLines(options.review, status, input), ...stored, '=== BERICHT ===', text].join('\n');
}

module.exports = { flowStatus, report };
