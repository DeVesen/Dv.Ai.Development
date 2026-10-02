'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');
const { isMostlyGerman } = require('./lib/german');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'writing-skills');
const VALIDATOR = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js"';

function skill() {
  return readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));
}

test('writingSkills_Frontmatter_NameDescriptionAndValidatorAllowed', () => {
  const { fields } = skill();

  assert.deepEqual(Object.keys(fields), ['name', 'description', 'allowed-tools']);
  assert.equal(fields.name, 'writing-skills');
  assert.match(fields.description, /^Use when /);
  assert.doesNotMatch(fields.description, /[<>]|: /);
  for (const shell of ['Bash', 'PowerShell']) assert.ok(fields['allowed-tools'].includes(`${shell}(${VALIDATOR} *)`), shell);
});

test('writingSkills_Description_GermanAndEnglishTriggerWords', () => {
  const { fields } = skill();

  assert.match(fields.description, /Skill schreiben/);
  assert.match(fields.description, /write a skill/);
});

test('writingSkills_Body_IsGerman', () => {
  assert.ok(isMostlyGerman(skill().body));
});

test('writingSkills_Body_ProcessIsObserveWriteCheckCloseGaps', () => {
  const { body } = skill();

  const positions = ['**Beobachten (rot).**', '**Schreiben (grün).**', '**Prüfen.**', '**Lücken schließen.**'].map((step) => body.indexOf(step));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('writingSkills_Body_ExplainsTestFirstItself', () => {
  const { body } = skill();

  assert.ok(body.includes('## Erst der Test'));
  assert.ok(body.includes('Ein Skill ohne beobachteten Fehlschlag ist eine Vermutung'));
});

test('writingSkills_Body_DescriptionNamesOnlyTheTrigger', () => {
  const { body } = skill();

  assert.ok(body.includes('### Die Beschreibung nennt nur den Auslöser'));
  assert.ok(body.includes('Sie fasst den Ablauf nicht zusammen'));
});

test('writingSkills_Body_HelperScriptAndSnapshotHints', () => {
  const { body } = skill();

  assert.ok(body.includes('als Snapshot'));
  assert.ok(body.includes('dasselbe Hilfsskript neu'));
});

test('writingSkills_Body_CallsTheValidatorWithTheSkillFolder', () => {
  assert.ok(skill().body.includes(`${VALIDATOR} <skill-ordner>`));
});

test('writingSkills_Folder_OnlySkillAndTheThreeOwnReferences', () => {
  const files = fs.readdirSync(SKILL_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(SKILL_DIR, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();

  assert.deepEqual(files, ['SKILL.md', 'references/persuasion-principles.md', 'references/testing-with-subagents.md', 'references/trigger-eval.md']);
});

test('writingSkills_Body_NamesExactlyTheThreeReferences', () => {
  const named = [...new Set(skill().body.match(/references\/[\w.-]+\.md/g))].sort();

  assert.deepEqual(named, ['references/persuasion-principles.md', 'references/testing-with-subagents.md', 'references/trigger-eval.md']);
});
