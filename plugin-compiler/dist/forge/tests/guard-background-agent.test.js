'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'guard-orchestrator.js');
const SESSION = 'bg-session';
const REASON = 'Im Review-Lauf laufen Agents im Vordergrund (run_in_background: false).';

function env({ review = true } = {}) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-bg-'));
  if (review) guard.onPrompt({ session_id: SESSION, cwd: tmpRoot, prompt: '/dv-forge:spec-review docs/spec.md' }, tmpRoot);
  return { tmpRoot, cwd: tmpRoot };
}

function agentCall(e, toolInput, extra = {}) {
  return guard.decidePreTool({ session_id: SESSION, cwd: e.cwd, tool_name: 'Agent', tool_input: toolInput, ...extra }, e.tmpRoot);
}

test('decidePreTool_ReviewRunBackgroundAgent_DeniesWithFixedReason', () => {
  assert.equal(agentCall(env(), { subagent_type: 'dv-forge:spec-review-clarity', prompt: 'x', run_in_background: true }), REASON);
});

test('decidePreTool_ReviewRunForegroundAgent_Allows', () => {
  const e = env();
  assert.equal(agentCall(e, { prompt: 'x', run_in_background: false }), null);
  assert.equal(agentCall(e, { prompt: 'x' }), null);
});

test('decidePreTool_NoReviewMarkerBackgroundAgent_Allows', () => {
  assert.equal(agentCall(env({ review: false }), { prompt: 'x', run_in_background: true }), null);
});

test('decidePreTool_MarkerWithOnlyMustShow_DoesNotCountAsReviewRun', () => {
  const e = env({ review: false });
  guard.writeMarker(SESSION, { mustShow: { anchors: ['# A'], lines: 1, text: '# A', file: 'x', attempts: 0 } }, e.tmpRoot);
  assert.equal(agentCall(e, { prompt: 'x', run_in_background: true }), null);
});

test('decidePreTool_ReviewRunAfterRelease_AllowsBackgroundAgent', () => {
  const e = env();
  guard.release(SESSION, e.tmpRoot);
  assert.equal(agentCall(e, { prompt: 'x', run_in_background: true }), null);
});

test('decidePreTool_ReviewRunBackgroundAgentFromSubagent_NotTouched', () => {
  assert.equal(agentCall(env(), { prompt: 'x', run_in_background: true }, { agent_id: 'a1' }), null);
});

test('decidePreTool_ReviewRunStringTrueOrOtherTool_Allows', () => {
  const e = env();
  assert.equal(agentCall(e, { prompt: 'x', run_in_background: 'true' }), null);
  assert.equal(guard.decidePreTool({ session_id: SESSION, cwd: e.cwd, tool_name: 'Task', tool_input: { run_in_background: true } }, e.tmpRoot), null);
});

test('hooksJson_PreToolUseMatcher_IncludesAgent', () => {
  const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
  assert.ok(hooks.PreToolUse[0].matcher.split('|').includes('Agent'));
});

test('cli_PretoolBackgroundAgentInReviewRun_PrintsDenyJson', () => {
  const e = env();
  const input = JSON.stringify({ session_id: SESSION, cwd: e.cwd, tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: true } });
  const result = spawnSync(process.execPath, [SCRIPT, 'pretool'], { input, encoding: 'utf8', env: { ...process.env, TMPDIR: e.tmpRoot, TMP: e.tmpRoot, TEMP: e.tmpRoot } });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.permissionDecision, 'deny');
  assert.equal(output.permissionDecisionReason, REASON);
});
