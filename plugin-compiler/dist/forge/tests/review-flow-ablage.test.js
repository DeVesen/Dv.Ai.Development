'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { commitFile, makeRepo } = require('./lib/git-repo');
const { SPEC, tempDir, writeReviewer, withAblage, flow } = require('./lib/review-flow-fixture');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');
const { parseReviewStatusLine } = require('../scripts/lib/review-status');

// Repo mit committeter Spec und Plan im Ordner docs/forge/x (Slug `x`) und einem sauberen Plan-Review ohne Findings.
function planRun() {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/x/spec.md', SPEC, 'add spec');
  commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  const plan = path.join(repo, 'docs/forge/x/plan.md');
  const workspace = tempDir('dv-forge-ablage-');
  writeReviewer({ workspace }, 'coverage', []);
  flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', plan, '--spec', spec, '--expect', 'coverage');
  const env = withAblage({ workspace }, 'plan-review', ablageDir(repo, 'x', 'plan-review'));
  return { repo, spec, plan, workspace, ablage: env.ablage };
}

function planReport(run, extra = []) {
  return flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--titel', 'Plan-Review', '--artefakt', run.plan, ...extra);
}

test('report_PlanReviewRun_StoresReportAndDataAndPrintsOnlyEndeAndTheStatusLine', () => {
  // Arrange
  const run = planRun();

  // Act
  const result = planReport(run);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(run.ablage).sort(), ['bericht-review.json', 'bericht-review.md']);
  const [ende, statusLine, ...rest] = result.stdout.trim().split('\n');
  assert.equal(ende, 'ENDE sauber nach Runde 1');
  assert.deepEqual(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')), {
    ergebnis: '✅ Bereit zur Umsetzung', followup: false, bericht: path.join(run.ablage, 'bericht-review.md').replace(/\\/g, '/'),
  });
  assert.deepEqual(rest, []);
  assert.doesNotMatch(result.stdout, /=== BERICHT ===|COMMIT-PRUEFUNG|\/dv-forge:/);
  const data = JSON.parse(fs.readFileSync(path.join(run.ablage, 'bericht-review.json'), 'utf8'));
  assert.equal(data.format, 2);
  assert.equal(data.status, 'sauber nach Runde 1');
  assert.equal(data.offersFollowup, false);
});

test('report_PlanReviewWithOpenRed_PrintsNoCommitCheckEither', () => {
  // Arrange
  const run = planRun();
  writeReviewer({ workspace: run.workspace }, 'coverage', [{ location: 'AC-01', quote: 'Gegeben A, wenn B, dann C.', category: 'ac-fehlt-im-plan', consequence: 'Folge', rationale: 'Grund' }]);
  flow('rate', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--expect', 'coverage');

  // Act
  const result = planReport(run);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE [^\n]+\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP nein · Bericht: /);
  assert.doesNotMatch(result.stdout, /COMMIT-PRUEFUNG/);
});

test('report_FollowupRuns_StoreNumberedRoundsBesideTheReview', () => {
  // Arrange
  const run = planRun();
  planReport(run);
  planReport(run, ['--quelle', 'nacharbeit']);

  // Act
  const result = planReport(run, ['--quelle', 'nacharbeit']);

  // Assert
  const names = fs.readdirSync(run.ablage).filter((name) => name.endsWith('.json')).sort();
  assert.deepEqual(names, ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
  assert.match(result.stdout, /Bericht: .+\/bericht-followup-2\.md$/m);
});

test('report_NewReview_StartsTheAblageOfItsEtappeAnew', () => {
  // Arrange
  const run = planRun();
  planReport(run);
  planReport(run, ['--quelle', 'nacharbeit']);

  // Act
  planReport(run);

  // Assert
  assert.deepEqual(fs.readdirSync(run.ablage).sort(), ['bericht-review.json', 'bericht-review.md']);
});

test('report_WorkspaceWithoutAblage_ExitsWithOneAndNamesPrepare', () => {
  // Arrange
  const run = planRun();
  fs.rmSync(path.join(run.workspace, 'kontext.json'));

  // Act
  const result = planReport(run);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest/);
  assert.equal(fs.existsSync(run.ablage), false);
});

for (const parts of [['--', 'ber', 'icht'], ['--', 'abl', 'age']]) {
  const parameter = parts.join('');
  test(`report_FormerParameter${parts[1]}${parts[2]}_ExitsWithTwoAndSaysUnknownParameter`, () => {
    // Arrange
    const run = planRun();

    // Act
    const result = planReport(run, [parameter, 'x']);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}$`, 'm'));
    assert.equal(fs.existsSync(run.ablage), false);
  });
}
