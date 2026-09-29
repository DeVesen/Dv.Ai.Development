'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { titleNamesPlace, openQuestions, documentQuestions, nextEntryNumber, bundleShapeProblem, bundleProblem, renderQuestions } = require('../scripts/lib/questions');
const { SPEC } = require('./lib/review-flow-fixture');

const QUESTION = '- **R2 · AC-04** — frage an den menschen — Gilt F auch bei leerem D?';

function specWith(...entries) {
  return SPEC.replace('- **W · Deckel**', [...entries, '- **W · Deckel**'].join('\n'));
}

function bundle(overrides = {}) {
  return { rule: 'Leere Eingabe', question: 'Was gilt?', places: ['AC-04'], cases: ['a) leer', 'b) Leerzeichen'], recommendation: 'a', ...overrides };
}

test('openQuestions_REntryWithoutWEntry_IsOpen', () => {
  // Act
  const open = openQuestions(specWith(QUESTION));

  // Assert
  assert.deepEqual(open, [{ id: 'R2', place: 'AC-04', key: 'ac-4', question: 'Gilt F auch bei leerem D?' }]);
});

test('openQuestions_WEntryNamesPlaceAndREntry_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf „R2 · AC-04": ja.'));

  // Assert
  assert.deepEqual(open, []);
});

test('openQuestions_WEntryWithPlaceButWithoutREntry_StaysOpen', () => {
  // Arrange
  const text = specWith('- **R1 · Nachforderung** — frage an den menschen — Was gilt?', '- **W · Nachforderung** · Aussage — Eine Nachforderung.');

  // Act
  const open = openQuestions(text);

  // Assert
  assert.deepEqual(open.map((question) => question.place), ['Nachforderung']);
});

test('openQuestions_WEntryWithAsciiQuotes_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf "R2 · AC-04": ja.'));

  // Assert
  assert.deepEqual(open, []);
});

test('openQuestions_WEntryNamesTwoPlaces_AnswersBoth', () => {
  // Arrange
  const text = specWith(QUESTION, '- **R2 · AC-07** — frage an den menschen — Und I?', '- **W · AC-04 und AC-07** · Aussage — Antwort auf „R2 · AC-04" und „R2 · AC-07".');

  // Act
  const open = openQuestions(text);

  // Assert
  assert.deepEqual(open, []);
});

test('documentQuestions_SpecAndPlanReview_OnlySpecReviewCountsQuestions', () => {
  // Arrange
  const text = specWith(QUESTION);

  // Act
  const counts = [documentQuestions({ review: 'spec-review' }, text).length, documentQuestions({ review: 'plan-review' }, text).length];

  // Assert
  assert.deepEqual(counts, [1, 0]);
});

test('titleNamesPlace_LongerIdOrSuffix_DoesNotMatch', () => {
  // Act
  const matches = [titleNamesPlace('AC-041', 'AC-04'), titleNamesPlace('AC-04-b', 'AC-04'), titleNamesPlace('AC-04, AC-07', 'AC-04')];

  // Assert
  assert.deepEqual(matches, [false, false, true]);
});

test('nextEntryNumber_HighestR2_ReturnsThree', () => {
  // Act
  const next = nextEntryNumber(specWith(QUESTION, '- **R1 · AC-07** — geändert — x'));

  // Assert
  assert.equal(next, 3);
});

test('bundleProblem_OneOfThreePlacesMissing_NamesIt', () => {
  // Act
  const problem = bundleProblem([bundle({ places: ['AC-01', 'AC-04'] })], ['ac-1', 'ac-4', 'ac-7']);

  // Assert
  assert.equal(problem, 'Stelle fehlt in den Fragen: ac-7');
});

test('bundleProblem_PlaceInTwoQuestions_NamesIt', () => {
  // Act
  const problem = bundleProblem([bundle(), bundle({ rule: 'Andere' })], ['ac-4']);

  // Assert
  assert.equal(problem, 'Stelle doppelt in den Fragen: ac-4');
});

test('bundleShapeProblem_NoCases_IsInvalid', () => {
  // Act
  const problem = bundleShapeProblem(bundle({ cases: [] }), 0);

  // Assert
  assert.equal(problem, 'Frage 1: cases fehlt');
});

test('renderQuestions_Bundle_ShowsPlacesCasesAndRecommendation', () => {
  // Act
  const text = renderQuestions([bundle({ places: ['AC-04', 'AC-07'] })]);

  // Assert
  assert.equal(text, [
    '### Fragen an den Menschen', '',
    '**Frage 1 — Leere Eingabe**', 'Was gilt?', 'Stellen: AC-04, AC-07', 'Unterfälle: a) leer b) Leerzeichen', 'Empfehlung: a',
  ].join('\n'));
});
