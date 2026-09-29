'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const DIR = path.join(__dirname, '..', 'skills', 'review-followup');
const SKILL = path.join(DIR, 'SKILL.md');
const FLOW = path.join(DIR, 'references', 'flow.md');

test('reviewFollowupSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'review-followup');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <auswahl>');
});

test('reviewFollowupSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS', 'references/flow.md',
    '${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md', '`original`', '`offen`', 'dv-forge:implementation-implementer', 'dv-forge:implementation-re-reviewer',
    'genau eine Runde', 'scripts/workspace.js" remove <rolle> <slug>', 'scripts/guard-orchestrator.js" release', 'run_in_background: false']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
  assert.ok(fs.existsSync(FLOW));
  const text = readText(FLOW);
  for (const part of ['Vorschläge: <F>', 'Ergebnis: <W>/nacharbeit/rework.json', 'review-flow.js" followup-checklist <original> "<DOK>" "<W>"',
    'review-flow.js" verify <original> "<DOK>" "<W>"', 'review-flow.js" finish <original> "<DOK>" "<W>" --title "Review-Followup (<original>)"',
    'Prüfliste: <W>/runde-2/pruefliste.md', 'Nachprüfer des Original-Skills', 'Kein Reviewer läuft',
    'followup.js" save <rolle> <slug> "<W>/bericht"', 'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"',
    'followup.js" drop review <slug>', 'Kein Scout', 'plan-tasks.js" anchors "<P>" "<R>" "<W>"', 'nicht gewählt', 'bleibt die alte Sicherung', '### Umgesetzt', 'WAHL', 'keine Änderung', 'blockiert']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.ok(!text.includes('--expect <aktiv> --round 1'));
  assert.ok(!text.includes('--dir "<W>/nacharbeit"'));
});
