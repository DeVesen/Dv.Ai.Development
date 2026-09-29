'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openQuestions } = require('./questions');
const { ICON, cell, renderGroups, renderTable } = require('./groups');
const { SCRIPT_CATEGORY } = require('./rated-items');
const { failedInstances } = require('./attempts');
const { ROUND_ONE, ROUND_TWO, CLOSING, FlowError, readText, readLines, readJson, writeText } = require('./flow-files');

const SCOUT_HEADING = '## Scout-Vorschläge';

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
  const attempts = failedInstances(options.workspace);
  const failed = attempts.filter((name) => !name.startsWith('scout'));
  const one = readJson(path.join(options.workspace, ROUND_ONE, 'einstufung.json'), null);
  const two = readJson(path.join(options.workspace, ROUND_TWO, 'einstufung.json'), null);
  const reworked = fs.existsSync(path.join(options.workspace, options.source, 'rework.json'));
  return {
    one, two, reworked, failed,
    openRed: openRedOf(one, two, reworked, failed),
    checked: fs.existsSync(path.join(options.workspace, ROUND_TWO, 'pruefliste.json')),
    questions: questionsAtEnd(options),
    scoutFailed: attempts.some((name) => name.startsWith('scout')),
  };
}

function groupLine(group) {
  const consequences = group.items.map((item) => cell(item.finding.consequence)).join('; ');
  return `- ${ICON[group.color]} ${group.label}: ${consequences}`;
}

function listSection(title, lines) {
  return lines.length > 0 ? [`### ${title}`, ...lines, ''] : [];
}

function verdictRow(verdict) {
  const text = verdict.verdict === 'nicht erledigt' ? `nicht erledigt — ${cell(verdict.rationale)}` : 'erledigt';
  return `| ${cell(verdict.location)} | ${text} |`;
}

function verdictSection(two) {
  if (!two) return [];
  const rows = two.verdicts.length > 0 ? two.verdicts.map(verdictRow) : ['| – | keine Punkte |'];
  return ['### Nachprüfung', '| Stelle | Urteil |', '|---|---|', ...rows, ''];
}

const isContradiction = (item) => item.category === 'widerspruch';
const isScript = (item) => item.category === SCRIPT_CATEGORY;
const isOtherRed = (item) => item.color === 'red' && !isContradiction(item) && !isScript(item);

function redOfTwo(two, predicate) {
  return (two?.groups ?? []).filter((group) => group.color === 'red' && group.items.some(predicate));
}

function greenGroups(data) {
  return [...(data.one?.groups ?? []), ...(data.two?.groups ?? [])].filter((group) => group.color === 'green');
}

function header(data, options, status) {
  const rounds = (data.one ? 1 : 0) + (data.checked ? 1 : 0);
  return [
    `## ${options.title}: ${options.artifact}`, '',
    `**Status:** ${status}`,
    `**Runden:** ${rounds} · **Nacharbeiten:** ${data.reworked ? 1 : 0}`, '',
  ];
}

function renderReport(data, options, status) {
  return [
    ...header(data, options, status),
    ...(data.one ? ['### Runde 1', renderTable(data.one.groups), ''] : []),
    ...verdictSection(data.two),
    ...listSection('Widersprüche', redOfTwo(data.two, isContradiction).map(groupLine)),
    ...listSection('Skript-Prüfungen', redOfTwo(data.two, isScript).map(groupLine)),
    ...listSection('Weitere 🔴 der Nachprüfung', redOfTwo(data.two, isOtherRed).map(groupLine)),
    ...listSection('Hinweise der Nachprüfung', (data.two?.groups ?? []).filter((group) => group.color === 'yellow').map(groupLine)),
    ...listSection('Offene Fragen', data.questions.map((question) => `- ${question.place}: ${question.question}`)),
    ...listSection('Anmerkungen (🟢)', greenGroups(data).map(groupLine)),
    ...listSection('Scout', data.scoutFailed ? ['- Scout ausgefallen'] : []),
  ].join('\n').trimEnd();
}

function scoutBody(file) {
  const lines = readLines(file);
  const start = lines.indexOf(SCOUT_HEADING);
  return start === -1 ? [] : lines.slice(start + 1);
}

// Sicherung für review-followup: alle Gruppen mit Scout-Vorschlägen aus Runde 1 und Nachprüfung.
function writeClosing(options, data) {
  const dir = path.join(options.workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  const bodies = [ROUND_ONE, ROUND_TWO].flatMap((round) => scoutBody(path.join(options.workspace, round, 'scout.md')));
  const groups = [...(data.one?.groups ?? []), ...(data.two?.groups ?? [])].filter((group) => group.color !== 'green');
  writeText(path.join(dir, 'aggregate.md'), renderGroups(groups));
  if (bodies.some((line) => line.trim() !== '')) writeText(path.join(dir, 'scout.md'), [SCOUT_HEADING, ...bodies].join('\n'));
}

function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  writeClosing(options, data);
  return [`ENDE ${status}`, '=== BERICHT ===', renderReport(data, options, status)].join('\n');
}

module.exports = { flowStatus, report };
