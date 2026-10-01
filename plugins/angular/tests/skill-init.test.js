'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'));
const count = (text, part) => text.split(part).length - 1;

test('frontmatter_Fields_ManualOnlyUseWhen', () => {
  assert.equal(fields.name, 'init');
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
  assert.equal(fields['disable-model-invocation'], 'true');
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('body_Length_StaysUnder500WordsAndUsesPluginRoot', () => {
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
});

test('body_Questions_AskHookAndBothMcpsSeparatelyWithDefaultNo', () => {
  for (const question of ['Hook einrichten?', 'Microsoft Learn einrichten?', 'Context7 einrichten?']) {
    assert.ok(body.includes(question), `${question} fehlt`);
  }
  assert.equal(count(body, '(Standard: Nein)'), 3);
});

test('body_McpQuestions_WarnAboutAlreadyInstalledPlugin', () => {
  assert.equal(count(body, 'Ist der MCP schon als Plugin installiert, wähle Nein.'), 2);
});

test('body_Script_IsCalledThroughNodeWithPluginRoot', () => {
  assert.ok(body.includes('node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>'));
});

test('body_ExistingRules_AreLeftToTheHuman', () => {
  assert.match(body, /Build und Test über dev-mcp/);
  assert.match(body, /von Hand/);
});
