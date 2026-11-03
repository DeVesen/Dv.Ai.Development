'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo } = require('./lib/git-repo');
const { SessionChainError, writeState } = require('../scripts/lib/session-chain-store');
const { ETAPPE_OF_SKILL, etappeFor } = require('../scripts/lib/etappe-of');

test('etappeFor_WhiteboardingSwitch_ReturnsWhiteboardingEvenWithARunningEtappe', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const etappe = etappeFor({ skill: 'spec-review', dir: repo, slug: 'x', whiteboarding: true });

  // Assert
  assert.equal(etappe, 'whiteboarding');
});

test('etappeFor_ChainStateWithRunningEtappe_ReturnsThatEtappe', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const etappe = etappeFor({ skill: 'plan-review', dir: repo, slug: 'x' });

  // Assert
  assert.equal(etappe, 'planning');
});

test('etappeFor_NoStateForTheSlug_UsesTheEtappeOfTheSkillName', () => {
  // Arrange
  const repo = makeRepo();
  const expected = {
    'spec-review': 'spec-review', 'spec-review-orchestrator': 'spec-review', 'plan-review': 'plan-review', 'plan-orchestrator': 'planning',
    'implementation-review': 'umsetzung', 'implementation-orchestrator': 'umsetzung',
  };

  // Act
  const actual = Object.fromEntries(Object.keys(expected).map((skill) => [skill, etappeFor({ skill, dir: repo, slug: 'x' })]));

  // Assert
  assert.deepEqual(actual, expected);
  assert.deepEqual(ETAPPE_OF_SKILL, expected);
});

test('etappeFor_StateWithoutRunningEtappe_UsesTheEtappeOfTheSkillName', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { slug: 'x', gestartet: null });

  // Act
  const etappe = etappeFor({ skill: 'plan-review', dir: repo, slug: 'x' });

  // Assert
  assert.equal(etappe, 'plan-review');
});

test('etappeFor_SkillWithoutAblage_ThrowsSessionChainError', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const resolve = () => etappeFor({ skill: 'spec-grilling', dir: repo, slug: 'x' });

  // Assert
  assert.throws(resolve, (error) => error instanceof SessionChainError && /Kein Skill mit Ablage: spec-grilling/.test(error.message));
});

test('etappeFor_DirOutsideAGitRepo_ThrowsSessionChainError', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-norepo-'));

  // Act
  const resolve = () => etappeFor({ skill: 'spec-review', dir, slug: 'x' });

  // Assert
  assert.throws(resolve, SessionChainError);
});
