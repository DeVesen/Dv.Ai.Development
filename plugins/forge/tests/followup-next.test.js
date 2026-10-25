'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { nextStepOf, commitCheckOf } = require('../scripts/lib/followup-next');
const { makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'followup.js');
const PLAN = 'plans/p.md';
const CHAIN = { worktree: '/w/feature', branch: 'feature-x' };
const FOLLOWUP = 'NAECHSTER Noch nicht umgesetzt: /dv-forge:review-followup plans/p.md alle.';
const FINISH_PLAIN = ['NAECHSTER Alles sauber. Arbeit abschließen mit:', 'CODE /dv-forge:finish-work'];
const FINISH_MANUAL = ['NAECHSTER Arbeit abschließen (nur manuell, in /w/feature):', 'CODE /dv-forge:finish-work'];
const RERUN = 'NAECHSTER /dv-forge:implementation-review plans/p.md erneut.';
const WORKTREE = 'NAECHSTER Worktree bleibt: /w/feature';
const PUSH = 'NAECHSTER Nicht gepusht: `git push -u origin feature-x`';
const READY = '✅ Bereit zum Abschließen';
const BLOCKED = '⛔ Noch nicht bereit · 1 Hindernis offen';

const IMPLEMENTATION_CASES = [
  ['sauber, nichts offen', { status: 'sauber nach Nach-Review', offen: 0, ergebnis: READY }, FINISH_PLAIN, [WORKTREE, ...FINISH_MANUAL, PUSH]],
  ['sauber, Rest offen', { status: 'sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen', offen: 2, ergebnis: READY }, [FOLLOWUP], [WORKTREE, FOLLOWUP, ...FINISH_MANUAL, PUSH]],
  ['sauber, Rest offen ohne --offen', { status: 'sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen', ergebnis: READY }, [FOLLOWUP], [WORKTREE, FOLLOWUP, ...FINISH_MANUAL, PUSH]],
  ['sauber, Rest offen mit Hindernis', { status: 'sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen', offen: 1, ergebnis: BLOCKED }, [FOLLOWUP], [WORKTREE, FOLLOWUP, PUSH]],
  ['offen mit behaltenen Nummern, bereit', { status: 'offen nach Nach-Review', behalten: '1,3', ergebnis: READY }, [FOLLOWUP], [WORKTREE, FOLLOWUP, ...FINISH_MANUAL, PUSH]],
  ['offen mit behaltenen Nummern, Hindernis', { status: 'offen nach Nach-Review', behalten: '2', ergebnis: BLOCKED }, [FOLLOWUP], [WORKTREE, FOLLOWUP, PUSH]],
  ['offen ohne behaltene Gruppen', { status: 'offen nach Nach-Review', behalten: 'keine', ergebnis: BLOCKED }, [RERUN], [WORKTREE, RERUN, PUSH]],
  ['keine Änderung', { status: 'keine Änderung', behalten: 'unveraendert', ergebnis: BLOCKED }, [RERUN], [WORKTREE, RERUN, PUSH]],
  ['blockiert', { status: 'blockiert', behalten: 'unveraendert', ergebnis: BLOCKED }, [RERUN], [WORKTREE, RERUN, PUSH]],
  ['unvollständig', { status: 'unvollständig, ausgefallen: Tests, Risiken' }, ['NAECHSTER Ausgefallen: Tests, Risiken. Den Skill in einer frischen Session erneut starten.'],
    [WORKTREE, 'NAECHSTER Ausgefallen: Tests, Risiken. Den Skill in einer frischen Session erneut starten.', PUSH]],
];

for (const [name, input, plain, chained] of IMPLEMENTATION_CASES) {
  test(`nextStepOf_Implementation_${name}_WithoutChain`, () => {
    // Act
    const lines = nextStepOf({ original: 'implementation-review', artefakt: PLAN, chain: null, ...input });

    // Assert
    assert.deepEqual(lines, plain);
  });

  test(`nextStepOf_Implementation_${name}_WithChain`, () => {
    // Act
    const lines = nextStepOf({ original: 'implementation-review', artefakt: PLAN, chain: CHAIN, ...input });

    // Assert
    assert.deepEqual(lines, chained);
  });
}

test('nextStepOf_ChainWithoutBranch_CountsAsNoEntry', () => {
  // Act
  const lines = nextStepOf({ original: 'implementation-review', artefakt: PLAN, chain: { worktree: '/w' }, status: 'blockiert' });

  // Assert
  assert.deepEqual(lines, [RERUN]);
});

