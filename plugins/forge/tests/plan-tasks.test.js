'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const planTasks = require('../scripts/plan-tasks.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'plan-tasks.js');
const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '',
  '## Global Constraints',
  '- Node 24',
  '',
  '---',
  '',
  '### Task 1: Erster',
  '',
  'Text eins.',
  '',
  '```markdown',
  '### Task 9: nur ein Beispiel im Code-Block',
  '## Entscheidungen im Beispiel',
  '```',
  '',
  '---',
  '',
  '### Task 2: Zweiter',
  '',
  'Text zwei.',
  '',
  '## Entscheidungen',
  '- **W · Demo** · Mensch — ja',
  '',
].join('\n');

function writePlan(content, name = 'plan.md') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-plan-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('listTasks_ValidPlan_ReturnsNumbersAndIgnoresFencedHeadings', () => {
  assert.deepEqual(planTasks.listTasks(writePlan(PLAN)), [1, 2]);
});

test('listTasks_NestedFences_IgnoresHeadingsInsideOuterFence', () => {
  const nested = ['````markdown', '```js', 'x();', '```', '### Task 7: im Beispiel-Plan', '````'].join('\n');
  const plan = writePlan(PLAN.replace('Text eins.', `Text eins.\n\n${nested}`));
  assert.deepEqual(planTasks.listTasks(plan), [1, 2]);
  assert.ok(planTasks.buildBrief(plan, 1).includes('### Task 7: im Beispiel-Plan'));
});

test('listTasks_CrlfPlan_ReturnsNumbers', () => {
  assert.deepEqual(planTasks.listTasks(writePlan(PLAN.replace(/\n/g, '\r\n'))), [1, 2]);
});

test('listTasks_Gap_ThrowsWithPosition', () => {
  const plan = writePlan(PLAN.replace('### Task 2:', '### Task 3:'));
  assert.throws(() => planTasks.listTasks(plan), /an Position 2 steht Task 3/);
});

test('listTasks_Duplicate_ThrowsWithPosition', () => {
  const plan = writePlan(PLAN.replace('### Task 2:', '### Task 1:'));
  assert.throws(() => planTasks.listTasks(plan), /an Position 2 steht Task 1/);
});

test('listTasks_NoTask_Throws', () => {
  assert.throws(() => planTasks.listTasks(writePlan('# Leer\n')), /Kein Task gefunden/);
});

test('buildBrief_FirstTask_HeaderConstraintsAndOnlyItsBlock', () => {
  const brief = planTasks.buildBrief(writePlan(PLAN), 1);
  assert.ok(brief.startsWith('# Demo — Umsetzungsplan\n'));
  assert.ok(brief.includes('## Global Constraints\n- Node 24'));
  assert.ok(brief.includes('### Task 1: Erster'));
  assert.ok(brief.includes('### Task 9: nur ein Beispiel im Code-Block'));
  assert.ok(!brief.includes('Text zwei.'));
  assert.ok(!brief.includes('- **W · Demo**'));
  assert.ok(!/---\s*$/.test(brief));
});

test('buildBrief_LastTask_EndsBeforeDecisions', () => {
  const brief = planTasks.buildBrief(writePlan(PLAN), 2);
  assert.ok(brief.includes('Text zwei.'));
  assert.ok(!brief.includes('Text eins.'));
  assert.ok(!brief.includes('## Entscheidungen\n'));
});

test('buildBrief_SectionHeadingBetweenTasks_EndsBlock', () => {
  const plan = writePlan(PLAN.replace('### Task 2: Zweiter', '## Block B\n\nZwischentext.\n\n### Task 2: Zweiter'));
  const brief = planTasks.buildBrief(plan, 1);
  assert.ok(!brief.includes('## Block B'));
  assert.ok(!brief.includes('Zwischentext.'));
});

test('buildBrief_MissingTask_Throws', () => {
  assert.throws(() => planTasks.buildBrief(writePlan(PLAN), 5), /Task 5 nicht im Plan/);
});

test('buildHeader_Plan_HeaderAndConstraintsOnly', () => {
  const header = planTasks.buildHeader(writePlan(PLAN));
  assert.ok(header.includes('## Global Constraints\n- Node 24\n'));
  assert.ok(!header.includes('### Task 1'));
});

test('slugOf_PlanMd_UsesFolderName', () => {
  assert.equal(planTasks.slugOf(path.join('docs', 'forge', '2026-09-25-foo', 'plan.md')), '2026-09-25-foo');
});

test('slugOf_OtherFileName_UsesBaseName', () => {
  assert.equal(planTasks.slugOf(path.join('docs', 'plans', '2026-09-25-bar.md')), '2026-09-25-bar');
});

test('cli_List_PrintsOneNumberPerLine', () => {
  const result = run('list', writePlan(PLAN));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '1\n2\n');
});

test('cli_Brief_WritesFileAndPrintsPath', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-brief-'));
  const result = run('brief', writePlan(PLAN), '2', dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), path.join(dir, 'task-2-brief.md'));
  assert.ok(fs.readFileSync(path.join(dir, 'task-2-brief.md'), 'utf8').includes('Text zwei.'));
});

test('cli_Header_WritesHeaderBrief', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-brief-'));
  const result = run('header', writePlan(PLAN), dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), path.join(dir, 'header-brief.md'));
});

test('cli_MissingPlan_ExitsWithOneAndNamesPath', () => {
  const missing = path.join(os.tmpdir(), 'dv-forge-no-plan.md');
  const result = run('list', missing);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dv-forge-no-plan\.md/);
});

test('cli_BadCall_ExitsWithTwo', () => {
  assert.equal(run().status, 2);
  assert.equal(run('brief', 'plan.md', 'x', 'dir').status, 2);
  assert.equal(run('slug').status, 2);
});
