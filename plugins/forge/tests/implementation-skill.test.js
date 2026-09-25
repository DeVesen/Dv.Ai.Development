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
  for (const part of ['`# Ledger — Plan: <pfad/plan.md>`', 'Urteil: <was> — <warum> — <was es kostet, falls falsch>',
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
  assert.match(text, /Final-Review \| immer `opus`/);
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

test('skill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'implementation');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md>');
});

test('skill_Body_ReadsReferencesViaPluginRoot', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/'));
  for (const name of REFERENCES) assert.ok(body.includes(`\`${name}\``), `${name} fehlt`);
});

test('skill_Body_StartScriptsInOrder', () => {
  const { body } = readMarkdown(SKILL);
  const order = ['plan-tasks.js" slug', 'base-tag.js" ensure', 'workspace.js" create implementation', 'plan-tasks.js" list'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('skill_Body_SixStopReasonsAndWEntryGuard', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Stopp-Gründe\n[\s\S]*6\. eine Prüfung beim Start scheitert/);
  assert.match(body, /einem W-Eintrag in Spec oder Plan widerspräche/);
});

test('skill_Body_BranchRuleAndHandover', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('git switch -c forge/<slug>'));
  assert.ok(body.includes('/dv-forge:implementation-review <P>'));
  assert.ok(body.includes('workspace.js" remove implementation <slug>'));
  assert.match(body, /kein Merge, kein Push/);
  assert.match(body, /\*\*Meine Urteile:\*\*/);
});

test('skill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('implementationTexts_NoTypographicQuotes', () => {
  assert.doesNotMatch(readText(SKILL), TYPOGRAPHIC_QUOTES);
  for (const name of REFERENCES) assert.doesNotMatch(reference(name), TYPOGRAPHIC_QUOTES, name);
});
