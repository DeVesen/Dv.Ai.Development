'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ledger = require('../scripts/ledger.js');
const { git, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'ledger.js');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ledger-'));
  const workspace = path.join(dir, 'w');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(dir, 'plan.md'), '# Plan\n');
  return { dir, workspace, plan: path.join(dir, 'plan.md') };
}

test('archivePath_PlanMdOrNamedPlan', () => {
  assert.equal(path.basename(ledger.archivePath('/x/plan.md')), 'umsetzung.md');
  assert.equal(path.basename(ledger.archivePath('/x/2026-09-26-login.md')), '2026-09-26-login-umsetzung.md');
});

test('archive_KeepsJudgementsDeferredAndReport', () => {
  const env = setup();
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), [
    '# Ledger — Plan: docs/forge/x/plan.md',
    'Vorab-Scan: …',
    'Urteil: A statt B — Spec verlangt A — ein Task Nacharbeit',
    'Task 1: zurückgestellt: Name unklar',
    'Task 2: geparkt — Finding X — Urteil: bleibt',
    'Task 2: fertig (Commits abc..def, Review sauber)',
  ].join('\n'));
  fs.writeFileSync(path.join(env.workspace, 'abschluss.md'), 'Alles umgesetzt.\n');
  const result = spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8');
  assert.match(text, /^# Umsetzung — Plan: docs\/forge\/x\/plan\.md$/m);
  assert.match(text, /## Abschlussbericht\nAlles umgesetzt\./);
  assert.match(text, /- Urteil: A statt B/);
  assert.match(text, /- Task 1: zurückgestellt: Name unklar/);
  assert.match(text, /- Task 2: geparkt — Finding X/);
  assert.doesNotMatch(text, /fertig \(Commits/);
});

test('archive_StateSection_NamesHeadAndLastGreenFullRun', () => {
  const repo = makeRepo();
  const head = git(repo, 'rev-parse', '--short', 'HEAD');
  const workspace = path.join(repo, 'w');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(repo, 'plan.md'), '# Plan\n');
  fs.writeFileSync(path.join(workspace, 'progress.md'), [
    '# Ledger — Plan: plan.md',
    'Gesamtlauf: aaa1111 grün (10 Tests)',
    'Task 1: fertig (Commits abc..def, Review sauber)',
    'Gesamtlauf: bbb2222 grün (12 Tests)',
  ].join('\n'));
  const result = spawnSync(process.execPath, [SCRIPT, 'archive', path.join(repo, 'plan.md'), workspace], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(repo, 'umsetzung.md'), 'utf8');
  assert.match(text, new RegExp(`## Stand\\n- Stand: ${head}\\n- Gesamtlauf: bbb2222 grün \\(12 Tests\\)`));
  assert.doesNotMatch(text, /aaa1111/);
});

test('archive_NoFullRunOutsideGit_StateSaysSo', () => {
  const env = setup();
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), '# Ledger — Plan: plan.md\n');
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' }).status, 0);
  const text = fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8');
  assert.match(text, /## Stand\n- Stand: -\n- Gesamtlauf: keiner/);
});

test('archive_NoLedger_ExitsWithOne', () => {
  const env = setup();
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive'], { encoding: 'utf8' }).status, 2);
});

const LEDGER_HEAD = '# Ledger — Plan: docs/forge/x/plan.md';
const THREE_TASKS = ['# Plan', '', ...[1, 2, 3].flatMap((n) => [`### Task ${n}: T${n}`, '', 'Text.', ''])].join('\n');

// Arbeitsbereich mit Plan (drei Tasks) und Ledger aus `lines`.
function ledgerEnv(lines, plan = THREE_TASKS) {
  const env = setup();
  fs.writeFileSync(env.plan, plan);
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), `${lines.join('\n')}\n`);
  return env;
}

