'use strict';

// Baut den Abschlussbericht des Implementierungs-Reviews und die gefilterte Sicherung (abschluss/) aus dem Arbeitsbereich.

const fs = require('node:fs');
const path = require('node:path');
const { reworkHeading, reworkLine, REWORK_MARK, SEVERITY_ICON } = require('../aggregate-findings');
const { reviewerLabel } = require('./reviewer-names');
const { topicOf, shorten } = require('./halt-text');
const { scoutTexts, scoutBlocks, checkScout } = require('./scout-check');
const { renderImplementationReport } = require('./implementation-report-text');
const { CLOSING, FlowError, readText, readLines, readJson, writeText } = require('./flow-files');

const REVIEW = 'implementation-review';
const SHORT = 400;
const CANONICAL = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'];
const TEST_PATHS = [/(^|[\\/])(tests?|__tests__)[\\/]/i, /[._-](test|spec)s?\./i, /[a-z0-9]Tests?\.[a-z0-9]+$/];
const SCOUT_HEADING = '## Scout-Vorschläge';
const SCOUT_NOTE = 'Der Scout hat keine gültigen Vorschläge geliefert; Beschreibungen stammen aus den Prüfergebnissen.';

function orderOf(name) {
  const index = CANONICAL.indexOf(name);
  return index === -1 ? CANONICAL.length : index;
}

function isGroup(group) {
  return typeof group?.location === 'string' && Object.hasOwn(SEVERITY_ICON, group.severity) && Array.isArray(group.reviewers)
    && Array.isArray(group.items) && group.items.length > 0;
}

// ergebnis.json schreibt aggregate-findings.js; eine andere Form bricht wie eine fehlende Datei mit Exit 1 ab.
function readResult(dir) {
  const file = path.join(dir, 'ergebnis.json');
  const result = readJson(file);
  const lists = ['reviewers', 'failed', 'groups'].every((key) => Array.isArray(result?.[key]));
  if (!lists || !result.groups.every(isGroup)) throw new FlowError(`ungültiges Ergebnis: ${file}`);
  return result;
}

// Status und Zahl der Hindernisse stammen aus derselben Liste offener Gruppen wie der Bericht.
function statusOf(result, openRed) {
  if (result.failed.length > 0) return `unvollständig nach Review 1, ausgefallen: ${result.failed.join(', ')}`;
  return openRed === 0 ? 'sauber nach Review 1' : `geprüft, ${openRed} × 🔴 offen`;
}

function changedFiles(packageText) {
  const lines = packageText.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf('## Dateien');
  const end = lines.indexOf('## Diff');
  if (start === -1) return [];
  return lines.slice(start + 1, end === -1 ? undefined : end).filter((line) => line.includes(' | ')).map((line) => line.split(' | ')[0].trim());
}

// Näherung nach Pfad-Muster; `latest.js` endet zwar auf "test", ist aber kein Test.
function isTestFile(file) {
  return TEST_PATHS.some((pattern) => pattern.test(file));
}

function reviewerLines(result) {
  const items = result.groups.flatMap((group) => group.items);
  const count = (name, severity) => items.filter((item) => item.reviewer === name && item.severity === severity).length;
  const label = (name) => reviewerLabel(REVIEW, name);
  const delivered = result.reviewers.map((name) => ({ order: orderOf(name), name: label(name), red: count(name, 'red'), yellow: count(name, 'yellow'), failed: false }));
  const failed = result.failed.map((name) => ({ order: orderOf(name), name: label(name), red: 0, yellow: 0, failed: true }));
  return [...delivered, ...failed].sort((a, b) => a.order - b.order).map(({ order, ...line }) => line);
}

function scoutKey(group) {
  return `${SEVERITY_ICON[group.severity]} ${group.location}`;
}

