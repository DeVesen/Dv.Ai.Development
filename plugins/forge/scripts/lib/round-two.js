'use strict';

const path = require('node:path');
const { placeKey, parsePlaces, changedPlaces } = require('./places');
const { findingProblem } = require('./rules');
const { openQuestions, wEntriesOf } = require('./questions');
const { groupRated, countColors, renderGroups } = require('./groups');
const { rateReviewer, scriptItems, droppedList } = require('./rated-items');
const { parseRework } = require('../followup');
const { ROUND_ONE, ROUND_TWO, readText, readLines, readJson, readAgentJson, writeText, writeJson } = require('./flow-files');

const VERDICTS = ['erledigt', 'nicht erledigt'];
const VERIFIER = 'nachprüfer';
const OUTCOME_LABELS = { changed: 'geändert', unchanged: 'nicht geändert', 'human-question': 'frage an den menschen', 'spec-question': 'spec-rückfrage' };

function sourceDir(options) {
  return path.join(options.workspace, options.source);
}

// Stellen mit offener Frage: in der Spec laut R- und W-Einträgen, im Plan die Spec-Rückfragen dieses Laufs.
function openKeysNow(options, text) {
  if (options.review === 'plan-review') return new Set(readJson(path.join(sourceDir(options), 'fragen.json'), []).map((question) => question.key));
  return new Set(openQuestions(text).map((question) => question.key));
}

function itemLines(items) {
  return items.map((item) => `- [${item.reviewer} · ${item.category}] ${item.finding.consequence}`);
}

function redItems(group) {
  const ai = group.items.filter((item) => !item.script);
  const script = group.items.filter((item) => item.script);
  return [
    ...(ai.length > 0 ? [{ key: group.key, label: group.label, source: 'ki', lines: itemLines(ai) }] : []),
    ...(script.length > 0 ? [{ key: group.key, label: group.label, source: 'skript', lines: itemLines(script) }] : []),
  ];
}

// Runde 1: die 🔴-Stellen; Folge-Modus: die gewählten Stellen.
function baseItems(options) {
  if (options.source === ROUND_ONE) {
    const { groups } = readJson(path.join(sourceDir(options), 'einstufung.json'));
    return groups.filter((group) => group.color === 'red').flatMap(redItems);
  }
  return parseRework(readLines(path.join(sourceDir(options), 'aggregate.md')))
    .map((group) => ({ key: placeKey(group.location), label: group.location, source: 'ki', lines: group.findings }));
}

function answeredItems(options, openKeys) {
  return readJson(path.join(sourceDir(options), 'fragen.json'), [])
    .filter((question) => !openKeys.has(question.key))
    .map((question) => ({ key: question.key, label: question.place, source: 'ki', lines: [`- Frage beantwortet: ${question.question}`] }));
}

function withoutDuplicates(items) {
  return items.filter((item, index) => items.findIndex((other) => other.key === item.key && other.source === item.source) === index);
}

function outcomeLine(entry) {
  const label = OUTCOME_LABELS[entry.status] ?? entry.status;
  return entry.reason ? `- Ausgang: ${label} — ${entry.reason}` : `- Ausgang: ${label}`;
}

// Ausgang der Nacharbeit je Stelle; so kann der Nachprüfer auch einen Ausgang nicht geändert samt Begründung werten.
function reworkOutcomes(options) {
  const { results } = readJson(path.join(sourceDir(options), 'rework.json'), { results: [] });
  return new Map(results.map((entry) => [placeKey(entry.location), outcomeLine(entry)]));
}

function pointText(item, outcomes) {
  const outcome = outcomes.has(item.key) ? [outcomes.get(item.key)] : [];
  return [`### ${item.label}`, ...item.lines, ...outcome].join('\n');
}

function renderChecklist(aiItems, changed, outcomes) {
  const points = aiItems.length > 0 ? aiItems.map((item) => pointText(item, outcomes)) : ['Keine Punkte.'];
  const areas = changed.length > 0 ? changed.map((label) => `- ${label}`) : ['Keine.'];
  return ['# Prüfliste', '', '## Punkte', '', points.join('\n\n'), '', '## Geänderte Bereiche', '', ...areas].join('\n');
}

