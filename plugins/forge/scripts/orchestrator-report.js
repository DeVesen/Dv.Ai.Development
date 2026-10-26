#!/usr/bin/env node
'use strict';

// Der eine Abschlussbericht eines Orchestrators aus den Bericht-Daten seines Reviews und Followups in der Ablage.
// Schreibt den Bericht nach `--out`; stdout `BERICHT <datei>`, `=== BERICHT ===`, Klartext.

const fs = require('node:fs');
const path = require('node:path');
const { mergeReports, REVIEW_OF_ART } = require('./lib/orchestrator-report');
const { renderOrchestratorReport, renderAbortReport } = require('./lib/orchestrator-report-text');
const { FlowError } = require('./lib/flow-error');
const { maxFollowups } = require('./lib/orchestrator-rules');
const { writeText } = require('./lib/flow-files');

const REQUIRED = ['--review', '--out'];
const OPTIONAL = ['--followup', '--fakten'];
// Ein Lauf, der vor dem Review endet, hat keine Review-Daten: nur Grund und Bericht-Datei sind Pflicht.
const ABORT_REQUIRED = ['--out', '--abbruch'];
const ABORT_OPTIONAL = ['--fakten'];
const USAGE = [
  'Aufruf: node orchestrator-report.js --art spec|plan|implementation --review <json> [--followup <json>]... --out <md> [--fakten <datei>]',
  '       node orchestrator-report.js --art spec|plan|implementation --abbruch <grund> --out <md> [--fakten <datei>]',
  '',
].join('\n');

class UsageError extends Error {}

function parse(args) {
  const values = {};
  let followups = null;
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index]?.startsWith('--') || index + 1 >= args.length) throw new UsageError(`Unvollständiges Argument: ${args[index]}`);
    if (args[index] === '--followup') (followups ??= []).push(args[index + 1]);
    else values[args[index]] = args[index + 1];
  }
  if (followups) values['--followup'] = followups;
  const max = maxFollowups();
  if ((followups?.length ?? 0) > max) throw new UsageError(`--followup höchstens ${max} Mal`);
  if (!Object.hasOwn(REVIEW_OF_ART, values['--art'])) throw new UsageError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}`);
  const aborted = Object.hasOwn(values, '--abbruch');
  const required = aborted ? ABORT_REQUIRED : REQUIRED;
  const optional = aborted ? ABORT_OPTIONAL : OPTIONAL;
  const unknown = Object.keys(values).filter((name) => name !== '--art' && !required.includes(name) && !optional.includes(name));
  if (unknown.length > 0) throw new UsageError(`unbekannter Parameter: ${unknown.join(', ')}`);
  const missing = required.filter((name) => !values[name]);
  if (missing.length > 0) throw new UsageError(`fehlt: ${missing.join(', ')}`);
  return values;
}

// Faktenzeilen des Orchestrators (Branch, Commits, Prüfergebnis, Abweichungen) stehen unverändert im Abschlussbericht.
function factLines(file) {
  if (!file) return [];
  if (!fs.existsSync(file)) throw new FlowError(`Faktendatei fehlt: ${file}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).filter((line) => line !== '');
}

function run(values) {
  const facts = { lines: factLines(values['--fakten']) };
  const out = path.resolve(values['--out']);
  const text = values['--abbruch']
    ? renderAbortReport(values['--art'], values['--abbruch'], facts)
    : renderOrchestratorReport(mergeReports({ art: values['--art'], reviewFile: path.resolve(values['--review']), followupFiles: (values['--followup'] ?? []).map((file) => path.resolve(file)) }), facts);
  writeText(out, text);
  return [`BERICHT ${out}`, '=== BERICHT ===', text].join('\n');
}

function main() {
  try {
    process.stdout.write(`${run(parse(process.argv.slice(2)))}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    if (!(error instanceof FlowError)) throw error;
    process.stderr.write(`dv-forge orchestrator-report: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { run, parse, UsageError };
