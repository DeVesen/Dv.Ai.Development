'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VALID_CONFIG = Object.freeze({
  organization: 'https://dev.azure.com/ExampleOrg',
  project: 'Example Project',
  repository: 'example-repo',
  tenantId: '11111111-2222-3333-4444-555555555555',
  user: 'dev@example.com',
  prTargetBranch: 'dev',
});

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function makeTempDir(prefix) {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function makeRepo({ config, gitignore } = {}) {
  const root = makeTempDir('ado-repo-');
  runGit(root, ['init', '-q', '-b', 'main']);
  runGit(root, ['config', 'user.email', 'test@example.com']);
  runGit(root, ['config', 'user.name', 'Test']);
  runGit(root, ['config', 'commit.gpgsign', 'false']);
  if (gitignore !== undefined) fs.writeFileSync(path.join(root, '.gitignore'), gitignore);
  fs.writeFileSync(path.join(root, 'README.md'), '# test\n');
  runGit(root, ['add', '-A']);
  runGit(root, ['commit', '-q', '-m', 'init']);
  if (config !== undefined) writeConfig(root, config);
  return root;
}

function writeConfig(root, config) {
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  const text = typeof config === 'string' ? config : JSON.stringify(config, null, 2);
  fs.writeFileSync(path.join(root, '.claude', 'ado.json'), text);
}

function addWorktree(root, name) {
  const dir = path.join(root, '.claude', 'worktrees', name);
  runGit(root, ['worktree', 'add', '-q', '-b', `wt-${name}`, dir]);
  return dir;
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { VALID_CONFIG, runGit, makeTempDir, makeRepo, writeConfig, addWorktree, removeDir };
