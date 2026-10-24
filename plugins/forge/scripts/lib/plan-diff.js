'use strict';

// Abgleich der Dateien eines Plans (Create, Modify, Test je Task) mit den Dateien, die Commits seit der Basis ändern.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { describeTasks } = require('../plan-tasks');
const { toPosix } = require('./posix');

function changedFiles(repo, base) {
  const result = spawnSync('git', ['-C', repo, 'diff', '--name-only', `${base}..HEAD`], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git diff ${base}..HEAD: ${result.stderr.trim()}`);
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

// Plan, Spec, Umsetzungsbericht und Arbeitsbereiche gehören zum Vorgang, nicht zum Umfang des Plans.
function isProcessFile(file, planRel) {
  const dir = path.posix.dirname(planRel);
  return file === planRel || file.startsWith('.forge/') || file.includes('/.forge/')
    || (path.posix.dirname(file) === dir && file.endsWith('.md'));
}

function planDiff(planPath, repo, base) {
  const planRel = toPosix(path.relative(repo, path.resolve(planPath)));
  const planned = describeTasks(planPath).flatMap((task) => task.files.map((file) => ({ ...file, task: task.number })));
  const changed = changedFiles(repo, base);
  const changedSet = new Set(changed);
  const plannedSet = new Set(planned.map((file) => file.path));
  const missing = planned.filter((file) => !changedSet.has(file.path))
    .filter((file, index, all) => all.findIndex((other) => other.path === file.path) === index);
  const extra = changed.filter((file) => !plannedSet.has(file) && !isProcessFile(file, planRel));
  return { planned: plannedSet.size, changed: changed.length, missing, extra };
}

function formatPlanDiff(result) {
  return [
    `PLANDIFF geplant=${result.planned} geaendert=${result.changed} fehlt=${result.missing.length} zuviel=${result.extra.length}`,
    ...result.missing.map((file) => `FEHLT ${file.kind} ${file.path} (Task ${file.task})`),
    ...result.extra.map((file) => `ZUVIEL ${file}`),
  ];
}

// Befunde im Findings-Format des Implementierungs-Reviews. Eine geplante, nicht geänderte Datei ist 🔴, außer eine
// bestehende Testdatei (`Test:`) ist 🟡; eine ungeplante Änderung ist ein 🟡 Kandidat für Scope-Creep.
function planDiffFindings(result, repo) {
  const missing = result.missing.map((file) => ({
    location: file.path,
    quote: `${file.kind}: \`${file.path}\``,
    severity: file.kind === 'Test' ? 'yellow' : 'red',
    consequence: `Task ${file.task} plant ${file.kind} für diese Datei, kein Commit seit der Basis ändert sie.`,
    rationale: 'Skript-Prüfung Plan↔Diff',
  }));
  const extra = result.extra.map((file) => ({
    location: file,
    quote: fs.existsSync(path.join(repo, file)) ? firstLine(path.join(repo, file)) : `gelöscht: ${file}`,
    severity: 'yellow',
    consequence: 'Die Datei ist geändert, aber in keinem Task geplant.',
    rationale: 'Skript-Prüfung Plan↔Diff',
  }));
  return [...missing, ...extra];
}

function firstLine(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text.split('\n').find((line) => line.trim() !== '')?.trim().slice(0, 120) ?? '';
}

module.exports = { planDiff, formatPlanDiff, planDiffFindings, changedFiles };
