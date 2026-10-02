'use strict';

const path = require('node:path');
const { parsePlaces } = require('./places');
const { resultProblem } = require('./rules');
const { documentQuestions, wEntriesOf } = require('./questions');
const { groupRated, countColors, renderGroups, renderTable } = require('./groups');
const { rateReviewer, scriptItems, droppedList } = require('./rated-items');
const { ROUND_ONE, readText, readAgentJson, writeText, writeJson } = require('./flow-files');

function readReviewerResult(dir, name, review) {
  const { value, problem } = readAgentJson(path.join(dir, `${name}.json`));
  const invalid = problem ?? resultProblem(value, review, name);
  return invalid ? { name, problem: `Ergebnis ungültig: ${invalid}` } : { name, findings: value.findings };
}

function scoutScope(counts) {
  if (counts.red > 0) return 'rot-und-gelb';
  return counts.yellow > 0 ? 'hinweise' : 'keiner';
}

function scoutGroups(groups, scope) {
  if (scope === 'rot-und-gelb') return groups.filter((group) => group.color !== 'green');
  return groups.filter((group) => group.color === 'yellow');
}

function statusLines(counts, questions, failed) {
  const names = failed.map((entry) => entry.name).join(',') || '-';
  return [
    `STATUS red=${counts.red} yellow=${counts.yellow} green=${counts.green} fragen=${questions} failed=${names}`,
    ...failed.map((entry) => `FEHLT ${entry.name} — ${entry.problem}`),
  ];
}

function nextLine(counts, questions) {
  const rework = counts.red > 0 || questions > 0 ? 'ja' : 'nein';
  return `WEITER scout=${scoutScope(counts)} nacharbeit=${rework}`;
}

// Runde 1 einstufen: gültige Ergebnisse lesen, jedes Finding bewerten, je Stelle gruppieren, Dateien für Scout und Nacharbeit schreiben.
function rateRoundOne(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const text = readText(options.doc);
  const places = parsePlaces(text);
  const questions = documentQuestions(options, text);
  const context = {
    review: options.review, advisory: new Set(options.advisory), wEntries: wEntriesOf(options),
    openKeys: new Set(questions.map((question) => question.key)), phase: 'suche', checklistKeys: new Set(), changedKeys: new Set(),
  };
  const results = options.expected.map((name) => readReviewerResult(dir, name, options.review));
  const failed = results.filter((result) => result.problem);
  const items = [
    ...results.filter((result) => result.findings).flatMap((result) => rateReviewer(result.name, result.findings, places, context)),
    ...scriptItems(dir, places),
  ];
  const groups = groupRated(items.filter((item) => !item.dropped));
  const counts = countColors(groups);
  writeJson(path.join(dir, 'einstufung.json'), { groups, dropped: droppedList(items), failed, questions, reviewers: options.expected });
  writeText(path.join(dir, 'aggregate.md'), `${renderTable(groups)}\n\n${renderGroups(groups)}`);
  writeText(path.join(dir, 'scout-eingabe.md'), renderGroups(scoutGroups(groups, scoutScope(counts))));
  const lines = statusLines(counts, questions.length, failed);
  return (failed.length > 0 ? lines : [...lines, nextLine(counts, questions.length)]).join('\n');
}

module.exports = { rateRoundOne };
