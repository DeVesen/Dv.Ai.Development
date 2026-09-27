'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const lint = require('../scripts/toolchain/dotnet-lint.js');
const { fakeDotnet } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'dotnet-lint.js');
const FINDINGS = [
  'C:\\src\\App\\Foo.cs(3,1): error WHITESPACE: Fix whitespace formatting. Replace 2 characters with \'\\n\'. [C:\\src\\App\\App.csproj]',
  'C:\\src\\App\\Foo.cs(1,1): warning IDE0005: Using directive is unnecessary. [C:\\src\\App\\App.csproj]',
].join('\n');

test('parse_FormatAndAnalyzerFindings_SplitIntoErrorsAndWarnings', () => {
  const result = lint.parse(FINDINGS, 2);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /error WHITESPACE/);
  assert.equal(result.warnings.length, 1);
  assert.match(result.summary, /^1 Fehler, 1 Warnungen\. Beheben mit: dotnet format/);
});

test('parse_Clean_NoFindings', () => {
  assert.deepEqual(lint.parse('', 0), { errors: [], warnings: [], summary: 'Keine Befunde.' });
});

test('cli_VerifyNoChanges_AlwaysPassed', { skip: process.platform === 'win32' && 'falsches dotnet nur unter POSIX' }, () => {
  const fake = fakeDotnet(FINDINGS, 2);
  const result = spawnSync(process.execPath, [SCRIPT, '--path', fake.dir, '--log', path.join(fake.dir, 'l.log')], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^dotnet-lint: FEHLGESCHLAGEN \(Exit 2\)/);
  assert.deepEqual(fake.args(), ['format', fake.dir, '--verify-no-changes']);
});
