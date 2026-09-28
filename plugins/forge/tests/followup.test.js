'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, commitFile } = require('./lib/git-repo');
const followup = require('../scripts/followup.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'followup.js');
const AGGREGATE = [
  'STATUS clean=false red=1 yellow=1 green=0 failed=',
  '=== REPORT ===',
  'Tabelle',
  '=== REWORK ===',
  '### 🔴 Task 2 (buildability, feasibility · hochgestuft)',
  '- [buildability · yellow] Zitat: „a“ · Konsequenz: k1 · Begründung: b1',
  '- [feasibility · yellow] Zitat: „b“ · Konsequenz: k2 · Begründung: b2',
  '',
  '### 🟡 AC-03 (coverage)',
  '- [coverage · yellow] Zitat: „c“ · Konsequenz: k3 · Begründung: b3',
  '',
].join('\n');
const SCOUT = [
  '## Scout-Vorschläge',
  '',
  '### 🔴 Task 2',
  '1. Anker auf `run` ändern',
  '2. Datei vorher anlegen',
  '```js',
  '1. kein Vorschlag, nur Code',
  '```',
  '**Bevorzugt: 2** — weniger Risiko',
  '',
  '### 🟡 AC-03',
  '1. Schritt ergänzen',
  '**Bevorzugt: 1** — einziger Weg',
  '',
].join('\n');

function roundDir(files) {
  const repo = makeRepo();
  const dir = path.join(repo, '.forge', 'plan-review', 'demo', 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return { repo, dir, saved: path.join(repo, '.forge', 'followup', 'plan-review', 'demo') };
}

function writeSave(repo, role, slug, savedAt, files = { 'aggregate.md': AGGREGATE, 'scout.md': SCOUT }) {
  const dir = path.join(repo, '.forge', 'followup', role, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ rolle: role, savedAt }));
  return dir;
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('save_ScoutAndAggregate_CopiesWithMetaAndPrintsNumberedGroups', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  const output = followup.save('plan-review', 'demo', env.dir);
  assert.equal(fs.readFileSync(path.join(env.saved, 'scout.md'), 'utf8'), SCOUT);
  assert.equal(fs.readFileSync(path.join(env.saved, 'aggregate.md'), 'utf8'), AGGREGATE);
  const meta = JSON.parse(fs.readFileSync(path.join(env.saved, 'meta.json'), 'utf8'));
  assert.equal(meta.rolle, 'plan-review');
  assert.ok(!Number.isNaN(Date.parse(meta.savedAt)));
  assert.ok(output.startsWith('## Scout-Vorschläge'));
  assert.ok(output.includes('### 1 · 🔴 Task 2'));
  assert.ok(output.includes('### 2 · 🟡 AC-03'));
});

test('save_NoScoutFile_RemovesOldSaveAndReportsKeinScout', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  followup.save('plan-review', 'demo', env.dir);
  fs.rmSync(path.join(env.dir, 'scout.md'));
  assert.equal(followup.save('plan-review', 'demo', env.dir), 'KEIN SCOUT');
  assert.equal(fs.existsSync(env.saved), false);
});

test('save_ScoutWithoutSection_TreatedAsNoScout', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': 'Text ohne Abschnitt\n' });
  assert.equal(followup.save('plan-review', 'demo', env.dir), 'KEIN SCOUT');
});

test('save_ScoutWithoutAggregate_Throws', () => {
  const env = roundDir({ 'scout.md': SCOUT });
  assert.throws(() => followup.save('plan-review', 'demo', env.dir), /aggregate\.md fehlt/);
});

test('cli_SaveAndDrop_PrintNumberedScoutAndRemove', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  const saved = run(env.repo, 'save', 'plan-review', 'demo', env.dir);
  assert.equal(saved.status, 0, saved.stderr);
  assert.ok(saved.stdout.includes('### 1 · 🔴 Task 2'));
  assert.equal(run(env.repo, 'drop', 'plan-review', 'demo').status, 0);
  assert.equal(fs.existsSync(env.saved), false);
  assert.equal(run(env.repo, 'drop', 'plan-review', 'demo').status, 0);
});

test('cli_BadRole_ExitsTwo', () => {
  const env = roundDir({});
  assert.equal(run(env.repo, 'save', 'implementation', 'demo', env.dir).status, 2);
  assert.equal(run(env.repo, 'drop', 'plan-review').status, 2);
});

test('loadGroups_SavedFiles_JoinsProposalsPreferredReviewersAndFindings', () => {
  const repo = makeRepo();
  const groups = followup.loadGroups(writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z'));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].number, 1);
  assert.equal(groups[0].severity, '🔴');
  assert.equal(groups[0].location, 'Task 2');
  assert.deepEqual(groups[0].reviewers, ['buildability', 'feasibility']);
  assert.equal(groups[0].preferred, 2);
  assert.equal(groups[0].proposals.length, 2);
  assert.equal(groups[0].proposals[1], 'Datei vorher anlegen\n```js\n1. kein Vorschlag, nur Code\n```');
  assert.equal(groups[0].findings.length, 2);
  assert.deepEqual(groups[1].reviewers, ['coverage']);
});

test('loadGroups_LocationWithParentheses_ReviewersFromLastParenthesis', () => {
  const repo = makeRepo();
  const aggregate = '=== REWORK ===\n### 🟡 `src/a.ts` (Zeile 3) (risks)\n- [risks · yellow] Zitat: „x“ · Konsequenz: k · Begründung: b\n';
  const scout = '## Scout-Vorschläge\n\n### 🟡 `src/a.ts` (Zeile 3)\n1. prüfen\n**Bevorzugt: 1** — klar\n';
  const groups = followup.loadGroups(writeSave(repo, 'review', 'demo', 'x', { 'aggregate.md': aggregate, 'scout.md': scout }));
  assert.equal(groups[0].location, '`src/a.ts` (Zeile 3)');
  assert.deepEqual(groups[0].reviewers, ['risks']);
});

test('loadGroups_ScoutGroupWithoutAggregateGroup_Throws', () => {
  const repo = makeRepo();
  const dir = writeSave(repo, 'plan-review', 'demo', 'x', { 'aggregate.md': AGGREGATE, 'scout.md': '## Scout-Vorschläge\n\n### 🔴 Task 9\n1. x\n' });
  assert.throws(() => followup.loadGroups(dir), /Keine Aggregat-Gruppe zu 🔴 Task 9/);
});

test('latest_TwoRoles_NewestSavedAtWins', () => {
  const repo = makeRepo();
  writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  writeSave(repo, 'review', 'demo', '2026-09-28T11:00:00.000Z');
  assert.equal(followup.latest(repo, 'demo', ['plan-review', 'review']).role, 'review');
  assert.equal(followup.latest(repo, 'demo', ['spec-review']), null);
});

test('resolveFollowup_PlanOrSpecByContent_PicksMatchingRole', () => {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/plan.md', '# P\n\n### Task 1: Eins\n', 'plan');
  commitFile(repo, 'docs/forge/demo/spec.md', '# S\n', 'spec');
  writeSave(repo, 'spec-review', 'demo', '2026-09-28T12:00:00.000Z');
  writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  assert.equal(followup.resolveFollowup(path.join(repo, 'docs/forge/demo/spec.md'), repo).role, 'spec-review');
  assert.equal(followup.resolveFollowup(path.join(repo, 'docs/forge/demo/plan.md'), repo).role, 'plan-review');
});
