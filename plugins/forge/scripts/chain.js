#!/usr/bin/env node
'use strict';

// Ketten-Einträge schreiben, nachschlagen und entfernen. Ausgabe und Fehler in Klartext.

const { ChainError, STAGES, writeEntry, readEntry, removeByWorktree } = require('./lib/chain');

const USAGE = [
  'Aufruf: node chain.js write --stage spec --spec <spec> [--wi <nr>]',
  '       node chain.js write --stage plan --plan <plan> --spec <spec> [--wi <nr>]',
  '       node chain.js write --stage implementation --plan <plan> --spec <spec> --worktree <ordner> --branch <name> [--wi <nr>]',
  '       node chain.js lookup --stage <spec|plan|implementation> (--spec <spec> | --plan <plan>)',
  '       node chain.js remove --worktree <ordner>',
  '',
].join('\n');
const VALUE_OPTIONS = ['--stage', '--spec', '--plan', '--wi', '--worktree', '--branch'];
const SHOWN = ['stage', 'slug', 'spec', 'plan', 'wi', 'worktree', 'branch'];
const NO_ENTRY = 'KEIN EINTRAG';

class UsageError extends Error {}

function parseOptions(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!VALUE_OPTIONS.includes(args[index]) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${args[index]}`);
    values[args[index].slice(2)] = args[index + 1];
  }
  return values;
}

function required(values, name) {
  if (!values[name]) throw new UsageError(`--${name} fehlt`);
  return values[name];
}

function stageOf(values) {
  const stage = required(values, 'stage');
  if (!STAGES.includes(stage)) throw new UsageError(`--stage erlaubt: ${STAGES.join(', ')}; nicht ${stage}`);
  return stage;
}

function renderEntry(entry) {
  return SHOWN.filter((key) => entry[key] !== undefined).map((key) => `${key}=${entry[key]}`).join('\n');
}

const COMMANDS = {
  write: (values) => {
    const entry = writeEntry({ stage: stageOf(values), spec: values.spec, plan: values.plan, wi: values.wi, worktree: values.worktree, branch: values.branch });
    return `EINTRAG ${entry.stage} ${entry.slug}`;
  },
  lookup: (values) => {
    const stage = stageOf(values);
    const entry = readEntry({ stage, artifact: required(values, stage === 'spec' ? 'spec' : 'plan') });
    return entry ? renderEntry(entry) : NO_ENTRY;
  },
  remove: (values) => `ENTFERNT ${removeByWorktree(process.cwd(), required(values, 'worktree'))}`,
};

function run(args) {
  const [command, ...rest] = args;
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
    if (!(error instanceof ChainError)) throw error;
    process.stderr.write(`dv-forge chain: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { run, UsageError, NO_ENTRY };
