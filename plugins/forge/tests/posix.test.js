'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { normalizePath } = require('../scripts/lib/posix');

test('normalizePath_RelativePathWithBackslashes_AbsoluteWithSlashesLowercaseOnWindows', () => {
  // Act
  const result = normalizePath('docs\\Forge\\x');

  // Assert
  const expected = path.resolve('docs', 'Forge', 'x').replace(/\\/g, '/');
  assert.equal(result, process.platform === 'win32' ? expected.toLowerCase() : expected);
});

test('normalizePath_SamePathInBothSpellings_ReturnsSameKey', () => {
  // Arrange
  const dir = path.join(path.resolve('.'), 'A', 'b');

  // Act & Assert
  assert.equal(normalizePath(dir), normalizePath(dir.split(path.sep).join('/')));
});
