'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flow = require('../scripts/review-flow.js');
const { SPEC, finding, scoutFor, flowWorkspace } = require('./lib/flow-workspace');
const { TWO_TASKS } = require('./lib/plan-fixtures');

const OPEN_AC04 = SPEC.replace('- **W · Deckel** · Aussage — Zwei Runden.',
  '- **W · Deckel** · Aussage — Zwei Runden.\n- **R1 · AC-04** — frage an den menschen — Gilt D auch leer?');
const question = (locations) => ({ rule: 'Leere Eingabe', question: 'Was gilt leer?', locations, cases: ['a) Fehler', 'b) leer'], recommendation: 'b', reason: 'Bestand' });

test('round1_NoRedNoQuestionTwoHints_ScoutOnlyThenCleanAfterRoundOne', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'detail'), finding('AC-07', 'detail')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, 'RUNDE1 rot=0 gelb=2 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=nein\n');
  ws.text('runde-1/scout.md', scoutFor([['🟡', 'AC-01'], ['🟡', 'AC-07']]));
  assert.equal(ws.run('scout-check', ws.workspace, '1').stdout, 'SCOUT ok\n');
  const finish = ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Spec-Review');
  assert.match(finish.stdout, /^STATUS sauber nach Runde 1\n/);
  assert.match(ws.read('bericht/scout.md'), /### 🟡 AC-01\n1\. Vorschlag A[\s\S]*### 🟡 AC-07/);
});

test('round1_RedAndYellow_ScoutSeesBothReworkOnlyRedWithProposals', () => {
  const ws = flowWorkspace();
  ws.review('consistency', [finding('AC-04', 'widerspruch'), finding('AC-07', 'detail')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  assert.match(out.stdout, /NEXT scout=ja nacharbeit=ja/);
  const input = ws.read('runde-1/scout-input.md');
  assert.ok(input.includes('### 🔴 AC-04 (consistency)') && input.includes('### 🟡 AC-07 (consistency)'));
  ws.text('runde-1/scout.md', scoutFor([['🔴', 'AC-04'], ['🟡', 'AC-07']]));
  assert.equal(ws.run('scout-check', ws.workspace, '1').stdout, 'SCOUT ok\n');
  const rework = ws.read('runde-1/nacharbeit.md');
  assert.ok(rework.includes('### 🔴 AC-04 (consistency)\n- [consistency · widerspruch]'));
  assert.ok(rework.includes('Scout-Vorschläge:\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher'));
  assert.ok(!rework.includes('AC-07'));
});

test('round1_InvalidReviewer_ListedAsFailedWithReason', () => {
  const ws = flowWorkspace();
  ws.review('clarity', [finding('AC-01', 'detail', { severity: 'yellow' })]);
  ws.review('completeness', [finding('AC-01', 'ac-fehlt-im-plan')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity,completeness,consistency');
  assert.match(out.stdout, /ausgefallen=clarity,completeness,consistency/);
  assert.match(out.stdout, /ERROR clarity: Finding an AC-01 nennt eine Farbe \(severity\)/);
  assert.match(out.stdout, /ERROR completeness: Finding an AC-01 hat eine unbekannte Kategorie: ac-fehlt-im-plan/);
  assert.match(out.stdout, /ERROR consistency: Datei fehlt: consistency\.json/);
});

test('round1_OpenQuestionAtRedStelle_FindingDroppedQuestionAskedAgain', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('consistency', [finding('AC-04', 'widerspruch')]);
  const out = ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  assert.equal(out.stdout, 'RUNDE1 rot=0 gelb=0 gruen=0 fragen=1 ausgefallen=-\nNEXT scout=nein nacharbeit=ja\n');
  assert.ok(!ws.read('runde-1/aggregate.md').includes('AC-04'));
  assert.ok(ws.read('runde-1/nacharbeit.md').includes('## Offene Fragen aus früheren Läufen\n\n- AC-04 — Gilt D auch leer?'));
});

test('round1_OpenQuestionAndOneHint_ScoutOnlyForTheHint', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('clarity', [finding('AC-09', 'detail')]);
  assert.match(ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity').stdout, /NEXT scout=ja nacharbeit=ja/);
  assert.equal(ws.read('runde-1/scout-input.md'), '=== REWORK ===\n### 🟡 AC-09 (clarity)\n- [clarity · detail] Zitat: „Gegeben“ · Konsequenz: Konsequenz AC-09 · Begründung: weil\n');
});

test('roundOne_ScriptCheckFinding_IsRedAndCountsForRework', () => {
  const ws = flowWorkspace();
  ws.review('clarity', []);
  const checks = [{ name: 'anker', run: () => [{ location: 'AC-12', quote: 'Gegeben I', consequence: 'Anker fehlt', rationale: 'Skript' }] }];
  assert.match(flow.roundOne('spec-review', ws.doc, ws.workspace, ['clarity'], checks), /rot=1[\s\S]*nacharbeit=ja/);
});

test('scoutCheck_ProposalCountOrPreferredWrong_Invalid', () => {
  const input = '=== REWORK ===\n### 🔴 AC-04 (x)\n- [x · widerspruch] a\n';
  assert.deepEqual(flow.scoutProblems(input, scoutFor([['🔴', 'AC-04']])), []);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n3. c\n4. d\n**Bevorzugt: 1** — x\n'), ['🔴 AC-04: 4 Vorschläge statt 1 bis 3']);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n'), ['🔴 AC-04: kein gültiger bevorzugter Vorschlag']);
  assert.deepEqual(flow.scoutProblems(input, '## Scout-Vorschläge\n'), ['🔴 AC-04: keine Scout-Gruppen']);
});

function reworkReady(ws, results, bundled = []) {
  ws.review('consistency', [finding('AC-04', 'widerspruch'), finding('AC-07', 'widerspruch'), finding('AC-09', 'widerspruch'), finding('AC-01', 'detail')]);
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
  ws.json('runde-1/rework.json', { results, questions: bundled });
}

test('reworkCheck_EachRedOneOutcomeNoQuestion_OkWithoutHalt', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'changed' })));
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_OutcomeForHint_Invalid', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09', 'AC-01'].map((location) => ({ location, status: 'changed' })));
  const out = ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^NACHARBEIT ungueltig\nERROR AC-01: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört/);
});