function runLedger(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function checkOf(lines, ...extra) {
  const env = ledgerEnv(lines);
  return runLedger('check', env.workspace, ...extra);
}

function nextOf(lines) {
  const env = ledgerEnv(lines);
  return runLedger('next', env.plan, env.workspace).stdout;
}

test('check_ValidLedger_OkWithFigures', () => {
  // Arrange
  const lines = [LEDGER_HEAD, 'Vorab-Scan: scan.md; 0 offen — keine', 'Basis rot: keine', 'Urteil: A — weil — kostet wenig',
    'Task 1: Fix-Runde 1/5 (1 behoben, 0 offen — ok; Commits abc1234..def5678)', 'Task 1: geparkt — Finding X — Urteil: bleibt',
    'Task 1: fertig (Commits abc1234..def5678, Review sauber)', 'Task 2: zurückgestellt: Name', 'Gesamtlauf: def5678 grün (verify-run)'];

  // Act
  const result = checkOf(lines);

  // Assert
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, 'LEDGER ok tasks=1 fixrunden=1 urteile=1 geparkt=1\n');
});

test('check_WithPlan_CountsTasksOfPlan', () => {
  // Arrange
  const env = ledgerEnv([LEDGER_HEAD, 'Task 1: fertig (Commits abc1234..def5678, Review sauber)']);

  // Act
  const result = runLedger('check', env.workspace, '--plan', env.plan);

  // Assert
  assert.equal(result.stdout, 'LEDGER ok tasks=1/3 fixrunden=0 urteile=0 geparkt=0\n');
});

test('check_FirstLineNotLedgerHead_Error', () => {
  // Act
  const result = checkOf(['Basis rot: keine', 'Task 1: fertig (Commits abc1234..def5678, Review sauber)']);

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stdout, 'FEHLER 1: erste Zeile ist nicht „# Ledger — Plan: …“\n');
});

test('check_UnknownLineForm_Error', () => {
  // Act
  const result = checkOf([LEDGER_HEAD, 'Task 1: irgendwie erledigt']);

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stdout, 'FEHLER 2: unbekannte Zeilenform: Task 1: irgendwie erledigt\n');
});

test('check_TaskNumbersDescending_Error', () => {
  // Act
  const result = checkOf([LEDGER_HEAD, 'Task 2: fertig (Commits abc1234..def5678, Review sauber)', 'Task 1: zurückgestellt: Name']);

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stdout, 'FEHLER 3: Task-Nummern nicht aufsteigend: Task 1 nach Task 2\n');
});

test('check_FixRoundOutsideRangeOrSkipped_Error', () => {
  // Act
  const outside = checkOf([LEDGER_HEAD, 'Task 1: Fix-Runde 6/5 (1 behoben, 0 offen — x; Commits abc1234..def5678)']);
  const skipped = checkOf([LEDGER_HEAD, 'Task 1: Fix-Runde 1/5 (1 behoben, 1 offen — x; Commits abc1234..def5678)', 'Task 1: Fix-Runde 3/5 (1 behoben, 0 offen — x; Commits abc1234..def5678)']);

  // Assert
  assert.equal(outside.stdout, 'FEHLER 2: Fix-Runde 6/5 außerhalb von 1 bis 5\n');
  assert.equal(skipped.stdout, 'FEHLER 3: Fix-Runde 3/5 nicht fortlaufend (erwartet 2)\n');
});

test('check_DoneWithoutReviewLine_AllowedButDoneTwice_Error', () => {
  // Arrange
  const done = 'Task 1: fertig (Commits abc1234..def5678, Review sauber)';

  // Act
  const once = checkOf([LEDGER_HEAD, done]);
  const twice = checkOf([LEDGER_HEAD, done, done]);

  // Assert
  assert.equal(once.status, 0);
  assert.equal(twice.stdout, 'FEHLER 3: Task 1 ist zweimal fertig\n');
});

test('check_CommitRangeUnknownToGit_ErrorOnlyWithRepo', () => {
  // Arrange
  const repo = makeRepo();
  const head = git(repo, 'rev-parse', '--short', 'HEAD');
  const known = `Task 1: fertig (Commits ${head}..${head}, Review sauber)`;
  const unknown = 'Task 2: fertig (Commits abc1234..def5678, Review sauber)';

  // Act
  const withoutRepo = checkOf([LEDGER_HEAD, known, unknown]);
  const withRepo = checkOf([LEDGER_HEAD, known, unknown], '--repo', repo);

  // Assert
  assert.equal(withoutRepo.status, 0);
  assert.equal(withRepo.stdout, 'FEHLER 3: Commit-Bereich unbekannt: abc1234..def5678\n');
});

