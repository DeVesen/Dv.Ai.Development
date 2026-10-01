#!/usr/bin/env node
'use strict';

// PreToolUse-Hook von dv-dotnet: lehnt Build und Test über dev-mcp und über dotnet im Bash-Tool ab und nennt den Skill.
// Er greift nur, wenn das Projekt ihn über den Init eingerichtet hat (.claude/dv-dotnet.json).

const fs = require('node:fs');
const { hookEnabled } = require('./lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };
const MCP_TOOL = /^mcp__.+__(?:build_dotnet_solution|test_dotnet_solution)$/;
const DOTNET_CALL = /(?:^|[;&|(\n]|\$\()\s*(?:\S*[\\/])?dotnet(?:\.exe)?\s+(?:build|test)\b/;
const MAX_COMMAND_LENGTH = 120;

// Beschreibt den abzulehnenden Aufruf oder gibt null zurück, wenn der Aufruf nicht zu Build und Test gehört.
function blockedAction(input) {
  if (MCP_TOOL.test(String(input.tool_name))) return input.tool_name;
  if (input.tool_name !== 'Bash') return null;
  const command = String(input.tool_input?.command ?? '').trim();
  return DOTNET_CALL.test(command) ? `Bash ${command.slice(0, MAX_COMMAND_LENGTH)}` : null;
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
