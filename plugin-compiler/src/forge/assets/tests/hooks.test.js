'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
const commandOf = (event) => hooks[event].flatMap((entry) => entry.hooks.map((hook) => hook.command));

test('hooksJson_Stop_RunsTurnEndOfGuardAndStageGuard', () => {
  assert.deepEqual(commandOf('Stop'), [
    'node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" turn-end',
    'node "${CLAUDE_PLUGIN_ROOT}/scripts/stage-guard.js" turn-end',
  ]);
});

test('hooksJson_StageGuard_ReadsBriefAtPromptAndClearsAtSessionEnd', () => {
  assert.ok(commandOf('UserPromptSubmit').includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/stage-guard.js" prompt'));
  assert.ok(commandOf('SessionEnd').includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/stage-guard.js" stop'));
});

test('hooksJson_SessionEndAndSubagentStop_KeepTheirGuardCommands', () => {
  assert.equal(commandOf('SessionEnd')[0], 'node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" stop');
  assert.equal(commandOf('SubagentStop')[0], 'node "${CLAUDE_PLUGIN_ROOT}/scripts/result-check.js"');
});
