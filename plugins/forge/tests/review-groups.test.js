'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { groupRated, countColors, renderGroups, renderTable } = require('../scripts/lib/groups');
const { parseRework } = require('../scripts/followup');
const { finding } = require('./lib/review-flow-fixture');

function item(reviewer, color, key = 'ac-4', label = 'AC-04') {
  return { reviewer, category: color === 'red' ? 'widerspruch' : 'detail', color, place: { key, label }, finding: finding({ location: label }) };
}

test('groupRated_TwoYellowFromTwoReviewers_StaysYellow', () => {
  // Act
  const [group] = groupRated([item('clarity', 'yellow'), item('consistency', 'yellow')]);

  // Assert
  assert.equal(group.color, 'yellow');
});

test('groupRated_RedAndYellowAtSamePlace_IsRed', () => {
  // Act
  const [group] = groupRated([item('clarity', 'yellow'), item('consistency', 'red')]);

  // Assert
  assert.equal(group.color, 'red');
});

test('groupRated_SeveralPlaces_SortedRedYellowGreen', () => {
  // Act
  const groups = groupRated([item('a', 'green', 'ac-1', 'AC-01'), item('a', 'yellow', 'ac-2', 'AC-02'), item('a', 'red', 'ac-3', 'AC-03')]);

  // Assert
  assert.deepEqual(groups.map((group) => group.color), ['red', 'yellow', 'green']);
});

test('countColors_Groups_CountsPerColor', () => {
  // Act
  const counts = countColors(groupRated([item('a', 'red', 'ac-1'), item('a', 'yellow', 'ac-2'), item('b', 'yellow', 'ac-3')]));

  // Assert
  assert.deepEqual(counts, { red: 1, yellow: 2, green: 0 });
});

test('renderGroups_Groups_ReadableByFollowupParser', () => {
  // Arrange
  const text = renderGroups(groupRated([item('clarity', 'yellow'), item('consistency', 'red', 'ac-7', 'AC-07')]));

  // Act
  const parsed = parseRework(text.split('\n'));

  // Assert
  assert.deepEqual(parsed.map((group) => [group.severity, group.location, group.reviewers]), [['🔴', 'AC-07', ['consistency']], ['🟡', 'AC-04', ['clarity']]]);
});

test('renderGroups_LabelWithLineBreak_HeadingStaysOneLine', () => {
  // Arrange
  const text = renderGroups(groupRated([item('clarity', 'yellow', 'x ### 🔴 y', 'X\n### 🔴 Y')]));

  // Act
  const parsed = parseRework(text.split('\n'));

  // Assert
  assert.deepEqual(parsed.map((group) => group.location), ['X ### 🔴 Y']);
});

test('renderTable_Group_ShowsCategoryColumn', () => {
  // Act
  const table = renderTable(groupRated([item('clarity', 'red')]));

  // Assert
  assert.equal(table.split('\n')[2], '| 🔴 | AC-04 | widerspruch | clarity | 🔴 Folge |');
});
