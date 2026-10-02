'use strict';

// Liest den Arbeitsbereich und baut die Eingabe des Berichts; der Text selbst entsteht in report-text.js.

const path = require('node:path');
const { ICON } = require('./groups');
const { collapse, placeKey } = require('./places');
const { reviewerLabel } = require('./reviewer-names');
const { topicOf, shorten, fallbackDescription } = require('./halt-text');
const { scoutTexts } = require('./scout-check');
const { readAttempts } = require('./attempts');
const { loadGroups } = require('../followup');
const { verdictMap, fromSaved } = require('./open-groups');
const { ROUND_ONE, ROUND_TWO, FlowError, readText, readLines, readJson, readAgentJson } = require('./flow-files');

const BEFORE = 'sicherung-vorher';
const SHORT = 400;
const VERIFIER = 'nachprüfer';
const INSTANCE_NAMES = { nacharbeit: 'Die Überarbeitung', [VERIFIER]: 'Die Nachprüfung', scout: 'Der Scout', 'scout-nachpruefung': 'Der Scout' };
const FAILED_LABELS = { nacharbeit: 'Überarbeitung', [VERIFIER]: 'Nachprüfung' };
const SCOUT_IMPACT = 'Es gibt keine Lösungsvorschläge; Beschreibungen stammen aus den Prüfergebnissen.';
const IMPACTS = {
  nacharbeit: 'Das Dokument wurde nicht überarbeitet.', [VERIFIER]: 'Die Korrekturen sind nicht nachgeprüft.', scout: SCOUT_IMPACT, 'scout-nachpruefung': SCOUT_IMPACT,
};
const VALID_STATUS = /^(unvollständig, ausgefallen: |Fragen offen$|nicht bereit, |sauber nach (Runde 1|Nachprüfung)$)/;
const REVIEWER_IMPACT = 'Dieser Blickwinkel fehlt in der Prüfung.';

function unique(list) {
  return [...new Set(list)];
}

function angles(review, names) {
  return names.map((name) => (name === VERIFIER ? 'Nachprüfung' : reviewerLabel(review, name))).join(', ');
}

function instanceName(review, name) {
  return INSTANCE_NAMES[name] ?? `Der Prüfer für ${reviewerLabel(review, name)}`;
}

function attemptNote(review, id, used) {
  const [kind, ...rest] = id.split(':');
  const name = rest.join(':');
  if (kind === 'buendelung') return used >= 2 ? 'Die Bündelung der Fragen konnte nicht korrigiert werden.' : 'Die Bündelung der Fragen musste korrigiert werden.';
  const label = instanceName(review, name);
  if (used === 1) return `${label} hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt.`;
  if (used === 2) return `${label} musste neu gestartet werden, weil die Antwort nicht gültig war.`;
  return `${label} ist ausgefallen. ${IMPACTS[name] ?? REVIEWER_IMPACT}`;
}

function notesOf(options) {
  const prepared = readJson(path.join(options.workspace, 'hinweise.json'), []);
  const attempts = Object.entries(readAttempts(options.workspace)).map(([id, used]) => attemptNote(options.review, id, used));
  return [...prepared, ...attempts];
}

function scoutIndex(options) {
  const index = new Map();
  for (const dir of [BEFORE, ROUND_ONE, ROUND_TWO]) {
    for (const entry of scoutTexts(readLines(path.join(options.workspace, dir, 'scout.md')))) index.set(`${entry.severity} ${entry.location}`, entry);
  }
  return index;
}

// `group` ist eine Einstufung-Gruppe (items) oder eine OpenGroup (consequence, scoutKey).
function described(group, index) {
  const found = index.get(group.scoutKey ?? `${ICON[group.color]} ${collapse(group.label)}`);
  if (found?.title && found.description) return { title: found.title, description: found.description, recommendation: found.recommendation ?? null };
  const consequence = group.consequence ?? group.items?.[0]?.finding?.consequence ?? '';
  return { title: group.label, description: fallbackDescription(consequence), recommendation: null };
}

// null: kein Urteil vorhanden.
function verdictOk(verdicts, keys) {
  const found = keys.map((key) => verdicts.get(key)).filter(Boolean);
  return found.length === 0 ? null : found.every((verdict) => verdict === 'erledigt');
}

function reworkChanges(options, data, ctx) {
  if (data.failed.includes('nacharbeit')) return [];
  return ctx.rework.results.filter((entry) => entry?.status === 'changed' && typeof entry.location === 'string').flatMap((entry) => {
    const key = placeKey(entry.location);
    const group = (data.one?.groups ?? []).find((candidate) => candidate.key === key && candidate.color === 'red');
    if (!group) return [];
    const texts = described(group, ctx.index);
    return [{
      ok: verdictOk(ctx.verdicts, [key]), title: texts.title, angles: angles(options.review, group.reviewers), description: texts.description,
      change: entry.change ?? '', evidence: entry.evidence ?? null, choice: null,
    }];
  });
}

function answeredBundles(ctx) {
  return ctx.bundles.filter((bundle) => Array.isArray(bundle?.places)).map((bundle) => {
    const keys = bundle.places.map(placeKey).filter((key) => ctx.answers.has(key));
    return { bundle, keys, entries: keys.map((key) => ctx.answers.get(key)) };
  }).filter((item) => item.keys.length > 0);
}

