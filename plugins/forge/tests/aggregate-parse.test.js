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
