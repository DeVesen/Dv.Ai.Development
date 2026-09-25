'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const reviewPackage = require('../scripts/review-package.js');
const { commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'review-package.js');

function repoWithTwoCommits() {
  const repo = makeRepo();
  const base = commitFile(repo, 'src/a.js', 'alt\n', 'chore: base');
  commitFile(repo, 'src/a.js', 'neu\n', 'feat: task 1');
  const head = commitFile(repo, 'src/b.js', 'b\n', 'feat: task 2');
  return { repo, base, head };
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('buildPackage_Range_ContainsCommitsStatAndDiff', () => {
  const { repo, base } = repoWithTwoCommits();
  const text = reviewPackage.buildPackage(base, 'HEAD', repo);
  assert.ok(text.startsWith(`# Review-Paket: ${base}..HEAD\n`));
  assert.match(text, /## Commits\n[0-9a-f]+ feat: task 2\n[0-9a-f]+ feat: task 1\n/);
  assert.match(text, /## Dateien\n.*src\/a\.js/);
  assert.ok(text.includes('+neu'));
  assert.ok(text.includes('-alt'));
  assert.ok(!text.includes('chore: base'));
});

test('writePackage_Range_WritesFileNamedByShortHashes', () => {
  const { repo, base, head } = repoWithTwoCommits();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pkg-'));
  const file = reviewPackage.writePackage(base, head, dir, repo);
  assert.equal(file, path.join(dir, `review-${base.slice(0, 7)}..${head.slice(0, 7)}.diff`));
  assert.ok(fs.readFileSync(file, 'utf8').includes('+neu'));
});

test('cli_ValidRange_PrintsPath', () => {
  const { repo, base } = repoWithTwoCommits();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pkg-'));
  const result = run(repo, base, 'HEAD', dir);
  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(result.stdout.trim()));
});

test('cli_EmptyRange_ExitsWithOne', () => {
  const { repo } = repoWithTwoCommits();
  const result = run(repo, 'HEAD', 'HEAD', os.tmpdir());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Bereich leer/);
});

test('cli_UnknownRef_ExitsWithTwo', () => {
  const { repo } = repoWithTwoCommits();
  const result = run(repo, 'forge-base/missing', 'HEAD', os.tmpdir());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Ungültige Referenz: forge-base\/missing/);
});

test('cli_WrongArgumentCount_ExitsWithTwo', () => {
  assert.equal(run(os.tmpdir(), 'HEAD').status, 2);
});
