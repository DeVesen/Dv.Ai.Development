#!/usr/bin/env node
'use strict';

// Der eine Abschlussbericht eines Orchestrators aus den Berichtsdaten seines eingebetteten Reviews und Followups.
// Schreibt den Bericht nach `--out`; stdout `BERICHT <datei>`, `=== BERICHT ===`, Klartext.

const fs = require('node:fs');
const path = require('node:path');
const { mergeReports } = require('./lib/orchestrator-report');
const { renderOrchestratorReport, renderAbortReport } = require('./lib/orchestrator-report-text');
const { FlowError } = require('./lib/flow-error');
const { writeText } = require('./lib/flow-files');

const REQUIRED = {
  spec: ['--review', '--out', '--spec', '--commit'],
  plan: ['--review', '--out', '--plan', '--spec', '--stand'],
  implementation: ['--review', '--out', '--plan', '--spec', '--worktree', '--branch', '--pruefung'],
};
const OPTIONAL = ['--followup', '--wi', '--fakten', '--ohne-weiter'];
// Ein Lauf, der vor dem Review endet, hat weder Review-Daten noch Worktree oder Prüfergebnis: nur Grund und Bericht-Datei sind Pflicht.
const ABORT_REQUIRED = ['--out', '--abbruch'];
const MAX_FOLLOWUPS = 2;
const CHECKS = ['gruen', 'rot', 'keine'];
const USAGE = [
  'Aufruf: node orchestrator-report.js --art spec --review <json> [--followup <json>]... --out <md> --spec <S> --commit <text> [--wi <nr>] [--fakten <datei>] [--ohne-weiter ja]',
  '       node orchestrator-report.js --art plan --review <json> [--followup <json>]... --out <md> --plan <P> --spec <S> --stand <text> [--wi <nr>] [--fakten <datei>]',
  '       node orchestrator-report.js --art implementation --review <json> [--followup <json>]... --out <md> --plan <P> --spec <S> --worktree <R> --branch <name> --pruefung gruen|rot|keine [--wi <nr>] [--fakten <datei>]',
  '       node orchestrator-report.js --art spec|plan|implementation --abbruch <grund> --out <md> [--spec <S>] [--plan <P>] [--wi <nr>] [--fakten <datei>]',
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
  if ((followups?.length ?? 0) > MAX_FOLLOWUPS) throw new UsageError(`--followup höchstens ${MAX_FOLLOWUPS} Mal`);
  if (!REQUIRED[values['--art']]) throw new UsageError(`--art erlaubt: ${Object.keys(REQUIRED).join(', ')}`);
  const aborted = Object.hasOwn(values, '--abbruch');
  const required = aborted ? ABORT_REQUIRED : REQUIRED[values['--art']];
  const optional = aborted ? ['--spec', '--plan', '--wi', '--fakten'] : OPTIONAL;
  const unknown = Object.keys(values).filter((name) => name !== '--art' && !required.includes(name) && !optional.includes(name));
  if (unknown.length > 0) throw new UsageError(`Unbekannt für --art ${values['--art']}: ${unknown.join(', ')}`);
  const missing = required.filter((name) => !values[name]);
  if (missing.length > 0) throw new UsageError(`fehlt: ${missing.join(', ')}`);
  if (values['--pruefung'] && !CHECKS.includes(values['--pruefung'])) throw new UsageError(`--pruefung erlaubt: ${CHECKS.join(', ')}`);
  if (values['--ohne-weiter'] !== undefined && values['--ohne-weiter'] !== 'ja') throw new UsageError('--ohne-weiter erlaubt: ja');
  return values;
}

// Faktenzeilen des Orchestrators (Branch, Commits, Prüfergebnis, Abweichungen) stehen unverändert im Abschlussbericht.
function factLines(file) {
  if (!file) return [];
  if (!fs.existsSync(file)) throw new FlowError(`Faktendatei fehlt: ${file}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).filter((line) => line !== '');
}

function run(values) {
  if (values['--abbruch']) {
    const facts = { spec: values['--spec'], plan: values['--plan'], wi: values['--wi'], lines: factLines(values['--fakten']) };
    const text = renderAbortReport(values['--art'], values['--abbruch'], facts);
    const out = path.resolve(values['--out']);
    writeText(out, text);
    return [`BERICHT ${out}`, '=== BERICHT ===', text].join('\n');
  }
  const report = mergeReports({ art: values['--art'], reviewFile: path.resolve(values['--review']), followupFiles: (values['--followup'] ?? []).map((file) => path.resolve(file)) });
  const facts = {
    spec: values['--spec'], plan: values['--plan'], wi: values['--wi'], commit: values['--commit'], stand: values['--stand'],
    worktree: values['--worktree'], branch: values['--branch'], check: values['--pruefung'], lines: factLines(values['--fakten']), ohneWeiter: values['--ohne-weiter'] === 'ja',
  };
  const text = renderOrchestratorReport(report, facts);
  const out = path.resolve(values['--out']);
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
