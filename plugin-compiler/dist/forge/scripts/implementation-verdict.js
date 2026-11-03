#!/usr/bin/env node
'use strict';

// Urteil eines Reviewer-Berichts der Umsetzung: `URTEIL <wert> ROT=<n> GELB=<n>` (bei der Übergabe dazu `BEHEBEN=<n>`).
// Der Bericht kommt als Datei oder, mit `-`, über stdin. Exit 1, wenn die Urteilszeile fehlt oder nicht lesbar ist.

const fs = require('node:fs');
const { verdictOf, verdictLine } = require('./lib/implementation-verdict');

const USAGE = 'Aufruf: node implementation-verdict.js <bericht.md | ->   (- liest den Bericht über stdin)\n';

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  let text;
  try {
    text = fs.readFileSync(args[0] === '-' ? 0 : args[0], 'utf8');
  } catch {
    process.stderr.write(`dv-forge implementation-verdict: Bericht nicht lesbar: ${args[0]}\n`);
    process.exit(1);
  }
  const result = verdictOf(text);
  if (result.problem) {
    process.stderr.write(`dv-forge implementation-verdict: ${result.problem}\n`);
    process.exit(1);
  }
  process.stdout.write(`${verdictLine(result)}\n`);
}

if (require.main === module) main();
