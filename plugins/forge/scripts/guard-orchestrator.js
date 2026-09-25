#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FILE_TOOLS = {
  Read: 'file_path', Edit: 'file_path', Write: 'file_path', MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
};
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js',
  'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js'];
const VALUE_FLAGS = new Set(['--rounds', '--spec', '--context', '--base']);
const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g;
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const DEFAULT_REASON = 'dv-forge-Orchestrator läuft: geschützte Dateien werden nur von SubAgents gelesen und geändert.';

const COMMANDS = {
  '/dv-forge:spec-review': {
    reason: 'dv-forge:spec-review läuft: Der Orchestrator liest und ändert die Spec nicht. '
      + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent spec-rework.',
    protect: ([spec]) => (spec ? [spec] : null),
  },
  '/dv-forge:plan-review': {
    reason: 'dv-forge:plan-review läuft: Der Orchestrator liest und ändert weder Plan noch Spec. '
      + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent plan-rework.',
    protect: ([plan, spec]) => (plan ? [plan, spec ?? path.join(path.dirname(plan), 'spec.md')] : null),
  },
  '/dv-forge:implementation-review': {
    reason: 'dv-forge:implementation-review läuft: Der Orchestrator liest weder Code noch Plan oder Spec. '
      + 'Prüfen übernehmen die Reviewer-Agents, Vorschläge der Agent implementation-review-scout.',
    protect: ([plan]) => (plan ? [{ path: plan, kind: 'repo' }] : null),
  },
};

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.json`);
}

function normalize(value) {
  const resolved = path.resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isWithin(filePath, dirPath) {
  const file = normalize(filePath);
  const dir = normalize(dirPath);
  return file === dir || file.startsWith(`${dir}/`);
}

function tokenize(text) {
  return [...String(text).matchAll(TOKEN)].map((match) => match[1] ?? match[2] ?? match[3]);
}

function positionalArguments(args) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (VALUE_FLAGS.has(args[index])) {
      index += 1;
      continue;
    }
    if (!args[index].startsWith('--')) result.push(args[index].replace(/^@/, ''));
  }
  return result;
}

function parseSkillCall(prompt) {
  const [command, ...args] = tokenize(String(prompt ?? '').trim());
  const entry = COMMANDS[command];
  if (!entry) return null;
  const files = entry.protect(positionalArguments(args));
  return files ? { command, files } : null;
}

function writeMarker(sessionId, marker, tmpRoot) {
  const file = markerPath(sessionId, tmpRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(marker));
}

function readMarker(sessionId, tmpRoot) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(sessionId, tmpRoot), 'utf8'));
  } catch {
    return null;
  }
}

function repoRootOf(file, fallback) {
  const result = spawnSync('git', ['-C', path.dirname(file), 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : path.resolve(fallback);
}

function toEntry(entry, cwd) {
  if (typeof entry === 'string') return { path: path.resolve(cwd, entry), kind: 'file' };
  const absolute = path.resolve(cwd, entry.path);
  return entry.kind === 'repo' ? { path: repoRootOf(absolute, cwd), kind: 'dir' } : { path: absolute, kind: entry.kind };
}

function onPrompt(input, tmpRoot) {
  const call = parseSkillCall(input.prompt);
  if (!call) return;
  const entries = call.files.map((entry) => toEntry(entry, input.cwd));
  writeMarker(input.session_id, { command: call.command, protected: entries }, tmpRoot);
}

function hitsEntry(target, entry) {
  return entry.kind === 'dir' ? isWithin(target, entry.path) : normalize(target) === normalize(entry.path);
}

function grepHitsEntry(searchRoot, entry) {
  return isWithin(entry.path, searchRoot) || (entry.kind === 'dir' && isWithin(searchRoot, entry.path));
}

function shellHitsEntry(command, entry) {
  const needle = entry.kind === 'dir'
    ? path.resolve(entry.path).replace(/\\/g, '/').toLowerCase()
    : path.basename(entry.path).toLowerCase();
  return command.includes(needle);
}

function touchesProtected(input, entries) {
  const toolInput = input.tool_input ?? {};
  if (input.tool_name === 'Grep') {
    const searchRoot = path.resolve(input.cwd, toolInput.path ?? '.');
    return entries.some((entry) => grepHitsEntry(searchRoot, entry));
  }
  if (Object.hasOwn(FILE_TOOLS, input.tool_name)) {
    const target = toolInput[FILE_TOOLS[input.tool_name]];
    if (!target) return false;
    const absolute = path.resolve(input.cwd, target);
    const readsOwnPluginFile = input.tool_name === 'Read' && isWithin(absolute, PLUGIN_ROOT);
    return entries.some((entry) => hitsEntry(absolute, entry) && !(entry.kind === 'dir' && readsOwnPluginFile));
  }
  if (SHELL_TOOLS.has(input.tool_name)) {
    const command = String(toolInput.command ?? '').toLowerCase().replace(/\\/g, '/');
    return !ALLOWED_SCRIPTS.some((script) => command.includes(script))
      && entries.some((entry) => shellHitsEntry(command, entry));
  }
  return false;
}

function decidePreTool(input, tmpRoot) {
  if (input.agent_id) return null;
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker || !Array.isArray(marker.protected)) return null;
  if (!touchesProtected(input, marker.protected)) return null;
  return COMMANDS[marker.command]?.reason ?? DEFAULT_REASON;
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

module.exports = { COMMANDS, PLUGIN_ROOT, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release };
