'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lockHint } = require('../scripts/toolchain/dotnet-lock-hint.js');
const build = require('../scripts/toolchain/dotnet-build.js');
const dotnetTest = require('../scripts/toolchain/dotnet-test.js');

const LOCKED = [
  'C:\\Program Files\\dotnet\\sdk\\Microsoft.Common.CurrentVersion.targets(5000,5): error MSB3027: Could not copy "obj\\Debug\\Bazaar.Api.dll" to "bin\\Debug\\Bazaar.Api.dll". Exceeded retry count of 10. Failed. The file is locked by: "Bazaar.Api (32700)" [C:\\src\\Bazaar.Api.csproj]',
  'Build FAILED.',
].join('\n');

test('lockHint_Msb3027WithHolder_NamesProcessAndWorkarounds', () => {
  const hint = lockHint(LOCKED);
  assert.match(hint, /Prozess Bazaar\.Api \(PID 32700\)/);
  assert.match(hint, /-c Release/);
  assert.match(hint, /außerhalb des Repos/);
});

test('lockHint_Msb3027WithoutHolder_UsesGenericSentence', () => {
  const hint = lockHint('x.targets(1,1): error MSB3027: Could not copy a to b.');
  assert.match(hint, /Ein laufender Prozess hält die Datei gesperrt/);
});

test('lockHint_OtherError_ReturnsNull', () => {
  assert.equal(lockHint('Foo.cs(1,1): error CS0103: The name x does not exist'), null);
});

test('build_parseAndRender_LockedDll_AddsHintLine', () => {
  const report = { ok: false, exitCode: 1, seconds: 1, log: 'l.log', ...build.parse(LOCKED, 1) };
  assert.match(build.render(report), /^Hinweis: Gesperrt von Prozess Bazaar\.Api \(PID 32700\)\./m);
});

test('build_parse_SuccessfulBuild_HasNoHint', () => {
  assert.equal(build.parse(LOCKED, 0).hint, undefined);
});

test('test_parse_LockedDllDuringTestBuild_CarriesHint', () => {
  assert.match(dotnetTest.parse(LOCKED, 1).hint, /PID 32700/);
});
