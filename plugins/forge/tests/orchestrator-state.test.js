'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { repoWithPlan, git, addWorktree } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-state.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ostate-'));
}

function report(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test('start_RecordsLocationAndPreexistingFiles', () => {
  const { repo, spec } = repoWithPlan();
  fs.writeFileSync(path.join(repo, 'offen.txt'), 'x');
  const result = run(repo, 'start', '--state', tmp(), '--spec', spec);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^TOPLEVEL=.+\nBRANCH=main\nHEAD=[0-9a-f]+\nWORKTREE=nein\nSPEC-IM-CHECKOUT=ja\nVORBESTAND=1\nVORBESTAND-DATEI=offen.txt\n$/);
});

test('start_DetachedHeadOrMissingSpec_ExitOne', () => {
  const { repo, spec } = repoWithPlan();
  assert.equal(run(repo, 'start', '--state', tmp(), '--spec', path.join(repo, 'fehlt.md')).status, 1);
  git(repo, 'checkout', '--quiet', '--detach');
  const detached = run(repo, 'start', '--state', tmp(), '--spec', spec);
  assert.equal(detached.status, 1);
  assert.match(detached.stderr, /detached HEAD/);
});

test('check_ChangedSpec_ExitOneWithDiff', () => {
  const { repo, spec, plan } = repoWithPlan();
  const state = tmp();
  run(repo, 'start', '--state', state, '--spec', spec);
  run(repo, 'add', '--state', state, '--plan', plan);
  assert.equal(run(repo, 'check', '--state', state).stdout, 'HASH-SPEC=ok\nHASH-PLAN=ok\n');
  fs.appendFileSync(spec, 'neue Zeile\n');
  const changed = run(repo, 'check', '--state', state);
  assert.equal(changed.status, 1);
  assert.match(changed.stdout, /^HASH-SPEC=abweichung\nHASH-PLAN=ok\n=== DIFF ===\n[\s\S]*\+neue Zeile/);
});

test('check_Ort_OtherBranchIsDeviation', () => {
  const { repo, spec } = repoWithPlan();
  const state = tmp();
  run(repo, 'start', '--state', state, '--spec', spec);
  git(repo, 'switch', '--quiet', '-c', 'anders');
  const result = run(repo, 'check', '--state', state, '--ort');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /ORT=abweichung .+ anders/);
});

test('start_InWorktree_ReportsWorktree', () => {
  const { repo, spec } = repoWithPlan();
  const tree = addWorktree(repo, 'feature/x');
  assert.match(run(tree, 'start', '--state', tmp(), '--spec', spec).stdout, /WORKTREE=ja\nSPEC-IM-CHECKOUT=nein/);
});

test('next_FollowupOfferedUnderCap_Followup', () => {
  const dir = tmp();
  const review = report(path.join(dir, 'br.json'), { status: 'nicht bereit', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true });
  assert.equal(run(dir, 'next', '--review', review).stdout, 'NEXT=followup\nRUNDE=1\nERGEBNIS=⛔ Nicht bereit\nBEREIT=nein\nRUNDEN=0\n');
});

test('next_TwoFollowupsDone_WeiterEvenIfOffered', () => {
  const dir = tmp();
  const offered = { status: 'x', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true };
  const files = ['br', 'bf1', 'bf2'].map((name) => report(path.join(dir, `${name}.json`), offered));
  const result = run(dir, 'next', '--review', files[0], '--followup', files[1], '--followup', files[2]);
  assert.match(result.stdout, /^NEXT=weiter\n/);
  assert.match(result.stdout, /RUNDEN=2/);
});

test('next_IncompleteOrMissingReport_Ende', () => {
  const dir = tmp();
  const incomplete = report(path.join(dir, 'br.json'), { status: 'unvollständig, ausgefallen: x', resultLine: '**Ergebnis:** ⚠️ Unvollständig', offersFollowup: true });
  assert.match(run(dir, 'next', '--review', incomplete).stdout, /^NEXT=ende\nGRUND=unvollstaendig/);
  assert.match(run(dir, 'next', '--review', path.join(dir, 'fehlt.json')).stdout, /^NEXT=ende\nGRUND=kein-bericht/);
});

test('next_Ready_WeiterBereitJa', () => {
  const dir = tmp();
  const ready = report(path.join(dir, 'br.json'), { status: 'sauber', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', offersFollowup: false });
  assert.equal(run(dir, 'next', '--review', ready).stdout, 'NEXT=weiter\nERGEBNIS=✅ Bereit zum Abschließen\nBEREIT=ja\nRUNDEN=0\n');
});

test('cli_BadCall_ExitTwo', () => {
  assert.equal(run(tmp(), 'start', '--state', 'x').status, 2);
  assert.equal(run(tmp(), 'bogus').status, 2);
});