// Nur bei offenen Gruppen wird der Scout gelesen; gültig ist er nur als Ganzes (`SCOUT ok`), sonst gilt er als fehlend.
function scoutState(options, open) {
  const empty = { valid: false, texts: new Map(), blocks: new Map() };
  if (open.length === 0 || checkScout(options.dir, REVIEW) !== 'SCOUT ok') return empty;
  const lines = readLines(path.join(options.dir, 'scout.md'));
  return { valid: true, texts: new Map(scoutTexts(lines).map((entry) => [`${entry.severity} ${entry.location}`, entry])), blocks: scoutBlocks(lines) };
}

// Ein Scout-Eintrag zählt nur mit Text und Block: dieselbe Bedingung entscheidet über Beschreibung, `hasProposal` und abschluss/scout.md.
function scoutedOf(group, scout) {
  const key = scoutKey(group);
  return scout.texts.has(key) && scout.blocks.has(key) ? { texts: scout.texts.get(key), block: scout.blocks.get(key) } : null;
}

function openEntry(group, scout) {
  const scouted = scoutedOf(group, scout);
  const angles = group.reviewers.map((name) => reviewerLabel(REVIEW, name)).join(', ');
  if (scouted) {
    const { title, description, recommendation } = scouted.texts;
    return { color: group.severity, title, description, recommendation, angles, hasProposal: true };
  }
  const description = `${shorten(group.items[0].consequence, SHORT)} (ohne Scout-Beschreibung)`;
  return { color: group.severity, title: group.location, description, recommendation: null, angles, hasProposal: false };
}

function aggregateBlock(group) {
  return [reworkHeading(SEVERITY_ICON[group.severity], group.location, group.reviewers), ...group.items.map((item) => reworkLine(item.reviewer, item.severity, item))].join('\n');
}

function writeClosing(options, open, scout, text) {
  const dir = path.join(options.workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  writeText(path.join(dir, 'aggregate.md'), [REWORK_MARK, ...open.map(aggregateBlock)].join('\n\n'));
  const scouted = open.map((group) => scoutedOf(group, scout)).filter(Boolean);
  if (scouted.length > 0) {
    writeText(path.join(dir, 'scout.md'), [SCOUT_HEADING, '', scouted.map(({ block }) => block.join('\n').trimEnd()).join('\n\n')].join('\n'));
  }
  writeText(path.join(dir, 'bericht.md'), text);
}

function notesOf(options, result, open, scout) {
  const prepared = readJson(path.join(options.workspace, 'hinweise.json'), []);
  if (!Array.isArray(prepared)) throw new FlowError(`keine JSON-Liste: ${path.join(options.workspace, 'hinweise.json')}`);
  const failed = result.failed.map((name) => `Der Prüfer für ${reviewerLabel(REVIEW, name)} ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.`);
  return [...prepared, ...failed, ...(open.length > 0 && !scout.valid ? [SCOUT_NOTE] : [])];
}

// `options`: dir (Rundenordner), workspace (W), plan (lesbare Plan-Datei), planArg (Pfad für die Befehle), range (Basis), packageFile.
function buildReport(options) {
  const result = readResult(options.dir);
  const open = result.groups.filter((group) => group.severity !== 'green');
  const openRed = open.filter((group) => group.severity === 'red').length;
  const scout = scoutState(options, open);
  const files = changedFiles(readText(options.packageFile));
  const text = renderImplementationReport({
    plan: options.planArg, topic: topicOf(readText(options.plan)), openRed,
    reviewerCount: result.reviewers.length + result.failed.length, range: `${options.range}..HEAD`,
    fileCount: files.length, testCount: files.filter(isTestFile).length,
    reviewerLines: reviewerLines(result), failedLabels: result.failed.map((name) => reviewerLabel(REVIEW, name)),
    open: open.map((group) => openEntry(group, scout)),
    notes: notesOf(options, result, open, scout),
  });
  writeClosing(options, open, scout, text);
  return [`ENDE ${statusOf(result, openRed)}`, '=== BERICHT ===', text].join('\n');
}

module.exports = { buildReport, changedFiles, isTestFile };
