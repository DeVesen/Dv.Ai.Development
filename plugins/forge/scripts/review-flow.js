#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { normalizeLocation } = require('./aggregate-findings');
const { parseScout, parseRework } = require('./followup');
const units = require('./lib/document-units');
const rules = require('./lib/review-rules');
const groupsLib = require('./lib/review-groups');
const questions = require('./lib/flow-questions');
const flowReport = require('./lib/flow-report');
const { readContext } = require('./workspace');

const KINDS = ['spec-review', 'plan-review'];
const SNAPSHOT = 'dokument-vorher.md';
const VERDICTS = ['erledigt', 'nicht erledigt'];
const SCOUT_HEADING = /^### (🔴|🟡|🟢) (.+?)\s*$/u;
const USAGE = [
  'Aufruf: node review-flow.js round1 <art> <dokument> <arbeitsbereich> <aktiv>',
  '       node review-flow.js scout-check <arbeitsbereich> <1|2>',
  '       node review-flow.js rework-check <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js answers-check <arbeitsbereich>',
  '       node review-flow.js checklist <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js followup-checklist <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js verify <art> <dokument> <arbeitsbereich>',
  '       node review-flow.js finish <art> <dokument> <arbeitsbereich> --title <titel> [--ausgefallen <liste>]',
  '',
].join('\n');

class UsageError extends Error {}

