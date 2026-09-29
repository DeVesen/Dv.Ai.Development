'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../scripts/lib/review-rules.js');

const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', category: 'detail', consequence: 'c', rationale: 'r', ...overrides,
});
const unit = (key = 'AC-07', kind = 'item') => ({ key, canon: key.toLowerCase().replace(/-0*/, '-'), kind });
const ctx = (overrides = {}) => ({ advisory: [], openKeys: new Set(), quoteFromW: () => false, verification: null, ...overrides });
const rate = (overrides, context = ctx(), target = unit(), reviewer = 'clarity') => rules.rateFinding(finding(overrides), reviewer, target, context);

test('rateFinding_RedCategories_AreRed', () => {
  for (const category of ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'ac-fehlt-im-plan', 'umsetzer-steckt-fest']) {
    assert.equal(rate({ category }).color, 'red', category);
  }
});

test('rateFinding_DetailAndFormulierung_AreYellowAndGreen', () => {
  assert.equal(rate({ category: 'detail' }).color, 'yellow');
  assert.equal(rate({ category: 'formulierung' }).color, 'green');
});

test('reviewProblem_PlanCategoryOrUnknownInSpecReview_Invalid', () => {
  const review = (category) => ({ reviewer: 'clarity', findings: [finding({ category })] });
  assert.match(rules.reviewProblem(review('ac-fehlt-im-plan'), 'spec-review', 'clarity'), /unbekannte Kategorie: ac-fehlt-im-plan/);
  assert.match(rules.reviewProblem(review('stil'), 'spec-review', 'clarity'), /unbekannte Kategorie: stil/);
  assert.equal(rules.reviewProblem(review('ac-fehlt-im-plan'), 'plan-review', 'clarity'), null);
});

test('reviewProblem_MissingRationaleOrOtherField_Invalid', () => {
  for (const field of ['location', 'quote', 'category', 'consequence', 'rationale']) {
    const broken = finding();
    delete broken[field];
    assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [broken] }, 'spec-review', 'clarity'), new RegExp(`ohne Pflichtfeld ${field}`));
  }
  assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [finding({ rationale: '  ' })] }, 'spec-review', 'clarity'), /Pflichtfeld rationale/);
});

test('reviewProblem_FindingWithColor_Invalid', () => {
  const review = { reviewer: 'clarity', findings: [finding({ severity: 'red' })] };
  assert.match(rules.reviewProblem(review, 'spec-review', 'clarity'), /nennt eine Farbe \(severity\)/);
  assert.match(rules.reviewProblem({ reviewer: 'clarity', findings: [finding({ color: 'red' })] }, 'plan-review', 'clarity'), /Farbe/);
});

test('reviewProblem_WrongNameOrNoFindings_Invalid', () => {
  assert.match(rules.reviewProblem({ reviewer: 'x', findings: [] }, 'spec-review', 'clarity'), /passt nicht/);
  assert.match(rules.reviewProblem({ reviewer: 'clarity' }, 'spec-review', 'clarity'), /findings fehlt/);
  assert.equal(rules.reviewProblem({ reviewer: 'clarity', summary: 's', findings: [] }, 'spec-review', 'clarity'), null);
});

test('rateFinding_AdvisoryReviewerContradiction_CappedYellow', () => {
  const result = rate({ category: 'widerspruch' }, ctx({ advisory: ['profiles'] }), unit(), 'profiles');
  assert.equal(result.color, 'yellow');
  assert.deepEqual(result.capped, ['beratend']);
  assert.equal(rate({ category: 'widerspruch' }, ctx({ advisory: ['profiles'] }), unit(), 'clarity').color, 'red');
});

test('rateFinding_WholeQuoteFromWEntry_CappedYellow', () => {
  const fromW = ctx({ quoteFromW: (quote) => quote === 'Zwei Runden.' });
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'Zwei Runden.' }, fromW).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', quote: 'Höchstens drei. ↔ Zwei Runden.' }, fromW).color, 'red');
});

test('rateFinding_SpellingWordAsWholeWord_CappedYellow', () => {
  assert.equal(rate({ category: 'fehlendes-verhalten', consequence: 'Ein Umlaut fehlt' }).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', rationale: '„ß" statt „ss"' }).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch', location: 'Großschreibung' }).color, 'yellow');
});

test('rateFinding_OtherWordForms_NotCapped', () => {
  assert.equal(rate({ category: 'fehlendes-verhalten', consequence: 'Umlaute fehlen' }).color, 'red');
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'Straße' }).color, 'red');
  assert.equal(rate({ category: 'fehlendes-verhalten', quote: 'umlaut' }).color, 'red');
});

test('rateFinding_HeaderOrOpenQuestion_Dropped', () => {
  assert.equal(rate({}, ctx(), unit('Basis', 'header')).dropped, 'Kopfzeile');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ openKeys: new Set(['ac-7']) })).dropped, 'offene Frage');
});

test('rateFinding_ScriptCheckAtOpenQuestion_StaysRed', () => {
  const result = rules.rateFinding(finding({ category: 'umsetzer-steckt-fest' }), 'skript:anker', unit(), ctx({ openKeys: new Set(['ac-7']) }), true);
  assert.equal(result.dropped, undefined);
  assert.equal(result.color, 'red');
});

test('rateFinding_VerificationOutsideChecklist_CappedUnlessContradictionInChange', () => {
  const verification = { checklist: new Set(['ac-1']), changed: new Set(['ac-7']) };
  assert.equal(rate({ category: 'fehlendes-verhalten' }, ctx({ verification })).color, 'yellow');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ verification })).color, 'red');
  assert.equal(rate({ category: 'widerspruch' }, ctx({ verification: { checklist: new Set(), changed: new Set() } })).color, 'yellow');
  assert.equal(rate({ category: 'fehlendes-verhalten', location: 'AC-01' }, ctx({ verification }), unit('AC-01')).color, 'red');
  assert.equal(rules.rateFinding(finding({ category: 'ac-fehlt-im-plan' }), 'skript:ac-abdeckung', unit(), ctx({ verification: { checklist: new Set(), changed: new Set() } }), true).color, 'red');
});
