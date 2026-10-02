'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
const commandOf = (event) => hooks[event].flatMap((entry) => entry.hooks.map((hook) => hook.command));

test('hooksJson_Stop_RunsTurnEndOfTheGuard', () => {
  assert.deepEqual(commandOf('Stop'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" turn-end']);
});

test('hooksJson_SessionEndAndSubagentStop_StayUnchanged', () => {
  assert.deepEqual(commandOf('SessionEnd'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" stop']);
  assert.deepEqual(commandOf('SubagentStop'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/result-check.js"']);
});
