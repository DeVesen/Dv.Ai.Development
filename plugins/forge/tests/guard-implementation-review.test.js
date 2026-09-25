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

function shell(env, command, cwd = env.cwd) {
  return preTool({ ...env, cwd }, { tool_name: 'Bash', tool_input: { command } });
}

function outsideDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-outside-'));
}

function gitBashSpelling(absolute) {
  const forward = path.resolve(absolute).replace(/\\/g, '/');
  return `/${forward[0].toLowerCase()}${forward.slice(2)}`;
}

function scriptCall(script, args) {
  return `node "${guard.PLUGIN_ROOT}/scripts/${script}" ${args}`;
}

test('decidePreTool_RelativeCatInsideRepo_Denies', () => {
  const env = setup();
  assert.match(shell(env, 'cat src/a.js'), /dv-forge:implementation-review läuft/);
});

test('decidePreTool_RelativeSedInPlaceInsideRepo_Denies', () => {
  const env = setup();
  assert.ok(shell(env, 'sed -i s/a/b/ src/a.js'));
});

test('decidePreTool_GitDiffInsideRepo_Denies', () => {
  const env = setup();
  assert.ok(shell(env, 'git diff forge-base/x..HEAD'));
});

test('decidePreTool_AllowedScriptChainedWithCat_Denies', () => {
  const env = setup();
  assert.ok(shell(env, `node "/plugins/forge/scripts/review-package.js" a b c; cat "${env.top}/src/a.js"`));
  assert.ok(shell(env, `node "/plugins/forge/scripts/review-package.js" a b c && cat "${env.top}/src/a.js"`, outsideDir()));
});

test('decidePreTool_AggregateHeredocAsLoopWritesIt_Allowed', () => {
  const env = setup();
  const command = [
    `${scriptCall('aggregate-findings.js', '--expect acceptance,design')} --repo "${env.top}" <<'DV_FORGE_EOF'`,
    '```json',
    '{"reviewer":"design","findings":[{"severity":"red","text":"a | b; c && d $(x) `y`"}]}',
    '```',
    'DV_FORGE_EOF',
  ].join('\n');
  assert.equal(shell(env, command), null);
});

test('decidePreTool_HeredocFollowedByCommand_Denies', () => {
  const env = setup();
  const command = `${scriptCall('aggregate-findings.js', '--expect design')} <<'DV_FORGE_EOF'\n{}\nDV_FORGE_EOF\ncat src/a.js`;
  assert.ok(shell(env, command));
});

test('decidePreTool_UnquotedHeredocWithSubstitution_Denies', () => {
  const env = setup();
  const command = `${scriptCall('aggregate-findings.js', '--expect design')} <<DV_FORGE_EOF\n$(cat src/a.js)\nDV_FORGE_EOF`;
  assert.ok(shell(env, command));
});

test('decidePreTool_ReleaseWithPluginRootInsideProtectedRepo_Allowed', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const repo = path.resolve(guard.PLUGIN_ROOT, '..', '..');
  guard.writeMarker(SESSION, { command: '/dv-forge:implementation-review', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  const env = { tmpRoot, cwd: repo };
  assert.equal(shell(env, scriptCall('guard-orchestrator.js', `release ${SESSION}`)), null);
  assert.equal(shell(env, scriptCall('guard-orchestrator.js', `release ${SESSION}`), outsideDir()), null);
});

test('decidePreTool_GitBashSpellingOfTopFromOutside_Denies', { skip: process.platform !== 'win32' }, () => {
  const env = setup();
  assert.ok(shell(env, `cat "${gitBashSpelling(env.top)}/src/a.js"`, outsideDir()));
});

test('decidePreTool_LongSpellingOfShortNamedTopFromOutside_Denies', () => {
  const env = setup();
  const longTop = fs.realpathSync.native(env.top);
  assert.ok(shell(env, `cat "${path.join(longTop, 'src', 'a.js')}"`, outsideDir()));
});

test('decidePreTool_ShellOutsideRepoNotNamingIt_Allowed', () => {
  const env = setup();
  assert.equal(shell(env, 'cat notes.txt', outsideDir()), null);
});

test('onPrompt_PlanInOtherRepo_ProtectsPlanAndWorkingDirectoryToplevel', () => {
  const planRepo = makeRepo();
  const workRepo = makeRepo();
  const plan = path.join(planRepo, 'docs', 'forge', 'x', 'plan.md');
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.writeFileSync(plan, '# plan\n');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.onPrompt({ session_id: SESSION, cwd: workRepo, prompt: `/dv-forge:implementation-review "${plan}"` }, tmpRoot);
  const { protected: entries } = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, tmpRoot), 'utf8'));
  assert.equal(entries.length, 2);
  assert.ok(entries.every((entry) => entry.kind === 'dir'));
  assert.ok(samePath(entries[0].path, planRepo));
  assert.ok(samePath(entries[1].path, workRepo));
});

test('onPrompt_PlanInWorkingDirectoryRepo_ProtectsOneToplevel', () => {
  const repo = makeRepo();
  const plan = path.join(repo, 'docs', 'forge', 'x', 'plan.md');
  fs.mkdirSync(path.dirname(plan), { recursive: true });
  fs.writeFileSync(plan, '# plan\n');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.onPrompt({ session_id: SESSION, cwd: path.join(repo, 'docs'), prompt: `/dv-forge:implementation-review "${plan}"` }, tmpRoot);
  const { protected: entries } = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, tmpRoot), 'utf8'));
  assert.equal(entries.length, 1);
  assert.ok(samePath(entries[0].path, repo));
});
