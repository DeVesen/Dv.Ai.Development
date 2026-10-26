'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, addWorktree } = require('./lib/git-repo');
const { SPEC, tempDir, writeReviewer, flow } = require('./lib/review-flow-fixture');
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
  return { repo, spec, plan, workspace };
}

function report(run, extra = []) {
  const result = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, ...extra);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// Wie specRun, dazu ein sauberes Plan-Review ohne Findings zum Plan im selben Ordner (eigener Arbeitsbereich).
function planRun() {
  const run = specRun();
  const workspace = tempDir('dv-forge-chain-plan-');
  writeReviewer({ workspace }, 'coverage', []);
  flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', run.plan, '--expect', 'coverage');
  return { ...run, workspace };
}

function planReport(run) {
  const result = flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--titel', 'Plan-Review', '--artefakt', run.plan);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
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

test('specReviewReport_EmbeddedRunWithEntry_PrintsSameLinesAndWritesNoEntryIntoJson', () => {
  // Arrange
  const run = specRun();
  const dir = tempDir('dv-forge-chain-embedded-');
  const without = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, '--bericht', path.join(dir, 'a.json'));
  writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

  // Act
  const file = path.join(dir, 'b.json');
  const withEntry = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, '--bericht', file);

  // Assert
  assert.equal(withEntry.stdout.replace(file, 'X'), without.stdout.replace(path.join(dir, 'a.json'), 'X'));
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
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

// Implementation-Review ohne Findings zum Plan im Repo; Rückgabe der Berichtsausgabe.
function implementationRun(run, extra = []) {
  const workspace = tempDir('dv-forge-chain-impl-');
  const dir = path.join(workspace, 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ergebnis.json'), JSON.stringify({ reviewers: ['design'], failed: [], counts: { red: 0, yellow: 0, green: 0 }, groups: [] }));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), 'STATUS clean=true red=0 yellow=0 green=0 failed=-\n=== REPORT ===\nTabelle\n=== REWORK ===\n');
  const packageFile = path.join(workspace, 'review.diff');
  fs.writeFileSync(packageFile, REVIEW_PACKAGE);
  const result = spawnSync(process.execPath, [IMPLEMENTATION_REPORT, '--dir', dir, '--workspace', workspace, '--plan', run.plan, '--bereich', 'a1b2c3d', '--paket', packageFile, ...extra], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// Ohne die Zeile `ENDE …`, die zwischen zwei Läufen abweichen darf.
function withoutStatus(text) {
  return text.replace(/\r\n/g, '\n').split('\n').filter((line) => !line.startsWith('ENDE ')).join('\n');
}

test('implementationReport_ImplementationEntry_WorktreeLineFinishStepAndPushLine', () => {
  // Arrange
  const run = specRun();
  const worktree = addWorktree(run.repo, 'feature/x');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/x' });
  const shown = worktree.split(path.sep).join('/');

  // Act
  const text = implementationRun(run);

  // Assert
  assert.ok(text.includes(`### Wie es weitergeht\nWorktree bleibt: ${shown}\n1. Arbeit abschließen (nur manuell, in ${shown}):\n   \`/dv-forge:finish-work\`\nNicht gepusht: \`git push -u origin feature/x\``), text);
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
  assert.equal(withoutStatus(text), withoutStatus(baseline));
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
  assert.equal(withoutStatus(text), withoutStatus(baseline));
  assert.equal(text.includes('Worktree bleibt'), false);
});

test('implementationReport_EmbeddedRunWithEntry_PrintsFourLinesWithoutNextSection', () => {
  // Arrange
  const run = specRun();
  const worktree = addWorktree(run.repo, 'feature/z');
  writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/z' });
  const file = path.join(tempDir('dv-forge-chain-impl-embedded-'), 'bericht.json');

  // Act
  const text = implementationRun(run, ['--bericht', file]);

  // Assert
  assert.equal(text, `ENDE sauber nach Review 1\nERGEBNIS ✅ Bereit zum Abschließen\nFOLLOWUP nein\nBERICHT ${file}\n`);
});
