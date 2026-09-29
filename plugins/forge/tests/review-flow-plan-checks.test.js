'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { finding, flowWorkspace } = require('./lib/flow-workspace');
const { PLAN_SPEC: SPEC, SOURCE, ALL_ACS, planTask: task, planText: plan } = require('./lib/plan-fixtures');

const RULE = 'die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.';

function planWorkspace(text, files = {}) {
  const ws = flowWorkspace(text, 'plan.md');
  ws.context(SPEC);
  for (const [name, content] of Object.entries(files)) ws.repoFile(name, content);
  return ws;
}

// Runde 1 mit coverage (ohne Findings, falls nicht anders gegeben) und den übrigen Reviews.
function roundOne(ws, reviews = {}) {
  const all = { coverage: [], ...reviews };
  for (const [reviewer, findings] of Object.entries(all)) ws.review(reviewer, findings);
  return ws.run('round1', 'plan-review', ws.doc, ws.workspace, Object.keys(all).join(',')).stdout;
}

const red = (state) => state.groups.filter((group) => group.color === 'red')
  .map((group) => `${group.key}: ${group.items.map((item) => `${item.reviewer}/${item.category}`).join(' + ')}`);
const scriptConsequences = (ws) => ws.readJson('runde-1/runde.json').groups
  .flatMap((group) => group.items.filter((item) => item.script).map((item) => `${group.key}: ${item.consequence}`));

test('round1_AcInNoTask_ScriptRedAtThatAc', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03', ['Setzt auch AC-05 um.'])));
  const out = roundOne(ws);
  assert.equal(out, 'RUNDE1 rot=1 gelb=0 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=ja\n');
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['AC-05: skript:ac-abdeckung/ac-fehlt-im-plan']);
});

test('round1_TasksOneTwoFour_ScriptRedAtTaskFour', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(4, 'AC-05')));
  roundOne(ws);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['Task 4: skript:nummerierung/umsetzer-steckt-fest']);
});

test('round1_AnchorNotInFileAndNoEarlierTask_ScriptRedAtThatTask', () => {
  const ws = planWorkspace(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  roundOne(ws);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['Task 1: skript:anker/umsetzer-steckt-fest']);
});

test('round1_DuplicateNumber_ScriptRedAtFirstTaskOffItsPosition', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(2, 'AC-05'), task(3, '')));
  roundOne(ws);
  assert.deepEqual(scriptConsequences(ws), [`Task 2: An Position 3 steht Task 2; ${RULE}`]);
});

test('round1_WrongOrder_ScriptRedAtFirstTaskOffItsPosition', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(3, 'AC-03'), task(2, 'AC-05')));
  roundOne(ws);
  assert.deepEqual(scriptConsequences(ws), [`Task 3: An Position 2 steht Task 3; ${RULE}`]);
});

test('round1_PlanWithoutTasks_PlanRedAndEveryAcRed', () => {
  const ws = planWorkspace(plan());
  const out = roundOne(ws);
  assert.match(out, /^RUNDE1 rot=4 /);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), [
    'AC-01: skript:ac-abdeckung/ac-fehlt-im-plan', 'AC-03: skript:ac-abdeckung/ac-fehlt-im-plan', 'AC-05: skript:ac-abdeckung/ac-fehlt-im-plan',
    'Plan: skript:nummerierung/umsetzer-steckt-fest',
  ]);
});

test('round1_SamePlanSpecAndCodeTwice_SameFindings', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01', ['- Modify: `src/a.js` · `fehlt`']), task(2, 'AC-03'), task('2a', '')), { 'src/a.js': SOURCE });
  const first = [roundOne(ws), ws.read('runde-1/runde.json')];
  const second = [roundOne(ws), ws.read('runde-1/runde.json')];
  assert.deepEqual(second, first);
  assert.match(first[0], /^RUNDE1 rot=3 /);
});

test('round1_ReviewerAndScriptAtSameAc_StelleCountsOnceScriptDecides', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01, AC-03')));
  const out = roundOne(ws, { coverage: [finding('AC-05', 'ac-fehlt-im-plan', { quote: 'Text.' })] });
  ws.json('runde-1/rework.json', { results: [{ location: 'AC-05', status: 'changed' }], questions: [] });
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^RUNDE1 rot=1 /);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['AC-05: coverage/ac-fehlt-im-plan + skript:ac-abdeckung/ac-fehlt-im-plan']);
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
});

test('verify_ReworkRemovesOnlyMentionOfAc_ScriptRedAtAcOutsideChecklist', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01, AC-03'), task(2, 'AC-05')));
  roundOne(ws, { feasibility: [finding('Task 1', 'umsetzer-steckt-fest', { quote: 'Text.' })] });
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }], questions: [] });
  ws.edit((text) => text.replace('**ACs:** AC-05', '**ACs:** -'));
  ws.run('checklist', 'plan-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [{ location: 'Task 1', verdict: 'erledigt', rationale: 'passt' }], findings: [] });
  const out = ws.run('verify', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.equal(out, 'NACHPRUEFUNG ok offen=1 hinweise=0\nNEXT scout=nein\n');
  assert.deepEqual(red(ws.readJson('runde-2/nachpruefung.json')), ['AC-05: skript:ac-abdeckung/ac-fehlt-im-plan']);
  assert.ok(!ws.readJson('runde-2/pruefliste.json').items.some((item) => item.key === 'AC-05'));
});

test('verify_RedAnchorLineFixedByRework_PointDoneBecauseScriptNoLongerReportsIt', () => {
  const ws = planWorkspace(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  roundOne(ws);
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }], questions: [] });
  ws.edit((text) => text.replace('`Klasse.fehlt`', '`Klasse.methode`'));
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [], findings: [] });
  const out = ws.run('verify', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=1 nachpruefer=ja\n');
  assert.equal(out, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  assert.deepEqual(ws.readJson('runde-2/nachpruefung.json').verdicts,
    [{ key: 'Task 1', script: true, verdict: 'erledigt', rationale: 'Skript-Prüfung meldet die Stelle nicht mehr' }]);
});
