'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');
const { writeState } = require('../scripts/lib/session-chain-store');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');

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

// kontext.json des Arbeitsbereichs, den die Ausgabe von prepare.js nennt.
function contextOf(result) {
  assert.equal(result.status, 0, result.stderr);
  const workspace = result.stdout.match(/^W=(.*)$/m)[1].trim();
  return JSON.parse(fs.readFileSync(path.join(workspace, 'kontext.json'), 'utf8'));
}

test('planReview_WithoutChainState_RecordsTheEtappeOfTheSkillAndItsAblage', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

  // Assert
  const context = contextOf(result);
  assert.equal(context.etappe, 'plan-review');
  assert.equal(context.ablage, ablageDir(repo, 'demo', 'plan-review').replace(/\\/g, '/'));
  assert.ok(samePath(context.artifact, path.join(repo, 'docs/forge/demo/plan.md')));
  assert.deepEqual(Object.keys(context).sort(), ['ablage', 'artifact', 'etappe', 'repo', 'spec']);
  assert.doesNotMatch(result.stdout, /^ablage=|^etappe=/m);
});

test('planReview_ChainStateWithRunningEtappe_RecordsThatEtappe', () => {
  // Arrange
  const repo = planRepo();
  writeState(repo, 'demo', { slug: 'demo', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

  // Assert
  const context = contextOf(result);
  assert.equal(context.etappe, 'planning');
  assert.equal(context.ablage, ablageDir(repo, 'demo', 'planning').replace(/\\/g, '/'));
});

test('specReview_WhiteboardingSwitch_RecordsTheWhiteboardingEtappe', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--whiteboarding');

  // Assert
  assert.equal(contextOf(result).etappe, 'whiteboarding');
});

test('specReview_WithoutSwitchAndWithoutState_RecordsTheEtappeFromTheSkillName', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md');

  // Assert
  assert.equal(contextOf(result).etappe, 'spec-review');
});

test('implementationReview_Run_RecordsUmsetzungAndThePlanAsArtifact', () => {
  // Arrange
  const repo = planRepo();
  git(repo, 'tag', 'forge-base/demo', 'HEAD~1');

  // Act
  const result = run(repo, 'implementation-review', 'docs/forge/demo/plan.md');

  // Assert
  const context = contextOf(result);
  assert.equal(context.etappe, 'umsetzung');
  assert.ok(samePath(context.artifact, path.join(repo, 'docs/forge/demo/plan.md')));
});

test('prepare_DebugSwitch_IsAcceptedByEveryStage', () => {
  // Arrange
  const repo = planRepo();
  git(repo, 'tag', 'forge-base/demo', 'HEAD~1');
  const calls = [
    ['spec-review', 'docs/forge/demo/spec.md'], ['plan-review', 'docs/forge/demo/plan.md'],
    ['implementation', 'docs/forge/demo/plan.md'], ['implementation-review', 'docs/forge/demo/plan.md'],
  ];

  // Act
  const results = calls.map((call) => run(repo, ...call, '--debug'));

  // Assert
  results.forEach((result, index) => assert.equal(result.status, 0, `${calls[index][0]}: ${result.stderr}`));
});

test('reviewFollowup_DebugAndWhiteboardingSwitch_AreAcceptedAndFailOnlyForTheMissingSave', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'review-followup', 'docs/forge/demo/spec.md', 'alle', '--whiteboarding', '--debug');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Keine Scout-Vorschläge gesichert für demo/);
});

for (const parts of [['--', 'ber', 'icht'], ['--', 'abl', 'age']]) {
  const parameter = parts.join('');
  for (const call of [['spec-review', 'docs/forge/demo/spec.md'], ['plan-review', 'docs/forge/demo/plan.md'], ['review-followup', 'docs/forge/demo/plan.md', 'alle']]) {
    test(`${call[0].replace(/\W+/g, '_')}_FormerParameter${parts[1]}${parts[2]}_AbortsWithUnknownParameter`, () => {
      // Arrange
      const repo = planRepo();

      // Act
      const result = run(repo, ...call, parameter, 'x');

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}$`, 'm'));
    });
  }
}

test('planReview_WhiteboardingSwitch_IsRejectedAsUnknownParameter', () => {
  // Arrange
  const repo = planRepo();

  // Act
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--whiteboarding');

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^unbekannter Parameter: --whiteboarding$/m);
});
