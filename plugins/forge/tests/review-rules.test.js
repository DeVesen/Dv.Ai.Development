'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findingProblem, resultProblem, rateFinding } = require('../scripts/lib/rules');
const { finding } = require('./lib/review-flow-fixture');

const PLACE = { key: 'ac-1', label: 'AC-01' };
const W_ENTRY = '- **W · Deckel** · Aussage — Zwei Runden, keine dritte.';

function context(overrides = {}) {
  return {
    review: 'spec-review', reviewer: 'clarity', advisory: new Set(), wEntries: [W_ENTRY], openKeys: new Set(),
    phase: 'suche', checklistKeys: new Set(), changedKeys: new Set(), ...overrides,
  };
}

function colorOf(overrides, contextOverrides = {}, place = PLACE) {
  return rateFinding(finding(overrides), place, context(contextOverrides)).color;
}

for (const category of ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar']) {
  test(`rateFinding_SpecCategory${category}_IsRed`, () => {
    // Act
    const color = colorOf({ category });

    // Assert
    assert.equal(color, 'red');
  });
}

for (const category of ['ac-fehlt-im-plan', 'umsetzer-steckt-fest']) {
  test(`rateFinding_PlanCategory${category}_IsRed`, () => {
    // Act
    const color = colorOf({ category, location: 'Task 1' }, { review: 'plan-review' });

    // Assert
    assert.equal(color, 'red');
  });
}

test('rateFinding_DetailAndFormulierung_AreYellowAndGreen', () => {
  // Act
  const colors = [colorOf({ category: 'detail' }), colorOf({ category: 'formulierung' })];

  // Assert
  assert.deepEqual(colors, ['yellow', 'green']);
});

test('findingProblem_PlanCategoryInSpecReview_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ category: 'ac-fehlt-im-plan' }), 'spec-review');

  // Assert
  assert.equal(problem, 'Kategorie unbekannt: ac-fehlt-im-plan (AC-01)');
});

test('findingProblem_UnknownCategory_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ category: 'stil' }), 'plan-review');

  // Assert
  assert.equal(problem, 'Kategorie unbekannt: stil (AC-01)');
});

test('findingProblem_MissingRationale_IsInvalid', () => {
  // Arrange
  const { rationale, ...withoutRationale } = finding();

  // Act
  const problem = findingProblem(withoutRationale, 'spec-review');

  // Assert
  assert.equal(problem, 'Pflichtfeld fehlt: rationale (AC-01)');
});

test('findingProblem_ColorInFinding_IsInvalid', () => {
  // Act
  const problem = findingProblem(finding({ severity: 'red' }), 'spec-review');

  // Assert
  assert.equal(problem, 'Farbe im Finding: AC-01');
});

test('resultProblem_ReviewerNameDiffers_IsInvalid', () => {
  // Act
  const problem = resultProblem({ reviewer: 'spec-review-clarity', findings: [] }, 'spec-review', 'clarity');

  // Assert
  assert.equal(problem, 'reviewer passt nicht zum Dateinamen: spec-review-clarity');
});

test('rateFinding_AdvisoryReviewerContradiction_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'widerspruch' }, { advisory: new Set(['clarity']) });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_WholeQuoteFromWEntry_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten', quote: 'Zwei Runden, keine dritte.' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_QuoteSetsSpecSentenceAgainstWEntry_StaysRed', () => {
  // Act
  const color = colorOf({ category: 'widerspruch', quote: 'Höchstens drei Runden. ↔ Zwei Runden, keine dritte.' });

  // Assert
  assert.equal(color, 'red');
});

test('rateFinding_WordUmlautInText_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten', rationale: 'Der Umlaut fehlt.' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_SharpSInQuotes_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'widerspruch', consequence: '„ß“ statt „ss“' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_WordsUmlauteAndStrasse_StayRed', () => {
  // Act
  const colors = [
    colorOf({ category: 'fehlendes-verhalten', rationale: 'Umlaute im Namen' }),
    colorOf({ category: 'widerspruch', quote: 'Straße' }),
  ];

  // Assert
  assert.deepEqual(colors, ['red', 'red']);
});

test('rateFinding_HeaderBasis_IsDropped', () => {
  // Act
  const rating = rateFinding(finding({ location: 'Basis', category: 'widerspruch' }), PLACE, context());

  // Assert
  assert.deepEqual(rating, { color: null, dropped: 'Kopfzeile' });
});

test('rateFinding_PlaceWithOpenQuestion_IsDropped', () => {
  // Act
  const rating = rateFinding(finding({ category: 'widerspruch' }), PLACE, context({ openKeys: new Set(['ac-1']) }));

  // Assert
  assert.deepEqual(rating, { color: null, dropped: 'offene Frage' });
});

test('rateFinding_VerificationOutsideChecklist_IsCappedAtYellow', () => {
  // Act
  const color = colorOf({ category: 'fehlendes-verhalten' }, { phase: 'nachpruefung' });

  // Assert
  assert.equal(color, 'yellow');
});

test('rateFinding_VerificationContradictionInChangedArea_StaysRed', () => {
  // Act
  const color = colorOf({ category: 'widerspruch' }, { phase: 'nachpruefung', changedKeys: new Set(['ac-1']) });

  // Assert
  assert.equal(color, 'red');
});

test('rateFinding_SameInputTwice_SameRating', () => {
  // Arrange
  const input = finding({ category: 'widerspruch', rationale: 'Umlaut' });

  // Act
  const ratings = [rateFinding(input, PLACE, context()), rateFinding(input, PLACE, context())];

  // Assert
  assert.deepEqual(ratings[0], ratings[1]);
});
