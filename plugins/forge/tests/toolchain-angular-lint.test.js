'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const lint = require('../scripts/toolchain/angular-lint.js');
const { fakeAngular } = require('./lib/fake-toolchain');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain', 'angular-lint.js');
const WITH_LINT = { projects: { app: { architect: { lint: { builder: '@angular-eslint/builder:lint' } } } } };
const eslint = (root) => [
  'Linting "app"...',
  JSON.stringify([
    { filePath: path.join(root, 'src', 'app', 'app.ts'), messages: [
      { ruleId: '@typescript-eslint/no-unused-vars', severity: 2, message: '\'x\' is assigned a value but never used.', line: 4 },
      { ruleId: '@angular-eslint/prefer-on-push-component-change-detection', severity: 1, message: 'Use OnPush.', line: 7 },
    ] },
    { filePath: path.join(root, 'src', 'main.ts'), messages: [] },
  ]),
  'Lint errors found in the listed files.',
].join('\n');

test('parse_EslintJson_FindingsWithRelativePathLineAndRule', () => {
  const root = path.resolve('/projekt');
  const result = lint.parse(eslint(root), 1, root);
  assert.deepEqual(result.errors, ['src/app/app.ts:4 @typescript-eslint/no-unused-vars: \'x\' is assigned a value but never used.']);
  assert.deepEqual(result.warnings, ['src/app/app.ts:7 @angular-eslint/prefer-on-push-component-change-detection: Use OnPush.']);
  assert.equal(result.summary, '1 Fehler, 1 Warnungen.');
});

test('parse_NoJsonButFailure_ReturnsLogTail', () => {
  const result = lint.parse('Cannot find module eslint\n', 1);
  assert.deepEqual(result.errors, ['Cannot find module eslint']);
});

test('cli_LintTarget_RunsNgLintWithJsonFormat', () => {
  const fake = fakeAngular(WITH_LINT, '', 0);
  require('node:fs').writeFileSync(fake.env.FAKE_OUTPUT, eslint(fake.dir));
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir, '--log', path.join(fake.dir, 'l.log')], { encoding: 'utf8', env: { ...fake.env, FAKE_EXIT: '1' } });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^angular-lint: FEHLGESCHLAGEN \(Exit 1\)/);
  assert.match(result.stdout, /- src\/app\/app\.ts:4 @typescript-eslint\/no-unused-vars/);
  assert.match(result.stdout, /Warnungen: 1, anzeigen mit --show warnings/);
  assert.deepEqual(fake.args(), ['lint', '--format=json']);
});

test('cli_NoLintTarget_ExitsTwoWithHint', () => {
  const fake = fakeAngular({ projects: { app: { architect: {} } } }, '', 0);
  const result = spawnSync(process.execPath, [SCRIPT, '--root', fake.dir], { encoding: 'utf8', env: fake.env });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /ng add @angular-eslint\/schematics/);
});
