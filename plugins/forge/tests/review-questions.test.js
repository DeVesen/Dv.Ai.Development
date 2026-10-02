'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { titleNamesPlace, openQuestions, documentQuestions, nextEntryNumber, bundleShapeProblem, bundleProblem } = require('../scripts/lib/questions');
const { SPEC } = require('./lib/review-flow-fixture');

const QUESTION = '- **R2 · AC-04** — frage an den menschen — Gilt F auch bei leerem D?';

function specWith(...entries) {
  return SPEC.replace('- **W · Deckel**', [...entries, '- **W · Deckel**'].join('\n'));
}

function bundle(overrides = {}) {
  return {
    title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['clarity'],
    options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng.' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem.' }],
    recommendation: 'a', reason: 'Fehler fallen früh auf.', places: ['AC-04'], ...overrides,
  };
}

test('openQuestions_REntryWithoutWEntry_IsOpen', () => {
  // Act
  const open = openQuestions(specWith(QUESTION));

  // Assert
  assert.deepEqual(open, [{ id: 'R2', place: 'AC-04', key: 'ac-4', question: 'Gilt F auch bei leerem D?' }]);
});

test('openQuestions_WEntryNamesPlaceAndREntry_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf „R2 · AC-04“: ja.'));

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

test('openQuestions_WEntryWithTypographicCloseQuote_IsAnswered', () => {
  // Act
  const open = openQuestions(specWith(QUESTION, '- **W · AC-04** · Aussage — Antwort auf „R2 · AC-04“: ja.'));

  // Assert
  assert.deepEqual(open, []);
});

test('openQuestions_WEntryNamesTwoPlaces_AnswersBoth', () => {
  // Arrange
  const text = specWith(QUESTION, '- **R2 · AC-07** — frage an den menschen — Und I?', '- **W · AC-04 und AC-07** · Aussage — Antwort auf „R2 · AC-04“ und „R2 · AC-07“.');

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
  const problem = bundleProblem([bundle(), bundle({ title: 'Andere' })], ['ac-4']);

  // Assert
  assert.equal(problem, 'Stelle doppelt in den Fragen: ac-4');
});

test('bundleShapeProblem_ValidBundle_ReturnsNull', () => {
  assert.equal(bundleShapeProblem(bundle(), 0), null);
});

test('bundleShapeProblem_MissingTextField_NamesIt', () => {
  assert.equal(bundleShapeProblem(bundle({ why: '' }), 0), 'Frage 1: why fehlt');
  assert.equal(bundleShapeProblem(bundle({ title: undefined }), 1), 'Frage 2: title fehlt');
});

test('bundleShapeProblem_ShorthandOrLengthInTextField_NamesFieldAndReason', () => {
  assert.equal(bundleShapeProblem(bundle({ affects: 'Siehe AC-07' }), 0), 'Frage 1: affects: Kürzel AC-07');
  assert.equal(bundleShapeProblem(bundle({ why: 'x'.repeat(401) }), 0), 'Frage 1: why: länger als 400 Zeichen (401)');
});

test('bundleShapeProblem_OldCasesField_AsksForNewRun', () => {
  assert.equal(bundleShapeProblem({ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) x'], recommendation: 'a' }, 0), 'rework.json im alten Format (cases); Lauf neu starten');
});

test('bundleShapeProblem_UnknownOrMissingReviewers_Invalid', () => {
  assert.equal(bundleShapeProblem(bundle({ reviewers: [] }), 0), 'Frage 1: reviewers fehlt');
  assert.equal(bundleShapeProblem(bundle({ reviewers: ['coverage'] }), 0), 'Frage 1: Reviewer unbekannt: coverage');
});

test('bundleShapeProblem_OptionCountOrLabels_Invalid', () => {
  const one = [{ label: 'a', text: 'x.', consequence: 'y.' }];
  const gap = [{ label: 'a', text: 'x.', consequence: 'y.' }, { label: 'c', text: 'x.', consequence: 'y.' }];
  assert.equal(bundleShapeProblem(bundle({ options: one }), 0), 'Frage 1: options braucht 2 bis 4 Einträge');
  assert.equal(bundleShapeProblem(bundle({ options: gap }), 0), 'Frage 1: Labels der options müssen a, b, … lückenlos sein');
});

test('bundleShapeProblem_OptionTextWithShorthand_NamesOption', () => {
  const options = [{ label: 'a', text: 'Task 3 ändern.', consequence: 'y.' }, { label: 'b', text: 'x.', consequence: 'y.' }];
  assert.equal(bundleShapeProblem(bundle({ options }), 0), 'Frage 1: options[0].text: Kürzel Task 3');
});

test('bundleShapeProblem_RecommendationWithoutMatchingOption_Invalid', () => {
  assert.equal(bundleShapeProblem(bundle({ recommendation: 'c' }), 0), 'Frage 1: recommendation passt zu keiner Option');
});
