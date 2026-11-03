'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { toPosix } = require('../scripts/lib/posix');
const { ChainError, writeEntry, readEntry, removeByWorktree } = require('../scripts/lib/chain');

test('writeEntry_PlanStage_ReadEntryReturnsPlanSpecAndWorkitem', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();

  // Act
  writeEntry({ stage: 'plan', plan, spec, wi: '311404' });

  // Assert
  const entry = readEntry({ stage: 'plan', artifact: plan });
  assert.equal(entry.slug, 'x');
  assert.equal(entry.plan, toPosix(path.resolve(plan)));
  assert.equal(entry.spec, toPosix(path.resolve(spec)));
  assert.equal(entry.wi, '311404');
});

test('writeEntry_WithoutWorkitem_EntryCarriesNoWorkitem', () => {
  // Arrange
  const { spec } = repoWithPlan();

  // Act
  writeEntry({ stage: 'spec', spec });

  // Assert
  assert.equal(readEntry({ stage: 'spec', artifact: spec }).wi, undefined);
});

test('readEntry_EntryOfAnotherStage_ReturnsNull', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();
  writeEntry({ stage: 'plan', plan, spec });

  // Act & Assert
  assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
});

test('writeEntry_SecondWriteForSameSlug_LastWriteWins', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();
  writeEntry({ stage: 'spec', spec, wi: '1' });

  // Act
  writeEntry({ stage: 'plan', plan, spec, wi: '2' });

  // Assert
  assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
  assert.equal(readEntry({ stage: 'plan', artifact: plan }).wi, '2');
});

test('readEntry_PlanOrSpecPathMissing_ReturnsNull', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();
  writeEntry({ stage: 'plan', plan, spec });
  fs.rmSync(spec);

  // Act & Assert
  assert.equal(readEntry({ stage: 'plan', artifact: plan }), null);
});

test('writeEntry_PlanFileMissing_ThrowsAndKeepsExistingEntry', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  writeEntry({ stage: 'plan', plan, spec, wi: '7' });

  // Act & Assert
  assert.throws(() => writeEntry({ stage: 'plan', plan: path.join(repo, 'docs/forge/x/fehlt.md'), spec, wi: '8' }), ChainError);
  assert.equal(readEntry({ stage: 'plan', artifact: plan }).wi, '7');
});

test('writeEntry_ImplementationWithoutBranch_ThrowsNamingMissingValue', () => {
  // Arrange
  const { spec, plan } = repoWithPlan();

  // Act & Assert
  assert.throws(() => writeEntry({ stage: 'implementation', plan, spec, worktree: path.dirname(plan) }), /fehlt: branch/);
});

test('readEntry_EntryFromMainCheckout_VisibleInWorktreeAndViceVersa', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/x');
  const inWorktree = (file) => path.join(worktree, path.relative(repo, file));
  writeEntry({ stage: 'plan', plan, spec, wi: '5' });

  // Act
  const fromWorktree = readEntry({ stage: 'plan', artifact: inWorktree(plan) });
  writeEntry({ stage: 'implementation', plan: inWorktree(plan), spec: inWorktree(spec), worktree, branch: 'feature/x' });
  const fromMain = readEntry({ stage: 'implementation', artifact: plan });

  // Assert
  assert.equal(fromWorktree.wi, '5');
  assert.equal(fromMain.worktree, toPosix(path.resolve(worktree)));
  assert.equal(fromMain.branch, 'feature/x');
});

test('readEntry_WorktreeOfImplementationEntryRemoved_ReturnsNull', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/y');
  writeEntry({ stage: 'implementation', plan, spec, worktree, branch: 'feature/y' });
  git(repo, 'worktree', 'remove', '--force', worktree);

  // Act & Assert
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
});

test('readEntry_ImplementationEntryWhoseSpecWasDeleted_ReturnsNull', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/s');
  writeEntry({ stage: 'implementation', plan, spec, worktree, branch: 'feature/s' });
  fs.rmSync(spec);

  // Act & Assert
  assert.equal(fs.existsSync(worktree), true);
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
});

test('readEntry_ImplementationEntryWhosePlanWasDeleted_ReturnsNull', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/p');
  const planInWorktree = path.join(worktree, path.relative(repo, plan));
  writeEntry({ stage: 'implementation', plan: planInWorktree, spec, worktree, branch: 'feature/p' });
  fs.rmSync(planInWorktree);

  // Act & Assert
  assert.equal(fs.existsSync(worktree), true);
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
});

test('removeByWorktree_MatchingEntry_RemovesOnlyThatEntry', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  commitFile(repo, 'docs/forge/y/spec.md', '# Spec\n', 'add spec y');
  commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n', 'add plan y');
  const wtX = addWorktree(repo, 'feature/x');
  const wtY = addWorktree(repo, 'feature/y');
  const planY = path.join(repo, 'docs/forge/y/plan.md');
  writeEntry({ stage: 'implementation', plan, spec, worktree: wtX, branch: 'feature/x' });
  writeEntry({ stage: 'implementation', plan: planY, spec: path.join(repo, 'docs/forge/y/spec.md'), worktree: wtY, branch: 'feature/y' });

  // Act
  const removed = removeByWorktree(repo, wtX);

  // Assert
  assert.equal(removed, 1);
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  assert.equal(readEntry({ stage: 'implementation', artifact: planY }).branch, 'feature/y');
});

test('removeByWorktree_NoMatchingEntry_ReturnsZero', () => {
  // Arrange
  const { repo } = repoWithPlan();

  // Act & Assert
  assert.equal(removeByWorktree(repo, path.join(repo, 'gibt-es-nicht')), 0);
});

test('readEntry_ArtifactWithSlugOutsideRule_ReturnsNullWhileWriteEntryThrows', () => {
  // Arrange
  const repo = makeRepo();
  const dir = path.join(repo, 'docs', 'Änderung Export');
  fs.mkdirSync(dir, { recursive: true });
  const spec = path.join(dir, 'spec.md');
  const plan = path.join(dir, 'plan.md');
  fs.writeFileSync(spec, '# Spec\n');
  fs.writeFileSync(plan, '# Plan\n\n### Task 1: Eins\n');

  // Act & Assert
  assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
  assert.equal(readEntry({ stage: 'plan', artifact: plan }), null);
  assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  assert.throws(() => writeEntry({ stage: 'plan', plan, spec }), /Slug ungültig: Änderung Export/);
});
