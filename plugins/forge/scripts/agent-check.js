#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { agentProblem } = require('./lib/agent-check');
const { mayBlock, release } = require('./lib/block-budget');

// Blockt höchstens zweimal je Sub-Agent; ohne agent_id nur einmal (stop_hook_active beendet es).
function decide(input, tmpRoot) {
  const problem = agentProblem(input);
  const key = input.agent_id;
  if (!problem) {
    if (key) release(key, tmpRoot);
    return null;
  }
  if (key ? !mayBlock(key, input.stop_hook_active, tmpRoot) : input.stop_hook_active) return null;
  return { decision: 'block', reason: `dv-forge: ${problem}` };
}

function main() {
  const raw = fs.readFileSync(0, 'utf8');
  const decision = decide(raw.trim() === '' ? {} : JSON.parse(raw));
  if (decision) process.stdout.write(JSON.stringify(decision));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge agent-check: ${error.message}\n`);
  }
}

module.exports = { decide };