function roundDir(workspace, round) {
  return path.join(workspace, `runde-${round}`);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readJson(file) {
  try {
    return { value: JSON.parse(readText(file)) };
  } catch (error) {
    return { error: fs.existsSync(file) ? `ungültiges JSON: ${error.message}` : `Datei fehlt: ${path.basename(file)}` };
  }
}

function readState(file) {
  return fs.existsSync(file) ? JSON.parse(readText(file)) : null;
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function yesNo(value) {
  return value ? 'ja' : 'nein';
}

function errorLines(problems) {
  return problems.map((problem) => `ERROR ${problem}`);
}

// Offene Fragen am Lauf-Anfang: nur im Spec-Review; Spec-Rückfragen früherer Läufe eines Plan-Reviews sind nicht Teil des Ablaufs.
function earlierOpen(kind, text) {
  return kind === 'spec-review' ? units.openQuestions(text).map(({ key, canon, question }) => ({ key, canon, question })) : [];
}

function readReviews(dir, names, kind) {
  const entries = [];
  const failed = [];
  const errors = [];
  for (const name of names) {
    const { value, error } = readJson(path.join(dir, `${name}.json`));
    const problem = error ?? rules.reviewProblem(value, kind, name);
    if (problem) {
      failed.push(name);
      errors.push(`${name}: ${problem}`);
      continue;
    }
    for (const finding of value.findings) entries.push({ reviewer: name, finding });
  }
  return { entries, failed, errors };
}

function reworkInput(state, scoutBlocks = new Map()) {
  const red = state.groups.filter((group) => group.color === 'red');
  const redPart = red.length === 0 ? ['Keine 🔴-Stellen.'] : red.map((group) => {
    const block = scoutBlocks.get(`🔴 ${group.key}`);
    return [groupsLib.groupBlock(group), ...(block ? ['Scout-Vorschläge:', ...block.slice(1)] : [])].join('\n');
  });
  const openPart = state.open.length === 0 ? ['Keine.'] : state.open.map((question) => `- ${question.key} — ${question.question}`);
  return ['# Nacharbeit', '', '## 🔴-Stellen', '', redPart.join('\n\n'), '', '## Offene Fragen aus früheren Läufen', '', ...openPart, ''].join('\n');
}

// Eingaben der Skript-Prüfungen: das geprüfte Dokument und, was prepare.js im Arbeitsbereich festhält.
function scriptContext(doc, workspace) {
  const { spec = null, repo = null } = readContext(workspace);
  return { doc, spec, repo };
}

function roundOne(kind, doc, workspace, active, checks = groupsLib.SCRIPT_CHECKS[kind]) {
  const dir = roundDir(workspace, 1);
  const text = readText(doc);
  write(path.join(workspace, SNAPSHOT), text);
  const { entries, failed, errors } = readReviews(dir, active, kind);
  const open = earlierOpen(kind, text);
  const openKeys = new Set(open.map((question) => question.canon));
  const { groups, dropped } = groupsLib.classify([...entries, ...groupsLib.runScriptChecks(text, checks, scriptContext(doc, workspace))], { kind, text, openKeys });
  const counts = groupsLib.countColors(groups);
  const scoutGroups = groups.filter((group) => group.color === 'yellow' || (counts.red > 0 && group.color === 'red'));
  const state = { kind, groups, dropped, open, counts, failed };
  writeJson(path.join(dir, 'runde.json'), state);
  write(path.join(dir, 'aggregate.md'), `=== REPORT ===\n${groupsLib.table(groups)}\n${groupsLib.reworkSection(groups)}`);
  write(path.join(dir, 'scout-input.md'), groupsLib.reworkSection(scoutGroups));
  write(path.join(dir, 'nacharbeit.md'), reworkInput(state));
  return [
    `RUNDE1 rot=${counts.red} gelb=${counts.yellow} gruen=${counts.green} fragen=${open.length} ausgefallen=${failed.join(',') || '-'}`,
    ...errorLines(errors),
    `NEXT scout=${yesNo(scoutGroups.length > 0)} nacharbeit=${yesNo(counts.red > 0 || open.length > 0)}`,
  ].join('\n');
}

function scoutBlocksOf(text) {
  const blocks = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const heading = SCOUT_HEADING.exec(line);
    if (heading) {
      current = [line];
      blocks.set(`${heading[1]} ${heading[2]}`, current);
    } else if (current) {
      current.push(line);
    }
  }
  for (const block of blocks.values()) while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();
  return blocks;
}

function scoutProblems(inputText, scoutText) {
  const wanted = parseRework(inputText.split('\n'));
  const given = parseScout(scoutText.split('\n'));
  const problems = [];
  for (const group of wanted) {
    const hit = given.filter((candidate) => candidate.severity === group.severity && candidate.location === group.location);
    const name = `${group.severity} ${group.location}`;
    if (hit.length !== 1) problems.push(`${name}: ${hit.length === 0 ? 'keine' : 'mehrere'} Scout-Gruppen`);
    else if (hit[0].proposals.length < 1 || hit[0].proposals.length > 3) problems.push(`${name}: ${hit[0].proposals.length} Vorschläge statt 1 bis 3`);
    else if (!(hit[0].preferred >= 1 && hit[0].preferred <= hit[0].proposals.length)) problems.push(`${name}: kein gültiger bevorzugter Vorschlag`);
  }
  for (const group of given) {
    if (!wanted.some((candidate) => candidate.severity === group.severity && candidate.location === group.location)) {
      problems.push(`${group.severity} ${group.location}: Scout-Gruppe ohne Eingabe`);
    }
  }
  return problems;
}

function scoutCheck(workspace, round) {
  const dir = roundDir(workspace, round);
  const scoutFile = path.join(dir, 'scout.md');
  if (!fs.existsSync(scoutFile)) return 'SCOUT ungueltig\nERROR Datei fehlt: scout.md';
  const scoutText = readText(scoutFile);
  const problems = scoutProblems(readText(path.join(dir, 'scout-input.md')), scoutText);
  if (problems.length > 0) return ['SCOUT ungueltig', ...errorLines(problems)].join('\n');
  if (round === '1') write(path.join(dir, 'nacharbeit.md'), reworkInput(readState(path.join(dir, 'runde.json')), scoutBlocksOf(scoutText)));
  return 'SCOUT ok';
}

function redKeys(state) {
  return state.groups.filter((group) => group.color === 'red').map((group) => group.key);
}

function reworkCheck(kind, doc, workspace) {
  const dir = roundDir(workspace, 1);
  const state = readState(path.join(dir, 'runde.json'));
  const { value, error } = readJson(path.join(dir, 'rework.json'));
  const invalid = error ? [error] : questions.reworkProblems(value, kind, redKeys(state));
  if (invalid.length > 0) return ['NACHARBEIT ungueltig', ...errorLines(invalid)].join('\n');
  const bundle = questions.bundleProblems(value, kind, state.open);
  if (bundle.length > 0) return ['NACHARBEIT buendelung', ...errorLines(bundle)].join('\n');
  const asked = questions.numbered(value.questions ?? []);
  writeJson(path.join(dir, 'fragen.json'), asked);
  const halt = kind === 'spec-review' && asked.length > 0;
  const lines = [`NACHARBEIT ok fragen=${asked.length} anhalten=${yesNo(halt)}`];
  if (asked.length > 0) {
    write(path.join(dir, 'fragen.md'), questions.formatQuestions(asked));
    if (halt) lines.push('=== FRAGEN ===', questions.formatQuestions(asked).trimEnd());
  }
  return lines.join('\n');
}

function answersCheck(workspace) {
  const dir = roundDir(workspace, 1);
  const asked = readState(path.join(dir, 'fragen.json')) ?? [];
  const { value, error } = readJson(path.join(dir, 'antworten.json'));
  const problems = error ? [error] : questions.answersProblems(value, asked);
  return problems.length > 0 ? ['ANTWORTEN ungueltig', ...errorLines(problems)].join('\n') : 'ANTWORTEN ok';
}

// Fragen, die die Nacharbeit in diesem Lauf gestellt hat; sie bleiben offen, weil niemand sie im Lauf beantwortet.
function askedInRun(results, kind, asked) {
  return results.filter((result) => result.status === questions.QUESTION_STATUS[kind]).map((result) => {
    const canon = normalizeLocation(result.location);
    const bundled = asked.find((question) => question.locations.some((location) => normalizeLocation(location) === canon));
    return { key: result.location.trim(), canon, question: bundled?.question ?? result.rationale ?? '' };
  });
}

// Im Spec-Review zählt das Dokument (R-Eintrag ohne späteren W-Eintrag), im Plan-Review die Spec-Rückfragen des Laufs.
function openNow(kind, text, rework, asked) {
  if (kind === 'spec-review') return units.openQuestions(text).map(({ key, canon, question }) => ({ key, canon, question }));
  return askedInRun(rework.results, kind, asked);
}

function outcomeLine(rework, key) {
  const result = rework.results.find((candidate) => normalizeLocation(candidate.location) === normalizeLocation(key));
  return result ? `Nacharbeit: ${result.status}${result.rationale ? ` — ${result.rationale}` : ''}` : 'Nacharbeit: kein Ausgang';
}

function checklistText(items, changed) {
  const points = items.filter((item) => !item.script).map((item) => [`### ${item.key}`, `Herkunft: ${item.origin}`, ...item.details].join('\n'));
  return ['# Prüfliste', '', '## Punkte', '', points.length === 0 ? 'Keine Punkte.' : points.join('\n\n'), '',
    '## Geänderte Bereiche', '', ...(changed.length === 0 ? ['Keine geänderten Bereiche.'] : changed.map((unit) => `- ${unit.key}`)), ''].join('\n');
}

function writeChecklist(workspace, doc, items, open) {
  const changed = units.changedUnits(readText(path.join(workspace, SNAPSHOT)), readText(doc));
  const verifier = items.some((item) => !item.script) || changed.length > 0;
  const dir = roundDir(workspace, 2);
  writeJson(path.join(dir, 'pruefliste.json'), { items, changed, open, nachpruefer: verifier });
  write(path.join(dir, 'pruefliste.md'), checklistText(items, changed));
  const scripted = items.filter((item) => item.script).length;
  return `PRUEFLISTE punkte=${items.length - scripted} skript=${scripted} geaendert=${changed.length} nachpruefer=${yesNo(verifier)}`;
}

function checklist(kind, doc, workspace) {
  const dir = roundDir(workspace, 1);
  const state = readState(path.join(dir, 'runde.json'));
  const rework = readState(path.join(dir, 'rework.json'));
  const asked = readState(path.join(dir, 'fragen.json')) ?? [];
  const open = openNow(kind, readText(doc), rework, asked);
  const openCanon = new Set(open.map((question) => question.canon));
  const items = state.groups.filter((group) => group.color === 'red' && !openCanon.has(group.canon)).map((group) => ({
    key: group.key, canon: group.canon, origin: 'Finding aus Runde 1',
    script: groupsLib.hasScript(group),
    details: [...group.items.map(groupsLib.itemLine), outcomeLine(rework, group.key)],
  }));
  for (const question of asked) {
    for (const location of question.locations) {
      const canon = normalizeLocation(location);
      if (openCanon.has(canon) || items.some((item) => item.canon === canon)) continue;
      items.push({ key: location, canon, origin: 'beantwortete Frage', script: false, details: [`Frage: ${question.question}`] });
    }
  }
  return writeChecklist(workspace, doc, items, open);
}

function followupChecklist(kind, doc, workspace) {
  const dir = path.join(workspace, 'nacharbeit');
  const chosen = parseRework(readText(path.join(dir, 'aggregate.md')).split('\n'));
  const { value, error } = readJson(path.join(dir, 'rework.json'));
  const results = value?.results;
  const invalid = error ? [error] : !Array.isArray(results) ? ['results fehlt']
    : [...results.map((result) => questions.resultProblem(result, kind)).filter(Boolean), ...questions.coverageProblems(results, chosen.map((group) => group.location))];
  if (invalid.length > 0) return ['PRUEFLISTE ungueltig', ...errorLines(invalid)].join('\n');
  const open = askedInRun(results, kind, []);
  const openCanon = new Set(open.map((question) => question.canon));
  const items = chosen.filter((group) => !openCanon.has(normalizeLocation(group.location))).map((group) => ({
    key: group.location, canon: normalizeLocation(group.location), origin: 'gewählter Vorschlag', script: false,
    details: [...group.findings, outcomeLine(value, group.location)],
  }));
  return writeChecklist(workspace, doc, items, open);
}

function verifierProblems(result, kind, aiItems) {
  if (result === null || typeof result !== 'object') return ['Ergebnis ist kein JSON-Objekt'];
  if (result.reviewer !== 'verifier') return [`reviewer ${String(result.reviewer)} passt nicht zu verifier`];
  if (!Array.isArray(result.verdicts) || !Array.isArray(result.findings)) return ['verdicts oder findings fehlt'];
  const problems = [];
  for (const verdict of result.verdicts) {
    if (!VERDICTS.includes(verdict?.verdict) || typeof verdict?.rationale !== 'string' || verdict.rationale.trim() === '') {
      problems.push(`Urteil zu ${String(verdict?.location)} braucht verdict erledigt|nicht erledigt und rationale`);
    }
  }
  problems.push(...questions.coverageProblems(result.verdicts.filter((verdict) => typeof verdict?.location === 'string'), aiItems.map((item) => item.key))
    .map((problem) => problem.replace('Ausgang', 'Urteil')));
  for (const finding of result.findings) {
    const problem = rules.findingProblem(finding, kind);
    if (problem) problems.push(problem);
  }
  return problems;
}

// Skript-Punkte und jede Stelle, an der jetzt ein roter Skript-Befund steht, entscheidet das Skript, nicht der Nachprüfer.
function scriptVerdict(item, redScript) {
  const reported = redScript.has(item.canon);
  const rationale = reported ? `Skript-Prüfung meldet die Stelle${item.script ? ' erneut' : ''}` : 'Skript-Prüfung meldet die Stelle nicht mehr';
  return { key: item.key, script: true, verdict: reported ? 'nicht erledigt' : 'erledigt', rationale };
}

function verify(kind, doc, workspace, checks = groupsLib.SCRIPT_CHECKS[kind]) {
  const dir = roundDir(workspace, 2);
  const list = readState(path.join(dir, 'pruefliste.json'));
  const aiItems = list.items.filter((item) => !item.script);
  let result = { verdicts: [], findings: [] };
  if (list.nachpruefer) {
    const { value, error } = readJson(path.join(dir, 'verifier.json'));
    const problems = error ? [error] : verifierProblems(value, kind, aiItems);
    if (problems.length > 0) return ['NACHPRUEFUNG ungueltig', ...errorLines(problems)].join('\n');
    result = value;
  }
  const text = readText(doc);
  const verification = { checklist: new Set(list.items.map((item) => item.canon)), changed: new Set(list.changed.map((unit) => unit.canon)) };
  const entries = [...result.findings.map((finding) => ({ reviewer: 'verifier', finding })), ...groupsLib.runScriptChecks(text, checks, scriptContext(doc, workspace))];
  const { groups, dropped } = groupsLib.classify(entries, { kind, text, openKeys: new Set(list.open.map((question) => question.canon)), verification });
  const redScript = new Set(groups.filter((group) => group.color === 'red' && groupsLib.hasScript(group)).map((group) => group.canon));
  const verdicts = list.items.map((item) => {
    if (item.script || redScript.has(item.canon)) return scriptVerdict(item, redScript);
    const verdict = result.verdicts.find((candidate) => normalizeLocation(candidate.location) === item.canon);
    return { key: item.key, script: false, verdict: verdict.verdict, rationale: verdict.rationale };
  });
  const counts = groupsLib.countColors(groups);
  const offen = verdicts.filter((verdict) => !verdict.script && verdict.verdict === 'nicht erledigt').length + counts.red;
  const hints = groups.filter((group) => group.color === 'yellow');
  writeJson(path.join(dir, 'nachpruefung.json'), { verdicts, groups, dropped, offen });
  write(path.join(dir, 'aggregate.md'), `=== REPORT ===\n${groupsLib.table(groups)}\n${groupsLib.reworkSection(groups)}`);
  write(path.join(dir, 'scout-input.md'), groupsLib.reworkSection(hints));
  return [`NACHPRUEFUNG ok offen=${offen} hinweise=${hints.length}`, `NEXT scout=${yesNo(hints.length > 0)}`].join('\n');
}

// Hinweise des Laufs mit ihren Scout-Vorschlägen für followup.js save; ohne Hinweise gibt es keine Sicherung.
function writeHints(workspace, roundOneState, verification) {
  const target = path.join(workspace, 'bericht');
  fs.rmSync(target, { recursive: true, force: true });
  const later = verification?.groups.filter((group) => group.color === 'yellow') ?? [];
  const earlier = (roundOneState?.groups ?? []).filter((group) => group.color === 'yellow' && !later.some((other) => other.canon === group.canon));
  const hints = [...earlier.map((group) => ({ group, round: 1 })), ...later.map((group) => ({ group, round: 2 }))];
  const blocks = hints.map(({ group, round }) => {
    const file = path.join(roundDir(workspace, round), 'scout.md');
    return fs.existsSync(file) ? scoutBlocksOf(readText(file)).get(`🟡 ${group.key}`) : null;
  });
  if (hints.length === 0 || blocks.some((block) => !block)) return;
  write(path.join(target, 'aggregate.md'), groupsLib.reworkSection(hints.map(({ group }) => group)));
  write(path.join(target, 'scout.md'), ['## Scout-Vorschläge', '', blocks.map((block) => block.join('\n')).join('\n\n'), ''].join('\n'));
}

function finish(kind, doc, workspace, title, failed) {
  const roundOneState = readState(path.join(roundDir(workspace, 1), 'runde.json'));
  const list = readState(path.join(roundDir(workspace, 2), 'pruefliste.json'));
  const verification = readState(path.join(roundDir(workspace, 2), 'nachpruefung.json'));
  const asked = readState(path.join(roundDir(workspace, 1), 'fragen.json')) ?? [];
  const reworked = [path.join(roundDir(workspace, 1), 'rework.json'), path.join(workspace, 'nacharbeit', 'rework.json')].some((file) => fs.existsSync(file));
  const open = list?.open ?? roundOneState?.open ?? [];
  const status = flowReport.statusOf({ failed, open, verification });
  writeHints(workspace, roundOneState, verification);
  const text = flowReport.report({ title, artifact: doc, status, roundOne: roundOneState, verification, reworked, open, asked });
  return [`STATUS ${status}`, '=== BERICHT ===', text.trimEnd()].join('\n');
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function kindOf(value) {
  if (!KINDS.includes(value)) throw new UsageError(`Unbekannte Art: ${value}`);
  return value;
}

const COMMANDS = {
  round1: ([kind, doc, workspace, active]) => roundOne(kindOf(kind), doc, workspace, String(active ?? '').split(',').filter(Boolean)),
  'scout-check': ([workspace, round]) => {
    if (!['1', '2'].includes(round)) throw new UsageError('scout-check braucht die Runde 1 oder 2');
    return scoutCheck(workspace, round);
  },
  'rework-check': ([kind, doc, workspace]) => reworkCheck(kindOf(kind), doc, workspace),
  'answers-check': ([workspace]) => answersCheck(workspace),
  checklist: ([kind, doc, workspace]) => checklist(kindOf(kind), doc, workspace),
  'followup-checklist': ([kind, doc, workspace]) => followupChecklist(kindOf(kind), doc, workspace),
  verify: ([kind, doc, workspace]) => verify(kindOf(kind), doc, workspace),
  finish: ([kind, doc, workspace, ...rest]) => {
    const title = option(rest, '--title');
    if (!title) throw new UsageError('finish braucht --title');
    const failed = String(option(rest, '--ausgefallen') ?? '').split(',').map((name) => name.trim()).filter((name) => name && name !== '-');
    return finish(kindOf(kind), doc, workspace, title, failed);
  },
};

function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (!Object.hasOwn(COMMANDS, command) || args.length === 0 || args.some((arg) => arg === undefined)) throw new UsageError(`Unbekannter Befehl: ${command}`);
    process.stdout.write(`${COMMANDS[command](args)}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    process.stderr.write(`dv-forge review-flow: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { roundOne, scoutCheck, reworkCheck, answersCheck, checklist, followupChecklist, verify, finish, scoutProblems, SNAPSHOT };
