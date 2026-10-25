#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { onPrompt, onTurnEnd, clearMarker } = require('./lib/stage-guard');

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function main() {
  const [event] = process.argv.slice(2);
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'stop') return clearMarker(input.session_id);
  if (event === 'turn-end') {
    const reason = onTurnEnd(input);
    if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge stage-guard: ${error.message}\n`);
  }
}
