'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const baseTag = require('../scripts/base-tag.js');
const { git, commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'base-tag.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('ensureTag_NoTag_CreatesTagOnHead', () => {
  const repo = makeRepo();
  const result = baseTag.ensureTag('foo', repo);
  assert.equal(result.action, 'created');
  assert.equal(result.commit, git(repo, 'rev-parse', 'HEAD'));
  assert.equal(git(repo, 'rev-parse', 'forge-base/foo^{commit}'), result.commit);
});

test('ensureTag_TagIsAncestor_KeepsIt', () => {
  const repo = makeRepo();
  const base = baseTag.ensureTag('foo', repo).commit;
  commitFile(repo, 'a.txt', 'a\n', 'task 1');
  const result = baseTag.ensureTag('foo', repo);
  assert.equal(result.action, 'kept');
  assert.equal(result.commit, base);
});

test('ensureTag_TagOnOtherBranch_Throws', () => {
  const repo = makeRepo();
  git(repo, 'switch', '--quiet', '-c', 'side');
  commitFile(repo, 'side.txt', 's\n', 'side');
  baseTag.ensureTag('foo', repo);
  git(repo, 'switch', '--quiet', 'main');
  commitFile(repo, 'main.txt', 'm\n', 'main');
  assert.throws(() => baseTag.ensureTag('foo', repo), /kein Vorfahre von HEAD/);
});

test('resolveTag_Missing_ThrowsWithBaseHint', () => {
  assert.throws(() => baseTag.resolveTag('foo', makeRepo()), /--base <ref>/);
});

test('resolveTag_Existing_ReturnsTagName', () => {
  const repo = makeRepo();
  baseTag.ensureTag('foo', repo);
  assert.equal(baseTag.resolveTag('foo', repo), 'forge-base/foo');
});

test('cli_EnsureThenResolve_PrintsResults', () => {
  const repo = makeRepo();
  assert.match(run(repo, 'ensure', 'foo').stdout, /^created forge-base\/foo [0-9a-f]{40}\n$/);
  assert.match(run(repo, 'ensure', 'foo').stdout, /^kept forge-base\/foo /);
  assert.equal(run(repo, 'resolve', 'foo').stdout, 'forge-base/foo\n');
});

test('cli_ResolveMissing_ExitsWithOne', () => {
  const result = run(makeRepo(), 'resolve', 'foo');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Basis-Tag forge-base\/foo/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'set', 'foo').status, 2);
  assert.equal(run(repo, 'ensure').status, 2);
  assert.equal(run(repo, 'ensure', '../foo').status, 2);
});