test('check_NoLedgerOrBadCall_ExitOneOrTwo', () => {
  // Arrange
  const env = setup();

  // Act
  const missing = runLedger('check', env.workspace);
  const bad = runLedger('check');
  const badOption = runLedger('check', env.workspace, '--foo', 'x');

  // Assert
  assert.equal(missing.status, 1);
  assert.equal(bad.status, 2);
  assert.equal(badOption.status, 2);
});

test('next_NoLedgerYet_TaskOne', () => {
  // Arrange
  const env = setup();
  fs.writeFileSync(env.plan, THREE_TASKS);

  // Act
  const result = runLedger('next', env.plan, env.workspace);

  // Assert
  assert.equal(result.stdout, 'NEXT=task 1\n');
});

test('next_FirstTaskDone_TaskTwo', () => {
  assert.equal(nextOf([LEDGER_HEAD, 'Task 1: fertig (Commits abc1234..def5678, Review sauber)']), 'NEXT=task 2\n');
});

test('next_LastLineIsFixRound_NextRound', () => {
  assert.equal(nextOf([LEDGER_HEAD, 'Task 1: fertig (Commits abc1234..def5678, Review sauber)',
    'Task 2: Fix-Runde 2/5 (1 behoben, 1 offen — x; Commits abc1234..def5678)']), 'NEXT=fixrunde 2 3\n');
});

test('next_FixRoundFiveReached_Urteil', () => {
  const rounds = [1, 2, 3, 4, 5].map((r) => `Task 1: Fix-Runde ${r}/5 (0 behoben, 1 offen — x; Commits abc1234..def5678)`);
  assert.equal(nextOf([LEDGER_HEAD, ...rounds]), 'NEXT=urteil 1\n');
});

test('next_AllTasksDoneWithoutFinal_Final', () => {
  const done = [1, 2, 3].map((n) => `Task ${n}: fertig (Commits abc1234..def5678, Review sauber)`);
  assert.equal(nextOf([LEDGER_HEAD, ...done]), 'NEXT=final\n');
});

test('next_FinalLinePresent_Abschluss', () => {
  const done = [1, 2, 3].map((n) => `Task ${n}: fertig (Commits abc1234..def5678, Review sauber)`);
  assert.equal(nextOf([LEDGER_HEAD, ...done, 'Final: sauber']), 'NEXT=abschluss\n');
});

test('next_PlanWithoutTasks_ExitOne', () => {
  // Arrange
  const env = ledgerEnv([LEDGER_HEAD], '# Plan\n');

  // Act
  const result = runLedger('next', env.plan, env.workspace);

  // Assert
  assert.equal(result.status, 1);
});

test('archive_KennzahlenSection_CountsTasksRoundsJudgementsParkedDeferred', () => {
  // Arrange
  const env = ledgerEnv([LEDGER_HEAD, 'Urteil: A — weil — kostet wenig', 'Task 1: zurückgestellt: Name', 'Task 1: Fix-Runde 1/5 (1 behoben, 0 offen — x; Commits abc1234..def5678)',
    'Task 1: geparkt — Finding X — Urteil: bleibt', 'Task 1: fertig (Commits abc1234..def5678, 1 geparkt)', 'Gesamtlauf: def5678 grün (verify-run)']);

  // Act
  const result = runLedger('archive', env.plan, env.workspace);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8');
  assert.match(text, /## Stand\n- Stand: .+\n- Gesamtlauf: def5678 grün \(verify-run\)\n\n## Kennzahlen\n- Tasks fertig: 1\/3\n- Fix-Runden: 1\n- Urteile: 1\n- Geparkt: 1\n- Zurückgestellt: 1\n$/);
});

test('archive_KennzahlenWithoutReadablePlanTasks_QuestionMarkForTotal', () => {
  // Arrange
  const env = setup();
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), `${LEDGER_HEAD}\n`);

  // Act
  runLedger('archive', env.plan, env.workspace);

  // Assert
  assert.match(fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8'), /- Tasks fertig: 0\/\?/);
});

