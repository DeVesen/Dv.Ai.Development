'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate, orgArguments } = require('../scripts/lib/ado-guard-rules');
const { sessionMessage } = require('../scripts/ado-session');
const { VALID_CONFIG, makeRepo, makeTempDir, addWorktree, removeDir } = require('./helpers/ado-fixture');

const GUARD = path.join(__dirname, '..', 'scripts', 'ado-guard.js');
const SESSION = path.join(__dirname, '..', 'scripts', 'ado-session.js');

let configured;
let unconfigured;
let noGit;

test.before(() => {
  configured = makeRepo({ config: VALID_CONFIG });
  unconfigured = makeRepo();
  noGit = makeTempDir('ado-nogit-');
});

test.after(() => {
  for (const dir of [configured, unconfigured, noGit]) removeDir(dir);
});

function goodEnv(root = configured) {
  return { AZURE_CONFIG_DIR: path.join(root, '.claude', 'azure') };
}

function check(command, { cwd = configured, env = goodEnv() } = {}) {
  return evaluate({ command, cwd, env }).decision;
}

// Rule 1: login, logout, account set, account clear

for (const command of [
  'az login',
  'az login --tenant 11111111-2222-3333-4444-555555555555',
  'az logout',
  'az account set --subscription x',
  'az account clear',
  'AZ LOGIN',
  'az.cmd login',
  '/usr/bin/az login',
  'git status && az login',
  'az account show; az logout',
  'echo x | az login --use-device-code',
  'cd x\naz login',
  '& az login --tenant x',
  'Start-Process az -ArgumentList login; az login',
]) {
  test(`denies account change: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'deny');
    assert.equal(check(command, { cwd: unconfigured, env: {} }), 'deny');
  });
}

for (const command of [
  'az account show --query "{user:user.name, tenant:tenantId}" -o json',
  'az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv',
  'az account list -o json',
  'az version',
  'git log --grep "login"',
  'npm run lazy-login',
  'az loginx',
]) {
  test(`allows non-switching command: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'allow');
  });
}

// Rule 2: changes to AZURE_CONFIG_DIR

for (const command of [
  'AZURE_CONFIG_DIR=/tmp/x az boards query',
  'export AZURE_CONFIG_DIR=/tmp/x',
  'export AZURE_CONFIG_DIR="C:/other"',
  'unset AZURE_CONFIG_DIR',
  'unset -v AZURE_CONFIG_DIR',
  'export -n AZURE_CONFIG_DIR',
  'env -u AZURE_CONFIG_DIR az boards query',
  'env AZURE_CONFIG_DIR=/x az repos pr list',
  'git status && export AZURE_CONFIG_DIR=/x',
  '$env:AZURE_CONFIG_DIR = "C:\\other"',
  '$env:AZURE_CONFIG_DIR="C:\\other"; az boards query',
  '$Env:azure_config_dir = $null',
  '${env:AZURE_CONFIG_DIR} = "x"',
  'Remove-Item Env:AZURE_CONFIG_DIR',
  'Remove-Item -Path Env:\\AZURE_CONFIG_DIR',
  'ri env:AZURE_CONFIG_DIR',
  'Set-Item -Path Env:AZURE_CONFIG_DIR -Value x',
  'Clear-Item Env:AZURE_CONFIG_DIR',
  '[Environment]::SetEnvironmentVariable("AZURE_CONFIG_DIR", "x", "User")',
  "[System.Environment]::SetEnvironmentVariable('AZURE_CONFIG_DIR', $null)",
  'setx AZURE_CONFIG_DIR C:\\x',
]) {
  test(`denies AZURE_CONFIG_DIR change: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'deny');
    assert.equal(check(command, { cwd: unconfigured, env: {} }), 'deny');
  });
}

for (const command of [
  'echo $AZURE_CONFIG_DIR',
  'echo "$AZURE_CONFIG_DIR"',
  '[ "$AZURE_CONFIG_DIR" == "/x" ] && echo ok',
  '$env:AZURE_CONFIG_DIR',
  'Write-Output $env:AZURE_CONFIG_DIR',
  'if ($env:AZURE_CONFIG_DIR -eq "x") { "ok" }',
  'Get-Item Env:AZURE_CONFIG_DIR',
  'Get-ChildItem Env: | Where-Object Name -eq AZURE_CONFIG_DIR',
  'export AZURE_CONFIG_DIR',
]) {
  test(`allows reading AZURE_CONFIG_DIR: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'allow');
  });
}

// Rule 3: login script

