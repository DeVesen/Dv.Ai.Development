'use strict';

// Berichtsdaten eines Implementierungs-Followups im eingebetteten Lauf (Format wie review-flow.js report --bericht).
// Quelle: followup.json und sicherung-vorher/ aus prepare.js, dazu die Antwort des Re-Reviewers (Urteil, neue Schäden).
// Der Re-Reviewer urteilt je Finding, nicht je Gruppe; darum zählt für jede gewählte Gruppe nur das Gesamturteil.

const path = require('node:path');
const { loadGroups } = require('../followup');
const { fromSaved } = require('./open-groups');
const { placeKey } = require('./places');
const { reviewerLabel } = require('./reviewer-names');
const { fallbackDescription } = require('./halt-text');
const { scoutTexts } = require('./scout-check');
const { resultLine } = require('./report-text');
const { FlowError, readJson, readLines, writeJson } = require('./flow-files');

const REVIEW = 'implementation-review';
const FORMAT = 1;
const BEFORE = 'sicherung-vorher';
const RESULT_PREFIX = '**Ergebnis:** ';
const CLEAN = /alle behoben, keine neuen 🔴/;
const VERDICT = /^\*\*Fix-Runde:\*\*\s*(.+?)\s*$/m;
const SECTION = /^### (.+?)\s*$/;
const DAMAGE = /^- (🔴|🟡|🟢)\s+(.+?)\s*$/u;
const COLOR = { '🔴': 'red', '🟡': 'yellow' };
const NONE = /^-?\s*„?"?keine"?“?\.?$/i;
// `--ohne`: der Re-Reviewer lief nicht.
const WITHOUT_REVIEW = { blockiert: 'blockiert', 'keine-aenderung': 'keine Änderung' };

function sectionLines(text, title) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => SECTION.exec(line)?.[1] === title);
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => SECTION.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).filter((line) => line !== '' && !NONE.test(line));
}

// Ohne Urteilszeile gilt die Nachprüfung als nicht bestanden: Der Bericht darf nicht ins Positive kippen.
function parseAnswer(text) {
  const verdict = VERDICT.exec(String(text))?.[1] ?? null;
  return {
    verdict, clean: verdict !== null && CLEAN.test(verdict),
    damages: sectionLines(text, 'Neue Schäden im Fix-Diff').map((line) => DAMAGE.exec(line)).filter((match) => match && COLOR[match[1]]),
    outside: sectionLines(text, 'Außerhalb').map((line) => line.replace(/^- /, '')),
  };
}

function angles(reviewers) {
  return reviewers.map((name) => reviewerLabel(REVIEW, name)).join(', ');
}

function described(group, texts) {
  const found = texts.get(`${group.severity} ${group.location}`);
  if (found?.title && found.description) return { title: found.title, description: found.description, recommendation: found.recommendation ?? null };
  return { title: group.location, description: fallbackDescription(fromSaved(group).consequence), recommendation: null };
}

function openOf(group, texts, color) {
  return { key: placeKey(group.location), color, ...described(group, texts), angles: angles(group.reviewers), hasProposal: true };
}

function damageEntry([, icon, text]) {
  const location = /`([^`]+)`/.exec(text)?.[1] ?? null;
  return {
    key: placeKey(location ?? text), color: COLOR[icon], title: location ?? 'Fix-Diff', description: text.replace(/^`[^`]+`\s*—?\s*/, ''),
    recommendation: null, angles: 'Nach-Review', hasProposal: false,
  };
}

function statusOf(reviewed, answer, unchosen) {
  if (!reviewed.done) return reviewed.status;
  if (!answer.clean) return 'offen nach Nach-Review';
  return unchosen.length === 0 ? 'sauber nach Nach-Review' : 'sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen';
}

function kindOf(open) {
  if (open.some((entry) => entry.color === 'red')) return 'blocked';
  return open.length > 0 ? 'hints' : 'ready';
}

function notesOf(reviewed, answer) {
  if (!reviewed.done) return [`Kein Nach-Review: ${reviewed.status}.`];
  return [
    ...(answer.clean ? [] : [`Nach-Review: ${answer.verdict ?? 'kein Urteil geliefert'}`]),
    ...answer.outside.map((line) => `Außerhalb des Fix-Diffs: ${line}`),
  ];
}

// `options`: workspace (W), reportFile, answer (Antwort des Re-Reviewers) oder without (`blockiert` | `keine-aenderung`).
function buildFollowupReport(options) {
  const reviewed = options.without ? { done: false, status: WITHOUT_REVIEW[options.without] } : { done: true };
  if (!reviewed.done && !reviewed.status) throw new FlowError(`--ohne erlaubt: ${Object.keys(WITHOUT_REVIEW).join(', ')}`);
  const followup = readJson(path.join(options.workspace, 'followup.json'));
  const saved = loadGroups(path.join(options.workspace, BEFORE));
  const texts = new Map(scoutTexts(readLines(path.join(options.workspace, BEFORE, 'scout.md'))).map((entry) => [`${entry.severity} ${entry.location}`, entry]));
  const answer = reviewed.done ? parseAnswer(options.answer) : { verdict: null, clean: false, damages: [], outside: [] };
  const chosen = followup.gewaehlt.map((entry) => ({ entry, group: saved.find((group) => group.number === entry.nummer) })).filter(({ group }) => group);
  const chosenNumbers = new Set(chosen.map(({ group }) => group.number));
  const unchosen = saved.filter((group) => !chosenNumbers.has(group.number));
  const ok = reviewed.done ? answer.clean : null;
  const changes = chosen.map(({ entry, group }) => ({
    key: placeKey(group.location), ok, ...described(group, texts), angles: angles(group.reviewers), change: null, evidence: null, choice: entry.vorschlag,
  }));
  const open = [
    ...unchosen.map((group) => openOf(group, texts, group.severity === '🔴' ? 'red' : 'yellow')),
    ...(ok ? [] : chosen.map(({ group }) => openOf(group, texts, 'red'))),
    ...answer.damages.map(damageEntry),
  ];
  const openRed = open.filter((entry) => entry.color === 'red').length;
  const kind = kindOf(open);
  const line = resultLine({ review: REVIEW, failedLabels: [], questions: [], openRed }, kind, open.length - openRed);
  const status = statusOf(reviewed, answer, unchosen);
  const count = chosen.length === 1 ? '1 gewählter Vorschlag' : `${chosen.length} gewählte Vorschläge`;
  writeJson(options.reportFile, {
    format: FORMAT, review: REVIEW, title: `Review-Followup (${REVIEW})`, followup: true, status, kind, resultLine: line,
    flowLine: `Ablauf: ${count} umgesetzt, ${reviewed.done ? 'ein Nach-Review' : 'kein Nach-Review'}.`, offersFollowup: false,
    openRed, failedLabels: [], chosenCount: chosen.length, changes, decisions: [], questions: [], open, notes: notesOf(reviewed, answer),
  });
  return [`ENDE ${status}`, `ERGEBNIS ${line.replace(RESULT_PREFIX, '')}`, 'FOLLOWUP nein', `BERICHT ${options.reportFile}`].join('\n');
}

module.exports = { buildFollowupReport, parseAnswer };