test('nextStepOf_UnknownImplementationStatus_Throws', () => {
  assert.throws(() => nextStepOf({ original: 'implementation-review', artefakt: PLAN, status: 'irgendwie' }), /Status unbekannt/);
});

test('nextStepOf_SpecReview_NothingBecauseTheReportCarriesTheNextStep', () => {
  assert.deepEqual(nextStepOf({ original: 'spec-review', status: 'sauber nach Nach-Review' }), []);
});

const COMMIT_CASES = [
  ['sauber und bereit', 'sauber nach Nachprüfung', '**Ergebnis:** ✅ Bereit zur Umsetzung', 'ja'],
  ['sauber, bereit mit Hinweisen', 'sauber nach Runde 1', '✅ Bereit zur Umsetzung · 2 kleine Hinweise offen', 'ja'],
  ['sauber, aber Hindernis offen', 'sauber nach Runde 1', '⛔ Noch nicht bereit · 1 Hindernis offen', 'nein'],
  ['nicht sauber', 'Fragen offen', '✅ Bereit zur Umsetzung', 'nein'],
  ['unvollständig', 'unvollständig, ausgefallen: x', '⚠️ Unvollständig · x ausgefallen', 'nein'],
  ['ohne Ergebnis-Zeile', 'sauber nach Runde 1', undefined, 'nein'],
];

for (const [name, status, ergebnis, expected] of COMMIT_CASES) {
  test(`nextStepOf_PlanReview_${name}_CommitCheck${expected}`, () => {
    // Act
    const lines = nextStepOf({ original: 'plan-review', status, ergebnis });

    // Assert
    assert.deepEqual(lines, [`COMMIT-PRUEFUNG ${expected}`]);
    assert.equal(commitCheckOf({ status, ergebnis }), expected);
  });
}

function runNext(args, cwd) {
  return spawnSync(process.execPath, [SCRIPT, 'next', ...args], { encoding: 'utf8', cwd });
}

test('followupNext_PlanReviewReady_PrintsCommitCheckLine', () => {
  // Act
  const result = runNext(['--original', 'plan-review', '--status', 'sauber nach Runde 1', '--ergebnis', '**Ergebnis:** ✅ Bereit zur Umsetzung']);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'COMMIT-PRUEFUNG ja\n');
});

test('followupNext_ImplementationWithoutChainEntry_PrintsPlainSteps', () => {
  // Arrange
  const repo = makeRepo();
  const plan = path.join(repo, 'plans', 'p.md');
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.writeFileSync(plan, '# Plan\n');

  // Act
  const result = runNext(['--original', 'implementation-review', '--status', 'sauber nach Nach-Review', '--offen', '0', '--ergebnis', READY, '--plan', plan]);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${FINISH_PLAIN.join('\n')}\n`);
});

test('followupNext_ImplementationWithChainEntry_NamesWorktreeAndPush', () => {
  // Arrange
  const repo = makeRepo();
  const dir = path.join(repo, 'plans');
  fs.mkdirSync(dir, { recursive: true });
  const plan = path.join(dir, 'p.md');
  const spec = path.join(dir, 'spec.md');
  const worktree = path.join(repo, 'wt');
  fs.mkdirSync(worktree);
  fs.writeFileSync(plan, '# Plan\n');
  fs.writeFileSync(spec, '# Spec\n');
  const { writeEntry } = require('../scripts/lib/chain');
  writeEntry({ stage: 'implementation', plan, spec, worktree, branch: 'feature-x' });

  // Act
  const result = runNext(['--original', 'implementation-review', '--status', 'blockiert', '--plan', plan]);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `NAECHSTER Worktree bleibt: ${worktree.replace(/\\/g, '/')}\nNAECHSTER /dv-forge:implementation-review ${plan} erneut.\nNAECHSTER Nicht gepusht: \`git push -u origin feature-x\`\n`);
});

test('followupNext_ImplementationWithoutPlan_UsageExitTwo', () => {
  assert.equal(runNext(['--original', 'implementation-review', '--status', 'blockiert']).status, 2);
});

test('followupNext_UnknownStatus_ExitOneWithReason', () => {
  const result = runNext(['--original', 'implementation-review', '--status', 'komisch', '--plan', 'x.md']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Status unbekannt: komisch/);
});
