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

test('skill_Body_GermanQuotesArePaired', () => {
  const { body } = readSkill();
  const opening = (body.match(/„/g) || []).length;
  const closing = (body.match(/“/g) || []).length;
  assert.equal(opening, closing);
});
