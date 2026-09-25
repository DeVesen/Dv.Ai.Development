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

test('parseSkillCall_SpecReviewPlainAndQuoted_ProtectsSpec', () => {
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review docs/spec.md'),
    { command: '/dv-forge:spec-review', files: ['docs/spec.md'] });
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review "my docs/spec.md" q.md --rounds 2').files, ['my docs/spec.md']);
});

test('parseSkillCall_OtherPrompt_ReturnsNull', () => {
  assert.equal(guard.parseSkillCall('bitte review docs/spec.md'), null);
  assert.equal(guard.parseSkillCall('/dv-forge:spec-review'), null);
});

test('onPrompt_SpecReview_WritesMarkerWithAbsoluteFileEntry', () => {
  const env = setup();
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
  assert.equal(marker.command, '/dv-forge:spec-review');
  assert.deepEqual(marker.protected, [{ path: env.specPath, kind: 'file' }]);
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

function setupPlanReview(prompt = '/dv-forge:plan-review docs/forge/x/plan.md') {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-repo-'));
  guard.onPrompt({ session_id: SESSION, cwd, prompt }, tmpRoot);
  return {
    tmpRoot, cwd,
    planPath: path.join(cwd, 'docs', 'forge', 'x', 'plan.md'),
    specPath: path.join(cwd, 'docs', 'forge', 'x', 'spec.md'),
  };
}

function setupDirectory() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-dir-'));
  const repo = path.join(base, 'repo');
  guard.writeMarker(SESSION, { command: '/dv-forge:test', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  return { tmpRoot, cwd: base, repo, sibling: path.join(base, 'repo-alt') };
}

test('parseSkillCall_PlanReviewWithoutSpec_UsesSpecInPlanFolder', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review docs/forge/x/plan.md --rounds 2');
  assert.equal(call.command, '/dv-forge:plan-review');
  assert.deepEqual(call.files.map((file) => file.replace(/\\/g, '/')), ['docs/forge/x/plan.md', 'docs/forge/x/spec.md']);
});

test('parseSkillCall_FileMentionWithAt_StripsAt', () => {
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review @docs/spec.md').files, ['docs/spec.md']);
  assert.equal(guard.parseSkillCall('/dv-forge:plan-review @docs/forge/x/plan.md').files[0], 'docs/forge/x/plan.md');
});

test('parseSkillCall_PlanReviewWithSpec_ProtectsBoth', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review "my plans/plan.md" other/spec.md --rounds 2');
  assert.deepEqual(call.files, ['my plans/plan.md', 'other/spec.md']);
});

test('decidePreTool_PlanReviewMainSessionReadsPlan_DeniesWithPlanReason', () => {
  const env = setupPlanReview();
  const reason = preTool(env, { tool_name: 'Read', tool_input: { file_path: env.planPath } });
  assert.match(reason, /dv-forge:plan-review läuft/);
});

test('decidePreTool_PlanReviewMainSessionReadsSpecInPlanFolder_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
});

test('decidePreTool_PlanReviewShellNamesPlan_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/forge/x/PLAN.md' } }));
});

test('decidePreTool_PlanReviewShellIsReworkOutcome_Allows', () => {
  const env = setupPlanReview();
  const command = `node "/plugins/forge/scripts/rework-outcome.js" --escalation-status spec-question <<'EOF'\nplan.md\nEOF`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_PlanReviewSubagentEditsPlan_Allows', () => {
  const env = setupPlanReview();
  assert.equal(preTool(env, { agent_id: 'agent-1', tool_name: 'Edit', tool_input: { file_path: env.planPath } }), null);
});

test('decidePreTool_DirectoryEntryFileInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.repo, 'src', 'x.cs') } }));
});

test('decidePreTool_DirectoryEntrySiblingWithSamePrefix_Allows', () => {
  const env = setupDirectory();
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.sibling, 'x.cs') } }), null);
});

test('decidePreTool_DirectoryEntryGrepInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.repo, 'src') } }));
});

test('decidePreTool_DirectoryEntryShellNamesDirectory_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `ls "${env.repo}"` } }));
});

function setupRepoAroundPlugin() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const repo = path.resolve(guard.PLUGIN_ROOT, '..', '..');
  guard.writeMarker(SESSION, { command: '/dv-forge:test', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  return { tmpRoot, cwd: repo };
}

test('decidePreTool_DirectoryEntryReadInsidePluginRoot_Allows', () => {
  const env = setupRepoAroundPlugin();
  const loop = path.join(guard.PLUGIN_ROOT, 'shared', 'review-loop', 'loop.md');
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: loop } }), null);
});

test('decidePreTool_DirectoryEntryEditInsidePluginRoot_Denies', () => {
  const env = setupRepoAroundPlugin();
  const loop = path.join(guard.PLUGIN_ROOT, 'shared', 'review-loop', 'loop.md');
  assert.ok(preTool(env, { tool_name: 'Edit', tool_input: { file_path: loop } }));
});

test('decidePreTool_FileEntryInsidePluginRoot_StillDeniesRead', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const spec = path.join(guard.PLUGIN_ROOT, 'tests', 'fixtures', 'flawed-spec.md');
  guard.writeMarker(SESSION, { command: '/dv-forge:spec-review', protected: [{ path: spec, kind: 'file' }] }, tmpRoot);
  assert.ok(preTool({ tmpRoot, cwd: guard.PLUGIN_ROOT }, { tool_name: 'Read', tool_input: { file_path: spec } }));
});
