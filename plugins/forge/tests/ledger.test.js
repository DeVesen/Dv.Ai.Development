'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ledger = require('../scripts/ledger.js');

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

test('archive_NoLedger_ExitsWithOne', () => {
  const env = setup();
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive', env.plan, env.workspace], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT, 'archive'], { encoding: 'utf8' }).status, 2);
});
