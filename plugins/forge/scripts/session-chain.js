#!/usr/bin/env node
'use strict';

// Werkzeug der Leit-Session und der Etappen-Sessions einer Session-Kette. Ausgabe: Zeilen `<NAME>=<Wert>`, danach bei Bedarf
// ein Block nach `=== AUSGABE ===`, `=== ZUSTAND ===`, `=== HINTERGRUND ===` oder `=== BRIEF ===`, den der Aufrufer unverändert nutzt.

const path = require('node:path');
const { SessionChainError, slugOfArtifact, readState, writeState } = require('./lib/session-chain-store');
const { answerHalt, startEtappe, checkGo } = require('./lib/session-chain-gate');
const { storeFiles } = require('./lib/session-chain-ablage');
const { EntryError, analyseEntry } = require('./lib/session-chain-entry');
const { buildBrief } = require('./lib/session-chain-brief');
const { parseStatusLine, turnAction, readTurns, writeTurns } = require('./lib/session-chain-turn');
const { commitFor } = require('./lib/session-chain-commit');
const { goCall, adoptedText, noStatusHint } = require('./lib/session-chain-text');
const { etappeReport, readInput } = require('./lib/session-chain-report');
const { setState, holdAt, processFinal, closing, recordCommit } = require('./lib/session-chain-steps');

const USAGE = [
  'Aufruf: node session-chain.js entry [<codewort> <pfade>... [workitem-nr]]',
  '       node session-chain.js set --slug <slug> [--basis <branch>] [--wi <nr>] [--spec <S>] [--plan <P>] [--worktree <R>]',
  '       node session-chain.js brief --etappe <etappe> [--slug <slug>] [--kontext <datei>] [--quelle <datei>] [--basis <branch>] [--wi <nr>] [--erneut]',
  '       node session-chain.js turn --session <id> --etappe <etappe> --turn-datei <datei>',
  '       node session-chain.js final --etappe <etappe> --session <id> --bericht <datei> --commit <hash|none> [--basis <branch>] [--wi <nr>]',
  '       node session-chain.js halt --slug <slug> --art spec|go',
  '       node session-chain.js answer --slug <slug> --antwort <planning|spec-nacharbeit|go|plan-nacharbeit|weiter|stopp>',
  '       node session-chain.js commit --anlass spec|go --slug <slug> --message <betreff>',
  '       node session-chain.js schluss --slug <slug> [--stopp]',
  '       node session-chain.js store --etappe <etappe> (--spec <S> | --plan <P>) [--neu] --datei <datei>...',
  '       node session-chain.js etappe-report --etappe <etappe> (--slug <slug> | --spec <S>) [--bericht <datei>] [--entscheidung <text>]... [--datei <pfad>]...',
  '              [--tests <text>] [--anhang <datei>]... [--plan <P>] [--worktree <R>] [--branch <name>] [--pruefung gruen|rot|keine | --pruefung-datei <pruefung.json>] [--luecke <befehl>]... [--ac-ohne-test <AC>]...',
  '',
].join('\n');
const VALUE_OPTIONS = ['--slug', '--basis', '--wi', '--spec', '--plan', '--worktree', '--etappe', '--kontext', '--quelle', '--session', '--turn-datei', '--bericht',
  '--commit', '--art', '--anlass', '--message', '--antwort', '--datei', '--entscheidung', '--tests', '--anhang', '--branch', '--pruefung', '--luecke', '--ac-ohne-test', '--pruefung-datei'];
const LIST_OPTIONS = ['--datei', '--entscheidung', '--anhang', '--luecke', '--ac-ohne-test'];
const FLAG_OPTIONS = ['--neu', '--stopp', '--erneut'];
const CHECKS = ['gruen', 'rot', 'keine'];

class UsageError extends Error {}

