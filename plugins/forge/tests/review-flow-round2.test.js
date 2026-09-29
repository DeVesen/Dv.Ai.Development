'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flow = require('../scripts/lib/flow-legacy');
const { SPEC, finding, scoutFor, flowWorkspace } = require('./lib/flow-workspace');
const { TWO_TASKS } = require('./lib/plan-fixtures');

const question = (locations, text = 'Was gilt leer?') => ({ rule: 'Leere Eingabe', question: text, locations, cases: ['a) Fehler', 'b) leer'], recommendation: 'b', reason: 'Bestand' });
const verdict = (location, value = 'erledigt') => ({ location, verdict: value, rationale: `Urteil ${location}` });
const addW = (title) => (text) => `${text}- **W · ${title}** · Aussage — Antwort.\n`;

// Runde 1 mit roten Stellen, Nacharbeit mit den gegebenen Ausgängen und Fragen.
function afterRework(ws, reds, results, bundled = []) {
  ws.review('consistency', reds.map((location) => finding(location, 'widerspruch')));
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  ws.json('runde-1/rework.json', { results, questions: bundled });
  ws.run('rework-check', 'spec-review', ws.doc, ws.workspace);
}

const writeQuestionEntries = (ws, keys) => ws.edit((text) => `${text}${keys.map((key) => `- **R1 · ${key}** — frage an den menschen — Was gilt leer?\n`).join('')}`);
const finish = (ws, ...extra) => ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Spec-Review', ...extra).stdout;

test('checklist_ThreeRedWithoutQuestions_ThreePointsAndVerdictEach', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07', 'AC-09'], ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'changed' })));
  ws.edit((text) => text.replace('Gegeben C, dann D.', 'Gegeben C, dann D2.'));
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=3 skript=0 geaendert=1 nachpruefer=ja\n');
  assert.ok(ws.read('runde-2/pruefliste.md').includes('### AC-04\nHerkunft: Finding aus Runde 1\n- [consistency · widerspruch]'));
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', summary: 's', verdicts: ['AC-04', 'AC-07', 'AC-09'].map((key) => verdict(key)), findings: [] });
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  const out = finish(ws);
  assert.match(out, /^STATUS sauber nach Nachprüfung\n/);
  for (const key of ['AC-04', 'AC-07', 'AC-09']) assert.ok(out.includes(`| ${key} | erledigt | Urteil ${key} |`), key);
  assert.ok(out.includes('**Runden:** 2 · **Nacharbeiten:** 1'));
});

test('verify_TwoPointsNotDone_NotReadyTwoRed', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], ['AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'nicht erledigt'), verdict('AC-07', 'nicht erledigt')], findings: [] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=2/);
  assert.match(finish(ws), /^STATUS nicht bereit, 2 × 🔴 offen\n/);
});

test('verify_MissingVerdictOrColor_Invalid', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], ['AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [finding('AC-01', 'detail', { severity: 'yellow' })] });
  const out = ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^NACHPRUEFUNG ungueltig/);
  assert.match(out, /ERROR AC-07: kein Urteil/);
  assert.match(out, /ERROR Finding an AC-01 nennt eine Farbe/);
});

test('verify_ContradictionInSideChangedSection_RedInReport', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.edit((text) => text.replace('Alle Reviewer prüfen.', 'Nur ein Reviewer prüft.'));
  assert.match(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, /geaendert=1/);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')],
    findings: [finding('Suche', 'widerspruch', { quote: 'Nur ein Reviewer prüft.', consequence: 'widerspricht AC-01' })] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=1/);
  const out = finish(ws);
  assert.match(out, /^STATUS nicht bereit, 1 × 🔴 offen/);
  assert.ok(out.includes('### Widersprüche\n- 🔴 Suche — 🔴 widerspricht AC-01'));
});

