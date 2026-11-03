'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { toPosix } = require('../scripts/lib/posix');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'chain.js');

function chain(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('chainCli_WritePlanThenLookup_PrintsEntryLines', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const written = chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '311404');
  const found = chain(repo, 'lookup', '--stage', 'plan', '--plan', plan);

  // Assert
  assert.equal(written.status, 0, written.stderr);
  assert.equal(written.stdout, 'EINTRAG plan x\n');
  assert.equal(found.stdout, ['stage=plan', 'slug=x', `spec=${toPosix(path.resolve(spec))}`, `plan=${toPosix(path.resolve(plan))}`, 'wi=311404'].join('\n') + '\n');
});

test('chainCli_LookupWithoutEntryOrOtherStage_PrintsNoEntry', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  chain(repo, 'write', '--stage', 'spec', '--spec', spec);

  // Act
  const other = chain(repo, 'lookup', '--stage', 'plan', '--plan', plan);

  // Assert
  assert.equal(other.stdout, 'KEIN EINTRAG\n');
});

test('chainCli_WritePlanWithoutPlanFile_ExitsWithOneAndKeepsEntry', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '1');

  // Act
  const result = chain(repo, 'write', '--stage', 'plan', '--plan', path.join(repo, 'docs/forge/x/fehlt.md'), '--spec', spec, '--wi', '2');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge chain: plan: Pfad nicht gefunden: plan=/);
  assert.match(chain(repo, 'lookup', '--stage', 'plan', '--plan', plan).stdout, /wi=1\n$/);
});

test('chainCli_RemoveByWorktree_RemovesImplementationEntryOnly', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/x');
  chain(repo, 'write', '--stage', 'implementation', '--plan', plan, '--spec', spec, '--worktree', worktree, '--branch', 'feature/x');

  // Act
  const removed = chain(repo, 'remove', '--worktree', worktree);

  // Assert
  assert.equal(removed.stdout, 'ENTFERNT 1\n');
  assert.equal(chain(repo, 'lookup', '--stage', 'implementation', '--plan', plan).stdout, 'KEIN EINTRAG\n');
  assert.equal(chain(repo, 'remove', '--worktree', worktree).stdout, 'ENTFERNT 0\n');
});

test('chainCli_LookupArtifactWithSlugOutsideRule_PrintsNoEntryWithExitZero', () => {
  // Arrange
  const repo = makeRepo();
  const plan = path.join(repo, 'docs', 'Änderung Export', 'plan.md');
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.writeFileSync(plan, '# Plan\n\n### Task 1: Eins\n');

  // Act
  const result = chain(repo, 'lookup', '--stage', 'implementation', '--plan', plan);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'KEIN EINTRAG\n');
});

test('chainCli_Write_CreatesNoCommitAndLeavesWorkingTreeClean', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const head = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '311404');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
  assert.equal(git(repo, 'status', '--porcelain'), '');
});

test('chainCli_UnknownCommandOrStage_ExitsWithTwoAndUsage', () => {
  // Act
  const command = chain(os.tmpdir(), 'zeige');
  const stage = chain(os.tmpdir(), 'lookup', '--stage', 'review', '--plan', 'p.md');

  // Assert
  assert.equal(command.status, 2);
  assert.match(command.stderr, /Unbekannter Befehl: zeige\nAufruf: node chain\.js write/);
  assert.equal(stage.status, 2);
  assert.match(stage.stderr, /--stage erlaubt: spec, plan, implementation; nicht review/);
});
