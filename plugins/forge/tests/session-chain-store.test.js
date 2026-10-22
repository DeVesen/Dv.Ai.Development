'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { makeRepo, addWorktree, repoWithPlan, samePath } = require('./lib/git-repo');
const { storeDir } = require('../scripts/lib/chain');
const {
  SessionChainError, etappeError, checkedEtappe, slugOfArtifact, chainsRoot, readState, writeState, slugByWorktree,
} = require('../scripts/lib/session-chain-store');

test('slugOfArtifact_SpecAndPlanInSameFolder_ShareTheFolderName', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();

  // Act
  const slugs = [slugOfArtifact({ spec }), slugOfArtifact({ plan })];

  // Assert
  assert.deepEqual(slugs, ['x', 'x']);
});

test('chainsRoot_FromWorktree_IsTheRootOfTheMainCheckout', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  const fromWorktree = chainsRoot(worktree);

  // Assert
  assert.ok(samePath(path.dirname(path.dirname(fromWorktree)), path.join(repo, '.git')));
  assert.equal(fromWorktree.replace(/\\/g, '/').endsWith('/dv-forge/session-chain'), true);
});

test('chainsRoot_AnyRepo_IsTheChainStoreDirWithNameSessionChain', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const root = chainsRoot(repo);

  // Assert
  assert.equal(root, storeDir(repo, 'session-chain'));
  assert.equal(path.basename(storeDir(repo)), 'chain');
});

test('chainsRoot_OutsideGit_ThrowsSessionChainError', () => {
  // Act & Assert
  assert.throws(() => chainsRoot(path.parse(process.cwd()).root), SessionChainError);
});

test('checkedEtappe_UnknownEtappe_ThrowsWithAllowedNames', () => {
  // Act & Assert
  assert.throws(() => checkedEtappe('review'), /^Error: Etappe unbekannt, erlaubt: whiteboarding, grill, spec-review, .+; nicht review$/);
});

test('etappeError_KnownAndUnknownName_NullOrMessagePart', () => {
  // Act
  const results = ['planning', 'review'].map(etappeError);

  // Assert
  assert.equal(results[0], null);
  assert.match(results[1], /^erlaubt: whiteboarding, .+, abschluss; nicht review$/);
});

test('writeState_FromWorktree_StateIsReadFromTheMainCheckout', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  writeState(worktree, 'x', { basis: 'dev', offen: [] });

  // Assert
  assert.deepEqual(readState(repo, 'x'), { basis: 'dev', offen: [], slug: 'x' });
});

test('readState_NoState_ReturnsNull', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.equal(readState(repo, 'x'), null);
});

test('slugByWorktree_StateNamesWorktree_ReturnsItsSlug', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  writeState(repo, 'x', { worktree: worktree.replace(/\\/g, '/') });

  // Act & Assert
  assert.equal(slugByWorktree(repo, worktree), 'x');
  assert.equal(slugByWorktree(repo, path.join(repo, 'anders')), null);
});
