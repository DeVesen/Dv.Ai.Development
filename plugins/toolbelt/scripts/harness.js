#!/usr/bin/env node
'use strict';

// Mechanische Schritte für harness-refactoring: Startprüfung, Zielerkennung, Scope-Prüfung, Paketordner und Paketprüfung.

const fs = require('node:fs');
const os = require('node:os');
const { classifyPath, resolveTarget, scopeLine, loadScopeContext } = require('./lib/harness-scope');
const { inventoryOf, matchTargets, itemLine } = require('./lib/harness-inventory');
const { HarnessError, gitRootOf, currentBranch, readFeedback, checkInput, dateOf, createPackage } = require('./lib/harness-package');
const { checkPackage } = require('./lib/harness-check');

const USAGE = [
  'Aufruf: node harness.js start [--ziel <pfad-oder-name>]... [--rueckmeldung <datei>] [--text]',
  '        node harness.js ziele --rueckmeldung <datei>',
  '        node harness.js ziele --alle',
  '        node harness.js scope <pfad>...',
  '        node harness.js paket <zielname>... [--datum <JJJJ-MM-TT>]',
  '        node harness.js pruefe <paketordner>',
].join('\n') + '\n';

const SWITCHES = new Set(['text', 'alle']);

function parse(args) {
  const positional = [];
  const flags = { ziel: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (SWITCHES.has(name)) {
      flags[name] = true;
      continue;
    }
    if (args[index + 1] === undefined) throw new HarnessError(`Option ${arg} braucht einen Wert`);
    if (name === 'ziel') flags.ziel.push(args[index + 1]);
    else flags[name] = args[index + 1];
    index += 1;
  }
  return { positional, flags };
}

function repoRootOf(cwd) {
  const root = gitRootOf(cwd);
  if (root === null) throw new HarnessError(`Abbruch: ${cwd} liegt in keinem Git-Repo.`);
  return root;
}

function contextOf(cwd) {
  return loadScopeContext(repoRootOf(cwd), os.homedir());
}

function pruefe([folder], flags, cwd) {
  if (!folder) return null;
  const context = contextOf(cwd);
  if (!fs.existsSync(folder)) throw new HarnessError(`Paketordner fehlt: ${folder}`);
  const { errors, warnings } = checkPackage(folder, {
    classify: (file) => classifyPath(resolveTarget(file, context), context),
    inGit: (file) => gitRootOf(resolveTarget(file, context)) !== null,
    currentBranch: currentBranch(context.repoRoot),
  });
  const verdict = errors.length === 0 ? 'Paket gültig' : `Paket ungültig: ${errors.length} Fehler`;
  return { output: [...errors.map((text) => `FEHLER ${text}`), ...warnings.map((text) => `WARNUNG ${text}`), verdict].join('\n'), code: errors.length === 0 ? 0 : 1 };
}

// Jeder Befehl liefert den Text für stdout oder { output, code }; `null` heißt falscher Aufruf.
const COMMANDS = {
  start: (positional, flags, cwd) => {
    const root = repoRootOf(cwd);
    checkInput({ ziele: flags.ziel, rueckmeldung: flags.rueckmeldung, text: flags.text === true });
    return `REPO=${root}\nBRANCH=${currentBranch(root)}`;
  },
  ziele: (positional, flags, cwd) => {
    if (!flags.rueckmeldung && flags.alle !== true) return null;
    const context = contextOf(cwd);
    const inventory = inventoryOf(context);
    if (flags.alle === true) return [`INVENTAR=${inventory.length}`, ...inventory.map(itemLine)].join('\n');
    const hits = matchTargets(readFeedback(flags.rueckmeldung), inventory, context.repoRoot);
    return [`TREFFER=${hits.length}`, ...hits.map(itemLine)].join('\n');
  },
  scope: (positional, flags, cwd) => {
    if (positional.length === 0) return null;
    const context = contextOf(cwd);
    return positional.map((file) => scopeLine(file, classifyPath(resolveTarget(file, context), context))).join('\n');
  },
  paket: (positional, flags, cwd) => {
    if (positional.length === 0) return null;
    return `PAKET=${createPackage(repoRootOf(cwd), positional, flags.datum ?? dateOf(new Date()))}`;
  },
  pruefe,
};

function main(argv, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  const run = COMMANDS[command];
  if (!run) {
    process.stderr.write(USAGE);
    return 2;
  }
  try {
    const { positional, flags } = parse(rest);
    const result = run(positional, flags, cwd);
    if (result === null) {
      process.stderr.write(USAGE);
      return 2;
    }
    const { output, code } = typeof result === 'string' ? { output: result, code: 0 } : result;
    process.stdout.write(output.replace(/\n?$/, '\n'));
    return code;
  } catch (error) {
    if (!(error instanceof HarnessError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, parse };
