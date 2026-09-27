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

test('withDocs_Body_DefinesPrecedenceRules', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /trotz Sperre erlaubt/);
  assert.match(body, /nur für brainstorming, Plan und Code/);
  assert.match(body, /ausschließlich die kanonischen Begriffe/);
  assert.match(body, /höchstens in dem W-Eintrag, der den Begriff festlegt/);
  assert.match(body, /tragen `Historie`/);
  assert.match(body, /`Art: verankert`/);
  assert.match(body, /nur der aktuelle Branch-Stand/);
  assert.ok(body.includes('forge-config.js" get Suche'));
  assert.ok(body.includes('`Begriffe: <Wort des Menschen> → <Glossar-Begriff>`'));
  assert.match(body, /ersetzt keine Runde/);
  assert.match(body, /Frontier aufgenommen/);
});

test('withDocs_Body_NamesReferencePerStepAndStaysLean', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of ['glossary-target.md', 'context-format.md', 'adr-format.md', 'grill-rounds.md']) assert.ok(body.includes(name), name);
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/skills'));
  assert.ok(wordCount(body) < 350);
  assert.ok(!fs.existsSync(path.join(SKILL_DIR, 'references')));
});