// Repo mit drei fertigen Tasks: Task 1 Test vor Code, Task 2 Code vor Test, Task 3 nur Code. Rückgabe: Umgebung mit Ledger.
function tddEnv() {
  const { commitFile } = require('./lib/git-repo');
  const repo = makeRepo();
  const range = (from) => `${from}..${git(repo, 'rev-parse', '--short', 'HEAD')}`;
  const base1 = git(repo, 'rev-parse', '--short', 'HEAD');
  commitFile(repo, 'tests/a.test.js', 't\n', 'test: a');
  commitFile(repo, 'src/a.js', 'a\n', 'feat: a');
  const range1 = range(base1);
  const base2 = git(repo, 'rev-parse', '--short', 'HEAD');
  commitFile(repo, 'src/b.js', 'b\n', 'feat: b');
  commitFile(repo, 'tests/b.test.js', 't\n', 'test: b');
  const range2 = range(base2);
  const base3 = git(repo, 'rev-parse', '--short', 'HEAD');
  commitFile(repo, 'src/c.js', 'c\n', 'feat: c');
  commitFile(repo, 'docs/c.md', 'doku\n', 'docs: c');
  const range3 = range(base3);
  const workspace = path.join(repo, 'w');
  fs.mkdirSync(workspace);
  const plan = path.join(repo, 'plan.md');
  fs.writeFileSync(plan, THREE_TASKS);
  fs.writeFileSync(path.join(workspace, 'progress.md'), [LEDGER_HEAD, ...[range1, range2, range3].map((r, index) => `Task ${index + 1}: fertig (Commits ${r}, Review sauber)`)].join('\n'));
  return { repo, workspace, plan, ranges: [range1, range2, range3] };
}

test('tdd_TestFirstCodeFirstAndNoTest_OneFindingPerDoneTask', () => {
  // Arrange
  const env = tddEnv();

  // Act
  const result = runLedger('tdd', env.plan, env.workspace, '--repo', env.repo);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TDD ok task 1\nTDD danach task 2\nTDD fehlt-test task 3\n');
});

test('tdd_TestAndCodeInTheFirstCommit_Ok', () => {
  // Arrange
  const { commitFile } = require('./lib/git-repo');
  const repo = makeRepo();
  const base = git(repo, 'rev-parse', '--short', 'HEAD');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src/a.js'), 'a\n');
  commitFile(repo, 'tests/a.test.js', 't\n', 'feat: a with test');
  const env = ledgerEnv([LEDGER_HEAD, `Task 1: fertig (Commits ${base}..${git(repo, 'rev-parse', '--short', 'HEAD')}, Review sauber)`]);

  // Act
  const result = runLedger('tdd', env.plan, env.workspace, '--repo', repo);

  // Assert
  assert.equal(result.stdout, 'TDD ok task 1\n');
});

test('tdd_UnknownRangeOrNoDoneTask_HintsOnlyNeverFailure', () => {
  // Arrange
  const unknown = ledgerEnv([LEDGER_HEAD, 'Task 1: fertig (Commits abc1234..def5678, Review sauber)']);
  const none = ledgerEnv([LEDGER_HEAD]);

  // Act
  const first = runLedger('tdd', unknown.plan, unknown.workspace, '--repo', makeRepo());
  const second = runLedger('tdd', none.plan, none.workspace, '--repo', makeRepo());

  // Assert
  assert.deepEqual([first.status, first.stdout], [0, 'TDD unbekannt task 1\n']);
  assert.deepEqual([second.status, second.stdout], [0, 'TDD keine fertigen Tasks\n']);
});

test('tdd_WithoutRepoOption_ExitTwo', () => {
  const env = ledgerEnv([LEDGER_HEAD]);
  assert.equal(runLedger('tdd', env.plan, env.workspace).status, 2);
});

test('archive_KennzahlenSection_ListsTheTddFindingsAfterTheFigures', () => {
  // Arrange
  const env = tddEnv();

  // Act
  const result = runLedger('archive', env.plan, env.workspace);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(env.repo, 'umsetzung.md'), 'utf8');
  assert.match(text, /- Zurückgestellt: 0\n- TDD ok task 1\n- TDD danach task 2\n- TDD fehlt-test task 3\n$/);
});
