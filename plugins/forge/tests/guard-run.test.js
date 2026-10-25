'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');
const { forbiddenIn } = require('../scripts/lib/git-commands');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'guard-orchestrator.js');
const SESSION = 'run-session';

function env() {
  return { tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-run-')), cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-run-cwd-')) };
}

function bash(e, command, extra = {}) {
  return guard.decidePreTool({ session_id: SESSION, cwd: e.cwd, tool_name: 'Bash', tool_input: { command }, ...extra }, e.tmpRoot);
}

function runMarker(e) {
  return guard.readRun(SESSION, e.tmpRoot);
}

for (const skill of guard.RUN_SKILLS) {
  test(`onPrompt_${skill}_WritesRunMarker`, () => {
    const e = env();
    guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: `/dv-forge:${skill} docs/spec.md 12` }, e.tmpRoot);
    assert.equal(runMarker(e).skill, skill);
    assert.ok(runMarker(e).seit);
  });

  test(`onSkillCall_${skill}_WritesRunMarker`, () => {
    const e = env();
    guard.onSkillCall({ session_id: SESSION, cwd: e.cwd, tool_name: 'Skill', tool_input: { skill: `dv-forge:${skill}`, args: 'a.md' } }, e.tmpRoot);
    assert.equal(runMarker(e).skill, skill);
  });
}

test('onPrompt_OtherCommandOrPlainText_WritesNoRunMarker', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:spec-review docs/spec.md' }, e.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: 'bitte plan-orchestrator starten' }, e.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/plan-orchestrator x' }, e.tmpRoot);
  assert.equal(runMarker(e), null);
});

test('onSkillCall_SubAgentCallsOrchestrator_WritesNoRunMarker', () => {
  const e = env();
  guard.onSkillCall({ session_id: SESSION, cwd: e.cwd, agent_id: 'a1', tool_input: { skill: 'dv-forge:plan-orchestrator' } }, e.tmpRoot);
  assert.equal(runMarker(e), null);
});

test('onPrompt_HumanPromptDuringRun_KeepsRunMarker', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }, e.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: 'ja, weiter' }, e.tmpRoot);
  assert.equal(runMarker(e).skill, 'plan-orchestrator');
});

test('release_ReviewMarkerReleased_KeepsRunMarker', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:implementation-orchestrator p.md s.md' }, e.tmpRoot);
  guard.release(SESSION, e.tmpRoot);
  assert.equal(runMarker(e).skill, 'implementation-orchestrator');
});

test('endRun_Marker_RemovesItAndAllowsPushAgain', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:spec-review-orchestrator s.md' }, e.tmpRoot);
  assert.ok(bash(e, 'git push'));
  guard.endRun(SESSION, e.tmpRoot);
  assert.equal(bash(e, 'git push'), null);
});

test('endRun_NoMarker_DoesNotThrow', () => {
  assert.doesNotThrow(() => guard.endRun('nobody', env().tmpRoot));
});

const FORBIDDEN = [
  'git push', 'git push origin HEAD', 'git checkout main', 'git switch -c x', 'git worktree add ../x', 'git merge feature',
  'git rebase main', 'git reset --hard HEAD~1', 'git stash', 'git stash pop', 'git add -A', 'git add .', 'git add --all',
  'git add -- .', 'git commit -a -m x', 'git commit -am x', 'git commit --all -m x', 'git -C /repo push', 'cd /repo && git push',
  'git commit -m x --no-verify', 'git push --no-verify', 'FOO=1 git checkout x', 'bash -c "git push"',
];

for (const command of FORBIDDEN) {
  test(`decidePreTool_RunActive_Denies_${command.replace(/\W+/g, '_')}`, () => {
    const e = env();
    guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:implementation-orchestrator p.md s.md' }, e.tmpRoot);
    const reason = bash(e, command);
    assert.ok(reason, command);
    assert.match(reason, /implementation-orchestrator/);
    assert.match(reason, /run-end run-session/);
  });
}

