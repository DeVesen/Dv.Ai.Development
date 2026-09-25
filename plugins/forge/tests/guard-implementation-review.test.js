'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const guard = require('../scripts/guard-orchestrator.js');
const { makeRepo, samePath } = require('./lib/git-repo');

const SESSION = 'session-impl';
const PROMPT = '/dv-forge:implementation-review docs/forge/x/plan.md --spec other/spec.md --context a.md --context b.md --base main';

function setup(cwd = makeRepo()) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.onPrompt({ session_id: SESSION, cwd, prompt: PROMPT }, tmpRoot);
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, tmpRoot), 'utf8'));
  return { tmpRoot, cwd, marker, top: marker.protected[0]?.path };
}

function preTool(env, overrides) {
  return guard.decidePreTool({ session_id: SESSION, cwd: env.cwd, ...overrides }, env.tmpRoot);
}

test('parseSkillCall_ImplementationReview_FlagValuesAreNotPositional', () => {
  assert.deepEqual(guard.parseSkillCall(PROMPT), {
    command: '/dv-forge:implementation-review',
    files: [{ path: 'docs/forge/x/plan.md', kind: 'repo' }],
  });
});

test('parseSkillCall_ImplementationReviewWithoutPlan_ReturnsNull', () => {
  assert.equal(guard.parseSkillCall('/dv-forge:implementation-review --base main'), null);
});

test('onPrompt_InsideRepo_ProtectsGitToplevelAsDirectory', () => {
  const env = setup();
  assert.equal(env.marker.command, '/dv-forge:implementation-review');
  assert.equal(env.marker.protected.length, 1);
  assert.equal(env.marker.protected[0].kind, 'dir');
  assert.ok(samePath(env.top, env.cwd));
});

test('onPrompt_OutsideRepo_ProtectsWorkingDirectory', () => {
  const env = setup(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-nogit-')));
  assert.equal(env.marker.protected[0].kind, 'dir');
  assert.ok(samePath(env.top, env.cwd));
});

test('decidePreTool_MainSessionReadsCode_DeniesWithReason', () => {
  const env = setup();
  const reason = preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.top, 'src', 'a.js') } });
  assert.match(reason, /dv-forge:implementation-review läuft/);
});

test('decidePreTool_MainSessionShellNamesRepo_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `cat "${env.top}/src/a.js"` } }));
});

test('decidePreTool_PluginScriptsWithRepoPath_Allowed', () => {
  const env = setup();
  for (const script of ['plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js']) {
    const command = `node "/plugins/forge/scripts/${script}" x "${env.top}/.forge/review/x"`;
    assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null, script);
  }
});

test('decidePreTool_RelativeGitCommand_Allowed', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command: 'git rev-parse --show-toplevel' } }), null);
});

test('decidePreTool_SubagentReadsCode_Allowed', () => {
  const env = setup();
  const input = { agent_id: 'agent-1', tool_name: 'Read', tool_input: { file_path: path.join(env.top, 'src', 'a.js') } };
  assert.equal(preTool(env, input), null);
});
