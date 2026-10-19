'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function commitFile(dir, file, content, message) {
  const target = path.join(dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  git(dir, 'add', file);
  git(dir, 'commit', '--quiet', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-git-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  git(dir, 'config', 'user.email', 'test@example.invalid');
  git(dir, 'config', 'user.name', 'dv-forge test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  commitFile(dir, 'README.md', '# repo\n', 'init');
  return dir;
}

function samePath(a, b) {
  const normalize = (value) => fs.realpathSync.native(value).replace(/\\/g, '/').toLowerCase();
  return normalize(a) === normalize(b);
}

// Neuer Worktree im temporären Ordner auf dem neuen Branch `branch`; Rückgabe: Ordner des Worktrees.
function addWorktree(repo, branch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-wt-'));
  git(repo, 'worktree', 'add', '--quiet', dir, '-b', branch);
  return dir;
}

// Repo mit committeter Spec und Plan im Ordner docs/forge/x; Slug `x`.
function repoWithPlan() {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'add spec');
  commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
  return { repo, spec: path.join(repo, 'docs/forge/x/spec.md'), plan: path.join(repo, 'docs/forge/x/plan.md') };
}

module.exports = { git, commitFile, makeRepo, samePath, addWorktree, repoWithPlan };