const ALLOWED = [
  'git status --porcelain', 'git diff --stat', 'git log --oneline main..HEAD', 'git add src/a.js', 'git add -- "docs/spec.md"',
  'git commit -m "docs: review spec x" -- docs/spec.md', 'git commit -m "fix git push handling"', 'git reset HEAD file.txt',
  'git worktree list', 'git stash list', 'git merge-base main HEAD', 'git branch --show-current', 'git rev-parse --show-toplevel',
  'echo git push', 'git commit -F - <<\'EOF\'\nbody mentions git push and git add .\nEOF',
  'node "/p/plugins/forge/scripts/work.js" start --branch x', 'node "/p/plugins/forge/scripts/spec-commit.js" commit --spec s.md --slug x',
  'node "/p/plugins/forge/scripts/session-chain.js" commit --anlass go --slug x --message "git push"',
];

for (const command of ALLOWED) {
  test(`decidePreTool_RunActive_Allows_${command.split('\n')[0].replace(/\W+/g, '_').slice(0, 60)}`, () => {
    const e = env();
    guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:spec-review-orchestrator s.md' }, e.tmpRoot);
    assert.equal(bash(e, command), null, command);
  });
}

test('decidePreTool_PlanOrchestratorRun_DeniesEveryCommit', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }, e.tmpRoot);
  assert.match(bash(e, 'git commit -m "docs: plan" -- plan.md'), /git commit/);
  assert.equal(bash(e, 'git add plan.md'), null);
});

test('decidePreTool_OtherRunsMayCommit', () => {
  const e = env();
  for (const skill of ['spec-review-orchestrator', 'implementation-orchestrator', 'session-orchestrator']) {
    guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: `/dv-forge:${skill} s.md` }, e.tmpRoot);
    assert.equal(bash(e, 'git commit -m x -- a.md'), null, skill);
  }
});

test('decidePreTool_PowerShellRun_DeniesPush', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:session-orchestrator' }, e.tmpRoot);
  const reason = guard.decidePreTool({ session_id: SESSION, cwd: e.cwd, tool_name: 'PowerShell', tool_input: { command: 'git push; git status' } }, e.tmpRoot);
  assert.ok(reason);
});

test('decidePreTool_NoRun_AllowsGit', () => {
  const e = env();
  assert.equal(bash(e, 'git push'), null);
});

test('decidePreTool_RunActiveSubagent_Untouched', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:implementation-orchestrator p.md s.md' }, e.tmpRoot);
  assert.equal(bash(e, 'git add -A', { agent_id: 'agent-1' }), null);
});

test('decidePreTool_RunActiveForeignSession_Allows', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }, e.tmpRoot);
  const reason = guard.decidePreTool({ session_id: 'other', cwd: e.cwd, tool_name: 'Bash', tool_input: { command: 'git push' } }, e.tmpRoot);
  assert.equal(reason, null);
});

test('decidePreTool_RunActiveNonShellTool_Allows', () => {
  const e = env();
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }, e.tmpRoot);
  assert.equal(guard.decidePreTool({ session_id: SESSION, cwd: e.cwd, tool_name: 'Read', tool_input: { file_path: 'git push' } }, e.tmpRoot), null);
});

test('decidePreTool_BrokenRunMarker_FailsOpen', () => {
  const e = env();
  fs.mkdirSync(path.dirname(guard.runMarkerPath(SESSION, e.tmpRoot)), { recursive: true });
  fs.writeFileSync(guard.runMarkerPath(SESSION, e.tmpRoot), '{kaputt');
  assert.equal(bash(e, 'git push'), null);
});

test('forbiddenIn_NonStringCommand_ReturnsNull', () => {
  assert.equal(forbiddenIn(undefined), null);
  assert.equal(forbiddenIn(42), null);
});

function startPlanRun(e) {
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }, e.tmpRoot);
}

function ageRun(e, hours) {
  const file = guard.runMarkerPath(SESSION, e.tmpRoot);
  const run = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ ...run, seit: new Date(Date.now() - hours * 3600 * 1000).toISOString() }));
}

test('onPrompt_RunActiveOtherSlashCommand_RemovesRunMarker', () => {
  const e = env();
  startPlanRun(e);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:grill neue Idee' }, e.tmpRoot);
  assert.equal(runMarker(e), null);
  assert.equal(bash(e, 'git push'), null);
});

