'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const groups = require('../scripts/lib/review-groups.js');

const SPEC = [
  '# Demo', '', 'Basis: 3ce509e', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '', '## Entscheidungen', '- **W · Deckel** · Aussage — Zwei Runden.', '',
].join('\n');

const entry = (reviewer, overrides = {}) => ({
  reviewer,
  finding: { location: 'AC-04', quote: 'Gegeben C', category: 'detail', consequence: 'c', rationale: 'r', ...overrides },
});
const classify = (entries, options = {}) => groups.classify(entries, { kind: 'spec-review', text: SPEC, ...options });

test('classify_TwoYellowFromTwoReviewers_StaysYellow', () => {
  const result = classify([entry('clarity'), entry('consistency')]);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].color, 'yellow');
  assert.deepEqual(groups.reviewersOf(result.groups[0]), ['clarity', 'consistency']);
});

test('classify_RedAndYellowAtSameStelle_GroupIsRed', () => {
  const result = classify([entry('clarity'), entry('consistency', { category: 'widerspruch' })]);
  assert.equal(result.groups[0].color, 'red');
  assert.equal(result.groups[0].items.length, 2);
});

test('classify_SameInputTwice_SameGroupsAndDrops', () => {
  const input = [entry('clarity', { location: 'AC-01', category: 'formulierung' }), entry('consistency', { category: 'widerspruch' }),
    entry('completeness', { location: 'Basis' }), entry('clarity', { location: 'AC-4' })];
  assert.deepEqual(classify(input), classify(input));
  assert.deepEqual(classify(input).groups.map((group) => `${group.color}:${group.key}`), ['red:AC-04', 'green:AC-01']);
});

test('classify_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle', () => {
  const text = ['# Export neu', '', 'Status: bestätigt am 2026-09-28', 'Art: verankert', '', '## Verhalten', 'Der Export läuft.', ''].join('\n');
  const titleFinding = { location: 'Export neu', quote: 'Keine AC-ID in der Spec', category: 'fehlendes-verhalten', consequence: 'c', rationale: 'r' };
  const result = groups.classify([{ reviewer: 'completeness', finding: titleFinding }], { kind: 'spec-review', text });
  assert.deepEqual(result.groups.map((group) => `${group.color}:${group.key}`), ['red:Export neu']);
  assert.deepEqual(result.dropped, []);
});

test('classify_HeaderFinding_DroppedAndNotInReworkSection', () => {
  const result = classify([entry('completeness', { location: 'Basis', category: 'widerspruch' })]);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.dropped, [{ reviewer: 'completeness', key: 'Basis', reason: 'Kopfzeile' }]);
  assert.ok(!groups.reworkSection(result.groups).includes('Basis'));
});

test('classify_RedAtOpenQuestion_Dropped', () => {
  const result = classify([entry('consistency', { category: 'widerspruch' })], { openKeys: new Set(['ac-4']) });
  assert.deepEqual(result.groups, []);
  assert.equal(result.dropped[0].reason, 'offene Frage');
});

test('runScriptChecks_Findings_KeepCategoryAndAreRedScriptItems', () => {
  const checks = [{ name: 'anker', run: (text, context) => [{ location: 'AC-01', quote: 'Gegeben A', category: 'umsetzer-steckt-fest', consequence: context.hint, rationale: 'b' }] }];
  const result = classify(groups.runScriptChecks(SPEC, checks, { hint: 'k' }), { openKeys: new Set(['ac-1']) });
  const item = result.groups[0].items[0];
  assert.deepEqual([result.groups[0].color, item.reviewer, item.category, item.script, item.consequence], ['red', 'skript:anker', 'umsetzer-steckt-fest', true, 'k']);
});

test('classify_ReviewerFindingWithScriptField_StaysReviewerFinding', () => {
  const result = classify([entry('clarity', { script: true })]);
  assert.deepEqual([result.groups[0].color, result.groups[0].items[0].script], ['yellow', false]);
});

test('reworkSection_Groups_HeadingAndItemLineFormat', () => {
  const result = classify([entry('clarity', { category: 'widerspruch', consequence: 'Ein Umlaut fehlt' })]);
  const text = groups.reworkSection(result.groups);
  assert.ok(text.startsWith('=== REWORK ===\n### 🟡 AC-04 (clarity)\n'));
  assert.ok(text.includes('- [clarity · widerspruch] Zitat: „Gegeben C“ · Konsequenz: Ein Umlaut fehlt · Begründung: r · höchstens 🟡: Schreibweise'));
});

test('table_Groups_OneRowPerStelle', () => {
  const result = classify([entry('clarity'), entry('consistency', { category: 'widerspruch', consequence: 'a | b' })]);
  assert.equal(groups.table(result.groups).split('\n')[2], '| 🔴 | AC-04 | 2 | clarity, consistency | 🔴 a \\| b<br>🟡 c |');
});
