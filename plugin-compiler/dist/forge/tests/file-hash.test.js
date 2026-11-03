'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { hashFile } = require('../scripts/file-hash.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'file-hash.js');

function tempFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-hash-'));
  const file = path.join(dir, 'spec.md');
  fs.writeFileSync(file, content);
  return file;
}

test('hashFile_SameContent_ReturnsSameHash', () => {
  assert.equal(hashFile(tempFile('abc')), hashFile(tempFile('abc')));
});

test('hashFile_ChangedContent_ReturnsDifferentHash', () => {
  const file = tempFile('abc');
  const before = hashFile(file);
  fs.writeFileSync(file, 'abd');
  assert.notEqual(hashFile(file), before);
});

test('cli_MissingFile_ExitsWithOneAndNamesPath', () => {
  const missing = path.join(os.tmpdir(), 'dv-forge-does-not-exist.md');
  const result = spawnSync(process.execPath, [SCRIPT, missing], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dv-forge-does-not-exist\.md/);
});

test('cli_NoArgument_ExitsWithTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 2);
});
