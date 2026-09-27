'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const build = require('../scripts/toolchain/dotnet-build.js');
const { fakeDotnet, tempDir } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'dotnet-build.js');
const POSIX_ONLY = { skip: process.platform === 'win32' && 'falsches dotnet nur unter POSIX' };
const FAILED = [
  'Determining projects to restore...',
  '\x1B[31mC:\\src\\App\\Foo.cs(12,5): error CS0103: The name \'x\' does not exist in the current context [C:\\src\\App\\App.csproj]\x1B[0m',
  'C:\\src\\App\\Foo.cs(12,5): error CS0103: The name \'x\' does not exist in the current context [C:\\src\\App\\App.csproj]',
  'C:\\src\\App\\Bar.cs(3,1): warning CS8618: Non-nullable property \'Name\' must contain a non-null value [C:\\src\\App\\App.csproj]',
  '',
  'Build FAILED.',
].join('\n');

test('parse_ErrorsAndWarnings_DedupedWithoutAnsi', () => {
  const result = build.parse(FAILED, 1);
  assert.deepEqual(result.errors, ['C:\\src\\App\\Foo.cs(12,5): error CS0103: The name \'x\' does not exist in the current context [C:\\src\\App\\App.csproj]']);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.summary, 'Build FAILED.');
});

test('parse_FailureWithoutErrorLine_ReturnsLogTail', () => {
  const output = Array.from({ length: 15 }, (_, index) => `zeile ${index + 1}`).join('\n');
  const result = build.parse(output, 1);
  assert.equal(result.errors.length, 10);
  assert.equal(result.errors[9], 'zeile 15');
  assert.match(result.summary, /ohne erkannte Fehlerzeile/);
});

test('parseArgs_ExtraArgumentsAfterDoubleDash_PassedThrough', () => {
  const args = build.parseArgs(['--path', 'App.sln', '--', '-c', 'Release']);
  assert.equal(args.path, 'App.sln');
  assert.deepEqual(args.extra, ['-c', 'Release']);
  assert.throws(() => build.parseArgs(['--unbekannt', 'x']));
});

test('cli_FailedBuild_PrintsErrorsWritesLogExitsOne', POSIX_ONLY, () => {
  const fake = fakeDotnet(FAILED, 1);
  const log = path.join(fake.dir, 'build.log');
  const result = spawnSync(process.execPath, [SCRIPT, '--path', fake.dir, '--log', log, '--', '-c', 'Release'], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^dotnet-build: FEHLGESCHLAGEN \(Exit 1\)/);
  assert.match(result.stdout, /Fehler \(1\):\n- C:\\src\\App\\Foo\.cs\(12,5\): error CS0103/);
  assert.match(result.stdout, new RegExp(`Log: ${log.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
  assert.deepEqual(fake.args(), ['build', fake.dir, '-c', 'Release']);
  assert.match(require('node:fs').readFileSync(log, 'utf8'), /Determining projects to restore/);
});

test('cli_SuccessfulBuild_ExitsZero', POSIX_ONLY, () => {
  const fake = fakeDotnet('Build succeeded.\n    0 Warning(s)\n    0 Error(s)\n', 0);
  const result = spawnSync(process.execPath, [SCRIPT, '--path', fake.dir, '--log', path.join(fake.dir, 'b.log')], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dotnet-build: OK/);
  assert.match(result.stdout, /Zusammenfassung: Build succeeded\./);
});

test('cli_MissingPath_ExitsTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--path', path.join(tempDir('dv-forge-'), 'fehlt.sln')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Pfad nicht gefunden/);
});
