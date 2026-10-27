'use strict';

// Prüft ein Paket von harness-refactoring gegen das feste Paketformat: Teile, Befunde, Protokoll, Plan, Tasks, Startanweisung und Vorlage.

const fs = require('node:fs');
const path = require('node:path');
const { checkFindings, checkProtocol } = require('./harness-check-findings');
const { checkPlan, parseTask, checkTaskScope, overlaps, checkStart, checkSummary } = require('./harness-check-plan');

const FINDINGS = 'BEFUNDE.md';
const PROTOCOL = 'PRUEFPROTOKOLL.md';
const START = 'START-PROMPT.md';
const PLAN = 'PLAN.md';
const SUMMARY = 'ABSCHLUSS-VORLAGE.md';
const TASKS = 'tasks';
const TASK_FILE = /^T-\d{2}\.md$/;
const IGNORED = '.gitignore';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function taskNames(folder) {
  try {
    return fs.readdirSync(path.join(folder, TASKS)).filter((name) => TASK_FILE.test(name)).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// Mit Umbau alle sechs Teile, ohne Umbau nur Befundbericht und Prüfprotokoll.
function checkParts(folder, rework) {
  const present = fs.readdirSync(folder).filter((name) => name !== IGNORED);
  if (rework) {
    const missing = [FINDINGS, PROTOCOL, START, PLAN, SUMMARY].filter((name) => !present.includes(name)).map((name) => `Teil fehlt: ${name}`);
    return taskNames(folder).length === 0 ? [...missing, `Teil fehlt: mindestens eine Aufgabendatei ${TASKS}/T-01.md`] : missing;
  }
  return [
    ...[FINDINGS, PROTOCOL].filter((name) => !present.includes(name)).map((name) => `Teil fehlt: ${name}`),
    ...present.filter((name) => ![FINDINGS, PROTOCOL].includes(name)).map((name) => `Paket ohne Umbau enthält ${name}; erlaubt sind nur ${FINDINGS} und ${PROTOCOL}`),
  ];
}

function checkTasks(tasks, green, classify) {
  return tasks.flatMap((task) => [
    ...task.errors,
    ...checkTaskScope(task, classify),
    ...task.findings.filter((id) => green.has(id)).map((id) => `${task.name}: ${id} ist 🟢 und bekommt keinen Task`),
  ]);
}

// classify(pfad) liefert das Ergebnis der Scope-Prüfung, inGit(pfad) sagt, ob die Datei in einem Git-Repo liegt.
function checkPackage(folder, { classify, inGit, currentBranch }) {
  const findingsText = read(path.join(folder, FINDINGS));
  if (findingsText === null) return { errors: [`Teil fehlt: ${FINDINGS}`], warnings: [] };
  const findings = checkFindings(findingsText);
  const rework = findings.result === 'Umbau';
  const protocol = read(path.join(folder, PROTOCOL));
  const errors = [...checkParts(folder, rework), ...findings.errors, ...(protocol === null ? [] : checkProtocol(protocol, rework))];
  if (!rework) return { errors, warnings: [] };
  const tasks = taskNames(folder).map((name) => parseTask(`${TASKS}/${name}`, read(path.join(folder, TASKS, name))));
  const overlap = overlaps(tasks);
  const waves = [...new Set(tasks.map((task) => task.wave))].sort((a, b) => a - b);
  const backupWaves = new Set(tasks.filter((task) => task.files.some(({ pfad }) => !inGit(pfad))).map((task) => task.wave));
  const plan = read(path.join(folder, PLAN));
  const start = read(path.join(folder, START));
  const summary = read(path.join(folder, SUMMARY));
  errors.push(
    ...checkTasks(tasks, findings.green, classify),
    ...overlap.errors,
    ...(plan === null ? [] : checkPlan(plan)),
    ...(start === null ? [] : checkStart(start, { waves, backupWaves, currentBranch })),
    ...(summary === null ? [] : checkSummary(summary)),
  );
  return { errors, warnings: overlap.warnings };
}

module.exports = { checkPackage };
