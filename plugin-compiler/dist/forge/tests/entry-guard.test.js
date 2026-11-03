'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { SUB_SKILLS, START_COMMAND, blockedEntry } = require('../scripts/lib/entry-guard');
const { buildBrief } = require('../scripts/lib/session-chain-brief');
const { readMarkdown } = require('./lib/markdown');

const ROOT = path.join(__dirname, '..');
const GUARD = path.join(ROOT, 'scripts', 'guard-orchestrator.js');
const TOOLS = ['init', 'commit-message', 'domain-modeling', 'merge-conflict-resolution'];

function skillNames() {
  return fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

test('subSkills_List_IsEverySkillExceptStartCommandAndTools', () => {
  // Arrange
  const expected = skillNames().filter((name) => name !== 'session-orchestrator' && !TOOLS.includes(name));

  // Assert
  assert.deepEqual([...SUB_SKILLS].sort(), expected);
  assert.equal(SUB_SKILLS.length, 14);
});

for (const name of SUB_SKILLS) {
  test(`blockedEntry_${name.replace(/\W/g, '_')}TypedWithoutDebug_NamesTheStartCommand`, () => {
    // Act
    const prefixed = blockedEntry(`/dv-forge:${name} docs/forge/x/spec.md`);
    const bare = blockedEntry(`/${name}`);

    // Assert
    for (const reason of [prefixed, bare]) {
      assert.match(reason, /^dv-forge: /);
      assert.ok(reason.includes(START_COMMAND), reason);
      assert.ok(reason.includes(`/dv-forge:${name}`), reason);
    }
  });

  test(`blockedEntry_${name.replace(/\W/g, '_')}TypedWithDebug_Passes`, () => {
    // Assert
    assert.equal(blockedEntry(`/dv-forge:${name} docs/forge/x/spec.md --debug`), null);
    assert.equal(blockedEntry(`/${name} --debug x`), null);
  });

  test(`skillDescription_${name.replace(/\W/g, '_')}_IsMarkedInternalWithTheStartCommand`, () => {
    // Act
    const { fields } = readMarkdown(path.join(ROOT, 'skills', name, 'SKILL.md'));

    // Assert
    assert.match(fields.description, /intern/);
    assert.ok(fields.description.includes(START_COMMAND), fields.description);
    assert.ok(fields.description.endsWith(' Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.'), 'der Zusatz enthält kein Doppelpunkt mit Leerzeichen');
  });
}

test('blockedEntry_ToolsStartCommandAndOtherText_Pass', () => {
  // Arrange
  const prompts = [...TOOLS.flatMap((name) => [`/dv-forge:${name}`, `/${name} x`]), START_COMMAND, `${START_COMMAND} grill docs/x/spec.md`, '/dv-forge:unbekannt', '/clear', 'Hallo', '', undefined];

  // Act / Assert
  for (const prompt of prompts) {
    assert.equal(blockedEntry(prompt), null, String(prompt));
  }
});

test('skillDescription_ToolsAndStartCommand_AreNotMarkedInternal', () => {
  // Act / Assert
  for (const name of [...TOOLS, 'session-orchestrator']) {
    assert.doesNotMatch(readMarkdown(path.join(ROOT, 'skills', name, 'SKILL.md')).fields.description, /Gilt als intern/, name);
  }
});

test('blockedEntry_BriefOfAnEtappenSession_Passes', () => {
  // Arrange
  const { brief } = buildBrief({ etappe: 'spec-review', values: { slug: 'x', spec: 'C:/r/docs/forge/x/spec.md' } });

  // Assert
  assert.ok(brief.startsWith('/dv-forge:spec-review-orchestrator'));
  assert.equal(blockedEntry(brief), null);
});

function hook(args, input, tmp) {
  return spawnSync(process.execPath, [GUARD, ...args], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp } });
}

test('guardPromptCli_SubSkillWithoutDebug_PrintsBlockJsonAndWritesNothing', () => {
  // Arrange
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

  // Act
  const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:plan-review docs/forge/x/plan.md' }, tmp);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.ok(output.reason.includes(START_COMMAND));
  assert.deepEqual(fs.readdirSync(tmp), [], 'weder Marker noch Lauf werden angelegt');
});

test('guardPromptCli_OrchestratorWithoutDebug_StartsNoRunMarker', () => {
  // Arrange
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

  // Act
  const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:plan-orchestrator docs/forge/x/spec.md' }, tmp);

  // Assert
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  assert.deepEqual(fs.readdirSync(tmp), []);
});

test('guardPromptCli_SubSkillWithDebug_PrintsNothing', () => {
  // Arrange
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

  // Act
  const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:finish-work --debug' }, tmp);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('guardPretoolCli_SkillCallWithoutDebugByAnEtappenSession_IsNotDenied', () => {
  // Arrange
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

  // Act
  const result = hook(['pretool'], { session_id: 's1', cwd: tmp, tool_name: 'Skill', tool_input: { skill: 'dv-forge:spec-review', args: 'docs/forge/x/spec.md' } }, tmp);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('hooksJson_UserPromptSubmit_RunsTheGuardPromptCommandThatBlocksTypedSubSkills', () => {
  // Arrange
  const { hooks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8'));

  // Act
  const commands = hooks.UserPromptSubmit.flatMap((entry) => entry.hooks.map((item) => item.command));

  // Assert
  assert.ok(commands.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" prompt'));
});