function answeredChanges(options, ctx) {
  return answeredBundles(ctx).map(({ bundle, keys, entries }) => ({
    ok: verdictOk(ctx.verdicts, keys), title: bundle.title, angles: angles(options.review, bundle.reviewers ?? []),
    description: unique(entries.map((entry) => entry.change)).join(' '), change: null, evidence: null, choice: null,
  }));
}

function decisionsOf(ctx) {
  return answeredBundles(ctx).map(({ bundle, entries }) => ({ title: bundle.title, decision: unique(entries.map((entry) => entry.decision)).join('; ') }));
}

function followupChanges(options, ctx) {
  return ctx.followup.gewaehlt.flatMap((chosen) => {
    const key = placeKey(chosen.stelle);
    const saved = ctx.saved.find((group) => group.number === chosen.nummer);
    const result = ctx.rework.results.find((entry) => typeof entry?.location === 'string' && placeKey(entry.location) === key);
    if (!saved || result?.status !== 'changed') return [];
    const texts = described(fromSaved(saved), ctx.index);
    return [{
      ok: verdictOk(ctx.verdicts, [key]), title: texts.title, angles: angles(options.review, saved.reviewers), description: texts.description,
      change: result.change ?? '', evidence: result.evidence ?? null, choice: chosen.vorschlag,
    }];
  });
}

function questionLines(options, data, ctx) {
  if (options.review === 'plan-review') return data.questions.map((question) => shorten(question.question, SHORT));
  const lines = data.questions.map((question) => {
    const bundle = ctx.bundles.find((candidate) => Array.isArray(candidate?.places) && candidate.places.some((place) => placeKey(place) === question.key));
    return bundle ? `**${bundle.title}** (betrifft: ${bundle.affects})` : `**${question.place}**: ${shorten(question.question, SHORT)}`;
  });
  return unique(lines);
}

function reviewerCount(one) {
  const named = one?.reviewers ?? unique((one?.groups ?? []).flatMap((group) => group.reviewers));
  return Math.max(1, named.length);
}

function failedLabel(options, name) {
  return FAILED_LABELS[name] ?? reviewerLabel(options.review, name);
}

function context(options, data) {
  const followup = readJson(path.join(options.workspace, 'followup.json'), null);
  const { value } = readAgentJson(path.join(options.workspace, options.source, 'rework.json'));
  const rework = { results: Array.isArray(value?.results) ? value.results : [], questions: Array.isArray(value?.questions) ? value.questions : [] };
  const answered = readAgentJson(path.join(options.workspace, ROUND_ONE, 'antworten.json')).value?.results;
  const answers = new Map((Array.isArray(answered) ? answered : [])
    .filter((entry) => entry?.status === 'answered' && typeof entry.location === 'string').map((entry) => [placeKey(entry.location), entry]));
  return {
    index: scoutIndex(options), verdicts: verdictMap(data.two), rework, bundles: rework.questions, answers, followup,
    saved: followup ? loadGroups(path.join(options.workspace, BEFORE)) : [],
  };
}

// renderReportText leitet die Art des Berichts aus dem Status ab; ein unbekannter Status würde als "Bereit" erscheinen.
function assertKnownStatus(status) {
  if (!VALID_STATUS.test(status)) throw new FlowError(`Unbekannter Berichtsstatus: ${status}`);
}

// Der Followup-Status zählt nur die Gruppen dieses Followups; nicht gewählte gesicherte 🔴 bleiben trotzdem Hindernisse.
function openRedOf(data, ctx, open) {
  const listed = open.filter((group) => group.color === 'red').length;
  return ctx.followup ? Math.max(data.openRed, listed) : data.openRed;
}

// Gleiche Dateien und Schlüssel wie writeClosing: Nur Gruppen mit Scout-Block landen in abschluss/scout.md und damit bei `alle`.
function openEntry(options, ctx, group) {
  return { color: group.color, ...described(group, ctx.index), angles: angles(options.review, group.reviewers), hasProposal: ctx.index.has(group.scoutKey) };
}

function buildInput(options, data, status, open) {
  assertKnownStatus(status);
  const ctx = context(options, data);
  return {
    review: options.review, followup: ctx.followup !== null, title: options.title, artifact: options.artifact, spec: options.spec,
    topic: topicOf(readText(options.doc)), status, openRed: openRedOf(data, ctx, open), reviewerCount: reviewerCount(data.one),
    reworked: data.reworked, verified: data.checked, chosenCount: ctx.followup?.gewaehlt.length ?? 0,
    failedLabels: data.failed.map((name) => failedLabel(options, name)),
    changes: ctx.followup ? followupChanges(options, ctx) : [...reworkChanges(options, data, ctx), ...answeredChanges(options, ctx)],
    decisions: ctx.followup ? [] : decisionsOf(ctx), questions: questionLines(options, data, ctx),
    open: open.map((group) => openEntry(options, ctx, group)),
    notes: notesOf(options),
  };
}

module.exports = { buildInput };