test('reworkCheck_ThreeQuestionsOneMissingInBundles_BundlingError', () => {
  const ws = flowWorkspace();
  reworkReady(ws, ['AC-04', 'AC-07', 'AC-09'].map((location) => ({ location, status: 'human-question' })), [question(['AC-04', 'AC-07'])]);
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT buendelung\nERROR AC-09: fehlt in den gebündelten Fragen\n');
});

test('reworkCheck_SpecQuestions_HaltAndShowBundledQuestions', () => {
  const ws = flowWorkspace();
  reworkReady(ws, [{ location: 'AC-04', status: 'human-question' }, { location: 'AC-07', status: 'human-question' }, { location: 'AC-09', status: 'changed' }],
    [question(['AC-04', 'AC-07'])]);
  const out = ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout;
  assert.ok(out.startsWith('NACHARBEIT ok fragen=1 anhalten=ja\n=== FRAGEN ===\n### Fragen an den Menschen\n\n**F1 · Leere Eingabe** — Was gilt leer?\n- Stellen: AC-04, AC-07\n'));
  assert.deepEqual(ws.readJson('runde-1/fragen.json').map((entry) => entry.number), ['F1']);
});

test('reworkCheck_PlanSpecQuestion_NoHalt', () => {
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const ws = flowWorkspace(plan, 'plan.md');
  ws.context('# Spec\n');
  ws.review('coverage', [finding('Task 2', 'ac-fehlt-im-plan', { quote: 'B.' })]);
  ws.run('round1', 'plan-review', ws.doc, ws.workspace, 'coverage');
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'spec-question' }], questions: [question(['Task 2'])] });
  assert.equal(ws.run('rework-check', 'plan-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT ok fragen=1 anhalten=nein\n');
});

test('reworkCheck_EarlierOpenQuestionWithoutRed_MustBeBundled', () => {
  const ws = flowWorkspace(OPEN_AC04);
  ws.review('clarity', []);
  ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'clarity');
  ws.json('runde-1/rework.json', { results: [], questions: [] });
  assert.equal(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, 'NACHARBEIT buendelung\nERROR AC-04: fehlt in den gebündelten Fragen\n');
  ws.json('runde-1/rework.json', { results: [], questions: [question(['AC-04'])] });
  assert.match(ws.run('rework-check', 'spec-review', ws.doc, ws.workspace).stdout, /^NACHARBEIT ok fragen=1 anhalten=ja/);
});

test('answersCheck_EachQuestionOnce_Ok', () => {
  const ws = flowWorkspace();
  ws.json('runde-1/fragen.json', [{ number: 'F1', ...question(['AC-04']) }, { number: 'F2', ...question(['AC-07']) }]);
  ws.json('runde-1/antworten.json', { answers: [{ question: 'F1', status: 'answered' }, { question: 'F2', status: 'open' }] });
  assert.equal(ws.run('answers-check', ws.workspace).stdout, 'ANTWORTEN ok\n');
  ws.json('runde-1/antworten.json', { answers: [{ question: 'F1', status: 'answered' }] });
  assert.equal(ws.run('answers-check', ws.workspace).stdout, 'ANTWORTEN ungueltig\nERROR F2: kein Eintrag\n');
});

test('cli_UnknownKindOrCommand_ExitsTwo', () => {
  const ws = flowWorkspace();
  assert.equal(ws.run('round1', 'implementation-review', ws.doc, ws.workspace, 'x').status, 2);
  assert.equal(ws.run('weiter', ws.workspace).status, 2);
  assert.equal(ws.run('scout-check', ws.workspace, '3').status, 2);
});

test('roundOne_PlanAdvisoryReviewersWithRedCategories_AtMostYellow', () => {
  const ws = flowWorkspace(TWO_TASKS, 'plan.md');
  ws.context('# Spec\n');
  ws.review('architecture', [finding('Task 1', 'umsetzer-steckt-fest', { quote: 'A.' })]);
  ws.review('risks', [finding('Task 2', 'widerspruch', { quote: 'B.' })]);
  const out = flow.roundOne('plan-review', ws.doc, ws.workspace, ['architecture', 'risks'], []);
  assert.equal(out, 'RUNDE1 rot=0 gelb=2 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=nein');
  assert.deepEqual(ws.readJson('runde-1/runde.json').groups.map((group) => group.items[0].capped), [['beratend'], ['beratend']]);
});
