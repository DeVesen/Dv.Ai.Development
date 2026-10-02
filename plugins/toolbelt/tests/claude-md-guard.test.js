'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { charCount, stampOf, backupPathOf, makeBackup } = require('../scripts/lib/claude-md-guard');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'claude-md-guard.js');
const NOW = new Date(2026, 9, 2, 10, 30, 5);

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-guard-'));
}

function fileWith(content, name = 'CLAUDE.md') {
  const file = path.join(tempDir(), name);
  fs.writeFileSync(file, content);
  return file;
}

function cli(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('charCount_UmlautsAndEuroSign_CountsCharactersNotBytes', () => {
  assert.equal(charCount('äö€'), 3);
});

test('stampOf_LocalDate_DateDashTime', () => {
  assert.equal(stampOf(NOW), '20261002-103005');
});

test('backupPathOf_NoTarget_TempFolderWithNameAndDate', () => {
  const result = backupPathOf(path.join('x', 'CLAUDE.md'), undefined, NOW);

  assert.equal(result, path.join(os.tmpdir(), 'CLAUDE.md.20261002-103005.bak'));
});

test('backupPathOf_ExistingFolder_NamedFileInsideTheFolder', () => {
  const folder = tempDir();

  const result = backupPathOf(path.join('x', 'CLAUDE.md'), folder, NOW);

  assert.equal(result, path.join(folder, 'CLAUDE.md.20261002-103005.bak'));
});

test('backupPathOf_FilePath_UsedAsGiven', () => {
  const target = path.join(tempDir(), 'sicherung', 'meine.bak');

  assert.equal(backupPathOf(path.join('x', 'CLAUDE.md'), target, NOW), target);
});

test('makeBackup_Target_CopiesBytesExactlyAndCreatesFolders', () => {
  const source = fileWith(Buffer.from('Zeile eins\r\nÄnderung €\r\n', 'utf8'));
  const target = path.join(tempDir(), 'tief', 'unten', 'kopie.bak');

  const written = makeBackup(source, target, NOW);

  assert.equal(written, target);
  assert.deepEqual(fs.readFileSync(target), fs.readFileSync(source));
});

test('makeBackup_MissingFile_ThrowsNotFound', () => {
  assert.throws(() => makeBackup(path.join(tempDir(), 'fehlt.md'), undefined, NOW), /Datei nicht gefunden/);
});

test('cli_Size_PrintsCharacterCount', () => {
  const file = fileWith('äö€');

  const result = cli('size', file);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${file}: 3 Zeichen\n`);
});

test('cli_BackupWithoutTarget_CopiesIntoTempFolderAndPrintsPath', () => {
  const file = fileWith('inhalt\n');

  const result = cli('backup', file);

  assert.equal(result.status, 0, result.stderr);
  const match = /^Backup: (.*CLAUDE\.md\.\d{8}-\d{6}\.bak)\n$/.exec(result.stdout);
  assert.ok(match, result.stdout);
  assert.equal(path.dirname(match[1]), os.tmpdir());
  assert.equal(fs.readFileSync(match[1], 'utf8'), 'inhalt\n');
  fs.rmSync(match[1]);
});

test('cli_BackupWithTarget_WritesToTheGivenPath', () => {
  const file = fileWith('inhalt\n');
  const target = path.join(tempDir(), 'eigener-ordner', 'sicherung.md');

  const result = cli('backup', file, '--to', target);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `Backup: ${target}\n`);
  assert.equal(fs.readFileSync(target, 'utf8'), 'inhalt\n');
});

test('cli_SizeOfMissingFile_ExitOneWithMessage', () => {
  const result = cli('size', path.join(tempDir(), 'fehlt.md'));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Datei nicht lesbar/);
});

test('cli_OptionWithoutValue_ExitOneWithMessage', () => {
  const result = cli('backup', fileWith('x'), '--to');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--to braucht einen Wert/);
});

test('cli_UnknownCommand_UsageAndExitTwo', () => {
  const result = cli('unbekannt');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf: node claude-md-guard\.js size <datei>/);
});
