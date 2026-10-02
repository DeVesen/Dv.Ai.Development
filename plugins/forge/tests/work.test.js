'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'work.js');
const WORKTREE_CONFIG = '## dv-forge\n- Worktree: ja\n- Worktree-Ordner: .wt\n';

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function values(result) {
  return Object.fromEntries(result.stdout.trim().split('\n').map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

function worktreeRepo() {
  const repo = makeRepo();
  commitFile(repo, '.gitignore', '.wt/\n', 'ignore');
  commitFile(repo, 'CLAUDE.md', WORKTREE_CONFIG, 'config');
  return repo;
}

test('start_NoWorktreeConfigured_StaysInPlace', () => {
  const repo = makeRepo();
  const out = values(run(repo, 'start', 'demo'));
  assert.equal(out.modus, 'vor-ort');
  assert.equal(out.branch, 'main');
  assert.equal(out.standard, 'true');
  assert.equal(out.vorschlag, 'feature/demo');
  assert.ok(samePath(out.R, repo));
});

test('start_WorktreeConfigured_CreatesSameNamedBranchFromHead', () => {
  const repo = worktreeRepo();
  const head = git(repo, 'rev-parse', 'HEAD');
  const result = run(repo, 'start', 'demo');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.modus, 'worktree');
  assert.equal(out.aktion, 'angelegt');
  assert.equal(out.branch, 'feature/demo');
  assert.ok(samePath(out.R, path.join(repo, '.wt', 'feature', 'demo')));
  assert.equal(git(out.R, 'rev-parse', 'HEAD'), head);
  assert.equal(git(out.R, 'branch', '--show-current'), 'feature/demo');
});

test('start_Twice_ResumesExistingWorktree', () => {
  const repo = worktreeRepo();
  const first = values(run(repo, 'start', 'demo'));
  const second = values(run(repo, 'start', 'demo'));
  assert.equal(second.aktion, 'fortgesetzt');
  assert.ok(samePath(second.R, first.R));
});

function workitemRepo() {
  const repo = makeRepo();
  commitFile(repo, '.gitignore', '.wt/\n', 'ignore');
  commitFile(repo, 'CLAUDE.md', `${WORKTREE_CONFIG}- Branch-Schema: feature/<workitem>-<slug>\n`, 'config');
  commitFile(repo, 'spec.md', '# T\n\nWorkitem: `307326`\n', 'spec');
  return repo;
}

test('start_SlugWithDateAndWorkitem_CreatesShortBranchAndWorktreeFolder', () => {
  const repo = workitemRepo();
  const result = run(repo, 'start', '2026-09-28-307326-foo', '--spec', path.join(repo, 'spec.md'));
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.aktion, 'angelegt');
  assert.equal(out.branch, 'feature/307326-foo');
  assert.ok(samePath(out.R, path.join(repo, '.wt', 'feature', '307326-foo')));
});

test('start_LegacyLongBranchExists_ContinuesOnIt', () => {
  const repo = workitemRepo();
  git(repo, 'branch', 'feature/307326-2026-09-28-307326-foo');
  const result = run(repo, 'start', '2026-09-28-307326-foo', '--spec', path.join(repo, 'spec.md'));
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.aktion, 'angehaengt');
  assert.equal(out.branch, 'feature/307326-2026-09-28-307326-foo');
  const again = values(run(repo, 'start', '2026-09-28-307326-foo', '--spec', path.join(repo, 'spec.md')));
  assert.equal(again.aktion, 'fortgesetzt');
  assert.equal(again.branch, 'feature/307326-2026-09-28-307326-foo');
});

test('start_FromInsideOtherWorktree_PlacesNewWorktreeBesideMainCheckout', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Worktree: ja\n', 'config');
  const first = values(run(repo, 'start', 'eins')).R;
  const second = values(run(first, 'start', 'zwei')).R;
  const expected = path.join(path.dirname(repo), `${path.basename(repo)}-worktrees`, 'feature', 'zwei');
  assert.ok(samePath(second, expected));
});

test('start_PlanNotCommitted_Aborts', () => {
  const repo = worktreeRepo();
  fs.writeFileSync(path.join(repo, 'plan.md'), '# Plan\n');
  const result = run(repo, 'start', 'demo', '--plan', 'plan.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nicht committet: plan\.md/);
});

test('check_DirtyTree_Aborts', () => {
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'offen.txt'), 'x\n');
  const result = run(repo, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Nicht committet: offen\.txt/);
});

test('check_InWorktree_ReportsWorktreeAndMainCheckout', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const out = values(run(dir, 'check'));
  assert.equal(out.modus, 'worktree');
  assert.equal(out.branch, 'feature/demo');
  assert.ok(samePath(out.haupt, repo));
});

test('remove_WorktreeWithCommit_KeepsBranchWithAllCommits', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const commit = commitFile(dir, 'feature.txt', 'neu\n', 'feature');
  const result = run(repo, 'remove', dir);
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.commit, commit);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(git(repo, 'rev-parse', 'refs/heads/feature/demo'), commit);
});

test('remove_FromMainCheckoutWithPath_RemovesWorktree', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  const result = run(repo, 'remove', dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(dir), false);
  assert.equal(result.stderr, '');
});

test('remove_WithUncommittedFile_KeepsWorktree', () => {
  const repo = worktreeRepo();
  const dir = values(run(repo, 'start', 'demo')).R;
  fs.writeFileSync(path.join(dir, 'offen.txt'), 'x\n');
  assert.equal(run(dir, 'remove').status, 1);
  assert.ok(fs.existsSync(dir));
});

test('remove_NotInWorktree_Aborts', () => {
  const repo = makeRepo();
  const result = run(repo, 'remove');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Worktree/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'start').status, 2);
  assert.equal(run(repo, 'start', '../x').status, 2);
  assert.equal(run(repo, 'start', 'demo', '--foo', 'x').status, 2);
  assert.equal(run(repo, 'check', 'x').status, 2);
});

test('start_PlanFilesChangedSinceBasis_ReportsDrift', () => {
  const repo = makeRepo();
  commitFile(repo, 'src/a.js', 'a\n', 'a');
  const base = git(repo, 'rev-parse', '--short', 'HEAD');
  const plan = `# P\n\n**Basis:** ${base}\n\n---\n\n### Task 1: A\n\n- Modify: \`src/a.js\` · \`a\`\n- Create: \`src/neu.js\`\n`;
  commitFile(repo, 'plan.md', plan, 'plan');
  assert.equal(values(run(repo, 'start', 'demo', '--plan', 'plan.md')).drift, undefined);
  commitFile(repo, 'src/a.js', 'b\n', 'change a');
  assert.equal(values(run(repo, 'start', 'demo', '--plan', 'plan.md')).drift, 'src/a.js');
});

test('start_BranchCarriesOtherWorkitem_ReportsConflict', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Workitem: `AB#\\d+`\n', 'config');
  commitFile(repo, 'spec.md', '# S\n\nWorkitem: AB#12\n', 'spec');
  git(repo, 'switch', '-q', '-c', 'feature/AB#99-alt');
  assert.equal(values(run(repo, 'start', 'demo', '--spec', 'spec.md'))['workitem-konflikt'], 'AB#99');
  git(repo, 'switch', '-q', '-c', 'feature/AB#12-neu');
  assert.equal(values(run(repo, 'start', 'demo', '--spec', 'spec.md'))['workitem-konflikt'], undefined);
});