// Prüfliste der Nachprüfung und geänderte Bereiche; Stellen mit offener Frage stehen nicht darauf.
function buildChecklist(options) {
  const text = readText(options.doc);
  const openKeys = openKeysNow(options, text);
  const base = baseItems(options).filter((item) => !openKeys.has(item.key));
  const items = withoutDuplicates([...base, ...answeredItems(options, openKeys)]);
  const changed = changedPlaces(readText(path.join(options.workspace, 'vorher.md')), text);
  const dir = path.join(options.workspace, ROUND_TWO);
  const aiItems = items.filter((item) => item.source === 'ki');
  writeJson(path.join(dir, 'pruefliste.json'), { items, changed });
  writeText(path.join(dir, 'pruefliste.md'), renderChecklist(aiItems, changed, reworkOutcomes(options)));
  const verifier = aiItems.length > 0 || changed.length > 0 ? 'ja' : 'nein';
  return `PRUEFLISTE punkte=${aiItems.length} skript=${items.length - aiItems.length} bereiche=${changed.length}\nNACHPRUEFER ${verifier}`;
}

function verdictProblem(verdicts, aiItems) {
  const wrong = verdicts.find((verdict) => typeof verdict?.location !== 'string' || !VERDICTS.includes(verdict.verdict) || typeof verdict.rationale !== 'string');
  if (wrong) return `Urteil ungültig: ${JSON.stringify(wrong)}`;
  const named = verdicts.map((verdict) => placeKey(verdict.location));
  const listed = new Set(aiItems.map((item) => item.key));
  // Urteile außerhalb der Prüfliste würden k in `nicht bereit, k × 🔴 offen` verfälschen.
  const extra = verdicts.filter((verdict, index) => !listed.has(named[index]));
  if (extra.length > 0) return `Urteil ohne Punkt der Prüfliste: ${extra.map((verdict) => verdict.location).join(', ')}`;
  const missing = aiItems.filter((item) => named.filter((key) => key === item.key).length !== 1);
  return missing.length > 0 ? `Urteil fehlt oder doppelt: ${missing.map((item) => item.label).join(', ')}` : null;
}

function verifierProblem(value, review, aiItems) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.verdicts) || !Array.isArray(value.findings)) return 'verdicts oder findings fehlt';
  return verdictProblem(value.verdicts, aiItems) ?? value.findings.map((finding) => findingProblem(finding, review)).find(Boolean) ?? null;
}

function readVerifier(dir, review, aiItems, needed) {
  if (!needed) return { verdicts: [], findings: [], problem: null };
  const { value, problem } = readAgentJson(path.join(dir, 'nachpruefung.json'));
  const invalid = problem ?? verifierProblem(value, review, aiItems);
  return invalid ? { problem: invalid } : { ...value, problem: null };
}

function scriptVerdicts(items, scripted) {
  return items.filter((item) => item.source === 'skript').map((item) => ({
    location: item.label, source: 'skript', rationale: 'Skript-Prüfung',
    verdict: scripted.some((finding) => finding.place.key === item.key) ? 'nicht erledigt' : 'erledigt',
  }));
}

// Nachprüfung auswerten: Urteile je Punkt, Findings herabstufen, Befunde der Skript-Prüfungen bleiben 🔴.
function verifyRoundTwo(options) {
  const dir = path.join(options.workspace, ROUND_TWO);
  const checklist = readJson(path.join(dir, 'pruefliste.json'));
  const aiItems = checklist.items.filter((item) => item.source === 'ki');
  const verifier = readVerifier(dir, options.review, aiItems, aiItems.length > 0 || checklist.changed.length > 0);
  if (verifier.problem) return `NACHPRUEFUNG ungültig: ${verifier.problem}`;
  const text = readText(options.doc);
  const places = parsePlaces(text);
  const context = {
    review: options.review, advisory: new Set(), wEntries: wEntriesOf(options), openKeys: openKeysNow(options, text),
    phase: 'nachpruefung', checklistKeys: new Set(checklist.items.map((item) => item.key)), changedKeys: new Set(checklist.changed.map(placeKey)),
  };
  const scripted = scriptItems(dir, places);
  const items = [...rateReviewer(VERIFIER, verifier.findings, places, context), ...scripted];
  const groups = groupRated(items.filter((item) => !item.dropped));
  const verdicts = [...verifier.verdicts.map((verdict) => ({ ...verdict, source: 'ki' })), ...scriptVerdicts(checklist.items, scripted)];
  const notDone = verifier.verdicts.filter((verdict) => verdict.verdict === 'nicht erledigt').length;
  const counts = countColors(groups);
  const openRed = notDone + counts.red;
  writeJson(path.join(dir, 'einstufung.json'), { verdicts, groups, dropped: droppedList(items), openRed });
  writeText(path.join(dir, 'scout-eingabe.md'), renderGroups(groups.filter((group) => group.color === 'yellow')));
  const scout = counts.yellow > 0 ? 'hinweise' : 'keiner';
  return `NACHPRUEFUNG ok offen=${openRed} hinweise=${counts.yellow}\nWEITER scout=${scout}`;
}

module.exports = { buildChecklist, verifyRoundTwo };
