'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkPackage } = require('../scripts/lib/harness-check');
const { TASK_FILE, validFiles, replaced, writePackage } = require('./lib/harness-fixture');

const ALLOWED = () => ({ ergebnis: 'erlaubt', grund: 'Plugin-Ordner' });
const OPTIONS = { classify: ALLOWED, inGit: () => true, currentBranch: 'master' };

function only(files, ...names) {
  return Object.fromEntries(names.map((name) => [name, files[name]]));
}

function noReworkFiles(result) {
  const files = replaced(validFiles(), 'BEFUNDE.md', '**Ergebnis:** Umbau', `**Ergebnis:** ${result}`);
  return only(files, 'BEFUNDE.md', 'PRUEFPROTOKOLL.md');
}

test('checkPackage_ValidReworkPackage_NoErrorsNoWarnings', () => {
  assert.deepEqual(checkPackage(writePackage(validFiles()), OPTIONS), { errors: [], warnings: [] });
});

test('checkPackage_ReworkPackageWithoutTemplateOrTasks_PartsMissing', () => {
  const files = { ...validFiles(), 'ABSCHLUSS-VORLAGE.md': null, 'tasks/T-01.md': null };

  const result = checkPackage(writePackage(files), OPTIONS);

  assert.deepEqual(result.errors.slice(0, 2), ['Teil fehlt: ABSCHLUSS-VORLAGE.md', 'Teil fehlt: mindestens eine Aufgabendatei tasks/T-01.md']);
});

test('checkPackage_NoReworkNeededWithOnlyReportAndProtocol_NoErrors', () => {
  assert.deepEqual(checkPackage(writePackage(noReworkFiles('kein Umbau nötig')), OPTIONS), { errors: [], warnings: [] });
});

test('checkPackage_NoReworkNeededButPlanPresent_Error', () => {
  const files = { ...noReworkFiles('kein Umbau nötig'), 'PLAN.md': validFiles()['PLAN.md'] };

  assert.deepEqual(checkPackage(writePackage(files), OPTIONS).errors, ['Paket ohne Umbau enthält PLAN.md; erlaubt sind nur BEFUNDE.md und PRUEFPROTOKOLL.md']);
});

test('checkPackage_AllOutOfScopeWithOnlyReportAndProtocol_NoPlanChecks', () => {
  const files = replaced(noReworkFiles('außerhalb des Scopes'), 'BEFUNDE.md', '## Außerhalb des Scopes\n', '## Außerhalb des Scopes\n- **B-03** gehört ins Marketplace-Repo.\n');

  assert.deepEqual(checkPackage(writePackage(files), OPTIONS), { errors: [], warnings: [] });
});

test('checkPackage_TaskWithForbiddenFile_Error', () => {
  const classify = () => ({ ergebnis: 'verboten', grund: 'Regel: installierte Plugins im Claude-Verzeichnis des Nutzers' });

  const result = checkPackage(writePackage(validFiles()), { ...OPTIONS, classify });

  assert.ok(result.errors.includes(`tasks/T-01.md: ${TASK_FILE} ist verboten (Regel: installierte Plugins im Claude-Verzeichnis des Nutzers)`), result.errors.join('\n'));
});

test('checkPackage_TaskForGreenFinding_Error', () => {
  const files = replaced(validFiles(), 'tasks/T-01.md', '**Befunde:** B-01, R-01', '**Befunde:** B-01, B-02');

  assert.deepEqual(checkPackage(writePackage(files), OPTIONS).errors, ['tasks/T-01.md: B-02 ist 🟢 und bekommt keinen Task']);
});

test('checkPackage_TwoTasksOfSameWaveShareFile_ErrorAndPackageNotDone', () => {
  const files = { ...validFiles(), 'tasks/T-02.md': validFiles()['tasks/T-01.md'].replace('# T-01', '# T-02') };

  assert.deepEqual(checkPackage(writePackage(files), OPTIONS).errors, [`Überschneidung in Welle 1: ${TASK_FILE} (tasks/T-01.md, tasks/T-02.md)`]);
});

test('checkPackage_TwoTasksOfDifferentWavesShareFile_OnlyWarning', () => {
  const second = validFiles()['tasks/T-01.md'].replace('**Welle:** 1', '**Welle:** 2');
  const files = replaced({ ...validFiles(), 'tasks/T-02.md': second }, 'START-PROMPT.md', '## Rückgabeformat', '### Welle 2\n**Checkpoint:** Baseline + 2 Tests\n**Commit:** `fix(werkzeug): second`\n## Rückgabeformat');

  const result = checkPackage(writePackage(files), OPTIONS);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, [`Überschneidung über Wellen: ${TASK_FILE} (tasks/T-01.md Welle 1, tasks/T-02.md Welle 2)`]);
});

test('checkPackage_TaskFileOutsideGit_WaveNeedsBackup', () => {
  const result = checkPackage(writePackage(validFiles()), { ...OPTIONS, inGit: () => false });

  assert.deepEqual(result.errors, [
    'START-PROMPT.md: Welle 1 braucht genau eine Zeile **Backup:** und keinen Commit',
    'START-PROMPT.md: Satz fehlt: Je Welle ersetzt eine Backup-Kopie den Commit.',
  ]);
});

test('checkPackage_NoReport_OnlyThatPartMissing', () => {
  assert.deepEqual(checkPackage(writePackage({ 'PLAN.md': 'x' }), OPTIONS), { errors: ['Teil fehlt: BEFUNDE.md'], warnings: [] });
});
