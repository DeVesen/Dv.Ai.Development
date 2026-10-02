'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { writeContext } = require('../scripts/workspace');
const { finding, tempDir, setup, writeJsonFile, writeReviewer, flow, readJsonFile } = require('./lib/review-flow-fixture');
const { PLAN_SPEC, SOURCE, ALL_ACS, planTask: task, planText: plan } = require('./lib/plan-fixtures');

// Plan im Repo-Ordner, Kontext wie von prepare.js: Spec neben dem Plan, Repo ist der Test-Ordner.
function planEnv(text, files = {}) {
  const root = tempDir('dv-forge-plan-');
  const env = { root, doc: path.join(root, 'plan.md'), workspace: path.join(root, '.forge', 'ws') };
  const spec = path.join(root, 'kontext-spec.md');
  fs.writeFileSync(env.doc, text);
  fs.writeFileSync(spec, PLAN_SPEC);
  for (const [name, content] of Object.entries(files)) writeJsonFile(path.join(root, name), content);
  fs.mkdirSync(env.workspace, { recursive: true });
  writeContext(env.workspace, { spec, repo: root });
  return env;
}

function flags(env) {
  return ['--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc];
}

const planFinding = (location, category) => finding({ location, category, quote: 'Text.' });

// Runde 1: Skript-Prüfungen, dann rate mit coverage (ohne Findings, falls nicht anders gegeben) und den übrigen Reviews.
function roundOne(env, reviews = {}) {
  const all = { coverage: [], ...reviews };
  for (const [reviewer, findings] of Object.entries(all)) writeReviewer(env, reviewer, findings);
  const checks = flow('script-checks', ...flags(env)).stdout;
  const rated = flow('rate', ...flags(env), '--expect', Object.keys(all).join(',')).stdout;
  return { checks, rated };
}

// Nacharbeit mit Ergebnis `results` und Änderung `change` am Plan, danach die Prüfliste.
function reworkAndChecklist(env, results, change = (text) => text) {
  flow('rework-input', ...flags(env));
  fs.writeFileSync(env.doc, change(fs.readFileSync(env.doc, 'utf8')));
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions: [] });
  flow('rework-check', ...flags(env));
  return flow('checklist', ...flags(env)).stdout;
}

function verify(env, verification) {
  flow('script-checks', ...flags(env), '--runde', 'runde-2');
  if (verification) writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  return flow('verify', ...flags(env)).stdout;
}

const readRound = (env, relative) => readJsonFile(path.join(env.workspace, relative));

const redLabels = (state) => state.groups.filter((group) => group.color === 'red')
  .map((group) => `${group.label}: ${group.items.map((item) => `${item.reviewer}/${item.category}`).join(' + ')}`);

const scriptItemsOf = (env) => readRound(env, 'runde-1/einstufung.json').groups.flatMap((group) => group.items.filter((item) => item.script)
  .map((item) => ({ label: group.label, category: item.category, finding: `${item.finding.check}/${item.finding.category}` })));

test('scriptChecks_AcInNoTask_RateCountsScriptRedWithCheckAndCategory', () => {
  // Arrange
  const env = planEnv(plan(task(1, 'AC-01'), task(2, 'AC-03', ['Setzt auch AC-05 um.'])));

  // Act
  const out = roundOne(env);

  // Assert
  assert.equal(out.checks, 'SKRIPT befunde=1\n');
  assert.equal(out.rated, 'STATUS red=1 yellow=0 green=0 fragen=0 failed=-\nWEITER scout=rot-und-gelb nacharbeit=ja\n');
  assert.deepEqual(redLabels(readRound(env, 'runde-1/einstufung.json')), ['AC-05: skript:ac-abdeckung/skript-prüfung']);
  assert.deepEqual(scriptItemsOf(env), [{ label: 'AC-05', category: 'skript-prüfung', finding: 'ac-abdeckung/ac-fehlt-im-plan' }]);
});

