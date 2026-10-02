#!/usr/bin/env node
'use strict';

// Mechanische Hilfen für claude-md-audit: Zeichenzahl, Backup, Diff und Hash-Vergleich geschützter Blöcke.

const { GuardError, readText, charCount, makeBackup, unifiedDiff, blockHashes, verifyBlocks } = require('./lib/claude-md-guard');

const USAGE = [
  'Aufruf: node claude-md-guard.js size <datei>',
  '        node claude-md-guard.js backup <datei> [--to <pfad>]',
  '        node claude-md-guard.js diff <alt> <neu>',
  '        node claude-md-guard.js blocks hash <datei> --start <text> --end <text>',
  '        node claude-md-guard.js blocks verify <datei> --start <text> --end <text> --hashes <einträge>',
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

function blocksCommand([action, file], flags) {
  if (!['hash', 'verify'].includes(action) || !file || !flags.start || !flags.end) return null;
  const text = readText(file);
  if (action === 'hash') {
    const hashes = blockHashes(text, flags.start, flags.end);
    return `Blöcke: ${hashes.length}\nHashes: ${hashes.join(',')}`;
  }
  if (flags.hashes === undefined) return null;
  const expected = flags.hashes.split(',').filter(Boolean);
  const problems = verifyBlocks(text, flags.start, flags.end, expected);
  if (problems.length > 0) throw new GuardError(problems.join('\n'));
  return `Blöcke unverändert: ${expected.length}`;
}

// Jeder Befehl liefert den Text für stdout; `null` heißt falscher Aufruf.
const COMMANDS = {
  size: ([file]) => (file ? `${file}: ${charCount(readText(file))} Zeichen` : null),
  backup: ([file], flags) => (file ? `Backup: ${makeBackup(file, flags.to)}` : null),
  diff: ([before, after]) => (before && after ? unifiedDiff(readText(before), readText(after), before, after) || 'Keine Änderung' : null),
  blocks: blocksCommand,
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
