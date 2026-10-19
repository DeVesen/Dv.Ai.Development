'use strict';

// Berichtsdaten eines Implementierungs-Followups im eingebetteten Lauf (Format wie review-flow.js report --bericht).
// Quelle: followup.json und sicherung-vorher/ aus prepare.js, dazu die Antwort des Re-Reviewers (Urteil, neue Schäden).
// Der Re-Reviewer urteilt je Gruppe; ohne Urteilszeile einer Gruppe zählt das Gesamturteil.

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
const COLOR = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
const GREEN_ICON = '🟢';
const GROUP_VERDICT = /^- \*\*(.+?)\*\*\s+—\s+(nicht behoben|behoben)\b/u;
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
// `judged`: Gruppenurteile aus `### Findings` (`- **<Stelle>** — behoben | nicht behoben`), Schlüssel placeKey der Stelle.
function parseAnswer(text) {
  const verdict = VERDICT.exec(String(text))?.[1] ?? null;
  const damages = sectionLines(text, 'Neue Schäden im Fix-Diff').map((line) => DAMAGE.exec(line)).filter(Boolean);
  return {
    verdict, clean: verdict !== null && CLEAN.test(verdict),
    damages: damages.filter((match) => match[1] !== GREEN_ICON), greens: damages.filter((match) => match[1] === GREEN_ICON),
    judged: new Map(sectionLines(text, 'Findings').map((line) => GROUP_VERDICT.exec(line)).filter(Boolean).map(([, place, state]) => [placeKey(place), state])),
    outside: sectionLines(text, 'Außerhalb').map((line) => line.replace(/^- /, '')),
  };
}

// Eine gewählte Gruppe gilt als bestätigt, wenn ihre Urteilszeile „behoben“ sagt; ohne Zeile zählt das Gesamturteil „alle behoben“.
// Die Zeile darf die Stelle allein oder die ganze Überschrift aus prepare.js (`<Stelle> (<Gutachter>)`) als Titel tragen.
function groupVerdict(group, answer) {
  return answer.judged.get(placeKey(group.location))
    ?? answer.judged.get(placeKey(`${group.location} (${group.reviewers.join(', ')})`));
}

// Ohne Gesamturteil (Zeile `**Fix-Runde:**`) bestätigt auch eine Gruppenzeile nichts: Die Antwort gilt als unvollständig.
function isConfirmed(group, answer) {
  if (answer.verdict === null) return false;
  const judged = groupVerdict(group, answer);
  return judged === undefined ? answer.clean : judged === 'behoben';
}

// Farbe einer gewählten, nicht bestätigten Gruppe: Mit eigenem Gruppenurteil bleibt ihre Stufe (🟡 ist kein Hindernis);
// ohne Nach-Review oder ohne eigenes Urteil zählt sie als Hindernis.
function unconfirmedColor(group, reviewed, answer) {
  const ownVerdict = reviewed.done && answer.verdict !== null && groupVerdict(group, answer) !== undefined;
  return ownVerdict && group.severity !== '🔴' ? 'yellow' : 'red';
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

function statusOf(reviewed, answer, unchosen, unconfirmed) {
  if (!reviewed.done) return reviewed.status;
  if (!answer.clean || unconfirmed.length > 0) return 'offen nach Nach-Review';
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

// Nummern der Gruppen, deren Vorschläge die Sicherung behält: nicht gewählte und nicht bestätigte gewählte Gruppen.
// `null`: der Re-Reviewer lief nicht, die Sicherung bleibt unverändert.
function keptNumbers(reviewed, unchosen, unconfirmed) {
  if (!reviewed.done) return null;
  return [...unchosen, ...unconfirmed].map((group) => group.number).sort((a, b) => a - b);
}

function keptLine(kept) {
  if (kept === null) return 'BEHALTEN unveraendert';
  return `BEHALTEN ${kept.length > 0 ? kept.join(',') : 'keine'}`;
}

// `options`: workspace (W), reportFile, answer (Antwort des Re-Reviewers) oder without (`blockiert` | `keine-aenderung`).
// `FOLLOWUP ja`: die Sicherung behält Vorschläge (`BEHALTEN <nummern>`); `/dv-forge:review-followup <P> alle` setzt nur diese um.
function buildFollowupReport(options) {
  const reviewed = options.without ? { done: false, status: WITHOUT_REVIEW[options.without] } : { done: true };
  if (!reviewed.done && !reviewed.status) throw new FlowError(`--ohne erlaubt: ${Object.keys(WITHOUT_REVIEW).join(', ')}`);
  const followup = readJson(path.join(options.workspace, 'followup.json'));
  const saved = loadGroups(path.join(options.workspace, BEFORE));
  const texts = new Map(scoutTexts(readLines(path.join(options.workspace, BEFORE, 'scout.md'))).map((entry) => [`${entry.severity} ${entry.location}`, entry]));
  const answer = reviewed.done ? parseAnswer(options.answer) : { verdict: null, clean: false, damages: [], greens: [], judged: new Map(), outside: [] };
  const chosen = followup.gewaehlt.map((entry) => ({ entry, group: saved.find((group) => group.number === entry.nummer) })).filter(({ group }) => group);
  const chosenNumbers = new Set(chosen.map(({ group }) => group.number));
  const unchosen = saved.filter((group) => !chosenNumbers.has(group.number));
  const unconfirmed = chosen.map(({ group }) => group).filter((group) => !reviewed.done || !isConfirmed(group, answer));
  const changes = chosen.map(({ entry, group }) => ({
    key: placeKey(group.location), ok: reviewed.done ? isConfirmed(group, answer) : null, ...described(group, texts), angles: angles(group.reviewers),
    change: null, evidence: null, choice: entry.vorschlag,
  }));
  const open = [
    ...unchosen.map((group) => openOf(group, texts, group.severity === '🔴' ? 'red' : 'yellow')),
    ...unconfirmed.map((group) => openOf(group, texts, unconfirmedColor(group, reviewed, answer))),
    ...answer.damages.map(damageEntry),
  ];
  const openRed = open.filter((entry) => entry.color === 'red').length;
  const kind = kindOf(open);
  const line = resultLine({ review: REVIEW, failedLabels: [], questions: [], openRed }, kind, open.length - openRed);
  const status = statusOf(reviewed, answer, unchosen, unconfirmed);
  const kept = keptNumbers(reviewed, unchosen, unconfirmed);
  const offersFollowup = kept !== null && kept.length > 0;
  const count = chosen.length === 1 ? '1 gewählter Vorschlag' : `${chosen.length} gewählte Vorschläge`;
  writeJson(options.reportFile, {
    format: FORMAT, review: REVIEW, title: `Review-Followup (${REVIEW})`, followup: true, status, kind, resultLine: line,
    flowLine: `Ablauf: ${count} umgesetzt, ${reviewed.done ? 'ein Nach-Review' : 'kein Nach-Review'}.`, offersFollowup,
    openRed, failedLabels: [], chosenCount: chosen.length, changes, decisions: [], questions: [], open, green: answer.greens.map(damageEntry), notes: notesOf(reviewed, answer),
  });
  return [`ENDE ${status}`, `ERGEBNIS ${line.replace(RESULT_PREFIX, '')}`, `FOLLOWUP ${offersFollowup ? 'ja' : 'nein'}`, `BERICHT ${options.reportFile}`, keptLine(kept)].join('\n');
}

module.exports = { buildFollowupReport, parseAnswer };
