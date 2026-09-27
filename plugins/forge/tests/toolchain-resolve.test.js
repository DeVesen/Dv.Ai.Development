'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { resolveToolchain } = require('../scripts/lib/toolchain');
const config = require('../scripts/forge-config');
const { commitFile, makeRepo } = require('./lib/git-repo');

const TOOLCHAIN = path.join(__dirname, '..', 'scripts', 'toolchain').replace(/\\/g, '/');

test('resolveToolchain_Reference_BecomesNodeCall', () => {
  assert.equal(resolveToolchain('dv-forge: dotnet-test --path src/App.sln ; dv-forge: angular-lint --root web'),
    `node "${TOOLCHAIN}/dotnet-test.js" --path src/App.sln ; node "${TOOLCHAIN}/angular-lint.js" --root web`);
  assert.equal(resolveToolchain('npm test'), 'npm test');
  assert.equal(resolveToolchain('dv-forge: python-test'), 'dv-forge: python-test');
});

test('getValue_TestKey_ResolvedOtherKeysUnchanged', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n\n- Test: `dv-forge: dotnet-test --path src/App.sln`\n- Suche: dv-forge: dotnet-test\n', 'config');
  assert.equal(config.getValue('Test', repo), `node "${TOOLCHAIN}/dotnet-test.js" --path src/App.sln`);
  assert.equal(config.getValue('Suche', repo), 'dv-forge: dotnet-test');
  assert.match(config.show(repo), /Test=dv-forge: dotnet-test --path src\/App\.sln/);
});
