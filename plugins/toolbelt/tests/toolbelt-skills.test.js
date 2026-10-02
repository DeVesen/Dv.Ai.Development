'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText } = require('./lib/markdown');
const { isMostlyGerman } = require('./lib/german');
const { validateSkill } = require('../scripts/lib/validate-skill');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');
const SKILL_NAMES = ['claude-md-audit', 'prozess-retrospektive', 'writing-skills'];
// Die Quellen entstehen aus Teilen, damit diese Datei sie nicht selbst enthält: Für alle Dateien außer der README gilt der Wächter-Test aus Plan 1.
const INSPIRATION_SOURCES = ['super' + 'powers:writing-skills', 'skill-' + 'creator'];

test('plugin_Skills_ExactlyTheThreeNamedOnes', () => {
  assert.deepEqual(fs.readdirSync(SKILLS_DIR).sort(), SKILL_NAMES);
});

test('plugin_EverySkill_PassesTheValidatorWithoutErrorsOrWarnings', () => {
  for (const name of SKILL_NAMES) {
    const result = validateSkill(path.join(SKILLS_DIR, name));

    assert.deepEqual(result.errors, [], name);
    assert.deepEqual(result.warnings, [], name);
    assert.equal(result.name, name);
  }
});

test('plugin_EverySkill_GermanTextAndGermanPlusEnglishTriggerWords', () => {
  for (const name of SKILL_NAMES) {
    const { fields, body } = readMarkdown(path.join(SKILLS_DIR, name, 'SKILL.md'));

    assert.ok(isMostlyGerman(body), `${name}: Text nicht deutsch`);
    assert.match(fields.description, /^Use when /, name);
    assert.match(fields.description, /Auslöser/, name);
  }
});

test('readme_Content_NamesThreeSkillsAndBothInspirationSources', () => {
  const text = readText(path.join(PLUGIN_ROOT, 'README.md'));

  for (const name of SKILL_NAMES) assert.ok(text.includes(`\`${name}\``), name);
  for (const source of INSPIRATION_SOURCES) assert.ok(text.includes(`\`writing-skills\` ist inhaltlich von \`${source}\` inspiriert.`), source);
});
