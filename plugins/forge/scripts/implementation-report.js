#!/usr/bin/env node
'use strict';

// Abschlussbericht des Implementierungs-Reviews: `ENDE <status>`, `=== BERICHT ===`, Klartext; schreibt <W>/abschluss/.
// Mit `--bericht <datei>` (eingebetteter Lauf): Berichtsdaten als JSON in die Datei, stdout `ENDE`, `ERGEBNIS`, `FOLLOWUP ja|nein`, `BERICHT <datei>`.
// `followup`: Bericht eines Implementierungs-Followups; die Antwort des Re-Reviewers kommt über stdin. Mit `--bericht` (eingebetteter Lauf) Berichtsdaten als JSON,
// mit `--artefakt` (Einzellauf) der Bericht nach `<W>/abschluss/bericht.md` und als Text nach `=== BERICHT ===`.

const fs = require('node:fs');
const path = require('node:path');
const { buildReport } = require('./lib/implementation-report');
const { buildFollowupReport } = require('./lib/implementation-followup-report');
const { readEntryFor } = require('./lib/chain');
const { FlowError } = require('./lib/flow-error');

const MODES = {
  report: { required: ['--dir', '--workspace', '--plan', '--bereich', '--paket'], optional: ['--bericht'] },
  followup: { required: ['--workspace'], optional: ['--bericht', '--artefakt', '--ohne', '--hinweis'] },
};
const USAGE = [
  'Aufruf: node implementation-report.js --dir <runden-ordner> --workspace <W> --plan <plan.md> --bereich <basis> --paket <datei> [--bericht <datei>]',
  '       node implementation-report.js followup --workspace <W> (--bericht <datei> | --artefakt <plan>) [--ohne blockiert|keine-aenderung] [--hinweis <zeile>]   (Antwort des Re-Reviewers über stdin)',
  '',
].join('\n');

function parse(mode, args) {
  const { required, optional } = MODES[mode];
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (![...required, ...optional].includes(args[index]) || index + 1 >= args.length) return null;
    values[args[index].slice(2)] = args[index + 1];
  }
  if (mode === 'followup' && !values.bericht && !values.artefakt) return null;
  return required.every((option) => values[option.slice(2)]) ? values : null;
}

function run(mode, values) {
  if (mode === 'followup') {
    return buildFollowupReport({
      workspace: path.resolve(values.workspace), reportFile: values.bericht ? path.resolve(values.bericht) : null, artifact: values.artefakt, note: values.hinweis,
      without: values.ohne, answer: values.ohne ? '' : fs.readFileSync(0, 'utf8'),
    });
  }
  return buildReport({
    dir: path.resolve(values.dir), workspace: path.resolve(values.workspace), plan: path.resolve(values.plan),
    planArg: values.plan, range: values.bereich, packageFile: path.resolve(values.paket),
    reportFile: values.bericht ? path.resolve(values.bericht) : undefined,
    chain: readEntryFor({ embedded: Boolean(values.bericht), stage: 'implementation', artifact: values.plan }),
  });
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] === 'followup' ? 'followup' : 'report';
  const values = parse(mode, mode === 'followup' ? args.slice(1) : args);
  if (!values) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${run(mode, values)}\n`);
  } catch (error) {
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge implementation-report: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
