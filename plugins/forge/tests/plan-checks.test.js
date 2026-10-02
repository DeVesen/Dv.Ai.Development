'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PLAN_CHECKS } = require('../scripts/lib/plan-checks.js');
const { PLAN_SPEC: SPEC, SOURCE, ALL_ACS, planTask: task, planText: plan } = require('./lib/plan-fixtures');

// Eigenes Repo je Test mit Plan, Spec und Quelldateien; liefert Plan-Text und Kontext wie review-flow.js.
function setup(planText, files = {}, spec = SPEC) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-plan-checks-'));
  for (const [name, content] of Object.entries({ 'docs/plan.md': planText, 'docs/spec.md': spec, ...files })) {
    fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    fs.writeFileSync(path.join(repo, name), content);
  }
  return { text: planText, context: { doc: path.join(repo, 'docs', 'plan.md'), spec: path.join(repo, 'docs', 'spec.md'), repo } };
}

function check(name, { text, context }) {
  return PLAN_CHECKS.find((candidate) => candidate.name === name).run(text, context);
}

const places = (findings) => findings.map((finding) => `${finding.location}: ${finding.category}`);

test('acCoverage_AcNamedOnlyInTaskText_AcFehltImPlanAtThatAc', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03', ['Setzt auch AC-05 um.'])));
  const findings = check('ac-abdeckung', env);
  assert.deepEqual(places(findings), ['AC-05: ac-fehlt-im-plan']);
});

test('acCoverage_AcIdOnlyInPlan_NoFinding', () => {
  const env = setup(plan(task(1, `${ALL_ACS}, AC-99`)));
  assert.deepEqual(check('ac-abdeckung', env), []);
});

test('acCoverage_SpecWithoutAcs_NoFinding', () => {
  const env = setup(plan(task(1, 'AC-01')), {}, '# Spec\n\n## Soll-Vorgaben\n- Nur Node.js.\n');
  assert.deepEqual(check('ac-abdeckung', env), []);
});

test('numbering_TasksOneTwoFour_UmsetzerStecktFestAtTaskFour', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(4, 'AC-05')));
  assert.deepEqual(places(check('nummerierung', env)), ['Task 4: umsetzer-steckt-fest']);
});

test('numbering_DuplicateNumber_FindingAtPositionThree', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(2, 'AC-05'), task(3, '')));
  const [finding] = check('nummerierung', env);
  assert.deepEqual([finding.location, finding.consequence], ['Task 2', 'An Position 3 steht Task 2; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.']);
});

test('numbering_WrongOrder_FindingAtPositionTwo', () => {
  const env = setup(plan(task(1, 'AC-01'), task(3, 'AC-03'), task(2, 'AC-05')));
  const [finding] = check('nummerierung', env);
  assert.deepEqual([finding.location, finding.consequence], ['Task 3', 'An Position 2 steht Task 3; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.']);
});

test('numbering_SuffixedTaskNumber_FindingAtThatTask', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(3, 'AC-05'), task('3a', '')));
  assert.deepEqual(places(check('nummerierung', env)), ['Task 3a: umsetzer-steckt-fest']);
});

test('numbering_PlanWithoutTasks_FindingAtPlanAndEveryAcMissing', () => {
  const env = setup(plan());
  const result = PLAN_CHECKS.map((candidate) => places(candidate.run(env.text, env.context)));
  assert.deepEqual(result, [['Plan: umsetzer-steckt-fest'], ['AC-01: ac-fehlt-im-plan', 'AC-03: ac-fehlt-im-plan', 'AC-05: ac-fehlt-im-plan'], []]);
});

test('anchors_RedLine_UmsetzerStecktFestAtItsTask', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  const findings = check('anker', env);
  assert.deepEqual(places(findings), ['Task 1: umsetzer-steckt-fest']);
  assert.ok(findings[0].quote.includes('❌ Modify `src/a.js` · `Klasse.fehlt` — Anker nicht gefunden'));
});

test('anchors_TwoRedLinesInOneTask_OneFindingEach', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`', '- Modify: `src/weg.js` · `x`'])), { 'src/a.js': SOURCE });
  assert.deepEqual(places(check('anker', env)), ['Task 1: umsetzer-steckt-fest', 'Task 1: umsetzer-steckt-fest']);
});

test('anchors_WarningLineFromEarlierTask_NoScriptFinding', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `methode`']), task(2, '', ['- Modify: `src/a.js` · `neueFunktion`'])), { 'src/a.js': SOURCE });
  assert.deepEqual(check('anker', env), []);
});

test('anchors_BrokenNumbering_LeftToNumberingFinding', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`']), task(3, '')), { 'src/a.js': SOURCE });
  assert.deepEqual([places(check('nummerierung', env)), check('anker', env)], [['Task 3: umsetzer-steckt-fest'], []]);
});

test('checks_NoSpecOrRepoInContext_FailureAtPlan', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const bare = { text: env.text, context: { doc: env.context.doc } };
  assert.deepEqual([places(check('ac-abdeckung', bare)), places(check('anker', bare))], [['Plan: umsetzer-steckt-fest'], ['Plan: umsetzer-steckt-fest']]);
});

test('checks_SpecNotReadable_FailureAtPlanNamingTheSpec', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const missing = { text: env.text, context: { ...env.context, spec: path.join(env.context.repo, 'docs', 'fehlt.md') } };
  const [finding] = check('ac-abdeckung', missing);
  assert.deepEqual([finding.location, finding.category], ['Plan', 'umsetzer-steckt-fest']);
  assert.match(finding.rationale, /^Spec nicht lesbar: .*fehlt\.md \(ENOENT\)$/);
});

test('checks_AnchorCheckAborts_FailureAtPlanWithMessage', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const noRepo = { text: env.text, context: { ...env.context, repo: path.join(env.context.repo, 'gibt-es-nicht') } };
  const [finding] = check('anker', noRepo);
  assert.equal(finding.location, 'Plan');
  assert.match(finding.rationale, /^Anker-Prüfung abgebrochen: Repo nicht gefunden: /);
});

test('planChecks_SamePlanSpecAndCodeTwice_SameFindings', () => {
  const env = setup(plan(task(1, 'AC-01', ['- Modify: `src/a.js` · `fehlt`']), task(2, 'AC-03'), task('2a', '')), { 'src/a.js': SOURCE });
  const runAll = () => PLAN_CHECKS.map((candidate) => candidate.run(env.text, env.context));
  const first = runAll();
  assert.deepEqual(runAll(), first);
  assert.deepEqual(first.map((findings) => findings.length), [1, 1, 1]);
});
