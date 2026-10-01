'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'toolchain', 'SKILL.md'));
const TRIGGERS = ['baue', 'teste', 'kompiliere', 'lint', 'führe die Tests aus', 'Build prüfen', 'laufen die Tests durch'];
const COMMANDS = ['dv-dotnet-build', 'dv-dotnet-test', 'dv-dotnet-lint'];

test('frontmatter_Fields_AreOnlyNameAndDescription', () => {
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'toolchain');
});

test('description_Text_StartsWithUseWhenAndStaysShort', () => {
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
});

test('description_Triggers_NamesEveryPhraseOfTheSpec', () => {
  for (const phrase of TRIGGERS) assert.ok(fields.description.includes(phrase), `${phrase} fehlt`);
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('description_Tools_NamesTheToolsItReplaces', () => {
  for (const tool of ['build_dotnet_solution', 'test_dotnet_solution', 'dotnet build']) assert.ok(fields.description.includes(tool), `${tool} fehlt`);
});

test('body_Length_StaysUnder200Words', () => {
  assert.ok(wordCount(body) < 200, `${wordCount(body)} Wörter`);
});

test('body_Commands_NamesBashAndAllThreeCommands', () => {
  assert.match(body, /\*\*Bash-Tool\*\*/);
  for (const command of COMMANDS) assert.ok(body.includes(`\`${command} --path <Solution>\``), `${command} fehlt`);
});

test('body_PowerShell_IsNeverAnInvocation', () => {
  assert.doesNotMatch(body, /```(?:powershell|pwsh)/i);
  assert.match(body, /nicht im PowerShell-Tool/);
});

test('body_SolutionRule_TakesTheOnlyOneOrAsksAndStartsNothing', () => {
  assert.match(body, /genau eine Solution, nimm sie/);
  assert.match(body, /mehrere, frag, welche gemeint ist, und starte nichts/);
});

test('body_References_HaveNoAtLinks', () => {
  assert.doesNotMatch(body, /(^|\s)@[\w./-]+/);
});