test('verify_FindingOutsideChecklistNotContradiction_HintWithScoutAfterwards', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [finding('AC-12', 'fehlendes-verhalten')] });
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=1\nNEXT scout=ja\n');
  assert.ok(ws.read('runde-2/scout-input.md').includes('### 🟡 AC-12 (verifier)'));
  ws.text('runde-2/scout.md', scoutFor([['🟡', 'AC-12']]));
  assert.equal(ws.run('scout-check', ws.workspace, '2').stdout, 'SCOUT ok\n');
  assert.match(finish(ws), /^STATUS sauber nach Nachprüfung/);
  assert.ok(ws.read('bericht/scout.md').includes('### 🟡 AC-12\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher'));
});

test('checklist_OnlyDecisionsChanged_NoChangedArea', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'unchanged', rationale: 'Fehllesung' }]);
  ws.edit(addW('AC-12'));
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  assert.ok(ws.read('runde-2/pruefliste.md').includes('Keine geänderten Bereiche.'));
});

test('checklist_AnsweredQuestion_StelleOnChecklist', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  ws.edit(addW('AC-04'));
  assert.match(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, /^PRUEFLISTE punkte=1/);
  assert.equal(ws.readJson('runde-2/pruefliste.json').items[0].key, 'AC-04');
});

test('checklist_AnswerLaterForOne_OthersCheckedStatusQuestionsOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04', 'AC-07'], [{ location: 'AC-04', status: 'human-question' }, { location: 'AC-07', status: 'changed' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-07', 'nicht erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen\n/);
  assert.ok(out.includes('| AC-07 | nicht erledigt | Urteil AC-07 |'));
  assert.ok(out.includes('### Offene Fragen\n- F1 · AC-04 — Was gilt leer?'));
});

test('checklist_ThreeQuestionsOneAnswered_TwoStayOpen', () => {
  const ws = flowWorkspace();
  const keys = ['AC-04', 'AC-07', 'AC-09'];
  afterRework(ws, keys, keys.map((location) => ({ location, status: 'human-question' })), keys.map((key) => question([key], `Frage ${key}?`)));
  writeQuestionEntries(ws, keys);
  ws.edit(addW('AC-04'));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  assert.deepEqual(ws.readJson('runde-2/pruefliste.json').open.map((entry) => entry.key), ['AC-07', 'AC-09']);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('- F2 · AC-07 — Frage AC-07?\n- F3 · AC-09 — Frage AC-09?'));
});

test('checklist_EveryStelleOpenNothingChanged_NoVerifierStatusQuestionsOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=0 skript=0 geaendert=0 nachpruefer=nein\n');
  assert.equal(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  assert.match(finish(ws), /^STATUS Fragen offen/);
});

test('finish_VerifierFailedWithOpenQuestion_Incomplete', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'])]);
  writeQuestionEntries(ws, ['AC-04']);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  assert.match(finish(ws, '--ausgefallen', 'nachprüfer'), /^STATUS unvollständig, ausgefallen: nachprüfer\n/);
});

test('finish_ReviewerFailed_IncompleteWithName', () => {
  const ws = flowWorkspace();
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  assert.match(finish(ws, '--ausgefallen', 'clarity'), /^STATUS unvollständig, ausgefallen: clarity\n/);
});

test('finish_GreenFinding_InReportWithoutScout', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'formulierung', { consequence: 'Wortwahl' })]);
  assert.match(ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity').stdout, /NEXT scout=nein nacharbeit=nein/);
  const out = finish(ws);
  assert.ok(out.includes('### Anmerkungen (🟢)\n- AC-01 — 🟢 Wortwahl'));
  assert.equal(require('node:fs').existsSync(ws.file('bericht')), false);
});

test('verify_NotDoneContradictionAndScriptRed_ThreeRedOpen', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.edit((text) => text.replace('Gegeben I, dann J.', 'Gegeben I, dann K.'));
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'nicht erledigt')], findings: [finding('AC-12', 'widerspruch')] });
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-01', quote: 'Gegeben A', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=3/);
  assert.match(finish(ws), /^STATUS nicht bereit, 3 × 🔴 offen/);
});

