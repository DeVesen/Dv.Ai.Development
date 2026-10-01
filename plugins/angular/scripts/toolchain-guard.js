#!/usr/bin/env node
'use strict';

// PreToolUse-Hook von dv-angular: lehnt Build, Test und Lint über dev-mcp, ng und npm im Bash-Tool ab und nennt den Skill.
// Er greift nur, wenn das Projekt ihn über den Init eingerichtet hat (.claude/dv-angular.json).

const fs = require('node:fs');
const { hookEnabled } = require('./lib/project-setup');

const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };
const MCP_TOOL = /^mcp__.+__(?:build_angular_project|test_angular_project)$/;
const NG_CALL = /(?:^|[;&|(\n]|\$\()\s*(?:npx\s+)?(?:\S*[\\/])?ng(?:\.cmd)?\s+(?:build|test|lint)\b/;
const NPM_CALL = /(?:^|[;&|(\n]|\$\()\s*npm\s+(?:test\b|run\s+(?:build|test|lint)\b)/;
const MAX_COMMAND_LENGTH = 120;

// Beschreibt den abzulehnenden Aufruf oder gibt null zurück, wenn der Aufruf nicht zu Build, Test und Lint gehört.
function blockedAction(input) {
  if (MCP_TOOL.test(String(input.tool_name))) return input.tool_name;
  if (input.tool_name !== 'Bash') return null;
  const command = String(input.tool_input?.command ?? '').trim();
  return NG_CALL.test(command) || NPM_CALL.test(command) ? `Bash ${command.slice(0, MAX_COMMAND_LENGTH)}` : null;
}

function reasonFor(action) {
  return `${STACK.plugin}: Build, Test und Lint laufen über den Skill \`${STACK.skill}\` (Skill-Tool laden) und dessen Befehle im Bash-Tool. Abgelehnt: ${action}.`;
}

// Die Begründung der Ablehnung oder null, wenn der Aufruf erlaubt ist.
function decide(input) {
  const action = blockedAction(input);
  if (!action || !hookEnabled(input.cwd ?? process.cwd(), STACK)) return null;
  return reasonFor(action);
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

if (require.main === module) {
  try {
    writeDeny(decide(readStdinJson()));
  } catch (error) {
    // Ein Fehler im Hook darf die Arbeit nie blockieren.
    process.stderr.write(`${STACK.plugin} guard: ${error.message}\n`);
  }
}

module.exports = { decide, blockedAction };
