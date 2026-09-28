'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');

test('flow_Steps_UseReviewFlowScriptInOrder', () => {
  const text = readText(FLOW);
  const order = ['review-flow.js" round1 <art> "<DOK>" "<W>" <aktiv>', 'review-flow.js" scout-check "<W>" 1', 'review-flow.js" rework-check <art> "<DOK>" "<W>"',
    'guard-orchestrator.js" pause <SESSION>', 'review-flow.js" answers-check "<W>"', 'review-flow.js" checklist <art> "<DOK>" "<W>"',
    'review-flow.js" verify <art> "<DOK>" "<W>"', 'review-flow.js" scout-check "<W>" 2', 'review-flow.js" finish <art> "<DOK>" "<W>" --title "<Titel>"',
    'followup.js" save <rolle> <slug> "<W>/bericht"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  let at = -1;
  for (const part of order) {
    const next = text.indexOf(part);
    assert.ok(next > at, `${part} fehlt oder steht an falscher Stelle`);
    at = next;
  }
});

test('flow_Failure_OneRequestOneRestartThenFailedAndReworkBudgetOnce', () => {
  const text = readText(FLOW);
  for (const part of ['genau einmal per `SendMessage`', 'genau einmal als frische Instanz', '--ausgefallen <namen', 'einmal für die ganze Nacharbeit',
    '`nacharbeit`', '`nachprüfer`', '`scout`', 'NACHARBEIT buendelung', 'einmal zur Korrektur', 'Fällt ein Reviewer in Runde 1 aus', 'Fällt die Nacharbeit aus',
    'Scout ausgefallen', 'ohne seine Vorschläge weiter']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('flow_Decisions_ComeOnlyFromScriptOutput', () => {
  const text = readText(FLOW);
  for (const part of ['`NEXT scout=ja`', '`nacharbeit=nein`', '`anhalten=ja`', '`nachpruefer=ja`', '`=== FRAGEN ===`', '`=== BERICHT ===`',
    'Kein Reviewer läuft ein zweites Mal', 'run_in_background: false', 'Du liest die geprüften Dateien nicht']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.ok(!text.includes('rework-outcome.js'));
  assert.ok(!text.includes('aggregate-findings.js'));
  assert.ok(!/Cap erreicht|Stillstand/.test(text));
});
