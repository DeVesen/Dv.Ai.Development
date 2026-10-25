#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { decideStart } = require('./lib/stage-start-guard');

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function main() {
  const reason = decideStart(readStdinJson());
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge start-guard: ${error.message}\n`);
  }
}
