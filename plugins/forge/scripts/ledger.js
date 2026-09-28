#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');

const USAGE = 'Aufruf: node ledger.js archive <plan> <arbeitsbereich>\n';
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
  ].join('\n');
}

function archive(planPath, workspace) {
  const target = archivePath(planPath);
  fs.writeFileSync(target, buildArchive(planPath, workspace));
  return toPosix(target);
}

function main() {
  const [command, plan, workspace] = process.argv.slice(2);
  if (command !== 'archive' || !plan || !workspace) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${archive(plan, workspace)}\n`);
  } catch (error) {
    if (!(error instanceof LedgerError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { LedgerError, archivePath, buildArchive, archive };
