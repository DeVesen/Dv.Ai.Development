'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readParts, openPoints, mergePoints, pointLine } = require('../scripts/lib/session-chain-points');
const { mergeReports } = require('../scripts/lib/orchestrator-report');

function yellow(key, title) {
  return { key, color: 'yellow', title };
}

test('openPoints_FollowupLeavesChosenYellowUnchanged_YellowStaysOpen', () => {
  // Arrange
  const review = { open: [yellow('a', 'Begriff AK/AC')], green: [], changes: [] };
  const followup = { open: [], green: [], changes: [] };

  // Act
  const points = openPoints([review, followup], 'spec-review');

  // Assert
  assert.deepEqual(points, [{ farbe: 'yellow', titel: 'Begriff AK/AC', key: 'a', herkunft: 'spec-review' }]);
});

test('openPoints_FollowupChangesYellowWithOk_YellowIsDone', () => {
  // Arrange
  const review = { open: [yellow('a', 'Begriff'), yellow('b', 'Rest')], green: [] };
  const followup = { open: [], changes: [{ key: 'a', ok: true }, { key: 'b', ok: false }] };

  // Act
  const points = openPoints([review, followup], 'plan-review');

  // Assert
  assert.deepEqual(points.map((point) => point.key), ['b']);
});

test('openPoints_RedAndGreen_KeepsOnlyYellowAndGreenYellowFirst', () => {
  // Arrange
  const review = { open: [{ key: 'r', color: 'red', title: 'Rot' }, yellow('y', 'Gelb')], green: [{ key: 'g', color: 'green', title: 'Grün' }] };

  // Act
  const points = openPoints([review], 'plan-review');

  // Assert
  assert.deepEqual(points.map((point) => point.farbe), ['yellow', 'green']);
});

test('readParts_ReviewAndTwoFollowups_ReturnsThemInRoundOrder', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-'));
  fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), JSON.stringify({ n: 2 }));
  fs.writeFileSync(path.join(dir, 'bericht-review.json'), JSON.stringify({ n: 0 }));
  fs.writeFileSync(path.join(dir, 'bericht-followup-1.json'), JSON.stringify({ n: 1 }));

  // Act
  const parts = readParts(dir);

  // Assert
  assert.deepEqual(parts.map((part) => part.n), [0, 1, 2]);
});

test('mergePoints_SameEtappeAgain_ReplacesItsPointsAndKeepsOthers', () => {
  // Arrange
  const existing = [{ farbe: 'yellow', titel: 'Alt', key: 'a', herkunft: 'spec-review' }, { farbe: 'green', titel: 'Plan', key: 'p', herkunft: 'plan-review' }];
  const fresh = [{ farbe: 'yellow', titel: 'Neu', key: 'n', herkunft: 'spec-review' }];

  // Act
  const merged = mergePoints(existing, 'spec-review', fresh);

  // Assert
  assert.deepEqual(merged.map((point) => point.titel), ['Plan', 'Neu']);
});

test('pointLine_YellowPoint_NamesIconTitleAndOrigin', () => {
  // Act
  const line = pointLine({ farbe: 'yellow', titel: 'Begriff', herkunft: 'spec-review' });

  // Assert
  assert.equal(line, '- 🟡 Begriff · spec-review');
});

test('openPoints_SameInputAsMergeReports_DiffersOnlyForUnchangedChosenGroups', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pt-'));
  const review = path.join(dir, 'bericht-review.json');
  const followup = path.join(dir, 'bericht-followup-1.json');
  fs.writeFileSync(review, JSON.stringify({ open: [{ ...yellow('a', 'Gewählt, nicht geändert'), hasProposal: true }, { ...yellow('b', 'Ohne Vorschlag'), hasProposal: false }], green: [], changes: [] }));
  fs.writeFileSync(followup, JSON.stringify({ open: [], green: [], changes: [] }));

  // Act
  const points = openPoints(readParts(dir), 'spec-review');

  // Assert
  const report = mergeReports({ art: 'spec', reviewFile: review, followupFiles: [followup] });
  assert.deepEqual(report.open.map((entry) => entry.key), ['b']);
  assert.deepEqual(points.map((point) => point.key), ['a', 'b']);
});