function parseOptions(args) {
  const values = Object.fromEntries(LIST_OPTIONS.map((name) => [name.slice(2), []]));
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (FLAG_OPTIONS.includes(name)) {
      values[name.slice(2)] = true;
      continue;
    }
    if (!VALUE_OPTIONS.includes(name) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${name}`);
    index += 1;
    if (LIST_OPTIONS.includes(name)) values[name.slice(2)].push(args[index]);
    else values[name.slice(2)] = args[index];
  }
  return values;
}

function required(values, name) {
  if (!values[name]) throw new UsageError(`--${name} fehlt`);
  return values[name];
}

function fieldLines(fields) {
  return Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${value}`);
}

function withBlock(lines, marker, text) {
  return text ? [...lines, `=== ${marker} ===`, text] : lines;
}

function entry(args) {
  const { fields, state } = analyseEntry(args, process.cwd());
  return withBlock(fieldLines(fields), 'ZUSTAND', state ? adoptedText(state) : '').join('\n');
}

function brief(values) {
  const state = values.slug ? readState(process.cwd(), values.slug) : null;
  const chain = { ...(state ?? {}), ...(values.slug ? { slug: values.slug } : {}), ...(values.basis ? { basis: values.basis } : {}), ...(values.wi ? { wi: values.wi } : {}) };
  const result = buildBrief({
    etappe: required(values, 'etappe'),
    values: { slug: chain.slug, wi: chain.wi, basis: chain.basis, spec: chain.spec, plan: chain.plan, worktree: chain.worktree, branch: chain.branch, quelle: values.quelle },
    decisions: state?.entscheidungen ?? [],
    kontext: values.kontext ? readInput(values.kontext, 'Kontext') : null,
  });
  // Erst nach dem gebauten Brief: Ein fehlender Pflichtwert hinterlässt keinen gestarteten Zustand.
  if (state) writeState(process.cwd(), state.slug, startEtappe(state, values.etappe, { erneut: values.erneut === true }));
  return [`MODELL=${result.modell}`, `TITEL=${result.titel}`, '=== HINTERGRUND ===', result.hintergrund, '=== BRIEF ===', result.brief].join('\n');
}

// Das Turn-Ende einer Etappen-Session kommt als Datei: sein Text stammt aus einer fremden Session und gehört nie auf die Kommandozeile.
function turn(values) {
  const session = required(values, 'session');
  const parsed = parseStatusLine(readInput(required(values, 'turn-datei'), 'Turn-Ende'));
  const { aktion, ohneStatus } = turnAction(readTurns(process.cwd(), session), parsed);
  writeTurns(process.cwd(), session, ohneStatus);
  const lines = [`AKTION=${aktion}`, ...Object.entries(parsed ?? {}).map(([key, value]) => `${key.toUpperCase()}=${value}`)];
  return withBlock(lines, 'AUSGABE', aktion === 'hinweis' ? noStatusHint({ etappe: required(values, 'etappe'), session }) : '').join('\n');
}

function final(values) {
  const result = processFinal({
    etappe: required(values, 'etappe'), session: required(values, 'session'), bericht: required(values, 'bericht'), commit: required(values, 'commit'), basis: values.basis, wi: values.wi,
  }, process.cwd());
  const lines = [`SLUG=${result.slug}`, `ERGEBNIS=${result.ergebnis}`, `WEITER=${result.weiter}`, `HALTEPUNKT=${result.haltepunkt}`, ...result.geprueft.map((line) => `GEPRUEFT=${line}`)];
  return withBlock(lines, 'AUSGABE', result.text).join('\n');
}

function stateOf(slug) {
  const state = readState(process.cwd(), slug);
  if (!state) throw new SessionChainError(`Kein Zustand für ${slug}`);
  return state;
}

function halt(values) {
  const art = required(values, 'art');
  if (!['spec', 'go'].includes(art)) throw new UsageError('--art erlaubt: spec, go');
  return ['=== AUSGABE ===', holdAt(required(values, 'slug'), art, process.cwd())].join('\n');
}

