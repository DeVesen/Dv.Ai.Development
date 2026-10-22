'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'prepare.js');
const PLAN = '# Demo — Umsetzungsplan\n\n**Ziel:** Demo.\n\n---\n\n### Task 1: Eins\n\nText.\n';

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function planRepo() {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/plan.md', PLAN, 'plan');
  commitFile(repo, 'docs/forge/demo/spec.md', '# Spec\n', 'spec');
  return repo;
}

test('planReview_WithAblage_PrintsTheEtappeAsLastLine', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--ablage', 'plan-review');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim().split('\n').at(-1), 'ablage=plan-review');
});

test('planReview_WithoutAblage_PrintsNoAblageLine', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /^ablage=/m);
});

test('planReview_UnknownAblageEtappe_AbortsWithUsage', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--ablage', 'review');

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--ablage erlaubt: whiteboarding, grill, spec-review/);
});

test('reviewFollowup_WithAblage_AcceptsTheOptionAndFailsOnlyForTheMissingSave', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle', '--ablage', 'plan-review');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Keine Scout-Vorschläge gesichert für demo/);
});

test('specReview_WithAblage_RejectsTheOption', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--ablage', 'spec-review');

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unbekanntes oder unvollständiges Argument: --ablage/);
});
