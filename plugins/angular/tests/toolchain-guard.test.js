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
const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };

// Projekt mit eingerichtetem Hook; der Schalter liegt wie nach dem Init im Wurzelordner.
function hookedProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  setup.writeHookMarker(root, STACK);
  return root;
}

const bash = (root, command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: root });

test('decide_DevMcpBuildAndTestTools_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__build_angular_project', 'mcp__plugin_x_dev-mcp__test_angular_project']) {
    const reason = guard.decide({ tool_name: tool, tool_input: {}, cwd: root });
    assert.match(reason, /`dv-angular:toolchain`/);
    assert.ok(reason.includes(tool));
  }
});

test('decide_OtherDevMcpTools_AreAllowed', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__read_lines', 'mcp__dev-mcp__lint_angular_project', 'mcp__dev-mcp__build_dotnet_solution']) {
    assert.equal(guard.decide({ tool_name: tool, tool_input: {}, cwd: root }), null);
  }
});

test('decide_NgNpxNgAndNpmBuildTestLintInBash_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  const commands = ['ng build', 'ng test --watch=false', 'ng lint', 'npx ng build', 'npm test', 'npm run build', 'npm run lint',
    'cd web && npm run test -- --browsers=ChromeHeadless', 'node_modules/.bin/ng test'];
  for (const command of commands) assert.match(guard.decide(bash(root, command)), /`dv-angular:toolchain`/, command);
});

test('decide_NpxNgGenerateAndOtherShellCommands_AreAllowed', () => {
  const root = hookedProject();
  const commands = ['npx ng generate component x', 'npx ng serve', 'npx ng version', 'ng generate service y', 'ng serve', 'ng version', 'npm install', 'npm run start', 'npm run buildx',
    'dv-angular-test --root web', 'git commit -m "npm test fix"', 'echo npm test'];
  for (const command of commands) assert.equal(guard.decide(bash(root, command)), null, command);
});

test('decide_NpxNgBuildThenGenerate_RejectsOnlyTheFirst', () => {
  const root = hookedProject();
  assert.match(guard.decide(bash(root, 'npx ng build')), /`dv-angular:toolchain`/);
  assert.equal(guard.decide(bash(root, 'npx ng generate component x')), null);
});

test('decide_PowerShellTool_IsNeverRejected', () => {
  const root = hookedProject();
  assert.equal(guard.decide({ tool_name: 'PowerShell', tool_input: { command: 'npm test' }, cwd: root }), null);
});

test('decide_ProjectWithoutSwitch_AllowsEverything', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  assert.equal(guard.decide(bash(root, 'npm test')), null);
  assert.equal(guard.decide({ tool_name: 'mcp__dev-mcp__build_angular_project', tool_input: {}, cwd: root }), null);
});

test('decide_CwdInSubfolder_FindsTheSwitchAbove', () => {
  const root = hookedProject();
  const sub = path.join(root, 'web', 'src');
  fs.mkdirSync(sub, { recursive: true });
  assert.match(guard.decide(bash(sub, 'npm test')), /dv-angular:toolchain/);
});

test('initThenDecide_HookYes_RejectsAfterwardsAndHookNoDoesNot', () => {
  const yes = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  initProject({ cwd: yes, hook: 'ja', mcp: [] });
  assert.match(guard.decide(bash(yes, 'npm test')), /`dv-angular:toolchain`/);
  const no = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  initProject({ cwd: no, hook: 'nein', mcp: [] });
  assert.equal(guard.decide(bash(no, 'npm test')), null);
});

test('cli_RejectedCall_PrintsDenyDecisionAsJson', () => {
  const root = hookedProject();
  const result = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'npm test')), encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /dv-angular:toolchain/);
});

test('cli_AllowedCallOrBrokenInput_PrintsNothingAndExitsZero', () => {
  const root = hookedProject();
  const allowed = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'git status')), encoding: 'utf8' });
  assert.deepEqual([allowed.status, allowed.stdout], [0, '']);
  const broken = spawnSync(process.execPath, [SCRIPT], { input: '{ kaputt', encoding: 'utf8' });
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, '');
  assert.match(broken.stderr, /^dv-angular guard: /);
});

test('hooksJson_Matcher_CoversBashAndTheTwoMcpToolsButNotPowerShell', () => {
  const [entry] = JSON.parse(fs.readFileSync(HOOKS, 'utf8')).hooks.PreToolUse;
  const matcher = new RegExp(entry.matcher);
  for (const tool of ['Bash', 'mcp__dev-mcp__build_angular_project', 'mcp__dev-mcp__test_angular_project']) assert.ok(matcher.test(tool), tool);
  for (const tool of ['PowerShell', 'Read', 'mcp__dev-mcp__read_lines']) assert.ok(!matcher.test(tool), tool);
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js"');
});
