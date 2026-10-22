'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { checkFinal } = require('../scripts/lib/session-chain-check');

// Repo mit Remote `origin` (bare) und dem Branch `feature/x`, der einen Commit vor `main` liegt.
function repoWithRemoteBranch() {
  const repo = makeRepo();
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-remote-'));
  git(remote, 'init', '--quiet', '--bare');
  git(repo, 'remote', 'add', 'origin', remote);
  git(repo, 'switch', '--quiet', '-c', 'feature/x');
  commitFile(repo, 'src/a.js', 'a\n', 'feat: a');
  git(repo, 'switch', '--quiet', 'main');
  return repo;
}

test('checkFinal_SpecReviewCommitWithOnlyTheSpec_IsChecked', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');

  // Act
  const result = checkFinal('spec-review', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md') });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.deepEqual(result.geprueft, [`Commit ${commit}: docs/forge/x/spec.md`, 'docs/forge/x/spec.md ist committet']);
});

test('checkFinal_SpecReviewWithoutCommitAndUncommittedSpec_NamesTheSpec', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');

  // Act
  const result = checkFinal('spec-review', repo, { commit: 'none', spec });

  // Assert
  assert.deepEqual(result.abweichungen, ['docs/forge/x/spec.md ist uncommittet']);
});

test('checkFinal_CommitWithForeignFile_NamesTheFile', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  fs.writeFileSync(path.join(repo, 'fremd.txt'), 'x\n');
  fs.appendFileSync(plan, 'mehr\n');
  git(repo, 'add', 'fremd.txt', 'docs/forge/x/plan.md');
  git(repo, 'commit', '--quiet', '-m', 'docs: plan');
  const commit = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = checkFinal('plan-review', repo, { commit, spec, plan });

  // Assert
  assert.deepEqual(result.abweichungen, [`Commit ${commit} enthält fremd.txt außerhalb der erwarteten Dateien`]);
});

test('checkFinal_CommitDoesNotExist_IsDeviation', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const result = checkFinal('planning', repo, { commit: 'deadbeef', spec, plan });

  // Assert
  assert.deepEqual(result.abweichungen, ['Commit deadbeef existiert nicht']);
});

test('checkFinal_GrillCommitWithGlossary_AllowsReportedGlossaryFile', () => {
  // Arrange
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: spec');

  // Act
  const result = checkFinal('grill', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md'), dateien: [path.join(repo, 'CONTEXT.md')] });

  // Assert
  assert.deepEqual(result.abweichungen, []);
});

test('checkFinal_UmsetzungBranchWithCommitsAndWorktree_IsChecked', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');

  // Act
  const result = checkFinal('umsetzung', repo, { commit: git(worktree, 'rev-parse', 'HEAD'), branch: 'feature/x', basis: 'main', worktree });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.ok(result.geprueft.includes('Branch feature/x: 1 Commits seit main'));
});

test('checkFinal_UmsetzungBranchWithoutCommits_IsDeviation', () => {
  // Arrange
  const repo = makeRepo();
  git(repo, 'branch', 'feature/x');

  // Act
  const result = checkFinal('umsetzung', repo, { commit: 'none', branch: 'feature/x', basis: 'main' });

  // Assert
  assert.deepEqual(result.abweichungen, ['Branch feature/x hat keine Commits seit main']);
});

test('checkFinal_AbschlussPushedAndWorktreeRemoved_IsChecked', () => {
  // Arrange
  const repo = repoWithRemoteBranch();
  git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  const removed = path.join(os.tmpdir(), 'dv-forge-entfernt-gibt-es-nicht');

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree: removed });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.equal(result.geprueft.length, 3);
});

test('checkFinal_AbschlussWithoutUpstream_IsDeviation', () => {
  // Arrange
  const repo = repoWithRemoteBranch();

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x' });

  // Assert
  assert.deepEqual(result.abweichungen, ['Branch feature/x hat keinen Upstream']);
});

test('checkFinal_AbschlussAheadOfUpstreamAndWorktreeLeft_NamesBoth', () => {
  // Arrange
  const repo = repoWithRemoteBranch();
  git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  const worktree = addWorktree(repo, 'feature/y');
  git(repo, 'switch', '--quiet', 'feature/x');
  commitFile(repo, 'src/b.js', 'b\n', 'feat: b');

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree });

  // Assert
  assert.equal(result.abweichungen.length, 2);
  assert.match(result.abweichungen[0], /hat 1 Commits Vorsprung vor origin\/feature\/x/);
  assert.match(result.abweichungen[1], /besteht noch$/);
});

test('checkFinal_SpecOutsideTheRepository_IsDeviationWithGitMessageInsteadOfChecked', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-outside-')), 'spec.md');
  fs.writeFileSync(spec, '# Spec\n');

  // Act
  const result = checkFinal('spec-review', repo, { commit: 'none', spec });

  // Assert
  assert.deepEqual(result.geprueft, []);
  assert.equal(result.abweichungen.length, 1);
  assert.match(result.abweichungen[0], /^.*spec\.md konnte nicht geprüft werden: git status --porcelain -- .*outside repository/s);
});
