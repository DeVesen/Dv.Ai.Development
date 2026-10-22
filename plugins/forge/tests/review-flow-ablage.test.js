'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { commitFile, makeRepo } = require('./lib/git-repo');
const { SPEC, tempDir, writeReviewer, flow } = require('./lib/review-flow-fixture');
const { chainsRoot } = require('../scripts/lib/session-chain-store');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');

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
  return { repo, spec, plan, workspace };
}

function planReport(run, extra = []) {
  return flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--titel', 'Plan-Review', '--artefakt', run.plan, ...extra);
}

test('report_PlanReviewWithAblage_StoresReportAndDataAndNamesFollowupOffer', () => {
  // Arrange
  const run = planRun();

  // Act
  const result = planReport(run, ['--ablage', 'plan-review']);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const target = ablageDir(run.repo, 'x', 'plan-review');
  assert.match(result.stdout, /^ENDE sauber nach Runde 1\nABLAGE .+\/bericht-review\.json · FOLLOWUP nein\n=== BERICHT ===\n/);
  assert.deepEqual(fs.readdirSync(target).sort(), ['bericht-review.json', 'bericht-review.md']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'bericht-review.json'), 'utf8')).status, 'sauber nach Runde 1');
  assert.ok(result.stdout.endsWith(`${fs.readFileSync(path.join(target, 'bericht-review.md'), 'utf8').trimEnd()}\n`));
});

test('report_WithoutAblage_PrintsTheSameAsBeforeAndStoresNothing', () => {
  // Arrange
  const run = planRun();
  const stored = planReport(run, ['--ablage', 'plan-review']).stdout;
  fs.rmSync(chainsRoot(run.repo), { recursive: true, force: true });

  // Act
  const result = planReport(run);

  // Assert
  assert.equal(result.stdout, stored.replace(/^ABLAGE .*\n/m, ''));
  assert.equal(fs.existsSync(chainsRoot(run.repo)), false);
});

test('report_FollowupRunsWithAblage_StoreNumberedRoundsBesideTheReview', () => {
  // Arrange
  const run = planRun();
  planReport(run, ['--ablage', 'plan-review']);
  planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

  // Act
  planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

  // Assert
  const names = fs.readdirSync(ablageDir(run.repo, 'x', 'plan-review')).filter((name) => name.endsWith('.json')).sort();
  assert.deepEqual(names, ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
});

test('report_NewReviewWithAblage_StartsTheAblageOfItsEtappeAnew', () => {
  // Arrange
  const run = planRun();
  planReport(run, ['--ablage', 'plan-review']);
  planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

  // Act
  planReport(run, ['--ablage', 'plan-review']);

  // Assert
  assert.deepEqual(fs.readdirSync(ablageDir(run.repo, 'x', 'plan-review')).sort(), ['bericht-review.json', 'bericht-review.md']);
});

test('report_UnknownAblageEtappe_ExitsWithUsage', () => {
  // Arrange
  const run = planRun();

  // Act
  const result = planReport(run, ['--ablage', 'review']);

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--ablage erlaubt: whiteboarding, grill, spec-review/);
});
