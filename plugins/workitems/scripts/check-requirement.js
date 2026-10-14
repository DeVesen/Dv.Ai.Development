#!/usr/bin/env node
'use strict';

// Prüft einen Stand-Block aus Datei oder Stdin gegen limits.json.
// Exit 0: keine Fehler (Warnungen zählen nur mit --strict), 1: Fehler, 2: falscher Aufruf oder kaputte Konfiguration.

const fs = require('node:fs');
const path = require('node:path');
const { check, reportLines } = require('./lib/check-requirement');

const DEFAULT_LIMITS = path.join(__dirname, '..', 'skills', 'requirement-definition', 'limits.json');
const USAGE = 'Aufruf: node check-requirement.js [--limits <limits.json>] [--strict] [<stand-block.md>]\n';

function parseArguments(argv) {
  const options = { limits: DEFAULT_LIMITS, strict: false, file: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--strict') options.strict = true;
    else if (argument === '--limits' && argv[index + 1]) options.limits = argv[++index];
    else if (argument.startsWith('--') || options.file) return null;
    else options.file = argument;
  }
  return options;
}

function readInput(file) {
  return fs.readFileSync(file ?? 0, 'utf8');
}

function main(argv) {
  const options = parseArguments(argv);
  if (!options) {
    process.stderr.write(USAGE);
    return 2;
  }
  let findings;
  try {
    const limits = JSON.parse(fs.readFileSync(options.limits, 'utf8'));
    findings = check(readInput(options.file), limits);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  process.stdout.write(`${reportLines(findings).join('\n')}\n`);
  const failing = findings.filter((item) => item.level === 'error' || options.strict);
  return failing.length === 0 ? 0 : 1;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, parseArguments };
