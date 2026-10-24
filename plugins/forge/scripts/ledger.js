#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const { describeTasks, PlanError } = require('./plan-tasks');
const { parseLedger, checkLedger, metrics, nextStep } = require('./lib/ledger-lines');

const USAGE = 'Aufruf: node ledger.js archive <plan> <arbeitsbereich> | check <arbeitsbereich> [--plan <plan>] [--repo <R>] | next <plan> <arbeitsbereich>\n';
const JUDGEMENT = /^Urteil:/;
const DEFERRED = /^Task \d+: (?:zurückgestellt:|geparkt —|Bedenken:)/;
const FULL_RUN = /^Gesamtlauf:/;

class LedgerError extends Error {}

function archivePath(planPath) {
  const name = path.basename(planPath);
  const base = name.toLowerCase() === 'plan.md' ? 'umsetzung.md' : `${path.basename(name, path.extname(name))}-umsetzung.md`;
  return path.join(path.dirname(path.resolve(planPath)), base);
}

function readLines(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n') : [];
}

function shortHead(dir) {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '-';
}

// Stand der Umsetzung beim Archivieren und der letzte grüne Gesamtlauf: Das Review erkennt spätere Commits,
// Test-Reviewer und Abschluss sparen sich einen zweiten Lauf auf demselben Code.
function stateLines(planPath, ledger) {
  const runs = ledger.map((line) => line.trim()).filter((line) => FULL_RUN.test(line));
  return [`- Stand: ${shortHead(path.dirname(path.resolve(planPath)))}`, `- ${runs.at(-1) ?? 'Gesamtlauf: keiner'}`];
}

// Task-Nummern des Plans; null, wenn der Plan nicht lesbar ist oder keine lückenlosen Tasks hat.
function planTaskNumbers(planPath) {
  try {
    return describeTasks(planPath).map((task) => task.number);
  } catch (error) {
    if (error instanceof PlanError) return null;
    throw error;
  }
}

function figureLines(planPath, ledger) {
  const numbers = planTaskNumbers(planPath);
  const figures = metrics(parseLedger(ledger), numbers ? numbers.length : null);
  return [
    `- Tasks fertig: ${figures.fertig}/${figures.gesamt ?? '?'}`,
    `- Fix-Runden: ${figures.fixrunden}`,
    `- Urteile: ${figures.urteile}`,
    `- Geparkt: ${figures.geparkt}`,
    `- Zurückgestellt: ${figures.zurueckgestellt}`,
  ];
}

function buildArchive(planPath, workspace) {
  const ledger = readLines(path.join(workspace, 'progress.md'));
  if (ledger.length === 0) throw new LedgerError(`Kein Ledger in ${toPosix(workspace)}`);
  const report = fs.existsSync(path.join(workspace, 'abschluss.md'))
    ? fs.readFileSync(path.join(workspace, 'abschluss.md'), 'utf8').trim()
    : '-';
  const bullets = (pattern) => {
    const lines = ledger.filter((line) => pattern.test(line.trim())).map((line) => `- ${line.trim()}`);
    return lines.length > 0 ? lines : ['- keine'];
  };
  return [
    `# Umsetzung — ${ledger[0].replace(/^#\s*Ledger\s*—\s*/, '')}`,
    '',
    '## Abschlussbericht',
    report,
    '',
    '## Urteile',
    ...bullets(JUDGEMENT),
    '',
    '## Zurückgestellt und geparkt',
    ...bullets(DEFERRED),
    '',
    '## Stand',
    ...stateLines(planPath, ledger),
    '',
    '## Kennzahlen',
    ...figureLines(planPath, ledger),
    '',
  ].join('\n');
}

function archive(planPath, workspace) {
  const target = archivePath(planPath);
  fs.writeFileSync(target, buildArchive(planPath, workspace));
  return toPosix(target);
}

function ledgerLines(workspace) {
  return readLines(path.join(workspace, 'progress.md'));
}

// Optionen --plan und --repo nach dem Arbeitsbereich; alles andere ist ein falscher Aufruf.
function checkOptions(args) {
  const [workspace, ...rest] = args;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index];
    if (!['--plan', '--repo'].includes(name) || !rest[index + 1]) return null;
    options[name.slice(2)] = rest[index + 1];
  }
  return workspace ? { workspace, ...options } : null;
}

function check({ workspace, plan, repo }) {
  const lines = ledgerLines(workspace);
  if (lines.length === 0) throw new LedgerError(`Kein Ledger in ${toPosix(workspace)}`);
  const { parsed, problems } = checkLedger(lines, { repo });
  if (problems.length > 0) return { text: problems.map((entry) => `FEHLER ${entry.line}: ${entry.reason}`).join('\n'), exit: 1 };
  const numbers = plan ? planTaskNumbers(plan) : null;
  const figures = metrics(parsed, numbers ? numbers.length : null);
  const total = plan ? `/${figures.gesamt ?? '?'}` : '';
  return { text: `LEDGER ok tasks=${figures.fertig}${total} fixrunden=${figures.fixrunden} urteile=${figures.urteile} geparkt=${figures.geparkt}`, exit: 0 };
}

function next(plan, workspace) {
  const numbers = planTaskNumbers(plan);
  if (!numbers) throw new LedgerError(`Plan nicht lesbar oder ohne lückenlose Tasks: ${toPosix(plan)}`);
  return { text: `NEXT=${nextStep(parseLedger(ledgerLines(workspace)), numbers)}`, exit: 0 };
}

function run(command, args) {
  if (command === 'archive' && args.length === 2) return { text: archive(args[0], args[1]), exit: 0 };
  if (command === 'next' && args.length === 2) return next(args[0], args[1]);
  const options = command === 'check' ? checkOptions(args) : null;
  return options ? check(options) : null;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    const result = run(command, args);
    if (!result) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    process.stdout.write(`${result.text}\n`);
    process.exitCode = result.exit;
  } catch (error) {
    if (!(error instanceof LedgerError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { LedgerError, archivePath, buildArchive, archive };
