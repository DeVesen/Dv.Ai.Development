'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { finding, setup, writeJsonFile, flow, readJsonFile, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

function prepareRework(env, review = 'spec-review', findings = [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]) {
  runUntilRework(env, findings, review);
}

function writeRework(env, value, source = 'runde-1') {
  writeJsonFile(path.join(env.workspace, source, 'rework.json'), value);
}

function checkRework(env, review = 'spec-review', source = 'runde-1') {
  return flow('rework-check', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--quelle', source).stdout;
}

function bundle(places) {
  return { rule: 'Regel', question: 'Was gilt?', places, cases: ['a) x', 'b) y'], recommendation: 'a' };
}

test('reworkCheck_EveryRedPlaceOneOutcome_Ok', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_RedPlaceWithoutOutcome_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Ausgang fehlt: ac-7\n');
});

test('reworkCheck_UnchangedWithoutReason_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: reason fehlt (AC-07)\n');
});

test('reworkCheck_QuestionsBundled_PausesAndWritesQuestions', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?', '- **R1 · AC-07** — frage an den menschen — Gilt I?');
  writeRework(env, {
    results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }, { location: 'AC-07', status: 'human-question', reason: 'neue Regel' }],
    questions: [bundle(['AC-04', 'AC-07'])],
  });

  // Act
  const output = checkRework(env);

  // Assert
  assert.match(output, /^NACHARBEIT ok fragen=2 anhalten=ja\n=== FRAGEN ===\n### Fragen an den Menschen\n\n\*\*Frage 1 — Regel\*\*\nWas gilt\?\nStellen: AC-04, AC-07\nUnterfälle: a\) x b\) y\nEmpfehlung: a\n$/);
});

test('reworkCheck_OneOfThreeQuestionPlacesMissing_BundlingFaulty', () => {
  // Arrange
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04'])] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'BUENDELUNG fehlerhaft: Stelle fehlt in den Fragen: ac-7\n');
});

test('reworkCheck_QuestionWithoutREntry_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'human-question', reason: 'neu' }, { location: 'AC-07', status: 'changed' }], questions: [] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: R-Eintrag fehlt: AC-04\n');
});

test('reworkCheck_PlanSpecQuestion_CountsWithoutPause', () => {
  // Arrange
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Spec legt X nicht fest' }] });

  // Act
  const output = checkRework(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=1 anhalten=nein\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'fragen.json')), [{ place: 'Task 1', key: 'task 1', question: 'Spec legt X nicht fest' }]);
});

test('reworkCheck_FollowupSource_ExpectsChosenGroups', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeRework(env, { results: [{ location: 'AC-07', status: 'changed' }] }, 'nacharbeit');

  // Act
  const output = checkRework(env, 'spec-review', 'nacharbeit');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

function answersSetup() {
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04', 'AC-07'])] });
  checkRework(env);
  return env;
}

test('answersCheck_OneAnsweredOneUnclearOneLater_OneAnsweredTwoOpen', () => {
  // Arrange
  const env = answersSetup();
  addEntries(env, '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: F gilt immer.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ok beantwortet=1 offen=2\n');
});

test('answersCheck_AnsweredWithoutWEntry_Invalid', () => {
  // Arrange
  const env = answersSetup();
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ungültig: Antwort passt nicht zum Dokument: AC-04\n');
});
