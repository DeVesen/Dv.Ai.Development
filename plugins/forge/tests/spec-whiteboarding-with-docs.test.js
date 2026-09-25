'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'spec-whiteboarding-with-docs');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');

test('withDocs_Frontmatter_ManualOnly', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description', 'disable-model-invocation']);
  assert.equal(fields.name, 'spec-whiteboarding-with-docs');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
});

test('withDocs_Body_LoadsBothSkillsViaSkillTool', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`dv-forge:spec-whiteboarding`'));
  assert.ok(body.includes('`dv-forge:domain-modeling`'));
  assert.match(body, /Skill-Tool/);
});

test('withDocs_Body_DefinesFourPrecedenceRules', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /trotz Sperre erlaubt/);
  assert.match(body, /nur für brainstorming, Plan und Code/);
  assert.match(body, /ausschließlich die kanonischen Begriffe/);
  assert.match(body, /tragen den Tag `Historie`/);
  assert.match(body, /ersetzt keine Runde/);
  assert.match(body, /Frontier aufgenommen/);
});

test('withDocs_Body_StaysThin', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 200);
  assert.ok(!fs.existsSync(path.join(SKILL_DIR, 'references')));
});
