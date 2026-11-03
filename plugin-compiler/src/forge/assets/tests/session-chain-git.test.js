'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, addWorktree, samePath } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { git, gitOrThrow, toplevel, isDirty, sameDir, worktreeListed, relative } = require('../scripts/lib/session-chain-git');

test('git_FailingCommand_ReturnsNotOkWithoutThrowing', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = git(repo, ['rev-parse', '--verify', '--quiet', 'refs/heads/gibt-es-nicht']);

  // Assert
  assert.equal(result.ok, false);
});

test('gitOrThrow_FailingCommand_ThrowsSessionChainErrorWithCommand', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.throws(() => gitOrThrow(repo, ['switch', 'gibt-es-nicht']), (error) => error instanceof SessionChainError && error.message.startsWith('git switch gibt-es-nicht: '));
});

test('toplevel_SubFolder_ReturnsTheCheckoutRoot', () => {
  // Arrange
  const repo = makeRepo();
  fs.mkdirSync(path.join(repo, 'docs'));

  // Act
  const root = toplevel(path.join(repo, 'docs'));

  // Assert
  assert.ok(samePath(root, repo));
});

test('isDirty_UntrackedAndCommittedFile_TrueAndFalse', () => {
  // Arrange
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'neu.md'), 'x\n');

  // Act
  const states = ['neu.md', 'README.md'].map((file) => isDirty(repo, file));

  // Assert
  assert.deepEqual(states, [true, false]);
});

test('worktreeListed_AddedWorktreeAndOtherFolder_TrueAndFalse', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  const listed = [worktree, path.join(repo, 'anders')].map((dir) => worktreeListed(repo, dir));

  // Assert
  assert.deepEqual(listed, [true, false]);
});

test('relativeAndSameDir_PathsOfTheSameCheckout_ComparePerRealPath', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const rel = relative(repo, path.join(repo, 'docs', 'x', 'spec.md'));

  // Assert
  assert.equal(rel, 'docs/x/spec.md');
  assert.ok(sameDir(repo, `${repo}${path.sep}`));
});
