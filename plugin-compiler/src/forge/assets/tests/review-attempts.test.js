'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readAttempts, nextAttempt, failedInstances } = require('../scripts/lib/attempts');
const { FlowError } = require('../scripts/lib/flow-error');
const { tempDir } = require('./lib/review-flow-fixture');

test('nextAttempt_InstanceThreeTimes_RequestsRestartsThenFails', () => {
  // Arrange
  const workspace = tempDir();

  // Act
  const steps = [nextAttempt(workspace, 'clarity'), nextAttempt(workspace, 'clarity'), nextAttempt(workspace, 'clarity')];

  // Assert
  assert.deepEqual(steps, ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN']);
});

test('nextAttempt_BundlingTwice_CorrectsThenFailsRework', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nacharbeit', 'buendelung');

  // Act
  const step = nextAttempt(workspace, 'nacharbeit', 'buendelung');

  // Assert
  assert.equal(step, 'AUSGEFALLEN');
  assert.deepEqual(failedInstances(workspace), ['nacharbeit']);
});

test('nextAttempt_ReworkBeforeAndAfterPause_SharesOneCounter', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nacharbeit');
  nextAttempt(workspace, 'nacharbeit');

  // Act
  const step = nextAttempt(workspace, 'nacharbeit');

  // Assert
  assert.equal(step, 'AUSGEFALLEN');
});

test('failedInstances_OnlyRequested_ListsNothing', () => {
  // Arrange
  const workspace = tempDir();
  nextAttempt(workspace, 'nachprüfer');

  // Act
  const failed = failedInstances(workspace);

  // Assert
  assert.deepEqual(failed, []);
});

test('readAttempts_BrokenJson_FlowError', () => {
  // Arrange
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'versuche.json'), '{"instanz:clarity": 1');

  // Act
  const read = () => readAttempts(workspace);

  // Assert
  assert.throws(read, (error) => error instanceof FlowError && /^kein gültiges JSON: .*versuche\.json: /.test(error.message));
});
