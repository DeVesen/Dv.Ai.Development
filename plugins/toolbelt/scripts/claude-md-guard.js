#!/usr/bin/env node
'use strict';

// Mechanische Hilfen für claude-md-audit: Zeichenzahl, Backup, Diff und Hash-Vergleich geschützter Blöcke.

const { GuardError, readText, charCount, makeBackup } = require('./lib/claude-md-guard');

const USAGE = [
  'Aufruf: node claude-md-guard.js size <datei>',
  '        node claude-md-guard.js backup <datei> [--to <pfad>]',
].join('\n') + '\n';

function parse(args) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    if (!args[index].startsWith('--')) {
      positional.push(args[index]);
      continue;
    }
    if (args[index + 1] === undefined) throw new GuardError(`Option ${args[index]} braucht einen Wert`);
    flags[args[index].slice(2)] = args[index + 1];
    index += 1;
  }
  return { positional, flags };
}

// Jeder Befehl liefert den Text für stdout; `null` heißt falscher Aufruf.
const COMMANDS = {
  size: ([file]) => (file ? `${file}: ${charCount(readText(file))} Zeichen` : null),
  backup: ([file], flags) => (file ? `Backup: ${makeBackup(file, flags.to)}` : null),
};

function main(argv) {
  const [command, ...rest] = argv;
  const run = COMMANDS[command];
  if (!run) {
    process.stderr.write(USAGE);
    return 2;
  }
  try {
    const { positional, flags } = parse(rest);
    const output = run(positional, flags);
    if (output === null) {
      process.stderr.write(USAGE);
      return 2;
    }
    process.stdout.write(output.replace(/\n?$/, '\n'));
    return 0;
  } catch (error) {
    if (!(error instanceof GuardError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, parse };
