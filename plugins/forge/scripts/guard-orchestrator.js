#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SKILL_CALL = /^\s*\/dv-forge:spec-review\s+(?:"([^"]+)"|'([^']+)'|(\S+))/;
const FILE_TOOLS = {
  Read: 'file_path', Edit: 'file_path', Write: 'file_path', MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path', Grep: 'path',
};
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js'];
const DENY_REASON = 'dv-forge:spec-review läuft: Der Orchestrator liest und ändert die Spec nicht. '
  + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent spec-rework.';

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.json`);
}

function samePath(a, b) {
  const normalize = (value) => {
    const resolved = path.resolve(value).replace(/\\/g, '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
}

function parseSpecArgument(prompt) {
  const match = SKILL_CALL.exec(String(prompt ?? ''));
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

function readMarker(sessionId, tmpRoot) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(sessionId, tmpRoot), 'utf8'));
  } catch {
    return null;
  }
}

function onPrompt(input, tmpRoot) {
  const specArgument = parseSpecArgument(input.prompt);
  if (!specArgument) return;
  const specPath = path.resolve(input.cwd, specArgument);
  const file = markerPath(input.session_id, tmpRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ specPath, specName: path.basename(specPath) }));
}

function touchesSpec(input, marker) {
  const toolInput = input.tool_input ?? {};
  if (Object.hasOwn(FILE_TOOLS, input.tool_name)) {
    const target = toolInput[FILE_TOOLS[input.tool_name]];
    return Boolean(target) && samePath(path.resolve(input.cwd, target), marker.specPath);
  }
  if (SHELL_TOOLS.has(input.tool_name)) {
    const command = String(toolInput.command ?? '').toLowerCase();
    return !ALLOWED_SCRIPTS.some((script) => command.includes(script)) && command.includes(marker.specName.toLowerCase());
  }
  return false;
}

function decidePreTool(input, tmpRoot) {
  if (input.agent_id) return null;
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker) return null;
  return touchesSpec(input, marker) ? DENY_REASON : null;
}

function release(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function main() {
  const [event, argument] = process.argv.slice(2);
  if (event === 'release') return release(argument);
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'pretool') return writeDeny(decidePreTool(input));
  if (event === 'stop') return release(input.session_id);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge guard: ${error.message}\n`);
  }
}

module.exports = { markerPath, parseSpecArgument, onPrompt, decidePreTool, release };