test('onPrompt_RunActiveOtherOrchestrator_ReplacesRunMarker', () => {
  const e = env();
  startPlanRun(e);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:session-orchestrator x' }, e.tmpRoot);
  assert.equal(runMarker(e).skill, 'session-orchestrator');
});

test('onPrompt_RunActiveFreeText_KeepsRunMarker', () => {
  const e = env();
  startPlanRun(e);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: 'ja, bitte weiter' }, e.tmpRoot);
  assert.equal(runMarker(e).skill, 'plan-orchestrator');
});

test('onPrompt_RunActiveHarnessNotice_KeepsRunMarker', () => {
  const e = env();
  startPlanRun(e);
  guard.onPrompt({ session_id: SESSION, cwd: e.cwd, prompt: '<task-notification>fertig</task-notification>' }, e.tmpRoot);
  assert.equal(runMarker(e).skill, 'plan-orchestrator');
});

test('decidePreTool_RunMarkerOlderThan12Hours_AllowsAndDeletesMarker', () => {
  const e = env();
  startPlanRun(e);
  ageRun(e, 13);
  assert.equal(bash(e, 'git push'), null);
  assert.equal(fs.existsSync(guard.runMarkerPath(SESSION, e.tmpRoot)), false);
});

test('decidePreTool_RunMarkerYoungerThan12Hours_StillDenies', () => {
  const e = env();
  startPlanRun(e);
  ageRun(e, 11);
  assert.match(bash(e, 'git push'), /plan-orchestrator/);
});

test('onTurnEnd_RunMarkerOlderThan12Hours_DoesNotBlockAndDeletesMarker', () => {
  const e = env();
  startPlanRun(e);
  ageRun(e, 13);
  assert.equal(guard.onTurnEnd({ session_id: SESSION, last_assistant_message: 'fertig' }, e.tmpRoot), null);
  assert.equal(fs.existsSync(guard.runMarkerPath(SESSION, e.tmpRoot)), false);
});

test('decidePreTool_RunDenial_NamesWayOut', () => {
  const e = env();
  startPlanRun(e);
  assert.match(bash(e, 'git push'), /neuer Slash-Befehl.*oder run-end hebt die Sperre auf/);
});

function cli(e, args, input) {
  const tmp = { ...process.env, TMPDIR: e.tmpRoot, TMP: e.tmpRoot, TEMP: e.tmpRoot };
  return spawnSync(process.execPath, [SCRIPT, ...args], { input, encoding: 'utf8', env: tmp });
}

test('cli_PromptThenPretoolThenRunEnd_DeniesThenAllows', () => {
  const e = env();
  cli(e, ['prompt'], JSON.stringify({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }));
  const push = JSON.stringify({ session_id: SESSION, cwd: e.cwd, tool_name: 'Bash', tool_input: { command: 'git push' } });
  assert.equal(JSON.parse(cli(e, ['pretool'], push).stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(cli(e, ['run-end', SESSION]).status, 0);
  assert.equal(cli(e, ['pretool'], push).stdout, '');
});

test('cli_SessionEnd_RemovesRunMarker', () => {
  const e = env();
  cli(e, ['prompt'], JSON.stringify({ session_id: SESSION, cwd: e.cwd, prompt: '/dv-forge:plan-orchestrator s.md' }));
  cli(e, ['stop'], JSON.stringify({ session_id: SESSION }));
  assert.equal(fs.existsSync(guard.runMarkerPath(SESSION, e.tmpRoot)), false);
});

test('cli_PretoolBrokenJson_FailsOpen', () => {
  const e = env();
  const result = cli(e, ['pretool'], '{kaputt');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge guard/);
});

test('skills_EveryRunSkill_CallsRunEndAfterTheReport', () => {
  const root = path.join(__dirname, '..', 'skills');
  const files = [...guard.STAGE_RUNS.map((name) => path.join(root, name, 'SKILL.md')), path.join(root, 'session-orchestrator', 'references', 'ablauf.md')];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(text.includes('guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}'), file);
  }
});
