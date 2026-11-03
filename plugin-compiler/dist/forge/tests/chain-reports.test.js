'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, addWorktree } = require('./lib/git-repo');
const { SPEC, tempDir, writeReviewer, withAblage, flow } = require('./lib/review-flow-fixture');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');
const { parseReviewStatusLine } = require('../scripts/lib/review-status');
const { writeEntry } = require('../scripts/lib/chain');
const { toPosix } = require('../scripts/lib/posix');

// Repo mit committeter Spec und Plan im Ordner docs/forge/x (Slug `x`) und einem sauberen Spec-Review ohne Findings.
function specRun() {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/x/spec.md', SPEC, 'add spec');
  commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  const plan = path.join(repo, 'docs/forge/x/plan.md');
  const workspace = tempDir();
  writeReviewer({ workspace }, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', workspace, '--doc', spec, '--expect', 'clarity');
  withAblage({ workspace }, 'spec-review', ablageDir(repo, 'x', 'spec-review'));
  return { repo, spec, plan, workspace };
}

// Der Bericht liegt in der Ablage; die Statuszeile des Reviews nennt die Datei.
function storedReport(result) {
  assert.equal(result.status, 0, result.stderr);
  const statusLine = result.stdout.split('\n').find((line) => line.startsWith('STATUSZEILE '));
  return { text: fs.readFileSync(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')).bericht, 'utf8'), stdout: result.stdout };
}

function runSpecReport(run) {
  return flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec);
}

function report(run) {
  return storedReport(runSpecReport(run)).text;
}

// Wie specRun, dazu ein sauberes Plan-Review ohne Findings zum Plan im selben Ordner (eigener Arbeitsbereich).
function planRun() {
  const run = specRun();
  const workspace = tempDir('dv-forge-chain-plan-');
  writeReviewer({ workspace }, 'coverage', []);
  flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', run.plan, '--expect', 'coverage');
  withAblage({ workspace }, 'plan-review', ablageDir(run.repo, 'x', 'plan-review'));
  return { ...run, workspace };
}

function planReport(run) {
  return storedReport(flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--titel', 'Plan-Review', '--artefakt', run.plan)).text;
}

test('specReviewReport_SpecEntryWithWorkitem_NamesNoOrchestratorStepAndEqualsReportWithoutEntry', () => {
  // Arrange
  const run = specRun();
  const baseline = report(run);
  writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

  // Act
  const text = report(run);

  // Assert
  assert.equal(text, baseline);
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zum Planen/);
  assert.doesNotMatch(text, /plan-orchestrator|plan-writing|Wie es weitergeht|\/dv-forge:/);
});

test('specReviewReport_EntryOfStagePlan_EqualsReportWithoutEntry', () => {
  // Arrange
  const run = specRun();
  const baseline = report(run);
  writeEntry({ stage: 'plan', plan: run.plan, spec: run.spec, wi: '1' });

  // Act
  const text = report(run);

  // Assert
  assert.equal(text, baseline);
});

test('specReviewReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
  // Arrange
  const run = specRun();
  const baseline = report(run);
  commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
  const otherSpec = path.join(run.repo, 'alt/x/spec.md');
  writeEntry({ stage: 'spec', spec: otherSpec, wi: '1' });
  fs.rmSync(otherSpec);

  // Act
  const text = report(run);

  // Assert
  assert.equal(text, baseline);
});

test('specReviewReport_RunWithEntry_PrintsSameLinesAndStoresNoEntryInTheData', () => {
  // Arrange
  const run = specRun();
  const without = storedReport(runSpecReport(run)).stdout;
  writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

  // Act
  const withEntry = storedReport(runSpecReport(run)).stdout;

  // Assert
  assert.equal(withEntry, without);
  const data = JSON.parse(fs.readFileSync(path.join(ablageDir(run.repo, 'x', 'spec-review'), 'bericht-review.json'), 'utf8'));
  assert.equal(Object.hasOwn(data, 'chain'), false);
  assert.equal(JSON.stringify(data).includes('plan-orchestrator'), false);
});

test('planReviewReport_SpecEntryThenPlanEntry_NamesNoOrchestratorStepAndEqualsReportWithoutEntry', () => {
  // Arrange
  const run = planRun();
  const baseline = planReport(run);
  writeEntry({ stage: 'spec', spec: run.spec, wi: '1' });
  writeEntry({ stage: 'plan', plan: run.plan, spec: run.spec, wi: '2' });

  // Act
  const text = planReport(run);

  // Assert
  assert.equal(text, baseline);
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung/);
  assert.doesNotMatch(text, /implementation-orchestrator|dv-forge:implementation|Wie es weitergeht|committen/);
});


