'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'implementation-review', 'SKILL.md');
const REVIEWERS = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'];

test('implementationReviewSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'implementation-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [--spec <pfad>] [--context <pfad>]... [--base <ref>]');
});

test('implementationReviewSkill_Body_ReadsSharedLoopWithPlaceholders', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md'));
});

test('implementationReviewSkill_Body_StartScriptsInOrder', () => {
  const { body } = readMarkdown(SKILL);
  const order = ['file-hash.js" "<P>"', 'plan-tasks.js" slug "<P>"', 'base-tag.js" resolve <slug>',
    'workspace.js" create review <slug>', 'review-package.js" <B> HEAD "<W>"'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('implementationReviewSkill_Body_NoRoundsFiveReviewersRepoFlag', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:implementation-review-${reviewer}`), `${reviewer} fehlt`);
  assert.ok(body.includes('aktiv = acceptance,plan-fidelity,design,tests,risks'));
  assert.ok(body.includes('`N = 0`'));
  assert.match(body, /## Nacharbeiter\nKeiner\./);
  assert.ok(body.includes('--repo "<R>"'));
  assert.match(body, /ohne `S` entfällt `acceptance`/);
});

test('implementationReviewSkill_Body_ScoutGetsContextOnly', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Abschluss-Scout\n`dv-forge:implementation-review-scout`/);
  const scoutSection = body.slice(body.indexOf('## Abschluss-Scout'), body.indexOf('## Bericht'));
  const reviewerSection = body.slice(body.indexOf('## Reviewer'), body.indexOf('## Nacharbeiter'));
  assert.ok(scoutSection.includes('`Context: <pfad>`'));
  assert.ok(!reviewerSection.includes('Context'));
});

test('implementationReviewSkill_Body_ReportStatusRangeAndCleanup', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`geprüft, k × 🔴 offen`'));
  assert.ok(body.includes('`<B>..HEAD` · acceptance: gelaufen | entfallen (keine Spec)'));
  assert.ok(body.includes('workspace.js" remove review <slug>'));
});

test('implementationReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});
