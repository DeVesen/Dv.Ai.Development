'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkPlan, parseTask, checkTaskScope, overlaps, checkStart, checkSummary } = require('../scripts/lib/harness-check-plan');
const { TASK_FILE, validFiles, replaced } = require('./lib/harness-fixture');

const FILES = validFiles();
const COMMIT_MODE = { waves: [1], backupWaves: new Set(), currentBranch: 'master' };

function task(name, wave, ...files) {
  return { name, wave, files: files.map((pfad) => ({ pfad, angabe: 'erlaubt' })), findings: [], errors: [] };
}

function startWith(from, to, options = COMMIT_MODE) {
  return checkStart(replaced(FILES, 'START-PROMPT.md', from, to)['START-PROMPT.md'], options);
}

test('checkPlan_ValidPlan_NoErrors', () => {
  assert.deepEqual(checkPlan(FILES['PLAN.md']), []);
});

test('checkPlan_AcWithoutTestNameOrLiteralProof_Error', () => {
  const plan = replaced(FILES, 'PLAN.md', 'Test: `skill_Call_QuotesPath`', 'per Hand prüfen')['PLAN.md'];

  assert.deepEqual(checkPlan(plan), ['PLAN.md: AC-01 ohne Testnamen oder wörtlichen Such- oder Skript-Nachweis']);
});

test('checkPlan_SearchWithoutExpectedResult_Error', () => {
  const plan = replaced(FILES, 'PLAN.md', ' → 0 Treffer', '')['PLAN.md'];

  assert.deepEqual(checkPlan(plan), ['PLAN.md: AC-02 ohne Testnamen oder wörtlichen Such- oder Skript-Nachweis']);
});

test('checkPlan_MissingSectionOrNoAcRow_Errors', () => {
  const plan = '# Plan\n## Akzeptanzkriterien\n| AC | Kriterium | Nachweis |\n';

  const result = checkPlan(plan);

  assert.ok(result.includes('PLAN.md: Abschnitt fehlt: ## Nicht Teil'));
  assert.ok(result.includes('PLAN.md: AC-Tabelle ohne Zeile'));
});

test('parseTask_ValidTask_WaveFilesAndFindings', () => {
  const result = parseTask('tasks/T-01.md', FILES['tasks/T-01.md']);

  assert.deepEqual(result, { name: 'tasks/T-01.md', wave: 1, files: [{ pfad: TASK_FILE, angabe: 'erlaubt' }], findings: ['B-01', 'R-01'], errors: [] });
});

test('parseTask_FileLineWithoutScopeResultAndNoWave_Errors', () => {
  const text = replaced(replaced(FILES, 'tasks/T-01.md', ' · erlaubt', ''), 'tasks/T-01.md', '**Welle:** 1\n', '')['tasks/T-01.md'];

  const result = parseTask('tasks/T-01.md', text);

  assert.deepEqual(result.errors, [
    'tasks/T-01.md: Welle fehlt',
    `tasks/T-01.md: Dateizeile ohne Pfad oder Scope-Ergebnis: - \`${TASK_FILE}\``,
    'tasks/T-01.md: keine Datei unter ## Dateien',
  ]);
});

test('checkTaskScope_ForbiddenOrUnknownFile_ErrorWithReason', () => {
  const classify = (file) => (file.startsWith('~/') ? { ergebnis: 'verboten', grund: 'Regel: x' } : { ergebnis: 'unbekannt', grund: 'in keinem erlaubten Bereich' });

  const result = checkTaskScope(task('tasks/T-01.md', 1, '~/.claude/plugins/a', 'src/b.js'), classify);

  assert.deepEqual(result, [
    'tasks/T-01.md: ~/.claude/plugins/a ist verboten (Regel: x)',
    'tasks/T-01.md: ~/.claude/plugins/a steht als erlaubt, die Scope-Prüfung sagt verboten',
    'tasks/T-01.md: src/b.js ist unbekannt (in keinem erlaubten Bereich)',
    'tasks/T-01.md: src/b.js steht als erlaubt, die Scope-Prüfung sagt unbekannt',
  ]);
});

test('checkTaskScope_AllowedFile_NoErrors', () => {
  assert.deepEqual(checkTaskScope(task('t', 1, 'plugins/a'), () => ({ ergebnis: 'erlaubt', grund: 'x' })), []);
});

test('overlaps_SameFileInTwoTasksOfSameWave_Error', () => {
  const result = overlaps([task('T-01', 1, 'plugins/a.md'), task('T-02', 1, 'Plugins\\A.md')]);

  assert.deepEqual(result, { errors: ['Überschneidung in Welle 1: plugins/a.md (T-01, T-02)'], warnings: [] });
});

