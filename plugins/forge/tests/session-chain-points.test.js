'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readParts, openPoints, mergePoints, pointLine } = require('../scripts/lib/session-chain-points');
const { mergeReports } = require('../scripts/lib/orchestrator-report');
const { SessionChainError } = require('../scripts/lib/session-chain-store');

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

test('openPoints_WhiteboardingWithRedYellowAndGreen_KeepsAllRedFirst', () => {
  // Arrange
  const review = { open: [yellow('y', 'Gelb'), { key: 'r', color: 'red', title: 'Rot' }], green: [{ key: 'g', color: 'green', title: 'Grün' }] };

  // Act
  const points = openPoints([review], 'whiteboarding');

  // Assert
  assert.deepEqual(points.map((point) => point.farbe), ['red', 'yellow', 'green']);
});

test('mergePoints_SpecReviewAfterWhiteboarding_ReplacesWhiteboardingPoints', () => {
  // Arrange
  const existing = [{ farbe: 'red', titel: 'Lücke', key: 'l', herkunft: 'whiteboarding' }, { farbe: 'yellow', titel: 'Plan', key: 'p', herkunft: 'planning' }];

  // Act
  const merged = mergePoints(existing, 'spec-review', [{ farbe: 'yellow', titel: 'Neu', key: 'n', herkunft: 'spec-review' }]);

  // Assert
  assert.deepEqual(merged.map((point) => point.titel), ['Plan', 'Neu']);
});

test('pointLine_RedPoint_NamesRedIcon', () => {
  // Act
  const line = pointLine({ farbe: 'red', titel: 'Lücke', herkunft: 'whiteboarding' });

  // Assert
  assert.equal(line, '- 🔴 Lücke · whiteboarding');
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

test('readParts_BrokenJson_ThrowsSessionChainError', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-bj-'));
  const file = path.join(dir, 'bericht-review.json');
  fs.writeFileSync(file, '{ kaputt');
  const message = `Bericht-Daten nicht lesbar: ${file.replace(/\\/g, '/')}`;

  // Act & Assert
  assert.throws(() => readParts(dir), (error) => error instanceof SessionChainError && error.message === message);
});

test('readParts_MissingFiles_ReturnsEmptyList', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-mf-'));

  // Act
  const parts = readParts(dir);

  // Assert
  assert.deepEqual(parts, []);
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

test('mergePoints_PlanReviewAfterPlanning_ReplacesPlanningPointsAndKeepsSpecPoints', () => {
  // Arrange
  const existing = [
    { farbe: 'yellow', titel: 'Spec-Begriff', key: 's', herkunft: 'spec-review' },
    { farbe: 'yellow', titel: 'Plan-Begriff', key: 'p', herkunft: 'planning' },
  ];
  const fresh = [{ farbe: 'green', titel: 'Reihenfolge', key: 'r', herkunft: 'plan-review' }];

  // Act
  const merged = mergePoints(existing, 'plan-review', fresh);

  // Assert
  assert.deepEqual(merged.map((point) => point.titel), ['Spec-Begriff', 'Reihenfolge']);
});
