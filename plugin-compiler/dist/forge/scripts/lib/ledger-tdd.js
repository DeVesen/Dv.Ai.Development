'use strict';

// Test-first-Vorstufe: Je `fertig`-Zeile des Ledgers die Reihenfolge von Testdateien und Produktivdateien in den Commits des Bereichs.
// Nur ein Hinweis, nie ein Abbruch. Die Näherung für Testdateien liefert isTestFile aus implementation-report.js.

const { spawnSync } = require('node:child_process');
const { isTestFile, isProductionFile } = require('./implementation-report');

const RANGE = /(?<![0-9a-f])([0-9a-f]{4,40})\.\.([0-9a-f]{4,40})(?![0-9a-f])/;

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim() };
}

// Dateien je Commit des Bereichs, ältester zuerst; null, wenn git den Bereich nicht kennt.
function filesPerCommit(repo, range) {
  const commits = git(repo, ['rev-list', '--reverse', range]);
  if (!commits.ok) return null;
  return commits.out.split('\n').filter(Boolean).map((commit) => git(repo, ['show', '--name-only', '--format=', commit]).out.split('\n').filter(Boolean));
}

// `ok`: Eine Testdatei steht im ersten Commit oder nicht nach der ersten Produktivdatei; `fehlt-test`: keine Testdatei im Bereich;
// `danach`: die erste Testdatei kommt erst nach Produktivcode; `unbekannt`: kein Bereich oder git kennt ihn nicht.
function verdictOf(commits) {
  if (!commits || commits.length === 0) return 'unbekannt';
  const firstTest = commits.findIndex((files) => files.some(isTestFile));
  if (firstTest === -1) return 'fehlt-test';
  const firstProduction = commits.findIndex((files) => files.some(isProductionFile));
  return firstProduction === -1 || firstTest <= firstProduction ? 'ok' : 'danach';
}

// Befunde je fertigem Task in der Reihenfolge der Task-Nummern: [{ task, befund }]. `parsed`: parseLedger; `taskNumbers`: Tasks des Plans.
function tddFindings({ parsed, taskNumbers, repo }) {
  const done = new Map(parsed.filter((line) => line.kind === 'fertig').map((line) => [line.task, line.text]));
  return taskNumbers.filter((number) => done.has(number)).map((number) => {
    const range = RANGE.exec(done.get(number));
    return { task: number, befund: range ? verdictOf(filesPerCommit(repo, `${range[1]}..${range[2]}`)) : 'unbekannt' };
  });
}

function formatTdd(findings) {
  return findings.map((entry) => `TDD ${entry.befund} task ${entry.task}`);
}

module.exports = { tddFindings, formatTdd, verdictOf };
