'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { git, makeRepo, repoWithPlan } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { commitFor, checkWhiteboardingCommitted } = require('../scripts/lib/session-chain-commit');

function committedFiles(repo) {
  return git(repo, 'show', '--name-only', '--format=', 'HEAD').split('\n').filter(Boolean);
}

test('commitFor_SpecWithReportedGlossaryAndForeignChange_CommitsOnlyTheGlossary', () => {
  // Arrange
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
  fs.writeFileSync(path.join(repo, 'fremd.md'), 'fremd\n');
  const state = { dateien: [{ etappe: 'whiteboarding', pfad: path.join(repo, 'CONTEXT.md') }, { etappe: 'grill', pfad: path.join(repo, 'CONTEXT.md') }] };

  // Act
  const result = commitFor('spec', repo, state, 'docs: glossary');

  // Assert
  assert.deepEqual(result.commit.dateien, ['CONTEXT.md']);
  assert.deepEqual(committedFiles(repo), ['CONTEXT.md']);
  assert.equal(git(repo, 'status', '--porcelain', '--', 'fremd.md'), '?? fremd.md');
});

test('commitFor_SpecWithReportedCodeFile_LeavesItAndNamesIt', () => {
  // Arrange
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'a.js'), 'x\n');
  const state = { dateien: [{ etappe: 'grill', pfad: path.join(repo, 'a.js') }] };

  // Act
  const result = commitFor('spec', repo, state, 'docs: glossary');

  // Assert
  assert.equal(result.commit, null);
  assert.deepEqual(result.nichtCommittet, [path.join(repo, 'a.js')]);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
});

test('commitFor_GoWithCommittedSpecAndUncommittedPlan_CommitsOnlyThePlan', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  fs.appendFileSync(plan, '\n### Task 2: Zwei\n');

  // Act
  const result = commitFor('go', repo, { basis: 'main', spec, plan }, 'docs: plan x');

  // Assert
  assert.deepEqual(result.commit.dateien, ['docs/forge/x/plan.md']);
  assert.deepEqual(committedFiles(repo), ['docs/forge/x/plan.md']);
});

test('commitFor_GoWithBothCommitted_CreatesNoCommit', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const before = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = commitFor('go', repo, { basis: 'main', spec, plan }, 'docs: plan x');

  // Assert
  assert.equal(result.commit, null);
  assert.equal(git(repo, 'rev-parse', 'HEAD'), before);
});

test('commitFor_GoOnOtherBranchThanBase_ThrowsNamingBothAndCommitsNothing', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  git(repo, 'switch', '--quiet', '-c', 'feature/x');
  fs.appendFileSync(plan, 'mehr\n');

  // Act & Assert
  assert.throws(() => commitFor('go', repo, { basis: 'dev', spec, plan }, 'docs: plan x'),
    (error) => error instanceof SessionChainError && error.message === 'Aktueller Branch feature/x ist nicht der Basis-Branch dev; die Umsetzung startet nicht.');
  assert.equal(git(repo, 'status', '--porcelain', '--', 'docs/forge/x/plan.md'), 'M docs/forge/x/plan.md');
});

test('commitFor_AnyCommit_ContainsOnlyMarkdownFiles', () => {
  // Arrange
  const repo = makeRepo();
  for (const name of ['CONTEXT.md', 'adr.md', 'tool.js']) fs.writeFileSync(path.join(repo, name), 'x\n');
  const state = { dateien: ['CONTEXT.md', 'adr.md', 'tool.js'].map((name) => ({ etappe: 'grill', pfad: path.join(repo, name) })) };

  // Act
  commitFor('spec', repo, state, 'docs: glossary');

  // Assert
  assert.ok(committedFiles(repo).every((file) => file.endsWith('.md')));
});

// Repo mit Spec in docs/forge/x, noch ohne Commit.
function repoWithNewSpec() {
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  return { repo, spec };
}

test('commitFor_Whiteboarding_CommitsSpecAndItsGlossaryInOneCommit', () => {
  // Arrange
  const { repo, spec } = repoWithNewSpec();
  for (const name of ['CONTEXT.md', 'grill.md', 'fremd.md']) fs.writeFileSync(path.join(repo, name), 'x\n');
  const state = { spec, dateien: [{ etappe: 'whiteboarding', pfad: path.join(repo, 'CONTEXT.md') }, { etappe: 'grill', pfad: path.join(repo, 'grill.md') }] };

  // Act
  const result = commitFor('whiteboarding', repo, state, 'docs: spec x');

  // Assert
  assert.deepEqual(result.commit.dateien, ['docs/forge/x/spec.md', 'CONTEXT.md']);
  assert.deepEqual(committedFiles(repo).sort(), ['CONTEXT.md', 'docs/forge/x/spec.md']);
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
});

test('commitFor_UnknownAnlass_ThrowsNamingAllowedAnlaesse', () => {
  // Act & Assert
  assert.throws(() => commitFor('x', makeRepo(), {}, 'm'),
    (error) => error instanceof SessionChainError && error.message === 'Anlass unbekannt: x (erlaubt: whiteboarding, spec, go)');
});

test('checkWhiteboardingCommitted_SpecUncommittedAfterWhiteboarding_ThrowsUntilCommitted', () => {
  // Arrange
  const { repo, spec } = repoWithNewSpec();
  const state = { spec, etappen: [{ etappe: 'whiteboarding' }] };

  // Act & Assert
  assert.throws(() => checkWhiteboardingCommitted(state, repo),
    (error) => error instanceof SessionChainError && error.message === 'Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`');
  commitFor('whiteboarding', repo, state, 'docs: spec x');
  assert.doesNotThrow(() => checkWhiteboardingCommitted(state, repo));
});

test('checkWhiteboardingCommitted_LastEtappeNotWhiteboarding_DoesNotThrow', () => {
  // Arrange
  const { repo, spec } = repoWithNewSpec();

  // Act & Assert
  assert.doesNotThrow(() => checkWhiteboardingCommitted({ spec, etappen: [{ etappe: 'spec-review' }] }, repo));
  assert.doesNotThrow(() => checkWhiteboardingCommitted({ spec }, repo));
});
