'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const questions = require('../scripts/lib/flow-questions.js');

const question = (locations, overrides = {}) => ({
  rule: 'Randfall leer', question: 'Was gilt bei leerer Liste?', locations, cases: ['a) Fehler', 'b) leer anzeigen'],
  recommendation: 'b', reason: 'passt zum Bestand', ...overrides,
});
const rework = (results, bundled = []) => ({ results, questions: bundled });

test('reworkProblems_EachRedStelleExactlyOneOutcome_Valid', () => {
  const result = rework([{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', rationale: 'W-Eintrag trägt' }]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04', 'AC-07']), []);
});

test('reworkProblems_MissingDuplicateOrForeignOutcome_Named', () => {
  const result = rework([{ location: 'AC-04', status: 'changed' }, { location: 'ac-4', status: 'changed' }, { location: 'AC-09', status: 'changed' }]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04', 'AC-07']), [
    'AC-04: mehr als ein Ausgang', 'AC-07: kein Ausgang',
    'AC-09: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört',
  ]);
});

test('reworkProblems_UnchangedWithoutRationaleOrWrongQuestionStatus_Invalid', () => {
  assert.match(questions.reworkProblems(rework([{ location: 'AC-04', status: 'unchanged' }]), 'spec-review', ['AC-04'])[0], /ohne rationale/);
  assert.match(questions.reworkProblems(rework([{ location: 'AC-04', status: 'spec-question' }]), 'spec-review', ['AC-04'])[0], /unbekannter status/);
  assert.deepEqual(questions.reworkProblems(rework([{ location: 'Task 2', status: 'spec-question' }], [question(['Task 2'])]), 'plan-review', ['Task 2']), []);
});

test('reworkProblems_QuestionWithoutCasesOrRecommendation_Invalid', () => {
  const result = rework([{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'], { cases: [] })]);
  assert.deepEqual(questions.reworkProblems(result, 'spec-review', ['AC-04']), ['Frage 1 ohne cases']);
  const noAdvice = rework([{ location: 'AC-04', status: 'human-question' }], [question(['AC-04'], { recommendation: '' })]);
  assert.deepEqual(questions.reworkProblems(noAdvice, 'spec-review', ['AC-04']), ['Frage 1 ohne recommendation']);
});

test('bundleProblems_OneOfThreeStellenMissing_Named', () => {
  const result = rework(['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question' })), [question(['AC-01', 'AC-04'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', []), ['AC-07: fehlt in den gebündelten Fragen']);
});

test('bundleProblems_DuplicateAndUnasked_Named', () => {
  const result = rework([{ location: 'AC-01', status: 'human-question' }], [question(['AC-01']), question(['AC-01', 'AC-09'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', []), ['AC-01: steht in mehr als einer gebündelten Frage', 'AC-09: hat keine Frage']);
});

test('bundleProblems_EarlierOpenQuestions_MustBeBundledToo', () => {
  const result = rework([], [question(['AC-02'])]);
  assert.deepEqual(questions.bundleProblems(result, 'spec-review', [{ key: 'AC-02' }, { key: 'AC-05' }]), ['AC-05: fehlt in den gebündelten Fragen']);
});

test('formatQuestions_Numbered_NamesStellenCasesAndRecommendation', () => {
  const text = questions.formatQuestions(questions.numbered([question(['AC-04', 'AC-07'])]));
  assert.ok(text.startsWith('### Fragen an den Menschen\n\n**F1 · Randfall leer** — Was gilt bei leerer Liste?\n'));
  assert.ok(text.includes('- Stellen: AC-04, AC-07\n- Unterfälle: a) Fehler · b) leer anzeigen\n- Empfohlen: b — passt zum Bestand'));
  assert.ok(text.includes('`F2: später` lässt F2 offen.'));
});

test('answersProblems_EachQuestionOnce_Valid', () => {
  const asked = questions.numbered([question(['AC-01']), question(['AC-04'])]);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'answered' }, { question: 'F2', status: 'open' }] }, asked), []);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'answered' }] }, asked), ['F2: kein Eintrag']);
  assert.deepEqual(questions.answersProblems({ answers: [{ question: 'F1', status: 'vielleicht' }, { question: 'F2', status: 'open' }] }, asked),
    ['F1: unbekannter status vielleicht']);
});
