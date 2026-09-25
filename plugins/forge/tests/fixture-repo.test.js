'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { SLUG, PLAN, buildRepo } = require('./fixtures/implementation/build-repo.js');
const { listTasks } = require('../scripts/plan-tasks.js');
const { git } = require('./lib/git-repo');

function target() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-fixture-')), 'repo');
}

test('buildRepo_Base_OneCommitWithPlanAndRulesWithoutTag', () => {
  const repo = buildRepo(target());
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  assert.deepEqual(listTasks(path.join(repo, PLAN)), [1, 2, 3]);
  assert.ok(fs.existsSync(path.join(repo, 'CLAUDE.md')));
  assert.equal(fs.existsSync(path.join(repo, 'CLAUDE.fixture.md')), false);
  assert.equal(git(repo, 'tag', '--list'), '');
});

test('buildRepo_Base_PlanCodeMakesSuiteGreen', () => {
  const repo = buildRepo(target());
  const plan = fs.readFileSync(path.join(repo, PLAN), 'utf8').replace(/\r\n/g, '\n');
  const blocks = [...plan.matchAll(/```js\n([\s\S]*?)```/g)].map((match) => match[1]);
  const files = ['tests/order-total.test.js', 'src/order-total.js', 'tests/format-total.test.js', 'src/format-total.js',
    'tests/load-positions.test.js', 'src/load-positions.js'];
  assert.equal(blocks.length, files.length);
  files.forEach((file, index) => {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    fs.writeFileSync(path.join(repo, file), blocks[index]);
  });
  const result = spawnSync(process.execPath, ['--test'], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout);
});

test('buildRepo_NonEmptyTarget_Throws', () => {
  const dir = target();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'x.txt'), 'x');
  assert.throws(() => buildRepo(dir), /Ziel ist nicht leer/);
});

test('buildRepo_Flawed_TagOnBaseAndOneImplementationCommit', () => {
  const repo = buildRepo(target(), { flawed: true });
  assert.equal(git(repo, 'rev-list', '--count', `forge-base/${SLUG}..HEAD`), '1');
  assert.equal(git(repo, 'rev-parse', `forge-base/${SLUG}`), git(repo, 'rev-parse', 'HEAD~1'));
  assert.ok(fs.existsSync(path.join(repo, 'src', 'order-total.js')));
  assert.equal(fs.existsSync(path.join(repo, 'src', 'format-total.js')), false);
});
