'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { repoWithPlan, git, addWorktree, commitFile } = require('./lib/git-repo');
const { subjectOf } = require('../scripts/lib/spec-commit');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'spec-commit.js');
const STATE_SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-state.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-speccommit-'));
}

// Repo mit committeter Spec; die Spec ist danach geändert (das Ergebnis des Reviews). `state` ist ein Start-Zustand vor der Änderung.
function reviewedRepo({ change = true } = {}) {
  const { repo, spec } = repoWithPlan();
  const state = tmp();
  const started = spawnSync(process.execPath, [STATE_SCRIPT, 'start', '--state', state, '--spec', spec], { cwd: repo, encoding: 'utf8' });
  assert.equal(started.status, 0, started.stderr);
  if (change) fs.appendFileSync(spec, '\nNeuer Satz.\n');
  return { repo, spec, state };
}

function lastSubject(repo) {
  return git(repo, 'log', '-1', '--format=%s');
}

test('subjectOf_WithAndWithoutWorkitem_UsesScopeOnlyWithNumber', () => {
  assert.equal(subjectOf('export', ''), 'docs: review spec export');
  assert.equal(subjectOf('export', 'AB#12'), 'docs(AB#12): review spec export');
});

test('commit_ChangedSpecWithoutWorkitem_CommitsOnlyTheSpecWithPlainSubject', () => {
  // Arrange
  const { repo, spec } = reviewedRepo();
  fs.writeFileSync(path.join(repo, 'fremd.txt'), 'x\n');
  git(repo, 'add', 'fremd.txt');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `COMMIT=${git(repo, 'rev-parse', '--short', 'HEAD')}\n`);
  assert.equal(lastSubject(repo), 'docs: review spec x');
  assert.equal(git(repo, 'show', '--name-only', '--format=', 'HEAD'), 'docs/forge/x/spec.md');
  assert.equal(git(repo, 'diff', '--cached', '--name-only'), 'fremd.txt');
});

test('commit_WithWorkitem_UsesScopedSubject', () => {
  // Arrange
  const { repo, spec } = reviewedRepo();

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x', '--wi', 'AB#12');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(lastSubject(repo), 'docs(AB#12): review spec x');
});

test('commit_UnchangedSpec_ReportsNichtsWithoutCommit', () => {
  // Arrange
  const { repo, spec } = reviewedRepo({ change: false });
  const head = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.stdout, 'COMMIT=nichts\n');
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
});

test('commit_IgnoredSpec_ReportsIgnoriert', () => {
  // Arrange
  const repo = repoWithPlan().repo;
  commitFile(repo, '.gitignore', 'ignoriert/\n', 'chore: ignore');
  const spec = path.join(repo, 'ignoriert', 'spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  const head = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.stdout, 'COMMIT=ignoriert\n');
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
});

test('commit_CommitConventionConfigured_ReportsFreiAndLeavesTheCommitToTheSkill', () => {
  // Arrange
  const { repo, spec } = reviewedRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Commit-Konvention: Conventional Commits mit Scope\n', 'docs: config');
  fs.appendFileSync(spec, 'noch ein Satz\n');
  const head = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.stdout, 'COMMIT=frei\n');
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
  assert.equal(git(repo, 'diff', '--cached', '--name-only'), '');
});

test('commit_PreCommitHookFails_ExitOneSpecStaysStagedAndMessageSaysSo', () => {
  // Arrange
  const { repo, spec } = reviewedRepo();
  const hook = path.join(repo, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hook, '#!/bin/sh\necho "hook sagt nein" >&2\nexit 1\n', { mode: 0o755 });
  const head = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /die Spec bleibt gestaged/);
  assert.match(result.stderr, /hook sagt nein/);
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
  assert.equal(git(repo, 'diff', '--cached', '--name-only'), 'docs/forge/x/spec.md');
});

test('commit_DetachedHead_ExitOneAndNothingCommitted', () => {
  // Arrange
  const { repo, spec } = reviewedRepo();
  git(repo, 'checkout', '--quiet', '--detach');

  // Act
  const result = run(repo, 'commit', '--spec', spec, '--slug', 'x');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /detached HEAD/);
  assert.equal(git(repo, 'diff', '--cached', '--name-only'), '');
});

test('preflight_SamePlace_PrintsOkAndTheFacts', () => {
  // Arrange
  const { repo, spec, state } = reviewedRepo();

  // Act
  const result = run(repo, 'preflight', '--spec', spec, '--state', state);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'ORT=ok\nSPEC-VORBESTAND=nein\nIGNORIERT=nein\nDIFF=ja\n');
});

test('preflight_SpecWasDirtyAtStart_ReportsVorbestand', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  fs.appendFileSync(spec, 'Vorbestand\n');
  const state = tmp();
  spawnSync(process.execPath, [STATE_SCRIPT, 'start', '--state', state, '--spec', spec], { cwd: repo, encoding: 'utf8' });

  // Act
  const result = run(repo, 'preflight', '--spec', spec, '--state', state);

  // Assert
  assert.match(result.stdout, /^ORT=ok\nSPEC-VORBESTAND=ja\n/);
});

test('preflight_OtherBranchThanAtStart_ExitOneWithAbweichung', () => {
  // Arrange
  const { repo, spec, state } = reviewedRepo();
  git(repo, 'switch', '--quiet', '-c', 'anders');

  // Act
  const result = run(repo, 'preflight', '--spec', spec, '--state', state);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^ORT=abweichung .+ anders\n/);
});

test('preflight_RunInAWorktree_ExitOneWithAbweichung', () => {
  // Arrange
  const { repo, state } = reviewedRepo();
  const worktree = addWorktree(repo, 'wt-branch');

  // Act
  const result = run(worktree, 'preflight', '--spec', path.join(worktree, 'docs/forge/x/spec.md'), '--state', state);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^ORT=abweichung worktree /);
});

test('preflight_IgnoredSpec_ReportsIgnoriertAndNoDiff', () => {
  // Arrange
  const { repo } = repoWithPlan();
  commitFile(repo, '.gitignore', 'ignoriert/\n', 'chore: ignore');
  const spec = path.join(repo, 'ignoriert', 'spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  const state = tmp();
  spawnSync(process.execPath, [STATE_SCRIPT, 'start', '--state', state, '--spec', spec], { cwd: repo, encoding: 'utf8' });

  // Act
  const result = run(repo, 'preflight', '--spec', spec, '--state', state);

  // Assert
  assert.equal(result.stdout, 'ORT=ok\nSPEC-VORBESTAND=nein\nIGNORIERT=ja\nDIFF=leer\n');
});

test('specCommit_WrongArguments_ExitTwo', () => {
  assert.equal(run(os.tmpdir()).status, 2);
  assert.equal(run(os.tmpdir(), 'commit', '--spec', 'a.md').status, 2);
  assert.equal(run(os.tmpdir(), 'preflight', '--spec', 'a.md', '--slug', 'x').status, 2);
});
