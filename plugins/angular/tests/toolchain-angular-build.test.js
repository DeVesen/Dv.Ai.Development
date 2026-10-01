'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const build = require('../scripts/toolchain/angular-build.js');
const { fakeAngular, tempDir } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'angular-build.js');
const ANGULAR_JSON = { projects: { app: { architect: { build: { builder: '@angular/build:application' } } } } };
const FAILED = [
  'Application bundle generation failed. [1.2 seconds]',
  '',
  '✘ [ERROR] TS2322: Type \'string\' is not assignable to type \'number\'. [plugin angular-compiler]',
  '',
  '    src/app/app.ts:10:9:',
  '      10 │   count: number = \'x\';',
  '',
  '▲ [WARNING] NG8107: The left side of this optional chain operation does not include \'null\' [plugin angular-compiler]',
  '',
  '    src/app/app.html:3:17:',
].join('\n');

test('parse_EsbuildError_CarriesLocation', () => {
  const result = build.parse(FAILED, 1);
  assert.deepEqual(result.errors, ['src/app/app.ts:10:9: ✘ [ERROR] TS2322: Type \'string\' is not assignable to type \'number\'. [plugin angular-compiler]']);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.summary, '1 Fehler, 1 Warnungen.');
});

test('parse_Success_CountsWarnings', () => {
  const result = build.parse('Application bundle generation complete.\n▲ [WARNING] bundle initial exceeded maximum budget.\n', 0);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary, 'Build erfolgreich, 1 Warnungen.');
});

test('findNg_CliInParentFolder_IsFound', () => {
  const fake = fakeAngular(ANGULAR_JSON, '', 0);
  const child = path.join(fake.dir, 'projects', 'lib');
  fs.mkdirSync(child, { recursive: true });
  assert.equal(build.findNg(child), path.join(fake.dir, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'));
});

test('cli_FailedBuild_RunsNgBuildWithExtraArgs', () => {
  const fake = fakeAngular(ANGULAR_JSON, FAILED, 1);
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--log', path.join(fake.dir, 'b.log'), '--', '--configuration=production'], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^angular-build: FEHLGESCHLAGEN \(Exit 1\)/);
  assert.match(result.stdout, /- src\/app\/app\.ts:10:9: ✘ \[ERROR\] TS2322/);
  assert.deepEqual(fake.args(), ['build', '--configuration=production']);
});

test('cli_NoAngularJson_ExitsTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', tempDir('dv-forge-')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /angular\.json fehlt/);
});

test('cli_NoCliInstalled_TellsToInstall', () => {
  const dir = tempDir('dv-forge-ng-');
  fs.writeFileSync(path.join(dir, 'angular.json'), JSON.stringify(ANGULAR_JSON));
  const result = spawnSync(process.execPath, [SCRIPT, '--root', dir, '--log', path.join(dir, 'b.log')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Angular CLI nicht gefunden\. Im Projektordner npm install ausführen\./);
});

test('cli_ShowWarnings_OnlyWarningsListed', () => {
  const fake = fakeAngular(ANGULAR_JSON, FAILED, 1);
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--show', 'warnings', '--log', path.join(fake.dir, 'w.log')], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Warnungen \(1\):\n- src\/app\/app\.html:3:17: ▲ \[WARNING\] NG8107/);
  assert.doesNotMatch(result.stdout, /- src\/app\/app\.ts:10:9/);
  assert.match(result.stdout, /Fehler: 1, anzeigen mit --show errors/);
});
