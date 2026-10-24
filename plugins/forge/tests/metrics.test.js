'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { appendMetric, metricsFile, flowReviewRecord, colorCounts } = require('../scripts/lib/metrics');
const { makeRepo } = require('./lib/git-repo');

test('appendMetric_GitRepo_AppendsJsonLinesUnderGitCommonDir', () => {
  const repo = makeRepo();
  appendMetric(repo, 'reviews', { review: 'spec-review' }, new Date('2026-10-24T00:00:00Z'));
  appendMetric(repo, 'reviews', { review: 'plan-review' });
  const lines = fs.readFileSync(metricsFile(repo, 'reviews'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines[0], { format: 1, zeit: '2026-10-24T00:00:00.000Z', review: 'spec-review' });
  assert.match(metricsFile(repo, 'reviews').replace(/\\/g, '/'), /\.git\/dv-forge\/metrics\/reviews\.jsonl$/);
});

test('appendMetric_NoRepo_ReturnsNullWithoutThrowing', () => {
  assert.equal(appendMetric(require('node:os').tmpdir(), 'reviews', {}), null);
});

test('flowReviewRecord_CountsColorsDroppedAndEvidence', () => {
  const record = flowReviewRecord({ review: 'spec-review', doc: '/x/spec.md', source: 'runde-1', workspace: '/nirgends' }, {
    one: { groups: [{ color: 'red' }, { color: 'yellow' }, { color: 'yellow' }], dropped: [{}], belege: { a: { belegt: 2 } } },
    two: { groups: [], openRed: 0 }, reworked: true, questions: [], failed: [],
  }, 'sauber nach Nachprüfung');
  assert.deepEqual(record.runde1, { red: 1, yellow: 2, green: 0 });
  assert.equal(record.verworfen, 1);
  assert.deepEqual(record.runde2, { red: 0, yellow: 0, green: 0, offenRot: 0 });
  assert.deepEqual(record.belege.runde1, { a: { belegt: 2 } });
});

test('colorCounts_SeverityField', () => {
  assert.deepEqual(colorCounts([{ severity: 'red' }, { severity: 'green' }], 'severity'), { red: 1, yellow: 0, green: 1 });
});
