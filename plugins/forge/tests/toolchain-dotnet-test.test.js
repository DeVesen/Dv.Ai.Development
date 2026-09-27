'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotnetTest = require('../scripts/toolchain/dotnet-test.js');
const { fakeDotnet } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'dotnet-test.js');
const POSIX_ONLY = { skip: process.platform === 'win32' && 'falsches dotnet nur unter POSIX' };
const FAILED = [
  '  Failed App.Tests.OrderTests.Total_WithDiscount_IsReduced [12 ms]',
  '  Error Message:',
  '   Assert.Equal() Failure: Values differ',
  '  Stack Trace:',
  '     at App.Tests.OrderTests.Total_WithDiscount_IsReduced()',
  '  Passed App.Tests.OrderTests.Total_Empty_IsZero [1 ms]',
  '',
  'Failed!  - Failed:     1, Passed:    10, Skipped:     0, Total:    11, Duration: 1 s - App.Tests.dll (net8.0)',
].join('\n');

test('parse_FailedTest_NameWithErrorMessageAndSummary', () => {
  const result = dotnetTest.parse(FAILED, 1);
  assert.deepEqual(result.errors, ['App.Tests.OrderTests.Total_WithDiscount_IsReduced: Assert.Equal() Failure: Values differ']);
  assert.match(result.summary, /^Failed! {2}- Failed: {5}1, Passed: {4}10/);
});

test('parse_TestingPlatformFormat_RecognizesFailedTest', () => {
  const result = dotnetTest.parse('failed App.Tests.X.Y (5ms)\n  Assert.True() Failure\nTest run summary: Failed!\n', 1);
  assert.deepEqual(result.errors, ['App.Tests.X.Y']);
  assert.equal(result.summary, 'Test run summary: Failed!');
});

test('parse_BuildErrorDuringTest_ReportsBuildErrors', () => {
  const result = dotnetTest.parse('C:\\src\\A.cs(1,1): error CS1002: ; expected [C:\\src\\A.csproj]\n', 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.summary, /Build im Testlauf fehlgeschlagen/);
});

test('parse_FilterMatchesNothing_SaysSo', () => {
  const result = dotnetTest.parse('No test matches the given testcase filter `FullyQualifiedName~Nope` in C:\\x.dll\n', 1);
  assert.match(result.errors[0], /^No test matches the given testcase filter/);
  assert.equal(result.summary, 'Kein Test passt zum Filter.');
});

test('parse_AllPassed_NoErrors', () => {
  const result = dotnetTest.parse('Passed!  - Failed:     0, Passed:    11, Skipped:     0, Total:    11\n', 0);
  assert.deepEqual(result.errors, []);
  assert.match(result.summary, /^Passed!/);
});

test('cli_FilterAfterDoubleDash_PassedToDotnetTest', POSIX_ONLY, () => {
  const fake = fakeDotnet(FAILED, 1);
  const result = spawnSync(process.execPath, [SCRIPT, '--path', fake.dir, '--log', path.join(fake.dir, 't.log'), '--', '--filter', 'OrderTests'], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^dotnet-test: FEHLGESCHLAGEN \(Exit 1\)/);
  assert.match(result.stdout, /- App\.Tests\.OrderTests\.Total_WithDiscount_IsReduced: Assert\.Equal\(\) Failure/);
  assert.deepEqual(fake.args(), ['test', fake.dir, '--filter', 'OrderTests']);
});

test('cli_TimeoutExceeded_ReportsAbort', POSIX_ONLY, () => {
  const fake = fakeDotnet('', 0);
  const env = { ...fake.env, FAKE_SLEEP_MS: '5000' };
  const result = spawnSync(process.execPath, [SCRIPT, '--path', fake.dir, '--log', path.join(fake.dir, 't.log'), '--timeout', '1'], { encoding: 'utf8', env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Abgebrochen nach 1 s\./);
});
