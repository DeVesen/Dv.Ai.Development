'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'work.js');
const WORKTREE_CONFIG = '## dv-forge\n- Worktree: ja\n- Worktree-Ordner: .wt\n';

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function values(result) {
  return Object.fromEntries(result.stdout.trim().split('\n').map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function worktreeRepo() {
  const repo = makeRepo();
  commitFile(repo, '.gitignore', '.wt/\n', 'ignore');
  commitFile(repo, 'CLAUDE.md', WORKTREE_CONFIG, 'config');
  return repo;
}

test('start_NoWorktreeConfigured_StaysInPlace', () => {
  const repo = makeRepo();
  const out = values(run(repo, 'start', 'demo'));
  assert.equal(out.modus, 'vor-ort');
  assert.equal(out.branch, 'main');
  assert.equal(out.standard, 'true');
  assert.equal(out.vorschlag, 'feature/demo');
  assert.ok(samePath(out.R, repo));
});

test('start_WorktreeConfigured_CreatesSameNamedBranchFromHead', () => {
  const repo = worktreeRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  const result = run(repo, 'start', 'demo');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.modus, 'worktree');
  assert.equal(out.aktion, 'angelegt');
  assert.equal(out.branch, 'feature/demo');
  assert.ok(samePath(out.R, path.join(repo, '.wt', 'feature', 'demo')));
  assert.equal(git(out.R, 'rev-parse', 'HEAD'), head);
  assert.equal(git(out.R, 'branch', '--show-current'), 'feature/demo');
});

test('start_Twice_ResumesExistingWorktree', () => {
  const repo = worktreeRepo();
  const first = values(run(repo, 'start', 'demo'));
  const second = values(run(repo, 'start', 'demo'));
  assert.equal(second.aktion, 'fortgesetzt');
  assert.ok(samePath(second.R, first.R));
});

test('start_PlanNotCommitted_Aborts', () => {
  const repo = worktreeRepo();
  fs.writeFileSync(path.join(repo, 'plan.md'), '# Plan\n');
  const result = run(repo, 'start', 'demo', '--plan', 'plan.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nicht committet: plan\.md/);
});

test('check_DirtyTree_Aborts', () => {
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'offen.txt'), 'x\n');
  const result = run(repo, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nicht committet: offen\.txt/);
});

test('check_InWorktree_ReportsWorktreeAndMainCheckout', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const out = values(run(dir, 'check'));
  assert.equal(out.modus, 'worktree');
  assert.equal(out.branch, 'feature/demo');
  assert.ok(samePath(out.haupt, repo));
});

test('remove_InWorktree_KeepsBranchWithAllCommits', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const commit = commitFile(dir, 'feature.txt', 'neu\n', 'feature');
  const result = run(dir, 'remove');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.commit, commit);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(git(repo, 'rev-parse', 'refs/heads/feature/demo'), commit);
});

test('remove_FromMainCheckoutWithPath_RemovesWorktree', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const result = run(repo, 'remove', dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(result.stderr, '');
});

test('remove_WithUncommittedFile_KeepsWorktree', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  fs.writeFileSync(path.join(dir, 'offen.txt'), 'x\n');
  assert.equal(run(dir, 'remove').status, 1);
  assert.ok(fs.existsSync(dir));
});

test('remove_NotInWorktree_Aborts', () => {
  const repo = makeRepo();
  const result = run(repo, 'remove');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Worktree/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'start').status, 2);
  assert.equal(run(repo, 'start', '../x').status, 2);
  assert.equal(run(repo, 'start', 'demo', '--foo', 'x').status, 2);
  assert.equal(run(repo, 'check', 'x').status, 2);
});
