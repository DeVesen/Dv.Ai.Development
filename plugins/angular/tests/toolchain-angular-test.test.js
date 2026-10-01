'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ngTest = require('../scripts/toolchain/angular-test.js');
const { fakeAngular } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'angular-test.js');
const project = (builder, options) => ({ projects: { app: { architect: { test: { builder, options } } } } });
const VITEST = [
  ' ✓ src/app/total.spec.ts (3 tests) 4ms',
  ' × src/app/app.spec.ts > AppComponent > should render title 12ms',
  '   → expected \'x\' to be \'y\'',
  '',
  ' Test Files  1 failed | 1 passed (2)',
  '      Tests  1 failed | 3 passed (4)',
].join('\n');

test('runnerOf_BuilderInAngularJson_DetectsRunner', () => {
  assert.equal(ngTest.runnerOf(fakeAngular(project('@angular/build:unit-test'), '', 0).dir), 'vitest');
  assert.equal(ngTest.runnerOf(fakeAngular(project('@angular/build:unit-test', { runner: 'karma' }), '', 0).dir), 'karma');
  assert.equal(ngTest.runnerOf(fakeAngular(project('@angular-builders/jest:run'), '', 0).dir), 'jest');
  assert.equal(ngTest.runnerOf(fakeAngular(project('@angular-devkit/build-angular:karma'), '', 0).dir), 'karma');
});

test('parse_Vitest_FailedTestWithoutDurationAndSummary', () => {
  const result = ngTest.parse(VITEST, 1, 'vitest');
  assert.deepEqual(result.errors, ['src/app/app.spec.ts > AppComponent > should render title: expected \'x\' to be \'y\'']);
  assert.equal(result.summary, 'Test Files  1 failed | 1 passed (2) | Tests  1 failed | 3 passed (4)');
});

test('parse_Karma_ProgressReporterLine', () => {
  const output = [
    'Chrome Headless 120.0.0.0 (Linux x86_64) AppComponent should create FAILED',
    '\tError: Expected false to be true.',
    'Chrome Headless 120.0.0.0 (Linux x86_64): Executed 2 of 3 (1 FAILED) (0 secs / 0.08 secs)',
    'Chrome Headless 120.0.0.0 (Linux x86_64): Executed 3 of 3 (1 FAILED) (0.1 secs / 0.08 secs)',
    'TOTAL: 1 FAILED, 2 SUCCESS',
  ].join('\n');
  const result = ngTest.parse(output, 1, 'karma');
  assert.deepEqual(result.errors, ['AppComponent should create: Error: Expected false to be true.']);
  assert.equal(result.summary, 'Chrome Headless 120.0.0.0 (Linux x86_64): Executed 3 of 3 (1 FAILED) (0.1 secs / 0.08 secs)');
});

test('parse_Jest_IgnoresConsoleBlocks', () => {
  const output = '  ● Console\n\n    console.log hallo\n\n  ● AppComponent › should create\n\nTests:       1 failed, 5 passed, 6 total\n';
  const result = ngTest.parse(output, 1, 'jest');
  assert.deepEqual(result.errors, ['AppComponent › should create']);
  assert.equal(result.summary, 'Tests:       1 failed, 5 passed, 6 total');
});

test('parse_CompileErrorBeforeTests_ReportsCompileErrors', () => {
  const result = ngTest.parse('src/app/x.spec.ts:3:1 - error TS2304: Cannot find name \'y\'.\n', 1, 'karma');
  assert.equal(result.errors.length, 1);
  assert.match(result.summary, /^Kompilieren im Testlauf fehlgeschlagen/);
});

test('cli_Vitest_RunsOnceWithoutWatch', () => {
  const fake = fakeAngular(project('@angular/build:unit-test'), VITEST, 1);
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--log', path.join(fake.dir, 't.log'), '--', '--include', 'src/app/app.spec.ts'], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^angular-test: FEHLGESCHLAGEN \(Exit 1\)/);
  assert.deepEqual(fake.args(), ['test', '--watch=false', '--include', 'src/app/app.spec.ts']);
});

test('cli_Jest_NoWatchFlag', () => {
  const fake = fakeAngular(project('@angular-builders/jest:run'), 'Tests:       6 passed, 6 total\n', 0);
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--log', path.join(fake.dir, 't.log')], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /angular-test: OK/);
  assert.deepEqual(fake.args(), ['test']);
});

test('cli_TestBuilderPackageMissing_StopsBeforeRunWithNpmCiHint', () => {
  const fake = fakeAngular(project('@angular/build:unit-test'), VITEST, 1, { withBuilderPackages: false });
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--log', path.join(fake.dir, 't.log')], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Node-Pakete fehlen: @angular\/build\. Im Projektordner npm ci ausführen\./);
  assert.match(result.stdout, /Zusammenfassung: Nicht gestartet\./);
  assert.throws(() => fake.args());
});

test('builderPackages_ScopedAndUnscopedBuilders_NamePackages', () => {
  assert.deepEqual(ngTest.builderPackages(project('@angular/build:unit-test')), ['@angular/build']);
  assert.deepEqual(ngTest.builderPackages(project('@angular-builders/jest:run')), ['@angular-builders/jest']);
  assert.deepEqual(ngTest.builderPackages(project('karma-builder:run')), ['karma-builder']);
  assert.deepEqual(ngTest.builderPackages({ projects: {} }), []);
});
