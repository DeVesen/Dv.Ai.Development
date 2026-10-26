'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { REPORT_FORMAT, ReportFormatError, assertCurrentFormat } = require('../scripts/lib/report-format');

test('assertCurrentFormat_CurrentFormat_ReturnsTheData', () => {
  // Arrange
  const data = { format: REPORT_FORMAT, status: 'sauber nach Runde 1' };

  // Act
  const result = assertCurrentFormat(data, 'bericht-review.json');

  // Assert
  assert.equal(result, data);
  assert.equal(REPORT_FORMAT, 2);
});

test('assertCurrentFormat_FormerFormatOrNoFormat_ThrowsNamingTheOldFormatAndTheFile', () => {
  for (const data of [{ format: 1 }, {}, null]) {
    // Act
    const read = () => assertCurrentFormat(data, '/x/bericht-review.json');

    // Assert
    assert.throws(read, (error) => error instanceof ReportFormatError && /^Ablage im alten Format: \/x\/bericht-review\.json$/.test(error.message));
  }
});
