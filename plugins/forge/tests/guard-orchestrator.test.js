'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'guard-orchestrator.js');
const HOOKS = path.join(__dirname, '..', 'hooks', 'hooks.json');
const SESSION = 'session-a';

function setup() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-repo-'));
  const specPath = path.join(cwd, 'docs', 'spec.md');
  guard.onPrompt({ session_id: SESSION, cwd, prompt: '/dv-forge:spec-review docs/spec.md --rounds 2' }, tmpRoot);
  return { tmpRoot, cwd, specPath };
}

function preTool(env, overrides) {
  return guard.decidePreTool({ session_id: SESSION, cwd: env.cwd, ...overrides }, env.tmpRoot);
}

test('parseSpecArgument_PlainAndQuotedPaths_ReturnsPath', () => {
  assert.equal(guard.parseSpecArgument('/dv-forge:spec-review docs/spec.md'), 'docs/spec.md');
  assert.equal(guard.parseSpecArgument('/dv-forge:spec-review "my docs/spec.md" q.md'), 'my docs/spec.md');
});

test('parseSpecArgument_OtherPrompt_ReturnsNull', () => {
  assert.equal(guard.parseSpecArgument('bitte review docs/spec.md'), null);
});

test('parseSpecArgument_AtPrefixedPath_StripsAt', () => {
  assert.equal(guard.parseSpecArgument('/dv-forge:spec-review @docs/spec.md'), 'docs/spec.md');
});

test('onPrompt_SkillCall_WritesMarkerWithAbsoluteSpecPath', () => {
  const env = setup();
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
  assert.equal(marker.specPath, env.specPath);
  assert.equal(marker.specName, 'spec.md');
});

test('decidePreTool_MainSessionReadsSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
});

test('decidePreTool_MainSessionEditsSpecViaRelativePath_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Edit', tool_input: { file_path: 'docs/spec.md' } }));
});

test('decidePreTool_MainSessionGrepsSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: env.specPath } }));
});

test('decidePreTool_MainSessionGrepsSpecDirectory_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.cwd, 'docs') } }));
});

test('decidePreTool_MainSessionGrepsWithoutPath_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x' } }));
});

test('decidePreTool_MainSessionGrepsSiblingDirectory_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.cwd, 'src') } }), null);
});

test('decidePreTool_ShellCommandNamesSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/SPEC.md' } }));
});

test('decidePreTool_ShellCommandIsFileHash_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/file-hash.js" "${env.specPath}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_ShellCommandIsAggregate_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/aggregate-findings.js" --expect clarity <<'EOF'\nspec.md erwähnt\nEOF`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_SubagentReadsSpec_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { agent_id: 'agent-1', tool_name: 'Edit', tool_input: { file_path: env.specPath } }), null);
});

test('decidePreTool_OtherFile_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.cwd, 'other.md') } }), null);
});

test('decidePreTool_ForeignSession_Allows', () => {
  const env = setup();
  const input = { session_id: 'session-b', cwd: env.cwd, tool_name: 'Read', tool_input: { file_path: env.specPath } };
  assert.equal(guard.decidePreTool(input, env.tmpRoot), null);
});

test('release_ExistingMarker_RemovesItAndAllowsAgain', () => {
  const env = setup();
  guard.release(SESSION, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('release_NoMarker_DoesNotThrow', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  assert.doesNotThrow(() => guard.release('nobody', tmpRoot));
});

test('cli_PretoolOnSpec_PrintsDenyJson', () => {
  const env = setup();
  const input = JSON.stringify({ session_id: SESSION, cwd: env.cwd, tool_name: 'Read', tool_input: { file_path: env.specPath } });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'pretool'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('hooksJson_EveryCommand_PointsToExistingGuardScript', () => {
  const { hooks } = JSON.parse(fs.readFileSync(HOOKS, 'utf8'));
  assert.ok(hooks.UserPromptSubmit && hooks.PreToolUse && hooks.SessionEnd && hooks.Stop);
  const commands = Object.values(hooks).flat().flatMap((entry) => entry.hooks.map((hook) => hook.command));
  for (const command of commands) assert.match(command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/guard-orchestrator\.js/);
  assert.ok(fs.existsSync(SCRIPT));
});
