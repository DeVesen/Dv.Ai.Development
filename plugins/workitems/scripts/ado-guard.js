#!/usr/bin/env node
'use strict';

// PreToolUse hook for the Bash and PowerShell tools: enforces the per-project
// Azure DevOps identity. Fail-open on its own errors, so a broken hook input
// never blocks unrelated shell commands.

const { evaluate } = require('./lib/ado-guard-rules');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch (error) {
    process.stderr.write(`ado-guard: Hook-Eingabe nicht lesbar, Befehl wird durchgelassen (${error.message})\n`);
    return;
  }
  const command = input?.tool_input?.command;
  const cwd = input?.cwd || process.cwd();
  const result = evaluate({ command, cwd, env: process.env });
  if (result.decision !== 'deny') return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: result.reason,
      },
    }),
  );
}

main().catch((error) => {
  process.stderr.write(`ado-guard: interner Fehler, Befehl wird durchgelassen (${error.message})\n`);
});