for (const command of [
  'bash "/plugins/workitems/scripts/ado-login.sh"',
  '& "C:\\plugins\\workitems\\scripts\\ado-login.ps1"',
  'pwsh -File ado-login.ps1',
]) {
  test(`denies login script: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'deny');
  });
}

test('allows reading the login script source', () => {
  assert.equal(check('cat scripts/ado-login-notes.txt'), 'allow');
});

// Rule 4: DevOps calls need ado.json, the right config folder and the right org

test('allows a DevOps call in a configured project with the right env', () => {
  assert.equal(check('az boards work-item show --id 1 -o json'), 'allow');
  assert.equal(check('az repos pr list --status active -o json'), 'allow');
  assert.equal(check('az devops invoke --area wit --resource comments -o json'), 'allow');
  assert.equal(check('az pipelines runs list -o json'), 'allow');
});

test('allows a DevOps call from a worktree of the configured project', () => {
  const worktree = addWorktree(configured, 'guard');
  assert.equal(check('az boards query --wiql "x" -o json', { cwd: worktree }), 'allow');
});

test('denies a DevOps call when ado.json is missing', () => {
  const result = evaluate({ command: 'az boards work-item show --id 1', cwd: unconfigured, env: goodEnv(unconfigured) });
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /ado\.json fehlt/);
});

test('denies a DevOps call outside a git repository', () => {
  assert.equal(check('az repos pr list', { cwd: noGit, env: {} }), 'deny');
});

test('denies a DevOps call when ado.json is invalid', (t) => {
  const root = makeRepo({ config: { ...VALID_CONFIG, tenantId: 'nope' } });
  t.after(() => removeDir(root));
  const result = evaluate({ command: 'az boards query --wiql x', cwd: root, env: goodEnv(root) });
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /ungültig/);
});

test('denies a DevOps call when AZURE_CONFIG_DIR is not set', () => {
  const result = evaluate({ command: 'az boards work-item show --id 1', cwd: configured, env: {} });
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /nicht gesetzt/);
});

test('denies a DevOps call when AZURE_CONFIG_DIR points at another project', () => {
  assert.equal(check('az repos pr list', { env: goodEnv(unconfigured) }), 'deny');
});

test('denies a DevOps call when AZURE_CONFIG_DIR points at the global folder', () => {
  assert.equal(check('az repos pr list', { env: { AZURE_CONFIG_DIR: 'C:\\Users\\x\\.azure' } }), 'deny');
});

test('accepts AZURE_CONFIG_DIR in Git-Bash form', () => {
  const winPath = path.join(configured, '.claude', 'azure');
  if (!/^[a-z]:/i.test(winPath)) return;
  const bashPath = `/${winPath[0].toLowerCase()}${winPath.slice(2).replace(/\\/g, '/')}`;
  assert.equal(check('az repos pr list', { env: { AZURE_CONFIG_DIR: bashPath } }), 'allow');
});

for (const command of [
  'az boards work-item show --id 1 --org https://dev.azure.com/OtherOrg',
  'az boards work-item show --id 1 --organization https://dev.azure.com/OtherOrg',
  'az repos pr list --org=https://dev.azure.com/OtherOrg',
  'az repos pr list --org "https://dev.azure.com/OtherOrg/"',
  "az repos pr list --org 'https://dev.azure.com/OtherOrg'",
  'az boards query --wiql x --org https://dev.azure.com/ExampleOrg && az repos pr list --org https://dev.azure.com/OtherOrg',
]) {
  test(`denies foreign org: ${JSON.stringify(command)}`, () => {
    const result = evaluate({ command, cwd: configured, env: goodEnv() });
    assert.equal(result.decision, 'deny');
    assert.match(result.reason, /OtherOrg/);
  });
}

for (const command of [
  'az boards work-item show --id 1 --org https://dev.azure.com/ExampleOrg -o json',
  'az boards work-item show --id 1 --org https://dev.azure.com/exampleorg/',
  'az repos pr list --organization="https://dev.azure.com/ExampleOrg"',
  'az repos pr list --org "$ORG"',
  'az repos pr list --org $env:ADO_ORG',
]) {
  test(`allows own org or variable: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'allow');
  });
}

// Projects without ado.json: nothing outside rules 1-3 is touched