function commit(values) {
  const slug = required(values, 'slug');
  const anlass = required(values, 'anlass');
  const state = stateOf(slug);
  if (anlass === 'go') checkGo(state);
  const result = commitFor(anlass, process.cwd(), state, required(values, 'message'));
  if (result.commit) recordCommit(slug, result.commit, anlass, process.cwd());
  return [
    result.commit ? `COMMIT=${result.commit.hash} ${result.commit.dateien.join(' ')}` : 'COMMIT=keiner',
    ...result.nichtCommittet.map((file) => `NICHT-COMMITTET=${file} (keine Markdown-Datei)`),
    ...(anlass === 'go' ? [`AUFRUF=${goCall(state)}`] : []),
  ].join('\n');
}

// Antwort des Menschen am Haltepunkt; erst danach startet `brief` die gewählte Etappe.
function answer(values) {
  const slug = required(values, 'slug');
  const state = answerHalt(stateOf(slug), required(values, 'antwort'));
  writeState(process.cwd(), slug, state);
  return `FREIGABE=${state.freigabe.halt} ${state.freigabe.antwort}`;
}

function schluss(values) {
  return ['=== AUSGABE ===', closing(required(values, 'slug'), values.stopp === true, process.cwd())].join('\n');
}

function store(values) {
  const artifact = values.spec ? { spec: values.spec } : { plan: required(values, 'plan') };
  const dir = path.dirname(path.resolve(values.spec ?? values.plan));
  if (values.datei.length === 0) throw new UsageError('--datei fehlt');
  return `ABLAGE=${storeFiles({ dir, slug: slugOfArtifact(artifact), etappe: required(values, 'etappe'), files: values.datei.map((file) => path.resolve(file)), fresh: values.neu === true })}`;
}

// Prüfergebnis aus der Datei von verify-run.js statt als Angabe der Etappe; `docker` (Tests nur ohne Docker rot) gilt als grün.
function checkFromFile(file) {
  const { ergebnis } = JSON.parse(readInput(file, 'Prüfergebnis'));
  if (!['gruen', 'rot', 'docker', 'keine'].includes(ergebnis)) throw new UsageError(`--pruefung-datei ohne gültiges ergebnis: ${file}`);
  return ergebnis === 'docker' ? 'gruen' : ergebnis;
}

function report(values) {
  if (!values.slug && !values.spec) throw new UsageError('--slug oder --spec fehlt');
  if (values['pruefung-datei']) {
    const fromFile = checkFromFile(values['pruefung-datei']);
    if (values.pruefung && values.pruefung !== fromFile) throw new UsageError(`--pruefung ${values.pruefung} widerspricht --pruefung-datei (${fromFile})`);
    values.pruefung = fromFile;
  }
  if (values.pruefung && !CHECKS.includes(values.pruefung)) throw new UsageError(`--pruefung erlaubt: ${CHECKS.join(', ')}`);
  const file = etappeReport({
    etappe: required(values, 'etappe'), slug: values.slug, spec: values.spec, bericht: values.bericht, entscheidungen: values.entscheidung, dateien: values.datei,
    tests: values.tests, anhang: values.anhang.map((item) => path.resolve(item)), plan: values.plan, worktree: values.worktree, branch: values.branch,
    pruefung: values.pruefung, luecken: values.luecke, acOhneTest: values['ac-ohne-test'],
  }, process.cwd());
  return `BERICHT=${file}`;
}

function set(values) {
  const state = setState({ slug: required(values, 'slug'), basis: values.basis, wi: values.wi, spec: values.spec, plan: values.plan, worktree: values.worktree }, process.cwd());
  return `ZUSTAND=${state.slug}`;
}

const COMMANDS = { set, brief, turn, final, halt, answer, commit, schluss, store, 'etappe-report': report };

function run(args) {
  const [command, ...rest] = args;
  if (command === 'entry') return entry(rest);
  if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`Unbekannter Befehl: ${command ?? '-'}`);
  return COMMANDS[command](parseOptions(rest));
}

function main() {
  try {
    process.stdout.write(`${run(process.argv.slice(2))}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    if (!(error instanceof SessionChainError) && !(error instanceof EntryError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { run, UsageError };
