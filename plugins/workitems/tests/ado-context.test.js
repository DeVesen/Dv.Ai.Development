'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  findMainCheckout,
  configDirFor,
  readAdoConfig,
  samePath,
  normalizeOrg,
  parseRemote,
  resolveContext,
} = require('../scripts/lib/ado-context');
const { VALID_CONFIG, makeRepo, makeTempDir, writeConfig, addWorktree, removeDir } = require('./helpers/ado-fixture');

test('findMainCheckout returns the repository root from the root itself', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  assert.ok(samePath(findMainCheckout(root), root));
});

test('findMainCheckout returns the main checkout from a subfolder', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const sub = path.join(root, '.claude');
  require('node:fs').mkdirSync(sub, { recursive: true });
  assert.ok(samePath(findMainCheckout(sub), root));
});

test('findMainCheckout returns the main checkout from a worktree under .claude/worktrees', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const worktree = addWorktree(root, 'feature');
  assert.ok(samePath(findMainCheckout(worktree), root));
  assert.ok(samePath(configDirFor(findMainCheckout(worktree)), path.join(root, '.claude', 'azure')));
});

test('findMainCheckout returns null outside a git repository', (t) => {
  const dir = makeTempDir('ado-nogit-');
  t.after(() => removeDir(dir));
  assert.equal(findMainCheckout(dir), null);
});

test('findMainCheckout returns null for a folder that does not exist', () => {
  assert.equal(findMainCheckout(path.join(__dirname, 'does-not-exist')), null);
});

test('configDirFor returns an absolute path', () => {
  assert.ok(path.isAbsolute(configDirFor('relative/root')));
});

test('readAdoConfig accepts a valid config', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const result = readAdoConfig(root);
  assert.equal(result.status, 'ok');
  assert.equal(result.config.organization, VALID_CONFIG.organization);
});

test('readAdoConfig accepts a config with a byte order mark', (t) => {
  const root = makeRepo({ config: `\uFEFF${JSON.stringify(VALID_CONFIG)}` });
  t.after(() => removeDir(root));
  assert.equal(readAdoConfig(root).status, 'ok');
});

test('readAdoConfig reports a missing file', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  assert.equal(readAdoConfig(root).status, 'missing');
});

test('readAdoConfig reports broken JSON', (t) => {
  const root = makeRepo({ config: '{ "organization": ' });
  t.after(() => removeDir(root));
  const result = readAdoConfig(root);
  assert.equal(result.status, 'invalid');
  assert.match(result.errors[0], /kein gültiges JSON/);
});

test('readAdoConfig reports a JSON array as invalid', (t) => {
  const root = makeRepo({ config: '[]' });
  t.after(() => removeDir(root));
  assert.equal(readAdoConfig(root).status, 'invalid');
});

for (const field of ['organization', 'project', 'repository', 'tenantId', 'user', 'prTargetBranch']) {
  test(`readAdoConfig reports missing field ${field}`, (t) => {
    const config = { ...VALID_CONFIG };
    delete config[field];
    const root = makeRepo({ config });
    t.after(() => removeDir(root));
    const result = readAdoConfig(root);
    assert.equal(result.status, 'invalid');
    assert.ok(result.errors.some((e) => e.includes(`"${field}"`)));
  });
}

test('readAdoConfig rejects an organization that is not a dev.azure.com URL', (t) => {
  const root = makeRepo({ config: { ...VALID_CONFIG, organization: 'https://example.visualstudio.com' } });
  t.after(() => removeDir(root));
  const result = readAdoConfig(root);
  assert.equal(result.status, 'invalid');
  assert.ok(result.errors.some((e) => e.includes('"organization"')));
});

test('readAdoConfig rejects an organization with a project path', (t) => {
  const root = makeRepo({ config: { ...VALID_CONFIG, organization: 'https://dev.azure.com/Org/Project' } });
  t.after(() => removeDir(root));
  assert.equal(readAdoConfig(root).status, 'invalid');
});

test('readAdoConfig rejects a tenantId that is not a GUID', (t) => {
  const root = makeRepo({ config: { ...VALID_CONFIG, tenantId: 'contoso.onmicrosoft.com' } });
  t.after(() => removeDir(root));
  const result = readAdoConfig(root);
  assert.equal(result.status, 'invalid');
  assert.ok(result.errors.some((e) => e.includes('"tenantId"')));
});

test('resolveContext reads the config of the main checkout from a worktree', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const worktree = addWorktree(root, 'x');
  const context = resolveContext(worktree);
  assert.equal(context.result.status, 'ok');
  assert.ok(samePath(context.configDir, path.join(root, '.claude', 'azure')));
});

test('resolveContext outside git reports missing', (t) => {
  const dir = makeTempDir('ado-nogit-');
  t.after(() => removeDir(dir));
  const context = resolveContext(dir);
  assert.equal(context.root, null);
  assert.equal(context.result.status, 'missing');
});

test('samePath treats slashes, trailing slashes and drive case as equal', () => {
  assert.ok(samePath('C:\\Repo\\.claude\\azure', 'c:/Repo/.claude/azure/'));
});

test('samePath treats Git-Bash drive form as equal to Windows form', () => {
  assert.ok(samePath('/c/Repo/.claude/azure', 'C:\\Repo\\.claude\\azure'));
});

test('samePath rejects different folders and empty values', () => {
  assert.equal(samePath('C:\\RepoA\\.claude\\azure', 'C:\\RepoB\\.claude\\azure'), false);
  assert.equal(samePath('', 'C:\\Repo'), false);
  assert.equal(samePath(undefined, 'C:\\Repo'), false);
});

test('normalizeOrg ignores case and trailing slash', () => {
  assert.equal(normalizeOrg('https://dev.azure.com/ExampleOrg/'), 'https://dev.azure.com/exampleorg');
});

test('parseRemote reads the form with user prefix and decodes the project', () => {
  assert.deepEqual(parseRemote('https://ExampleOrg@dev.azure.com/ExampleOrg/Example%20Project/_git/example-repo'), {
    organization: 'https://dev.azure.com/ExampleOrg',
    project: 'Example Project',
    repository: 'example-repo',
  });
});

test('parseRemote reads the form without user prefix', () => {
  assert.equal(parseRemote('https://dev.azure.com/Org/Proj/_git/repo').repository, 'repo');
});

test('parseRemote returns null for a non-ADO remote', () => {
  assert.equal(parseRemote('https://github.com/owner/repo.git'), null);
  assert.equal(parseRemote('git@ssh.dev.azure.com:v3/Org/Proj/repo'), null);
});
