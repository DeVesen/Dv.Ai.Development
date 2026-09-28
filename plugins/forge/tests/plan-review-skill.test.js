'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--rounds N] [--only <reviewer,...>]');
});

test('planReviewSkill_Body_ReadsSharedLoopWithPlaceholders', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md'));
});

test('planReviewSkill_Body_ListsAllAgents', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  assert.ok(body.includes('dv-forge:plan-rework'));
  assert.ok(body.includes('`aktiv` kommt aus `prepare.js`'));
  assert.ok(body.includes('Du startest genau die Reviewer aus `aktiv`'));
});

test('planReviewSkill_Body_NamesClosingScout', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Abschluss-Scout\n`dv-forge:plan-review-scout`/);
});

test('planReviewSkill_Body_CleanReportHandsOverToImplementation', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('/dv-forge:implementation <P>'));
  assert.match(body, /frischen Session/);
  assert.match(body, /Soll ich Spec und Plan jetzt committen\?/);
  assert.ok(body.includes('forge-config.js" get Commit-Konvention'));
});

test('planReviewSkill_Body_InputsFromPrepareScript', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS'));
});

test('planReviewSkill_Body_EscalationReadsRoundFolder', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/scripts/rework-outcome.js" --escalation-status spec-question --dir "<W>/runde-<r>"'));
  assert.ok(!body.includes('DV_FORGE_EOF'));
  assert.ok(!body.includes('file-hash.js'));
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});
