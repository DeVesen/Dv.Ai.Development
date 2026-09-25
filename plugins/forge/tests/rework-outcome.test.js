'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const aggregateFindings = require('../scripts/aggregate-findings.js');
const outcome = require('../scripts/rework-outcome.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'rework-outcome.js');
const finding = (location, severity) => ({ location, quote: 'q', severity, consequence: 'c', rationale: 'r' });
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

function aggregateText(findings) {
  const text = block({ reviewer: 'coverage', findings });
  return aggregateFindings.render(aggregateFindings.run(text, ['coverage']));
}

function input(findings, results) {
  return `=== AGGREGATE ===\n${aggregateText(findings)}\n=== REWORK-RESULT ===\nErledigt.\n${block({ results })}\n`;
}

test('evaluate_AllRedAreSpecQuestions_ReturnsTrue', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')],
    [{ location: 'AC-04', status: 'spec-question' }, { location: 'Task 2', status: 'spec-question' }]);
  const result = outcome.evaluate(text, 'spec-question');
  assert.equal(result.allRedEscalated, true);
  assert.deepEqual(result.escalated, ['AC-04', 'Task 2']);
});

test('evaluate_MixedStatuses_ReturnsFalse', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')],
    [{ location: 'AC-04', status: 'spec-question' }, { location: 'Task 2', status: 'changed' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_RedWithoutResultEntry_ReturnsFalse', () => {
  const text = input([finding('AC-04', 'red'), finding('Task 2', 'red')], [{ location: 'AC-04', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_LocationSpelledDifferently_MatchesNormalised', () => {
  const text = input([finding('Task 03', 'red')], [{ location: 'task 3', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, true);
});

test('evaluate_HeadingWithParentheses_IsRecognised', () => {
  const text = input([finding('Kopf (Ziel)', 'red')], [{ location: 'Kopf (Ziel)', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, true);
});

test('evaluate_OtherStatusParameter_IsUsed', () => {
  const text = input([finding('Task 1', 'red')], [{ location: 'Task 1', status: 'plan-question' }]);
  assert.equal(outcome.evaluate(text, 'plan-question').allRedEscalated, true);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_NoRedGroups_ReturnsFalse', () => {
  const text = input([finding('Task 1', 'yellow')], [{ location: 'Task 1', status: 'spec-question' }]);
  assert.equal(outcome.evaluate(text, 'spec-question').allRedEscalated, false);
});

test('evaluate_BareJsonWithoutFence_IsParsed', () => {
  const findings = [finding('AC-04', 'red')];
  const results = [{ location: 'AC-04', status: 'spec-question' }];
  const text = `=== AGGREGATE ===\n${aggregateText(findings)}\n=== REWORK-RESULT ===\n`
    + `Erledigt, hier das Ergebnis ohne Fence:\n${JSON.stringify({ results })}\n`;
  const result = outcome.evaluate(text, 'spec-question');
  assert.equal(result.allRedEscalated, true);
  assert.deepEqual(result.escalated, ['AC-04']);
});

test('evaluate_NoJsonAtAll_Throws', () => {
  const text = `=== AGGREGATE ===\n${aggregateText([finding('Task 1', 'red')])}\n=== REWORK-RESULT ===\nNur Text, kein JSON.\n`;
  assert.throws(() => outcome.evaluate(text, 'spec-question'), /Kein JSON-Block/);
});

test('evaluate_InvalidJson_Throws', () => {
  const text = `=== AGGREGATE ===\n${aggregateText([finding('Task 1', 'red')])}\n=== REWORK-RESULT ===\n\`\`\`json\n{ kaputt\n\`\`\`\n`;
  assert.throws(() => outcome.evaluate(text, 'spec-question'));
});

test('evaluate_ResultsNotAnArray_Throws', () => {
  const text = `=== AGGREGATE ===\n${aggregateText([finding('Task 1', 'red')])}\n=== REWORK-RESULT ===\n${block({ results: 'x' })}\n`;
  assert.throws(() => outcome.evaluate(text, 'spec-question'), /Rückgabe-Format/);
});

test('evaluate_MissingMarkers_Throws', () => {
  assert.throws(() => outcome.evaluate('nur Text', 'spec-question'), /=== AGGREGATE ===/);
});

test('render_Outcome_FirstLineThenEscalatedLines', () => {
  assert.equal(outcome.render({ allRedEscalated: true, escalated: ['AC-04'] }),
    'OUTCOME all-red-escalated=true escalated=1\nESCALATED AC-04');
});

test('parseStatus_MissingOrFlagAsValue_ReturnsEmpty', () => {
  assert.equal(outcome.parseStatus([]), '');
  assert.equal(outcome.parseStatus(['--escalation-status', '--x']), '');
  assert.equal(outcome.parseStatus(['--escalation-status', 'spec-question']), 'spec-question');
});

test('cli_MissingParameter_ExitsWith2', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { input: '', encoding: 'utf8' });
  assert.equal(result.status, 2);
});

test('cli_InvalidInput_ExitsWith1', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--escalation-status', 'spec-question'], { input: 'x', encoding: 'utf8' });
  assert.equal(result.status, 1);
});

test('cli_ValidInput_PrintsOutcome', () => {
  const text = input([finding('AC-04', 'red')], [{ location: 'AC-04', status: 'spec-question' }]);
  const result = spawnSync(process.execPath, [SCRIPT, '--escalation-status', 'spec-question'], { input: text, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'OUTCOME all-red-escalated=true escalated=1\nESCALATED AC-04\n');
});
