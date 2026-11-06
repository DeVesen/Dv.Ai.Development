'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, parseArgs, UsageError } = require('../scripts/ado-setup');
const { VALID_CONFIG, makeRepo, runGit, addWorktree, removeDir } = require('./helpers/ado-fixture');

const IGNORE = '.claude/azure/\n.claude/ado.json\n.claude/settings.local.json\n';
const WRITE_ARGS = [
  'write',
  '--organization', VALID_CONFIG.organization,
  '--project', VALID_CONFIG.project,
  '--repository', VALID_CONFIG.repository,
  '--tenant', VALID_CONFIG.tenantId,
  '--user', VALID_CONFIG.user,
  '--pr-target', VALID_CONFIG.prTargetBranch,
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('parseArgs reads --key value and --key=value', () => {
  assert.deepEqual(parseArgs(['write', '--project', 'A B', '--tenant=x']), {
    command: 'write',
    options: { project: 'A B', tenant: 'x' },
  });
});

test('parseArgs rejects an option without value', () => {
  assert.throws(() => parseArgs(['write', '--project']), UsageError);
});

test('run rejects an unknown command', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  assert.throws(() => run(['nope'], { cwd: root }), UsageError);
});

test('write aborts when .claude/azure is not gitignored', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const result = run(WRITE_ARGS, { cwd: root });
  assert.equal(result.exit, 1);
  assert.match(result.error, /nicht gitignored/);
  assert.equal(fs.existsSync(path.join(root, '.claude', 'ado.json')), false);
  assert.equal(fs.existsSync(path.join(root, '.claude', 'azure')), false);
});

test('write aborts when only .claude/azure is ignored', (t) => {
  const root = makeRepo({ gitignore: '.claude/azure/\n' });
  t.after(() => removeDir(root));
  const result = run(WRITE_ARGS, { cwd: root });
  assert.equal(result.exit, 1);
  assert.match(result.error, /\.claude\/ado\.json/);
});

test('write rejects invalid values before touching the disk', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  const args = WRITE_ARGS.map((a) => (a === VALID_CONFIG.tenantId ? 'not-a-guid' : a));
  const result = run(args, { cwd: root });
  assert.equal(result.exit, 1);
  assert.match(result.error, /tenantId/);
  assert.equal(fs.existsSync(path.join(root, '.claude', 'ado.json')), false);
});

test('write creates ado.json, the config folder and the settings entry', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  const result = run(WRITE_ARGS, { cwd: root });
  assert.equal(result.exit, 0, result.error);
  assert.deepEqual(readJson(path.join(root, '.claude', 'ado.json')), VALID_CONFIG);
  assert.ok(fs.statSync(path.join(root, '.claude', 'azure')).isDirectory());
  const settings = readJson(path.join(root, '.claude', 'settings.local.json'));
  assert.equal(settings.env.AZURE_CONFIG_DIR, path.join(root, '.claude', 'azure'));
  assert.ok(path.isAbsolute(settings.env.AZURE_CONFIG_DIR));
});

test('write adds settings.local.json to .worktreeinclude once and keeps entries', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  fs.writeFileSync(path.join(root, '.worktreeinclude'), '.env');
  assert.equal(run(WRITE_ARGS, { cwd: root }).exit, 0);
  assert.equal(run(WRITE_ARGS, { cwd: root }).exit, 0);
  assert.equal(fs.readFileSync(path.join(root, '.worktreeinclude'), 'utf8'), '.env\n.claude/settings.local.json\n');
});

test('write aborts when ado.json is already tracked', (t) => {
  const root = makeRepo({ gitignore: IGNORE, config: VALID_CONFIG });
  t.after(() => removeDir(root));
  runGit(root, ['add', '-f', '.claude/ado.json']);
  const result = run(WRITE_ARGS, { cwd: root });
  assert.equal(result.exit, 1);
  assert.match(result.error, /eingecheckt/);
});

test('write keeps existing settings and env entries', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.claude', 'settings.local.json'),
    JSON.stringify({ permissions: { allow: ['Bash(git status)'] }, env: { FOO: 'bar', AZURE_CONFIG_DIR: 'old' } }),
  );
  assert.equal(run(WRITE_ARGS, { cwd: root }).exit, 0);
  const settings = readJson(path.join(root, '.claude', 'settings.local.json'));
  assert.deepEqual(settings.permissions, { allow: ['Bash(git status)'] });
  assert.equal(settings.env.FOO, 'bar');
  assert.equal(settings.env.AZURE_CONFIG_DIR, path.join(root, '.claude', 'azure'));
});

