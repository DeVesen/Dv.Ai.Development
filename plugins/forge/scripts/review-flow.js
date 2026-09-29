#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isReview } = require('./lib/rules');
const { isKind, nextAttempt } = require('./lib/attempts');
const { rateRoundOne } = require('./lib/round-one');
const { snapshot, writeReworkInput } = require('./lib/rework-input');
const { checkRework, checkAnswers } = require('./lib/rework-check');
const { checkScout } = require('./lib/scout-check');
const { writeScriptChecks } = require('./lib/script-checks');
const { LEGACY_USAGE, LegacyUsageError, isLegacyCommand, runLegacy } = require('./lib/flow-legacy');
const { ROUND_ONE, FOLLOWUP, FlowError } = require('./lib/flow-files');

const USAGE = [
  'Aufruf: node review-flow.js rate --review <spec-review|plan-review> --dir <W> --doc <datei> [--spec <datei>] --expect <a,b> [--beratend <a,b>]',
  '       node review-flow.js attempt --dir <W> --instanz <name> [--art instanz|buendelung]',
  '       node review-flow.js scout-check --dir <runden-ordner>',
  '       node review-flow.js snapshot --dir <W> --doc <datei>',
  '       node review-flow.js rework-input --review <..> --dir <W> --doc <datei>',
  '       node review-flow.js rework-check --review <..> --dir <W> --doc <datei> [--quelle runde-1|nacharbeit]',
  '       node review-flow.js answers-check --review spec-review --dir <W> --doc <datei>',
  '       node review-flow.js script-checks --review <..> --dir <W> --doc <datei> [--spec <datei>]',
  '',
].join('\n');
const VALUE_OPTIONS = ['--review', '--dir', '--doc', '--spec', '--expect', '--beratend', '--instanz', '--art', '--quelle', '--titel', '--artefakt'];
const SOURCES = [ROUND_ONE, FOLLOWUP];
// Namen werden Dateinamen im Arbeitsbereich: kein `.`, kein Pfadtrenner.
const INSTANCE_NAME = /^[\p{Ll}\d]+(?:-[\p{Ll}\d]+)*$/u;

class UsageError extends Error {}

function parseOptions(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!VALUE_OPTIONS.includes(args[index]) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${args[index]}`);
    values[args[index].slice(2)] = args[index + 1];
  }
  return values;
}

function list(value) {
  return String(value ?? '').split(',').map((name) => name.trim()).filter(Boolean);
}

function required(values, name) {
  if (!values[name]) throw new UsageError(`--${name} fehlt`);
  return values[name];
}

function checkedName(name, option) {
  if (!INSTANCE_NAME.test(name)) throw new UsageError(`--${option}: ungültiger Name: ${name}`);
  return name;
}

function names(value, option) {
  return list(value).map((name) => checkedName(name, option));
}

function existing(file, label) {
  if (!fs.existsSync(file)) throw new FlowError(`${label} nicht gefunden: ${file}`);
  return path.resolve(file);
}

// Gemeinsame Optionen der Schritte, die ein Review und sein Dokument brauchen.
function flowOptions(values) {
  const review = required(values, 'review');
  if (!isReview(review)) throw new UsageError(`--review erlaubt: spec-review, plan-review; nicht ${review}`);
  const source = values.quelle ?? ROUND_ONE;
  if (!SOURCES.includes(source)) throw new UsageError(`--quelle erlaubt: ${SOURCES.join(', ')}`);
  return {
    review, source,
    workspace: path.resolve(required(values, 'dir')),
    doc: existing(required(values, 'doc'), 'Dokument'),
    spec: values.spec ? existing(values.spec, 'Spec') : null,
  };
}

function attempt(values) {
  const kind = values.art ?? 'instanz';
  if (!isKind(kind)) throw new UsageError(`--art erlaubt: instanz, buendelung; nicht ${kind}`);
  return nextAttempt(path.resolve(required(values, 'dir')), checkedName(required(values, 'instanz'), 'instanz'), kind);
}

const COMMANDS = {
  rate: (values) => rateRoundOne({ ...flowOptions(values), expected: names(required(values, 'expect'), 'expect'), advisory: names(values.beratend, 'beratend') }),
  attempt,
  'scout-check': (values) => checkScout(path.resolve(required(values, 'dir'))),
  snapshot: (values) => snapshot(path.resolve(required(values, 'dir')), existing(required(values, 'doc'), 'Dokument')),
  'rework-input': (values) => writeReworkInput(flowOptions(values)),
  'rework-check': (values) => checkRework(flowOptions(values)),
  'answers-check': (values) => checkAnswers(flowOptions(values)),
  'script-checks': (values) => writeScriptChecks(flowOptions(values)),
};

// Aufrufe mit Positionsargumenten gehören zum älteren Ablauf, den flow.md und die Skills noch nutzen.
function isLegacyCall(command, rest) {
  return isLegacyCommand(command) && !String(rest[0] ?? '').startsWith('--');
}

// Der ältere Ablauf meldete jeden Fehler mit Exit 1; das bleibt, bis seine Schritte abgelöst sind.
function runLegacyCall(command, rest) {
  try {
    return runLegacy(command, rest);
  } catch (error) {
    if (error instanceof LegacyUsageError) throw new UsageError(error.message);
    throw error instanceof FlowError ? error : new FlowError(error.message);
  }
}

function run(args) {
  const [command, ...rest] = args;
  if (isLegacyCall(command, rest)) return runLegacyCall(command, rest);
  if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`Unbekannter Schritt: ${command ?? '-'}`);
  return COMMANDS[command](parseOptions(rest));
}

function main() {
  try {
    process.stdout.write(`${run(process.argv.slice(2))}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}${LEGACY_USAGE}`);
      process.exit(2);
    }
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge review-flow: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { run, UsageError };
