'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

test('skill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'spec-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md> [quelle.md] [--only <reviewer,...>]');
});

test('skill_Body_ReadsSharedFlowWithBuildingBlocks', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`', '`<SESSION>` = `${CLAUDE_SESSION_ID}`', '${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md',
    '`<art>` = `spec-review`', '`<DOK>` = `<S>`', 'Titel `Spec-Review`', 'Rolle `spec-review`', '${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" spec-review $ARGUMENTS',
    '## Reviewer', '## Nacharbeiter', '## Nachprüfer', '## Scout', '## Nächster Schritt']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.ok(!body.includes('review-loop/loop.md'));
  assert.ok(!body.includes('rework-outcome.js'));
  assert.ok(!body.includes('--rounds'));
});

test('skill_Body_ListsAllAgents', () => {
  const { body } = readMarkdown(SKILL);
  for (const agent of [...AGENTS, 'dv-forge:spec-rework', 'dv-forge:spec-review-verifier', 'dv-forge:spec-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('`Profil-Index: <PI>`'));
  assert.ok(body.includes('`Profil-Auszug: <PA>`'));
});

test('skill_Body_NextStepPerStatus', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`sauber …`', '`Fragen offen`', '`nicht bereit …`', '`unvollständig …`', '/dv-forge:plan-writing <S>', 'Spec nicht bereit',
    'Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.', '/dv-forge:review-followup <S> <auswahl>', 'der neue Lauf stellt sie wieder',
    '`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('skill_Body_StaysUnder500WordsWithPairedQuotes', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(wordCount(body) < 500);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});