test('write refuses to overwrite a broken settings.local.json', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'settings.local.json'), '{ broken');
  assert.throws(() => run(WRITE_ARGS, { cwd: root }), /kein gültiges JSON/);
  assert.equal(fs.readFileSync(path.join(root, '.claude', 'settings.local.json'), 'utf8'), '{ broken');
});

test('write from a worktree targets the main checkout', (t) => {
  const root = makeRepo({ gitignore: IGNORE });
  t.after(() => removeDir(root));
  const worktree = addWorktree(root, 'setup');
  assert.equal(run(WRITE_ARGS, { cwd: worktree }).exit, 0);
  assert.ok(fs.existsSync(path.join(root, '.claude', 'ado.json')));
  assert.equal(fs.existsSync(path.join(worktree, '.claude', 'ado.json')), false);
});

test('show returns config and configDir, or exit 1 without ado.json', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  const empty = makeRepo();
  t.after(() => {
    removeDir(root);
    removeDir(empty);
  });
  const shown = run(['show'], { cwd: root });
  assert.equal(shown.exit, 0);
  assert.equal(shown.output.configDir, path.join(root, '.claude', 'azure'));
  assert.equal(shown.output.project, VALID_CONFIG.project);
  const missing = run(['show'], { cwd: empty });
  assert.equal(missing.exit, 1);
  assert.match(missing.error, /Einrichtung/);
});

test('suggest derives values from an ADO remote', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  runGit(root, ['remote', 'add', 'origin', 'https://ExampleOrg@dev.azure.com/ExampleOrg/Example%20Project/_git/example-repo']);
  const result = run(['suggest'], { cwd: root });
  assert.equal(result.output.organization, 'https://dev.azure.com/ExampleOrg');
  assert.equal(result.output.project, 'Example Project');
  assert.equal(result.output.repository, 'example-repo');
  assert.equal(result.output.tenantId, null);
});

test('suggest returns nulls without remote', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const result = run(['suggest'], { cwd: root });
  assert.equal(result.output.organization, null);
});

function fakeAccount(stdout, status = 0, stderr = '') {
  const calls = [];
  const fn = (configDir) => {
    calls.push(configDir);
    return { status, stdout, stderr };
  };
  fn.calls = calls;
  return fn;
}

test('check-identity passes for the configured user and tenant', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const account = fakeAccount(JSON.stringify({ user: 'DEV@example.com', tenant: VALID_CONFIG.tenantId.toUpperCase() }));
  const result = run(['check-identity'], { cwd: root, accountShow: account });
  assert.equal(result.exit, 0);
  assert.deepEqual(account.calls, [path.join(root, '.claude', 'azure')]);
});

test('check-identity fails for another user', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const account = fakeAccount(JSON.stringify({ user: 'other@example.com', tenant: VALID_CONFIG.tenantId }));
  const result = run(['check-identity'], { cwd: root, accountShow: account });
  assert.equal(result.exit, 1);
  assert.match(result.error, /Falsche Identität/);
  assert.match(result.error, /ado-login/);
});

test('check-identity fails for another tenant', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const account = fakeAccount(JSON.stringify({ user: VALID_CONFIG.user, tenant: '99999999-2222-3333-4444-555555555555' }));
  assert.equal(run(['check-identity'], { cwd: root, accountShow: account }).exit, 1);
});

test('check-identity fails without login and names the login command', (t) => {
  const root = makeRepo({ config: VALID_CONFIG });
  t.after(() => removeDir(root));
  const account = fakeAccount('', 1, "Please run 'az login' to setup account.");
  const result = run(['check-identity'], { cwd: root, accountShow: account });
  assert.equal(result.exit, 1);
  assert.match(result.error, /Nicht angemeldet/);
  assert.match(result.error, /ado-login/);
});

test('check-identity fails without ado.json and does not call az', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const account = fakeAccount('{}');
  assert.equal(run(['check-identity'], { cwd: root, accountShow: account }).exit, 1);
  assert.equal(account.calls.length, 0);
});

test('login-command names both scripts', (t) => {
  const root = makeRepo();
  t.after(() => removeDir(root));
  const result = run(['login-command'], { cwd: root });
  assert.match(result.output.powershell, /ado-login\.ps1/);
  assert.match(result.output.bash, /ado-login\.sh/);
});
