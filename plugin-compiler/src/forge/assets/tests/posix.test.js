'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { normalizePath, realPath } = require('../scripts/lib/posix');

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

test('realPath_ExistingDirectory_EqualsTheRealPathOfTheSystem', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-real-'));

  // Act
  const result = realPath(dir);

  // Assert
  assert.equal(result, fs.realpathSync.native(dir));
});

test('realPath_MissingPath_IsTheRealParentWithTheMissingRest', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-real-'));

  // Act
  const result = realPath(path.join(dir, 'gibt', 'es', 'nicht'));

  // Assert
  assert.equal(result, path.join(fs.realpathSync.native(dir), 'gibt', 'es', 'nicht'));
});
