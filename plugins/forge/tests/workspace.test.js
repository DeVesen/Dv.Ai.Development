'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const workspace = require('../scripts/workspace.js');
const { git, makeRepo, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'workspace.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('createWorkspace_InRepo_CreatesRoleSlugFolder', () => {
  const repo = makeRepo();
  const dir = workspace.createWorkspace('implementation', '2026-09-25-foo', repo);
  assert.ok(fs.statSync(dir).isDirectory());
  assert.ok(samePath(dir, path.join(repo, '.forge', 'implementation', '2026-09-25-foo')));
});

test('createWorkspace_InRepo_IsIgnoredByGit', () => {
  const repo = makeRepo();
  const dir = workspace.createWorkspace('review', 'x', repo);
  fs.writeFileSync(path.join(dir, 'progress.md'), '# Ledger\n');
  assert.equal(fs.readFileSync(path.join(repo, '.forge', '.gitignore'), 'utf8'), '*\n');
  assert.equal(git(repo, 'status', '--porcelain'), '');
});

test('removeWorkspace_Existing_DeletesOnlyThatFolder', () => {
  const repo = makeRepo();
  const kept = workspace.createWorkspace('implementation', 'keep', repo);
  const dir = workspace.createWorkspace('implementation', 'drop', repo);
  workspace.removeWorkspace('implementation', 'drop', repo);
  assert.equal(fs.existsSync(dir), false);
  assert.ok(fs.existsSync(kept));
});

test('cli_Create_PrintsPath', () => {
  const repo = makeRepo();
  const result = run(repo, 'create', 'implementation', 'x');
  assert.equal(result.status, 0);
  assert.ok(samePath(result.stdout.trim(), path.join(repo, '.forge', 'implementation', 'x')));
});

test('cli_OutsideRepo_ExitsWithOne', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-nogit-'));
  const result = run(dir, 'create', 'review', 'x');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Git-Repo/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'create', 'other', 'x').status, 2);
  assert.equal(run(repo, 'create', 'review', '../x').status, 2);
  assert.equal(run(repo, 'delete', 'review', 'x').status, 2);
});