test('verify_ScriptPointFromRoundOne_JudgedByScript', () => {
  const ws = flowWorkspace();
  ws.review('clarity', []);
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-12', quote: 'Gegeben I', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  flow.roundOne('spec-review', ws.doc, ws.workspace, ['clarity'], checks);
  ws.json('runde-1/rework.json', { results: [{ location: 'AC-12', status: 'unchanged', rationale: 'nicht lösbar' }], questions: [] });
  assert.equal(ws.run('checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=1/);
  const out = finish(ws);
  assert.ok(out.includes('| AC-12 | 🔴 Skript-Prüfung | Skript-Prüfung meldet die Stelle erneut |'));
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, []), /offen=0/);
});

test('verify_ScriptRedOutsideChecklist_StaysRed', () => {
  const ws = flowWorkspace();
  afterRework(ws, ['AC-04'], [{ location: 'AC-04', status: 'changed' }]);
  ws.run('checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04')], findings: [] });
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-09', quote: 'Gegeben G', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.verify('spec-review', ws.doc, ws.workspace, checks), /offen=1/);
  assert.ok(finish(ws).includes('### Skript-Befunde\n- 🔴 AC-09 — 🔴 Anker fehlt'));
});

test('planReview_SpecQuestion_NoHaltCheckedOthersQuestionsOpen', () => {
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const ws = flowWorkspace(plan, 'plan.md');
  ws.context('# Spec\n');
  ws.review('coverage', [finding('Task 1', 'ac-fehlt-im-plan', { quote: 'A.' }), finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  ws.run('round1', 'plan-review', ws.doc, ws.workspace, 'coverage');
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }, { location: 'Task 2', status: 'spec-question' }],
    questions: [question(['Task 2'], 'Spec lässt die Grenze offen?')] });
  assert.match(ws.run('rework-check', 'plan-review', ws.doc, ws.workspace).stdout, /anhalten=nein/);
  assert.equal(ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=1 skript=0 geaendert=0 nachpruefer=ja\n');
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('Task 1')], findings: [] });
  ws.run('verify', 'plan-review', ws.doc, ws.workspace);
  const out = ws.run('finish', 'plan-review', ws.doc, ws.workspace, '--title', 'Plan-Review').stdout;
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('### Offene Fragen\n- F1 · Task 2 — Spec lässt die Grenze offen?'));
});

const anchorAt = (location) => [{ name: 'anker', run: () => [{ location, quote: 'B.', category: 'umsetzer-steckt-fest', consequence: 'Anker fehlt', rationale: 'Skript' }] }];

test('checklist_ReviewerAndScriptAtSameTask_OneRedStelleJudgedByScript', () => {
  const ws = flowWorkspace(TWO_TASKS, 'plan.md');
  ws.review('feasibility', [finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  const round = flow.roundOne('plan-review', ws.doc, ws.workspace, ['feasibility'], anchorAt('Task 2'));
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'changed' }], questions: [] });
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.match(round, /^RUNDE1 rot=1 gelb=0 /);
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
});

test('verify_ScriptNowReportsAiPoint_ScriptDecidesAndStelleCountsOnce', () => {
  const ws = flowWorkspace(TWO_TASKS, 'plan.md');
  ws.review('feasibility', [finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  flow.roundOne('plan-review', ws.doc, ws.workspace, ['feasibility'], []);
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'changed' }], questions: [] });
  ws.run('checklist', 'plan-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('Task 2', 'nicht erledigt')], findings: [] });
  const out = flow.verify('plan-review', ws.doc, ws.workspace, anchorAt('Task 2'));
  assert.match(out, /^NACHPRUEFUNG ok offen=1 /);
  assert.deepEqual(ws.readJson('runde-2/nachpruefung.json').verdicts, [{ key: 'Task 2', script: true, verdict: 'nicht erledigt', rationale: 'Skript-Prüfung meldet die Stelle' }]);
});
