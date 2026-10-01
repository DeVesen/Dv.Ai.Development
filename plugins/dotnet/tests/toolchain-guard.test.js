'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/toolchain-guard');
const { initProject } = require('../scripts/init');
const setup = require('../scripts/lib/project-setup');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain-guard.js');
const HOOKS = path.join(__dirname, '..', 'hooks', 'hooks.json');
const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };

// Projekt mit eingerichtetem Hook; der Schalter liegt wie nach dem Init im Wurzelordner.
function hookedProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  setup.writeHookMarker(root, STACK);
  return root;
}

const bash = (root, command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: root });

test('decide_DevMcpBuildAndTestTools_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__build_dotnet_solution', 'mcp__plugin_x_dev-mcp__test_dotnet_solution']) {
    const reason = guard.decide({ tool_name: tool, tool_input: {}, cwd: root });
    assert.match(reason, /`dv-dotnet:toolchain`/);
    assert.ok(reason.includes(tool));
  }
});

test('decide_OtherDevMcpTools_AreAllowed', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__read_lines', 'mcp__dev-mcp__run_inspectcode', 'mcp__dev-mcp__build_angular_project']) {
    assert.equal(guard.decide({ tool_name: tool, tool_input: {}, cwd: root }), null);
  }
});

test('decide_DotnetBuildOrTestInBash_IsRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const command of ['dotnet test', 'dotnet build -c Release', 'cd src && dotnet test --no-build', 'dotnet.exe build', '/usr/bin/dotnet test']) {
    assert.match(guard.decide(bash(root, command)), /`dv-dotnet:toolchain`/, command);
  }
});

test('decide_OtherShellCommands_AreAllowed', () => {
  const root = hookedProject();
  for (const command of ['dotnet run', 'dotnet restore', 'dotnet ef migrations add X', 'dv-dotnet-test --path x.sln', 'git commit -m "dotnet test fix"', 'echo dotnet test']) {
    assert.equal(guard.decide(bash(root, command)), null, command);
  }
});

test('decide_PowerShellTool_IsNeverRejected', () => {
  const root = hookedProject();
  assert.equal(guard.decide({ tool_name: 'PowerShell', tool_input: { command: 'dotnet test' }, cwd: root }), null);
});

test('decide_ProjectWithoutSwitch_AllowsEverything', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  assert.equal(guard.decide(bash(root, 'dotnet build')), null);
  assert.equal(guard.decide({ tool_name: 'mcp__dev-mcp__build_dotnet_solution', tool_input: {}, cwd: root }), null);
});

test('decide_CwdInSubfolder_FindsTheSwitchAbove', () => {
  const root = hookedProject();
  const sub = path.join(root, 'src', 'Api');
  fs.mkdirSync(sub, { recursive: true });
  assert.match(guard.decide(bash(sub, 'dotnet test')), /dv-dotnet:toolchain/);
});

test('initThenDecide_HookYes_RejectsAfterwardsAndHookNoDoesNot', () => {
  const yes = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  initProject({ cwd: yes, hook: 'ja', mcp: [] });
  assert.match(guard.decide(bash(yes, 'dotnet test')), /`dv-dotnet:toolchain`/);
  const no = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  initProject({ cwd: no, hook: 'nein', mcp: [] });
  assert.equal(guard.decide(bash(no, 'dotnet test')), null);
});

test('cli_RejectedCall_PrintsDenyDecisionAsJson', () => {
  const root = hookedProject();
  const result = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'dotnet test')), encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /dv-dotnet:toolchain/);
});

test('cli_AllowedCallOrBrokenInput_PrintsNothingAndExitsZero', () => {
  const root = hookedProject();
  const allowed = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'git status')), encoding: 'utf8' });
  assert.deepEqual([allowed.status, allowed.stdout], [0, '']);
  const broken = spawnSync(process.execPath, [SCRIPT], { input: '{ kaputt', encoding: 'utf8' });
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, '');
  assert.match(broken.stderr, /^dv-dotnet guard: /);
});

test('hooksJson_Matcher_CoversBashAndTheTwoMcpToolsButNotPowerShell', () => {
  const [entry] = JSON.parse(fs.readFileSync(HOOKS, 'utf8')).hooks.PreToolUse;
  const matcher = new RegExp(entry.matcher);
  for (const tool of ['Bash', 'mcp__dev-mcp__build_dotnet_solution', 'mcp__dev-mcp__test_dotnet_solution']) assert.ok(matcher.test(tool), tool);
  for (const tool of ['PowerShell', 'Read', 'mcp__dev-mcp__read_lines']) assert.ok(!matcher.test(tool), tool);
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js"');
});
