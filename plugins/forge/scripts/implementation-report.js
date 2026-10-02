#!/usr/bin/env node
'use strict';

// Abschlussbericht des Implementierungs-Reviews: `ENDE <status>`, `=== BERICHT ===`, Klartext; schreibt <W>/abschluss/.

const path = require('node:path');
const { buildReport } = require('./lib/implementation-report');
const { FlowError } = require('./lib/flow-error');

const REQUIRED = ['--dir', '--workspace', '--plan', '--bereich', '--paket'];
const USAGE = 'Aufruf: node implementation-report.js --dir <runden-ordner> --workspace <W> --plan <plan.md> --bereich <basis> --paket <datei>\n';

function parse(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!REQUIRED.includes(args[index]) || index + 1 >= args.length) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  return REQUIRED.every((option) => values[option.slice(2)]) ? values : null;
}

function main() {
  const values = parse(process.argv.slice(2));
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${buildReport({
      dir: path.resolve(values.dir), workspace: path.resolve(values.workspace), plan: path.resolve(values.plan),
      planArg: values.plan, range: values.bereich, packageFile: path.resolve(values.paket),
    })}\n`);
  } catch (error) {
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge implementation-report: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