test('scriptChecks_SpecReview_WritesNoFindings', () => {
  // Arrange
  const env = setup();

  // Act
  const out = flow('script-checks', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;

  // Assert
  assert.equal(out, 'SKRIPT befunde=0\n');
  assert.deepEqual(readRound(env, 'runde-1/skript-pruefung.json'), { findings: [] });
});

test('rate_PlanWithoutTasks_PlanRedAndEveryAcRed', () => {
  // Arrange
  const env = planEnv(plan());

  // Act
  const out = roundOne(env);

  // Assert
  assert.match(out.rated, /^STATUS red=4 /);
  assert.deepEqual(redLabels(readRound(env, 'runde-1/einstufung.json')).sort(), [
    'AC-01: skript:ac-abdeckung/skript-prüfung', 'AC-03: skript:ac-abdeckung/skript-prüfung', 'AC-05: skript:ac-abdeckung/skript-prüfung',
    'Plan: skript:nummerierung/skript-prüfung',
  ]);
});

test('rate_SamePlanSpecAndCodeTwice_SameFindings', () => {
  // Arrange
  const env = planEnv(plan(task(1, 'AC-01', ['- Modify: `src/a.js` · `fehlt`']), task(2, 'AC-03'), task('2a', '')), { 'src/a.js': SOURCE });
  const first = [roundOne(env), fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8')];

  // Act
  const second = [roundOne(env), fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8')];

  // Assert
  assert.deepEqual(second, first);
  assert.match(first[0].rated, /^STATUS red=3 /);
});

test('checklist_ReviewerAndScriptAtSameAc_OneRedPlaceWithReviewerAndScriptPoint', () => {
  // Arrange
  const env = planEnv(plan(task(1, 'AC-01, AC-03')));
  // Das Zitat stammt aus der Spec; im Plan fehlt AC-05, also bleibt die Stelle AC-05.
  const out = roundOne(env, { coverage: [finding({ location: 'AC-05', category: 'ac-fehlt-im-plan', quote: 'Gegeben E, dann F.' })] });

  // Act
  const list = reworkAndChecklist(env, [{ location: 'AC-05', status: 'changed' }], (text) => text.replace('**ACs:** AC-01, AC-03', '**ACs:** AC-01, AC-03, AC-05'));

  // Assert
  assert.match(out.rated, /^STATUS red=1 /);
  assert.deepEqual(redLabels(readRound(env, 'runde-1/einstufung.json')), ['AC-05: coverage/ac-fehlt-im-plan + skript:ac-abdeckung/skript-prüfung']);
  assert.equal(list, 'PRUEFLISTE punkte=1 skript=1 bereiche=1\nNACHPRUEFER ja\n');
});

test('verify_ReworkRemovesOnlyMentionOfAc_ScriptRedAtAcOutsideChecklist', () => {
  // Arrange
  const env = planEnv(plan(task(1, 'AC-01, AC-03'), task(2, 'AC-05')));
  roundOne(env, { feasibility: [planFinding('Task 1', 'umsetzer-steckt-fest')] });
  reworkAndChecklist(env, [{ location: 'Task 1', status: 'changed' }], (text) => text.replace('**ACs:** AC-05', '**ACs:** -'));

  // Act
  const out = verify(env, { verdicts: [{ location: 'Task 1', verdict: 'erledigt', rationale: 'passt' }], findings: [] });

  // Assert
  assert.equal(out, 'NACHPRUEFUNG ok offen=1 hinweise=0\nWEITER scout=keiner\n');
  assert.deepEqual(redLabels(readRound(env, 'runde-2/einstufung.json')), ['AC-05: skript:ac-abdeckung/skript-prüfung']);
  assert.ok(!readRound(env, 'runde-2/pruefliste.json').items.some((item) => item.key === 'AC-05'));
});

test('verify_RedAnchorLineFixedByRework_ScriptPointDone', () => {
  // Arrange
  const env = planEnv(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  roundOne(env);
  const list = reworkAndChecklist(env, [{ location: 'Task 1', status: 'changed' }], (text) => text.replace('`Klasse.fehlt`', '`Klasse.methode`'));

  // Act
  const out = verify(env, { verdicts: [], findings: [] });

  // Assert
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 bereiche=1\nNACHPRUEFER ja\n');
  assert.equal(out, 'NACHPRUEFUNG ok offen=0 hinweise=0\nWEITER scout=keiner\n');
  assert.deepEqual(readRound(env, 'runde-2/einstufung.json').verdicts,
    [{ location: 'Task 1', source: 'skript', rationale: 'Skript-Prüfung', verdict: 'erledigt' }]);
});
