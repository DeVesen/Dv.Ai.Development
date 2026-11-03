'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.join(__dirname, '..');
const MOVED_ENTRIES = ['skills/prozess-retrospektive', 'scripts/session-facts.js', 'scripts/retro-report.js', 'scripts/retro-timeline.js', 'scripts/retro-sort.js', 'scripts/mcp-usage.js'];
const MOVED_LIBS = /^(retro-|session-files|regexp)/;
const MOVED_TESTS = /^(retro-|prozess-retrospektive|session-(facts|files)|mcp-usage|regexp)/;

test('forge_RetrospectiveFiles_AreMovedOut', () => {
  for (const entry of MOVED_ENTRIES) assert.equal(fs.existsSync(path.join(PLUGIN_ROOT, entry)), false, entry);
  assert.deepEqual(fs.readdirSync(path.join(PLUGIN_ROOT, 'scripts', 'lib')).filter((name) => MOVED_LIBS.test(name)), []);
  assert.deepEqual(fs.readdirSync(__dirname).filter((name) => MOVED_TESTS.test(name) && name !== 'retro-moved.test.js'), []);
});

test('forge_ReadmeInitSkillAndConfig_NameNeitherRetrospectiveNorExpectedMcp', () => {
  for (const file of ['README.md', 'skills/init/SKILL.md', 'scripts/forge-config.js']) {
    const text = fs.readFileSync(path.join(PLUGIN_ROOT, file), 'utf8');

    assert.doesNotMatch(text, /[Rr]etrospektive|MCP-Erwartet/, file);
  }
});