for (const command of ['git status', 'npm test', 'dotnet build', 'Get-ChildItem', 'az version', 'az account show', 'echo azure']) {
  test(`allows unrelated command without ado.json: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command, { cwd: unconfigured, env: {} }), 'allow');
    assert.equal(check(command, { cwd: noGit, env: {} }), 'allow');
  });
}

// Review findings: text is data, not a command

for (const command of [
  'git diff scripts/ado-login.ps1',
  'cat scripts/ado-login.sh',
  'git add scripts/ado-login.*',
  'git commit -m "fix ado-login.ps1 env restore"',
  'grep -rn "az login" skills/',
  'git commit -m "docs: az boards query beschrieben"',
  'Write-Host "az repos pr create"',
  'grep -n AZURE_CONFIG_DIR= README.md',
  '[ $AZURE_CONFIG_DIR = /c/x ]',
  'Copy-Item Env:AZURE_CONFIG_DIR Env:FOO',
  "cat <<'EOF' > notes.md\naz login\naz account set --subscription x\nEOF",
  "$text = @'\naz login\n'@",
]) {
  test(`allows text that only mentions a blocked command: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command, { cwd: unconfigured, env: {} }), 'allow');
  });
}

for (const command of [
  'az --only-show-errors login',
  'az --debug account set --subscription x',
  '"az" login',
  "'az' logout",
  'az \\\n  login',
  'az `\n  login',
  'pwsh -NoProfile -File "C:\\Program Files\\x\\ado-login.ps1"',
  '. ./ado-login.sh',
  'cd x && ./scripts/ado-login.sh',
]) {
  test(`denies hidden account change or login script: ${JSON.stringify(command)}`, () => {
    assert.equal(check(command), 'deny');
  });
}

test('denies a foreign org behind global flags', () => {
  assert.equal(check('az --only-show-errors boards query --wiql x --org https://dev.azure.com/OtherOrg'), 'deny');
});

test('denies a foreign default org', () => {
  const result = evaluate({
    command: 'az devops configure --defaults organization=https://dev.azure.com/OtherOrg project=X',
    cwd: configured,
    env: goodEnv(),
  });
  assert.equal(result.decision, 'deny');
  assert.match(result.reason, /OtherOrg/);
});

test('allows the own default org', () => {
  assert.equal(check('az devops configure --defaults organization="https://dev.azure.com/ExampleOrg" project="Example Project"'), 'allow');
});

test('denies a DevOps call with a cleared environment', () => {
  assert.equal(check('env -i az boards query --wiql x'), 'deny');
});

test('allows a DevOps call whose quoted text mentions az login', () => {
  assert.equal(check('az boards work-item update --id 1 --discussion "bitte nicht az login ausführen" -o json'), 'allow');
});

test('allows a missing or non-string command', () => {
  assert.equal(evaluate({ command: undefined, cwd: configured, env: {} }).decision, 'allow');
  assert.equal(evaluate({ command: 42, cwd: configured, env: {} }).decision, 'allow');
});

test('orgArguments reads all forms', () => {
  assert.deepEqual(orgArguments('x --org a --organization=b --org "c d" --org \'e\''), ['a', 'b', 'c d', 'e']);
});

// Hook process: input and output contract

function runHook(script, input, env = {}) {
  return spawnSync(process.execPath, [script], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, AZURE_CONFIG_DIR: '', ...env },
  });
}

test('hook prints a deny decision for az login', () => {
  const result = runHook(GUARD, { cwd: unconfigured, tool_name: 'PowerShell', tool_input: { command: 'az login' } });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /ado-login/);
});

test('hook prints nothing for an allowed command', () => {
  const result = runHook(GUARD, { cwd: configured, tool_name: 'Bash', tool_input: { command: 'git status' } });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('hook uses the process env for the config folder check', () => {
  const input = { cwd: configured, tool_name: 'Bash', tool_input: { command: 'az repos pr list -o json' } };
  assert.equal(runHook(GUARD, input, goodEnv()).stdout, '');
  assert.match(runHook(GUARD, input).stdout, /"deny"/);
});

test('hook lets the command through on broken input', () => {
  const result = runHook(GUARD, 'not json');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /durchgelassen/);
});

// SessionStart hook

test('session message is empty without ado.json', () => {
  assert.equal(sessionMessage(unconfigured, {}), null);
  assert.equal(sessionMessage(noGit, {}), null);
});

test('session message names org and project when the env is right', () => {
  const message = sessionMessage(configured, goodEnv());
  assert.match(message, /ExampleOrg/);
  assert.doesNotMatch(message, /WARNUNG/);
});

test('session message warns when the env is wrong', () => {
  assert.match(sessionMessage(configured, {}), /WARNUNG/);
});

test('session hook prints additionalContext', () => {
  const result = runHook(SESSION, { cwd: configured, hook_event_name: 'SessionStart' }, goodEnv());
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(output.hookSpecificOutput.additionalContext, /ado-cli/);
});
