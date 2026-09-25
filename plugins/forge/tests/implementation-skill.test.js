'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'implementation');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['ledger.md', 'task-loop.md', 'final-review.md', 'model-selection.md'];
const TYPOGRAPHIC_QUOTES = /[\u201C\u201D\u201E]/;

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('ledger_Lines_IdentityResumeAndAllEntryKinds', () => {
  const text = reference('ledger.md');
  for (const part of [`# Ledger — Plan: <pfad/plan.md>`, 'Urteil: <was> — <warum> — <was es kostet, falls falsch>',
    'Task <n>: zurückgestellt:', 'Task <n>: Fix-Runde <r>/5', 'Task <n>: geparkt —', 'Task <n>: fertig (',
    'Final: sauber | Fix-Welle', 'git log --oneline forge-base/<slug>..HEAD']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /startest ihn nie erneut/);
});

test('modelSelection_Roles_ExplicitModelAndEscalation', () => {
  const text = reference('model-selection.md');
  assert.match(text, /ausdrücklich mit `model`/);
  assert.match(text, /Rundenzahl schlägt Token-Preis/);
  assert.match(text, /Final-Review | immer `opus`/);
  assert.ok(text.includes('`haiku` → `sonnet` → `opus`'));
});

test('taskLoop_Steps_BriefReviewFixLoopBreaker', () => {
  const text = reference('task-loop.md');
  for (const part of ['<PLUGIN>/scripts/plan-tasks.js" brief "<P>" <n> "<W>"', '<PLUGIN>/scripts/review-package.js" <BASE> HEAD "<W>"',
    'dv-forge:implementation-implementer', 'dv-forge:implementation-task-reviewer', 'dv-forge:implementation-re-reviewer',
    '`SendMessage`', 'höchstens 5 Runden', 'Nie `HEAD~1`', '## 5. Breaker nach Runde 5', '`plan-vorgeschrieben`']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /nie mehr als ein Umsetzer gleichzeitig/);
  assert.match(text, /Du behebst nie selbst etwas/);
  assert.match(text, /Du urteilst nur am Cap/);
});

test('finalReview_Wave_OneFixerOneReReview', () => {
  const text = reference('final-review.md');
  for (const part of ['review-package.js" forge-base/<slug> HEAD "<W>"', 'dv-forge:implementation-final-reviewer',
    '`model: opus`', 'plan-tasks.js" header "<P>" "<W>"', '**ein** Fixer', '**Ein** Re-Review']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /Eine zweite Welle gibt es nicht/);
});
