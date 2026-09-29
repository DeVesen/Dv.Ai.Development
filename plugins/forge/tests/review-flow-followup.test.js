'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SPEC, flowWorkspace } = require('./lib/flow-workspace');

const CHOSEN = [
  '=== REWORK ===',
  '### 🟡 AC-04 (clarity)',
  '- [clarity · detail] Zitat: „Gegeben C“ · Konsequenz: k4 · Begründung: b4',
  '',
  '### 🟡 AC-07 (clarity)',
  '- [clarity · detail] Zitat: „Gegeben E“ · Konsequenz: k7 · Begründung: b7',
  '',
].join('\n');
const verdict = (location, value) => ({ location, verdict: value, rationale: `Urteil ${location}` });

function chosenTwo(results) {
  const ws = flowWorkspace();
  ws.text('dokument-vorher.md', SPEC);
  ws.text('nacharbeit/aggregate.md', CHOSEN);
  ws.json('nacharbeit/rework.json', { results });
  ws.edit((text) => text.replace('Gegeben C, dann D.', 'Gegeben C, dann D und leer.'));
  return ws;
}

const changedBoth = [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }];
const finish = (ws) => ws.run('finish', 'spec-review', ws.doc, ws.workspace, '--title', 'Review-Followup (spec-review)').stdout;

test('followupChecklist_TwoChosenStellen_VerifierJudgesBothAndChangedArea', () => {
  const ws = chosenTwo(changedBoth);
  assert.equal(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE punkte=2 skript=0 geaendert=1 nachpruefer=ja\n');
  const list = ws.read('runde-2/pruefliste.md');
  assert.ok(list.includes('### AC-04\nHerkunft: gewählter Vorschlag') && list.includes('### AC-07') && list.includes('## Geänderte Bereiche\n\n- AC-04'));
});

test('followupVerify_OnePointNotDone_NotReadyOneRed', () => {
  const ws = chosenTwo(changedBoth);
  ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'nicht erledigt')], findings: [] });
  assert.match(ws.run('verify', 'spec-review', ws.doc, ws.workspace).stdout, /offen=1/);
  const out = finish(ws);
  assert.match(out, /^STATUS nicht bereit, 1 × 🔴 offen\n/);
  assert.ok(out.includes('## Review-Followup (spec-review): '));
  assert.ok(out.includes('**Runden:** 1 · **Nacharbeiten:** 1'));
});

test('followupVerify_AllDoneNoContradiction_CleanAfterVerification', () => {
  const ws = chosenTwo(changedBoth);
  ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  assert.match(finish(ws), /^STATUS sauber nach Nachprüfung\n/);
});

test('followupChecklist_QuestionForOneStelle_NotOnChecklistStatusQuestionsOpen', () => {
  const ws = chosenTwo([{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'human-question', rationale: 'Grenze offen?' }]);
  assert.match(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, /^PRUEFLISTE punkte=1/);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt')], findings: [] });
  ws.run('verify', 'spec-review', ws.doc, ws.workspace);
  const out = finish(ws);
  assert.match(out, /^STATUS Fragen offen/);
  assert.ok(out.includes('### Offene Fragen\n- AC-07 — Grenze offen?'));
});

test('followupChecklist_ReworkMissesChosenStelle_Invalid', () => {
  const ws = chosenTwo([{ location: 'AC-04', status: 'changed' }]);
  assert.equal(ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace).stdout, 'PRUEFLISTE ungueltig\nERROR AC-07: kein Ausgang\n');
});