test('planReviewReport_PlanEntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
  // Arrange
  const run = planRun();
  const baseline = planReport(run);
  commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
  const otherSpec = path.join(run.repo, 'alt/x/spec.md');
  writeEntry({ stage: 'plan', plan: run.plan, spec: otherSpec, wi: '1' });
  fs.rmSync(otherSpec);

  // Act
  const text = planReport(run);

  // Assert
  assert.equal(text, baseline);
  assert.equal(text.includes('implementation-orchestrator'), false);
});

const IMPLEMENTATION_REPORT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
const REVIEW_PACKAGE = ['# Review-Paket: a1b2c3d..HEAD', '', '## Commits', 'abc feat: x', '', '## Dateien', ' src/a.js | 3 ++-', ' 1 file changed', '', '## Diff', 'diff --git a/x b/x'].join('\n');

// Implementation-Review ohne Findings zum Plan im Repo; Rückgabe: stdout des Berichts-Skripts.
function runImplementation(run) {
  const workspace = tempDir('dv-forge-chain-impl-');
  const dir = path.join(workspace, 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ergebnis.json'), JSON.stringify({ reviewers: ['design'], failed: [], counts: { red: 0, yellow: 0, green: 0 }, groups: [] }));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), 'STATUS clean=true red=0 yellow=0 green=0 failed=-\n=== REPORT ===\nTabelle\n=== REWORK ===\n');
  const packageFile = path.join(workspace, 'review.diff');
  fs.writeFileSync(packageFile, REVIEW_PACKAGE);
  fs.writeFileSync(path.join(workspace, 'kontext.json'), JSON.stringify({ etappe: 'umsetzung', ablage: ablageDir(run.repo, 'x', 'umsetzung') }));
  const result = spawnSync(process.execPath, [IMPLEMENTATION_REPORT, '--dir', dir, '--workspace', workspace, '--plan', run.plan, '--bereich', 'a1b2c3d', '--paket', packageFile], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// Der Bericht liegt in der Ablage; die Statuszeile nennt die Datei.
function implementationRun(run) {
  const statusLine = runImplementation(run).split('\n').find((line) => line.startsWith('STATUSZEILE '));
  return fs.readFileSync(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')).bericht, 'utf8');
}

test('implementationReport_ImplementationEntry_EqualsReportWithoutEntryAndNamesNoNextStep', () => {
  // Arrange
  const run = specRun();
  const baseline = implementationRun(run);
  const worktree = addWorktree(run.repo, 'feature/x');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/x' });

  // Act
  const text = implementationRun(run);

  // Assert
  assert.equal(text, baseline);
  assert.doesNotMatch(text, /Wie es weitergeht|Worktree bleibt|Nicht gepusht|finish-work/);
});

test('implementationReport_NoEntryOrWorktreeRemoved_EqualsReportWithoutEntry', () => {
  // Arrange
  const run = specRun();
  const baseline = implementationRun(run);
  const worktree = addWorktree(run.repo, 'feature/y');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/y' });
  git(run.repo, 'worktree', 'remove', '--force', worktree);

  // Act
  const text = implementationRun(run);

  // Assert
  assert.equal(text, baseline);
  assert.equal(text.includes('Worktree bleibt'), false);
});

test('implementationReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
  // Arrange
  const run = specRun();
  const baseline = implementationRun(run);
  commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
  const otherSpec = path.join(run.repo, 'alt/x/spec.md');
  const worktree = addWorktree(run.repo, 'feature/s');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: otherSpec, worktree, branch: 'feature/s' });
  fs.rmSync(otherSpec);

  // Act
  const text = implementationRun(run);

  // Assert
  assert.equal(text, baseline);
  assert.equal(text.includes('Worktree bleibt'), false);
});

test('implementationReport_RunWithEntry_PrintsOnlyEndeAndTheStatusLine', () => {
  // Arrange
  const run = specRun();
  const worktree = addWorktree(run.repo, 'feature/z');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/z' });

  // Act
  const stdout = runImplementation(run);

  // Assert
  const file = path.join(ablageDir(run.repo, 'x', 'umsetzung'), 'bericht-review.md').replace(/\\/g, '/');
  assert.equal(stdout, `ENDE sauber nach Review 1\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · FOLLOWUP nein · Bericht: ${file}\n`);
});