test('overlaps_SameFileInDifferentWaves_OnlyWarning', () => {
  const result = overlaps([task('T-01', 1, 'plugins/a.md'), task('T-02', 2, 'plugins/a.md')]);

  assert.deepEqual(result, { errors: [], warnings: ['Überschneidung über Wellen: plugins/a.md (T-01 Welle 1, T-02 Welle 2)'] });
});

test('overlaps_NoSharedFileOrSameFileTwiceInOneTask_EmptyReport', () => {
  assert.deepEqual(overlaps([task('T-01', 1, 'a', 'a'), task('T-02', 1, 'b')]), { errors: [], warnings: [] });
});

test('checkStart_ValidStartPrompt_NoErrors', () => {
  assert.deepEqual(checkStart(FILES['START-PROMPT.md'], COMMIT_MODE), []);
});

test('checkStart_NoDividerLine_Error', () => {
  assert.deepEqual(startWith('\n---\n', '\n'), ['START-PROMPT.md: Linie --- zwischen Handgriffen und Prompt fehlt']);
});

test('checkStart_MissingAbortRulesOrStatusTriple_Errors', () => {
  assert.deepEqual(startWith('## Abbruchregeln', '## Regeln'), ['START-PROMPT.md: Abschnitt fehlt nach der Linie: ## Abbruchregeln']);
  assert.deepEqual(startWith('Status FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN', 'Status FERTIG'), ['START-PROMPT.md: letzte Ausgabe nennt nicht FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN']);
});

test('checkStart_OnMasterWithoutBranchStepBeforeLine_Error', () => {
  const result = startWith('- Branch anlegen: `git switch -c feat/werkzeug`', '- Backup anlegen.');

  assert.deepEqual(result, ['START-PROMPT.md: aktueller Branch ist master, vor der Linie fehlt der Handgriff git switch -c feat/werkzeug']);
});

test('checkStart_AlreadyOnPlannedBranch_NoBranchStepNeeded', () => {
  const result = startWith('- Branch anlegen: `git switch -c feat/werkzeug`', '- Backup anlegen.', { ...COMMIT_MODE, currentBranch: 'feat/werkzeug' });

  assert.deepEqual(result, []);
});

test('checkStart_PlannedBranchIsMaster_Error', () => {
  const result = startWith('**Branch:** `feat/werkzeug`', '**Branch:** `master`', { ...COMMIT_MODE, currentBranch: 'master' });

  assert.deepEqual(result, ['START-PROMPT.md: Branch master ist kein Arbeits-Branch']);
});

test('checkStart_WaveOfTasksMissingOrWithoutCommit_Errors', () => {
  assert.deepEqual(checkStart(FILES['START-PROMPT.md'], { ...COMMIT_MODE, waves: [1, 2] }), ['START-PROMPT.md: Welle 2 fehlt unter ## Wellen']);
  assert.deepEqual(startWith('**Commit:** `fix(werkzeug): quote the path`\n', ''), ['START-PROMPT.md: Welle 1 braucht genau eine Zeile **Commit:**']);
});

test('checkStart_TargetWithoutGit_BackupLineAndSentenceRequired', () => {
  const backupMode = { ...COMMIT_MODE, backupWaves: new Set([1]) };

  assert.deepEqual(checkStart(FILES['START-PROMPT.md'], backupMode), [
    'START-PROMPT.md: Welle 1 braucht genau eine Zeile **Backup:** und keinen Commit',
    'START-PROMPT.md: Satz fehlt: Je Welle ersetzt eine Backup-Kopie den Commit.',
  ]);
  const text = replaced(FILES, 'START-PROMPT.md', '**Commit:** `fix(werkzeug): quote the path`', '**Backup:** Kopie von ~/.claude/skills/a nach .harness/backup-1\n\nJe Welle ersetzt eine Backup-Kopie den Commit.')['START-PROMPT.md'];
  assert.deepEqual(checkStart(text, backupMode), []);
});

test('checkSummary_ValidAndWithoutStatusLine_NoErrorsThenError', () => {
  assert.deepEqual(checkSummary(FILES['ABSCHLUSS-VORLAGE.md']), []);
  assert.deepEqual(checkSummary('## Wellen\n## Tasks\n## Akzeptanzkriterien\n## Offene Punkte\n'), ['ABSCHLUSS-VORLAGE.md: Zeile **Status:** FERTIG | FERTIG MIT OFFENEN PUNKTEN | ABGEBROCHEN fehlt']);
});
