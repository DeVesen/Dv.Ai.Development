'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

function readSkill() {
  const text = fs.readFileSync(SKILL, 'utf8');
  const [, frontmatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  return { frontmatter, body };
}

test('skill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { frontmatter } = readSkill();
  assert.match(frontmatter, /^name: spec-review$/m);
  assert.match(frontmatter, /^description: Use when/m);
  assert.match(frontmatter, /^disable-model-invocation: true$/m);
  assert.match(frontmatter, /^argument-hint: /m);
});

test('skill_Body_DispatchesAllAgentsInForeground', () => {
  const { body } = readSkill();
  for (const agent of [...AGENTS, 'dv-forge:spec-rework']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('run_in_background: false'));
});

test('skill_Body_UsesScriptsViaPluginRoot', () => {
  const { body } = readSkill();
  for (const script of ['file-hash.js', 'aggregate-findings.js', 'guard-orchestrator.js']) {
    assert.ok(body.includes(`\${CLAUDE_PLUGIN_ROOT}/scripts/${script}`), `${script} fehlt`);
  }
});

test('skill_Body_StaysUnder500Words', () => {
  const { body } = readSkill();
  assert.ok(body.split(/\s+/).filter(Boolean).length < 500);
});

test('skill_Body_TellsToKeepJsonFence', () => {
  const { body } = readSkill();
  assert.ok(body.includes('inklusive seiner ```json-Zeile'));
});

test('skill_Body_GermanQuotesArePaired', () => {
  const { body } = readSkill();
  const opening = (body.match(/„/g) || []).length;
  const closing = (body.match(/“/g) || []).length;
  assert.equal(opening, closing);
});

test('skill_Body_RunsScoutAfterLastReview', () => {
  const { body } = readSkill();
  assert.ok(body.includes('dv-forge:spec-review-scout'));
  assert.ok(body.includes('## Scout-Vorschläge'));
  assert.ok(body.includes('Scout ausgefallen'));
});

test('reportFormat_HasScoutSection', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'skills', 'spec-review', 'references', 'report-format.md'), 'utf8');
  assert.ok(text.includes('### Scout-Vorschläge'));
  assert.ok(text.includes('Scout ausgefallen'));
});
