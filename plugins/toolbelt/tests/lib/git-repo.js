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

module.exports = { git, commitFile, makeRepo, samePath };
