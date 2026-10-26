#!/usr/bin/env node
'use strict';

// Abschlussbericht des Implementierungs-Reviews: Bericht (.md) und Bericht-Daten (.json) gehen in die Ablage der Etappe, die
// prepare.js im Arbeitsbereich festgelegt hat; stdout `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`; schreibt <W>/abschluss/.
// `followup`: Bericht eines Implementierungs-Followups; die Antwort des Re-Reviewers kommt über stdin. Dazu die Zeile `BEHALTEN <x>`.

const fs = require('node:fs');
const path = require('node:path');
const { buildReport } = require('./lib/implementation-report');
const { buildFollowupReport } = require('./lib/implementation-followup-report');
const { FlowError } = require('./lib/flow-error');

const MODES = {
  report: { required: ['--dir', '--workspace', '--plan', '--bereich', '--paket'], optional: [] },
  followup: { required: ['--workspace'], optional: ['--ohne', '--hinweis'] },
};
const USAGE = [
  'Aufruf: node implementation-report.js --dir <runden-ordner> --workspace <W> --plan <plan.md> --bereich <basis> --paket <datei>',
  '       node implementation-report.js followup --workspace <W> [--ohne blockiert|keine-aenderung] [--hinweis <zeile>]   (Antwort des Re-Reviewers über stdin)',
  '',
].join('\n');

class UsageError extends Error {}

// Gibt die Werte oder null zurück (falscher Aufruf, nur die Aufrufzeile); ein unbekannter Parameter wirft mit eigener Meldung.
function parse(mode, args) {
  const { required, optional } = MODES[mode];
  const known = [...required, ...optional];
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (String(name).startsWith('--') && !known.includes(name)) throw new UsageError(`unbekannter Parameter: ${name}`);
    if (!known.includes(name) || index + 1 >= args.length) return null;
    values[name.slice(2)] = args[index + 1];
  }
  return required.every((option) => values[option.slice(2)]) ? values : null;
}

function run(mode, values) {
  if (mode === 'followup') {
    return buildFollowupReport({
      workspace: path.resolve(values.workspace), note: values.hinweis, without: values.ohne, answer: values.ohne ? '' : fs.readFileSync(0, 'utf8'),
    });
  }
  return buildReport({
    dir: path.resolve(values.dir), workspace: path.resolve(values.workspace), plan: path.resolve(values.plan),
    planArg: values.plan, range: values.bereich, packageFile: path.resolve(values.paket),
  });
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0] === 'followup' ? 'followup' : 'report';
  let values;
  try {
    values = parse(mode, mode === 'followup' ? args.slice(1) : args);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`${error.message}\n${USAGE}`);
    process.exit(2);
  }
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
