'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ledger = require('../scripts/ledger.js');
const { git, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'ledger.js');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ledger-'));
  const workspace = path.join(dir, 'w');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(dir, 'plan.md'), '# Plan\n');
  return { dir, workspace, plan: path.join(dir, 'plan.md') };
}

test('archivePath_PlanMdOrNamedPlan', () => {
  assert.equal(path.basename(ledger.archivePath('/x/plan.md')), 'umsetzung.md');
  assert.equal(path.basename(ledger.archivePath('/x/2026-09-26-login.md')), '2026-09-26-login-umsetzung.md');
});

test('archive_KeepsJudgementsDeferredAndReport', () => {
  const env = setup();
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), [
    '# Ledger — Plan: docs/forge/x/plan.md',
    'Vorab-Scan: …',
    'Urteil: A statt B — Spec verlangt A — ein Task Nacharbeit',
    'Task 1: zurückgestellt: Name unklar',
    'Task 2: geparkt — Finding X — Urteil: bleibt',
    'Task 2: fertig (Commits abc..def, Review sauber)',
  ].join('\n'));
  fs.writeFileSync(path.join(env.workspace, 'abschluss.md'), 'Alles umgesetzt.\n');
  const result = spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8');
  assert.match(text, /^# Umsetzung — Plan: docs\/forge\/x\/plan\.md$/m);
  assert.match(text, /## Abschlussbericht\nAlles umgesetzt\./);
  assert.match(text, /- Urteil: A statt B/);
  assert.match(text, /- Task 1: zurückgestellt: Name unklar/);
  assert.match(text, /- Task 2: geparkt — Finding X/);
  assert.doesNotMatch(text, /fertig \(Commits/);
});

test('archive_StateSection_NamesHeadAndLastGreenFullRun', () => {
  const repo = makeRepo();
  const head = git(repo, 'rev-parse', '--short', 'HEAD');
  const workspace = path.join(repo, 'w');
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(repo, 'plan.md'), '# Plan\n');
  fs.writeFileSync(path.join(workspace, 'progress.md'), [
    '# Ledger — Plan: plan.md',
    'Gesamtlauf: aaa1111 grün (10 Tests)',
    'Task 1: fertig (Commits abc..def, Review sauber)',
    'Gesamtlauf: bbb2222 grün (12 Tests)',
  ].join('\n'));
  const result = spawnSync(process.execPath, [SCRIPT, 'archive', path.join(repo, 'plan.md'), workspace], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(repo, 'umsetzung.md'), 'utf8');
  assert.match(text, new RegExp(`## Stand\\n- Stand: ${head}\\n- Gesamtlauf: bbb2222 grün \\(12 Tests\\)`));
  assert.doesNotMatch(text, /aaa1111/);
});

test('archive_NoFullRunOutsideGit_StateSaysSo', () => {
  const env = setup();
  fs.writeFileSync(path.join(env.workspace, 'progress.md'), '# Ledger — Plan: plan.md\n');
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' }).status, 0);
  const text = fs.readFileSync(path.join(env.dir, 'umsetzung.md'), 'utf8');
  assert.match(text, /## Stand\n- Stand: -\n- Gesamtlauf: keiner/);
});

test('archive_NoLedger_ExitsWithOne', () => {
  const env = setup();
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive'], { encoding: 'utf8' }).status, 2);
});
