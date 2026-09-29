'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const flowReport = require('../scripts/lib/flow-report.js');

const item = (overrides = {}) => ({
  reviewer: 'verifier', location: 'AC-12', quote: 'q', category: 'widerspruch', consequence: 'k', rationale: 'r', color: 'red', capped: [], ...overrides,
});
const group = (key, color, items) => ({ key, canon: key.toLowerCase(), color, items: items ?? [item({ color })] });
const open = (key, question = 'Frage?') => ({ key, canon: key.toLowerCase().replace(/-0*/, '-'), question });

test('statusOf_Ranking_FirstMatchWins', () => {
  assert.equal(flowReport.statusOf({ failed: ['verifier'], open: [open('AC-04')], verification: null }), 'unvollständig, ausgefallen: verifier');
  assert.equal(flowReport.statusOf({ failed: [], open: [open('AC-04')], verification: { offen: 1 } }), 'Fragen offen');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: { offen: 2 } }), 'nicht bereit, 2 × 🔴 offen');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: { offen: 0 } }), 'sauber nach Nachprüfung');
  assert.equal(flowReport.statusOf({ failed: [], open: [], verification: null }), 'sauber nach Runde 1');
});

test('statusOf_ReviewerFailed_ListsNames', () => {
  assert.equal(flowReport.statusOf({ failed: ['clarity', 'profiles'], open: [], verification: null }), 'unvollständig, ausgefallen: clarity, profiles');
});

const verification = {
  offen: 3,
  verdicts: [
    { key: 'AC-04', verdict: 'erledigt', rationale: 'passt', script: false },
    { key: 'AC-09', verdict: 'nicht erledigt', rationale: 'fehlt noch', script: false },
    { key: 'AC-11', verdict: 'nicht erledigt', rationale: 'Skript meldet erneut', script: true },
  ],
  groups: [
    group('AC-12', 'red'),
    group('AC-11', 'red', [item({ reviewer: 'skript:anker', category: 'umsetzer-steckt-fest', script: true })]),
    group('AC-05', 'yellow', [item({ color: 'yellow', category: 'detail' })]),
    group('AC-03', 'green', [item({ color: 'green', category: 'formulierung', consequence: 'Wortwahl' })]),
  ],
};

test('report_Verification_ShowsVerdictPerPointContradictionsScriptAndGreen', () => {
  const text = flowReport.report({
    title: 'Spec-Review', artifact: 'docs/spec.md', status: 'nicht bereit, 3 × 🔴 offen', roundOne: { groups: [] }, verification, reworked: true, open: [], asked: [],
  });
  assert.ok(text.startsWith('## Spec-Review: docs/spec.md\n\n**Status:** nicht bereit, 3 × 🔴 offen\n**Runden:** 2 · **Nacharbeiten:** 1\n'));
  assert.ok(text.includes('| AC-04 | erledigt | passt |'));
  assert.ok(text.includes('| AC-09 | nicht erledigt | fehlt noch |'));
  assert.ok(text.includes('| AC-11 | 🔴 Skript-Prüfung | Skript meldet erneut |'));
  assert.ok(text.includes('### Widersprüche\n- 🔴 AC-12 — 🔴 k'));
  assert.ok(text.includes('### Skript-Befunde\n- 🔴 AC-11 — 🔴 k'));
  assert.ok(text.includes('### Anmerkungen (🟢)\n- AC-03 — 🟢 Wortwahl'));
  assert.ok(!text.includes('AC-05 —'), 'Hinweise stehen im Scout-Abschnitt');
});

test('report_OpenQuestions_BundledWithOpenStellenOnly', () => {
  const asked = [{ number: 'F1', question: 'Grenze?', locations: ['AC-04', 'AC-07'] }, { number: 'F2', question: 'Leer?', locations: ['AC-09'] }];
  const text = flowReport.report({
    title: 'Spec-Review', artifact: 's.md', status: 'Fragen offen', roundOne: { groups: [] }, verification: null, reworked: true,
    open: [open('AC-04'), open('AC-07'), open('AC-20', 'Alt?')], asked,
  });
  assert.ok(text.includes('### Offene Fragen\n- F1 · AC-04, AC-07 — Grenze?\n- AC-20 — Alt?'));
  assert.ok(!text.includes('F2'));
});

test('report_RoundOneOnly_OneRoundNoRework', () => {
  const text = flowReport.report({
    title: 'Plan-Review', artifact: 'p.md', status: 'sauber nach Runde 1', roundOne: { groups: [group('Task 1', 'yellow')] }, verification: null, reworked: false, open: [], asked: [],
  });
  assert.ok(text.includes('**Runden:** 1 · **Nacharbeiten:** 0'));
  assert.ok(text.includes('### Runde 1\n| Stufe | Stelle | Anzahl | Reviewer | Konsequenzen |'));
  assert.ok(!text.includes('### Nachprüfung'));
});

test('report_RedStelleWithReviewerAndScriptItems_ListedAsScriptFinding', () => {
  const both = group('Task 2', 'red', [
    item({ reviewer: 'feasibility', category: 'umsetzer-steckt-fest', consequence: 'Vorleistung fehlt' }),
    item({ reviewer: 'skript:anker', category: 'umsetzer-steckt-fest', script: true, consequence: 'Anker fehlt' }),
  ]);
  const text = flowReport.report({
    title: 'Plan-Review', artifact: 'p.md', status: 'nicht bereit, 1 × 🔴 offen', roundOne: { groups: [] },
    verification: { offen: 1, verdicts: [], groups: [both] }, reworked: true, open: [], asked: [],
  });
  assert.ok(text.includes('### Skript-Befunde\n- 🔴 Task 2 — 🔴 Vorleistung fehlt<br>🔴 Anker fehlt'));
  assert.ok(!text.includes('### Widersprüche'));
});
