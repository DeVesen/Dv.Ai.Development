'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { aggregate, summarize, run, render } = require('../scripts/aggregate-findings.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'aggregate-findings.js');
const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', severity: 'yellow', consequence: 'c', rationale: 'r', ...overrides,
});
const review = (reviewer, findings) => ({ reviewer, findings });
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

test('aggregate_SameLocationDifferentSpelling_FormsOneGroup', () => {
  const groups = aggregate([
    review('consistency', [finding({ location: 'AC-07' })]),
    review('clarity', [finding({ location: 'ac-7', severity: 'green' })]),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 2);
});

test('aggregate_MixedSeverities_GroupTakesHighest', () => {
  const [group] = aggregate([
    review('consistency', [finding({ severity: 'green' })]),
    review('consistency', [finding({ severity: 'red' })]),
  ]);
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, false);
});

test('aggregate_YellowFromTwoReviewers_EscalatesToRed', () => {
  const [group] = aggregate([
    review('consistency', [finding()]),
    review('clarity', [finding()]),
  ]);
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, true);
});

test('aggregate_YellowTwiceFromSameReviewer_StaysYellow', () => {
  const [group] = aggregate([review('clarity', [finding(), finding()])]);
  assert.equal(group.severity, 'yellow');
});

test('aggregate_GreenFromTwoReviewers_StaysGreen', () => {
  const [group] = aggregate([
    review('consistency', [finding({ severity: 'green' })]),
    review('clarity', [finding({ severity: 'green' })]),
  ]);
  assert.equal(group.severity, 'green');
});

test('aggregate_SeveralGroups_SortedRedYellowGreen', () => {
  const groups = aggregate([review('clarity', [
    finding({ location: 'AC-01', severity: 'green' }),
    finding({ location: 'AC-02', severity: 'red' }),
    finding({ location: 'AC-03', severity: 'yellow' }),
  ])]);
  assert.deepEqual(groups.map((group) => group.severity), ['red', 'yellow', 'green']);
});

test('summarize_NoRedAllDelivered_IsClean', () => {
  const reviews = [review('clarity', [finding({ severity: 'yellow' })])];
  const status = summarize(aggregate(reviews), reviews, ['clarity']);
  assert.equal(status.clean, true);
  assert.deepEqual(status.counts, { red: 0, yellow: 1, green: 0 });
});

test('summarize_MissingReviewer_IsNotCleanAndListedAsFailed', () => {
  const reviews = [review('clarity', [])];
  const status = summarize(aggregate(reviews), reviews, ['clarity', 'consistency']);
  assert.equal(status.clean, false);
  assert.deepEqual(status.failed, ['consistency']);
});

test('render_Result_StartsWithStatusLineAndHasBothSections', () => {
  const text = block(review('clarity', [finding({ severity: 'red', consequence: 'a | b' })]));
  const output = render(run(text, ['clarity']));
  const lines = output.split('\n');
  assert.equal(lines[0], 'STATUS clean=false red=1 yellow=0 green=0 failed=-');
  assert.match(output, /=== REPORT ===/);
  assert.match(output, /=== REWORK ===/);
  assert.match(output, /a \\\| b/);
});

test('cli_ExpectAndStdin_PrintsStatusLine', () => {
  const input = block(review('clarity', []));
  const result = spawnSync(process.execPath, [SCRIPT, '--expect', 'clarity,profiles'], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.split('\n')[0], 'STATUS clean=false red=0 yellow=0 green=0 failed=profiles');
});
