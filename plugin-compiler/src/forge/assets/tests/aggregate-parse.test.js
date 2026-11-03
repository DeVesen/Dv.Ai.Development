'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLocation, extractReviews } = require('../scripts/aggregate-findings.js');

const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', severity: 'red', consequence: 'c', rationale: 'r', ...overrides,
});
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

test('normalizeLocation_AcIdWithAndWithoutLeadingZero_AreEqual', () => {
  assert.equal(normalizeLocation(' AC-07 '), normalizeLocation('ac-7'));
});

test('normalizeLocation_Heading_CollapsesWhitespaceAndCase', () => {
  assert.equal(normalizeLocation('  Rand   Fälle '), 'rand fälle');
});

test('extractReviews_ValidBlockAmongProse_ReturnsReview', () => {
  const text = `Ich habe geprüft.\n${block({ reviewer: 'clarity', findings: [finding()] })}\n`;
  const { reviews, errors } = extractReviews(text);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].reviewer, 'clarity');
  assert.deepEqual(errors, []);
});

test('extractReviews_EmptyFindings_IsValid', () => {
  const { reviews } = extractReviews(block({ reviewer: 'clarity', findings: [] }));
  assert.equal(reviews.length, 1);
});

test('extractReviews_BrokenJson_ReportsErrorAndNoReview', () => {
  const { reviews, errors } = extractReviews('```json\n{ "reviewer": \n```');
  assert.equal(reviews.length, 0);
  assert.equal(errors.length, 1);
});

test('extractReviews_UnknownSeverity_ReportsError', () => {
  const { reviews, errors } = extractReviews(block({ reviewer: 'clarity', findings: [finding({ severity: 'high' })] }));
  assert.equal(reviews.length, 0);
  assert.match(errors[0], /clarity/);
});

test('extractReviews_SameReviewerTwice_LastValidBlockWins', () => {
  const first = block({ reviewer: 'clarity', findings: [finding()] });
  const second = block({ reviewer: 'clarity', findings: [] });
  const { reviews } = extractReviews(`${first}\n${second}`);
  assert.equal(reviews.length, 1);
  assert.deepEqual(reviews[0].findings, []);
});

test('extractReviews_CrlfLineEndings_AreParsed', () => {
  const text = '```json\r\n' + JSON.stringify({ reviewer: 'clarity', findings: [] }) + '\r\n```';
  assert.equal(extractReviews(text).reviews.length, 1);
});

const { LOCATION_TYPES } = require('../scripts/aggregate-findings.js');

test('normalizeLocation_TaskSpellings_AreEqual', () => {
  assert.equal(normalizeLocation('Task 03'), 'task 3');
  assert.equal(normalizeLocation('task 3'), 'task 3');
  assert.equal(normalizeLocation(' TASK   3 '), 'task 3');
});

test('normalizeLocation_GlobalConstraints_FallsBackToHeadingRule', () => {
  assert.equal(normalizeLocation('Global  Constraints'), 'global constraints');
});

test('normalizeLocation_TaskWithStep_IsNotATaskLocation', () => {
  assert.equal(normalizeLocation('Task 3, Schritt 2'), 'task 3, schritt 2');
});

test('locationTypes_Table_HasAcAndTaskRows', () => {
  assert.deepEqual(LOCATION_TYPES.map((type) => type.name), ['ac', 'task']);
});

test('normalizeLocation_ExtraTypeRow_WorksWithoutTouchingOthers', () => {
  const types = [...LOCATION_TYPES, { name: 'x', pattern: /^x-0*(\d+)$/, normalize: (match) => `x-${match[1]}` }];
  assert.equal(normalizeLocation('X-05', types), 'x-5');
  assert.equal(normalizeLocation('AC-07', types), 'ac-7');
  assert.equal(normalizeLocation('Task 03', types), 'task 3');
});
