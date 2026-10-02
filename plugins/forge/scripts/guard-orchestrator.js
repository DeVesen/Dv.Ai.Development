#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { mustShowOf, decideTurnEnd } = require('./lib/must-show');
const { turnText } = require('./lib/turn-text');

const FILE_TOOLS = {
  Read: 'file_path', Edit: 'file_path', Write: 'file_path', MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
};
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js', 'review-flow.js',
  'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js', 'prepare.js', 'forge-config.js', 'work.js', 'ledger.js', 'followup.js'];
const VALUE_FLAGS = new Set(['--rounds', '--spec', '--context', '--base']);
const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g;
const DIR_ALLOWED_SCRIPTS = [...ALLOWED_SCRIPTS, 'guard-orchestrator.js'];
const TOPLEVEL_QUERY = 'git rev-parse --show-toplevel';
const ABSOLUTE_PATH = /(?<![a-z])[a-z]:[\\/].*|(?<![\w.~-])\/(?!\/).*/i;
const GIT_BASH_DRIVE = /^\/([a-z])(?=\/|$)/i;
const CHAINING = /[;&|`<>\r\n]|\$\(/;
const HEREDOC_START = /\s<<(?:'([A-Za-z_]\w*)'|([A-Za-z_]\w*))\s*$/;
const UNQUOTED_EXPANSION = /`|\$\(/;
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const REVIEW_AGENT = /^dv-forge:(?:(?:spec|plan|implementation)-review-[a-z-]+|(?:spec|plan)-rework)$/;
const WORKSPACE_SEGMENT = /\/\.forge\//;
const WORKSPACE_REASON = 'dv-forge: Review- und Nacharbeits-Agents schreiben mit Write nur in den Arbeitsbereich .forge/. '
  + 'Schreib dein Ergebnis an den Pfad aus deinem Auftrag (Zeile Ergebnis:).';
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
    protect: ([plan, spec], cwd) => (plan ? [plan, spec ?? specOfPlan(path.resolve(cwd ?? '.', plan))] : null),
  },
  '/dv-forge:implementation-review': {
    reason: 'dv-forge:implementation-review läuft: Der Orchestrator liest weder Code noch Plan oder Spec. '
      + 'Prüfen übernehmen die Reviewer-Agents, Vorschläge der Agent implementation-review-scout.',
    protect: ([plan]) => (plan ? [{ path: plan, kind: 'repo' }] : null),
  },
  '/dv-forge:review-followup': {
    reason: 'dv-forge:review-followup läuft: Der Orchestrator liest und ändert weder Artefakt, Spec noch Code. '
      + 'Umsetzen übernehmen Nacharbeiter bzw. Umsetzer, Prüfen die Reviewer-Agents.',
    protect: ([artifact], cwd) => (artifact ? followupEntries(path.resolve(cwd ?? '.', artifact), cwd) : null),
  },
};

const HARNESS_NOTICE = /<(?:task-notification|agent-message|system-reminder)\b/;
const ALLOWED_WAYS = 'Erlaubt sind: ein einzelner Aufruf node "<PLUGIN>/scripts/<script>.js" ohne Verkettung, '
  + '`git rev-parse --show-toplevel` und das Lesen von Plugin-Dateien. Die geschützten Dateien lesen und ändern nur SubAgents.';

function specOfPlan(planPath) {
  const beside = path.join(path.dirname(planPath), 'spec.md');
  try {
    const { resolveSpec } = require('./prepare');
    return resolveSpec(planPath, undefined, gitToplevel(path.dirname(planPath), path.dirname(planPath)));
  } catch {
    return beside;
  }
}

// Schützt dasselbe wie das Review, dessen Sicherung der Followup nutzt; ohne Sicherung scheitert prepare.js ohnehin.
function followupEntries(artifact, cwd) {
  let saved;
  try {
    saved = require('./followup').resolveFollowup(artifact, gitToplevel(path.dirname(artifact), cwd ?? '.'));
  } catch {
    return null;
  }
  if (!saved) return null;
  if (saved.role === 'spec-review') return [artifact];
  if (saved.role === 'plan-review') return [artifact, specOfPlan(artifact)];
  return [{ path: artifact, kind: 'repo' }];
}

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.json`);
}

function normalize(value) {
  const resolved = path.resolve(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isWithin(filePath, dirPath) {
  const file = canonicalPath(filePath);
  const dir = canonicalPath(dirPath);
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

function parseSkillCall(prompt, cwd) {
  const [command, ...args] = tokenize(String(prompt ?? '').trim());
  const entry = COMMANDS[command];
  if (!entry) return null;
  const files = entry.protect(positionalArguments(args), cwd);
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

function gitToplevel(dir, fallback) {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : path.resolve(fallback);
}

function fromGitBashDrive(value) {
  return process.platform === 'win32' ? value.replace(GIT_BASH_DRIVE, '$1:') : value;
}

function canonicalPath(value) {
  let existing = path.resolve(fromGitBashDrive(String(value).replace(/\\/g, '/')));
  const missing = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return normalize(value);
    missing.unshift(path.basename(existing));
    existing = parent;
  }
  return normalize(path.join(fs.realpathSync.native(existing), ...missing));
}

function uniqueDirectories(dirs) {
  const keys = dirs.map(canonicalPath);
  return dirs.filter((dir, index) => keys.indexOf(keys[index]) === index).map((dir) => ({ path: dir, kind: 'dir' }));
}

function repoEntries(plan, cwd) {
  const cwdTop = gitToplevel(cwd, cwd);
  return uniqueDirectories([gitToplevel(path.dirname(plan), cwdTop), cwdTop]);
}

function toEntries(entry, cwd) {
  if (typeof entry === 'string') return [{ path: path.resolve(cwd, entry), kind: 'file' }];
  const absolute = path.resolve(cwd, entry.path);
  return entry.kind === 'repo' ? repoEntries(absolute, cwd) : [{ path: absolute, kind: entry.kind }];
}

function onPrompt(input, tmpRoot) {
  const call = parseSkillCall(input.prompt, input.cwd);
  if (call) {
    const entries = call.files.flatMap((entry) => toEntries(entry, input.cwd));
    writeMarker(input.session_id, { command: call.command, protected: entries }, tmpRoot);
    return;
  }
  if (HARNESS_NOTICE.test(String(input.prompt ?? ''))) return;
  // Beim Anhalten für Fragen an den Menschen bleibt der Guard für genau eine Antwort bestehen.
  const marker = readMarker(input.session_id, tmpRoot);
  if (marker?.paused) {
    // Ein offener Pflichttext gehört zum Turn, der ihn registriert hat; jede Menschen-Eingabe macht ihn hinfällig.
    const { mustShow: _verfallen, ...geschuetzt } = marker;
    writeMarker(input.session_id, { ...geschuetzt, paused: false }, tmpRoot);
    return;
  }
  clearMarker(input.session_id, tmpRoot);
}

function hitsEntry(target, entry) {
  return entry.kind === 'dir' ? isWithin(target, entry.path) : canonicalPath(target) === canonicalPath(entry.path);
}

function grepHitsEntry(searchRoot, entry) {
  return isWithin(entry.path, searchRoot) || (entry.kind === 'dir' && isWithin(searchRoot, entry.path));
}

function shellHitsFile(command, entry) {
  return command.includes(path.basename(entry.path).toLowerCase());
}

function isPluginRead(rawCommand) {
  if (CHAINING.test(rawCommand)) return false;
  const args = tokenize(rawCommand).slice(1).filter((token) => !token.startsWith('-'));
  const root = canonicalPath(PLUGIN_ROOT);
  return args.length > 0 && args.every((token) => ABSOLUTE_PATH.test(token) && token.match(ABSOLUTE_PATH)[0] === token
    && isWithin(canonicalPath(token), root));
}

function shellTouchesFiles(rawCommand, entries) {
  const command = rawCommand.toLowerCase().replace(/\\/g, '/');
  return !ALLOWED_SCRIPTS.some((script) => command.includes(script))
    && entries.some((entry) => shellHitsFile(command, entry));
}

function namedPaths(command) {
  return tokenize(command)
    .map((token) => token.match(ABSOLUTE_PATH)?.[0])
    .filter(Boolean)
    .map(canonicalPath);
}

function isInsideAny(target, roots) {
  return roots.some((root) => isWithin(target, root));
}

function isAllowedScriptPath(script) {
  const match = String(script ?? '').replace(/\\/g, '/').match(/\/scripts\/([^/]+)$/);
  return Boolean(match) && DIR_ALLOWED_SCRIPTS.includes(match[1].toLowerCase());
}

function isSingleScriptInvocation(line) {
  if (CHAINING.test(line)) return false;
  const [program, script] = tokenize(line);
  return program === 'node' && isAllowedScriptPath(script);
}

function isClosedHeredoc(lines, [, quotedTerm, bareTerm]) {
  const end = lines.indexOf(quotedTerm ?? bareTerm);
  if (end === -1 || lines.slice(end + 1).some((line) => line.trim() !== '')) return false;
  return quotedTerm !== undefined || !lines.slice(0, end).some((line) => UNQUOTED_EXPANSION.test(line));
}

function isPluginScriptCall(command) {
  const [firstLine, ...body] = command.split(/\r?\n/);
  const heredoc = firstLine.match(HEREDOC_START);
  if (!heredoc) return body.length === 0 && isSingleScriptInvocation(firstLine);
  return isSingleScriptInvocation(firstLine.slice(0, heredoc.index)) && isClosedHeredoc(body, heredoc);
}

function isPermittedInProtectedDir(rawCommand) {
  const command = rawCommand.trim();
  return command === TOPLEVEL_QUERY || isPluginScriptCall(command) || isPluginRead(command);
}

function shellTouchesDirectories(rawCommand, cwd, entries) {
  if (entries.length === 0) return false;
  const roots = entries.map((entry) => canonicalPath(entry.path));
  const targets = [canonicalPath(cwd ?? '.'), ...namedPaths(rawCommand)];
  const concerned = targets.some((target) => isInsideAny(target, roots));
  return concerned && !isPermittedInProtectedDir(rawCommand);
}

function shellTouchesProtected(input, entries) {
  const command = String(input.tool_input?.command ?? '');
  const files = entries.filter((entry) => entry.kind !== 'dir');
  const dirs = entries.filter((entry) => entry.kind === 'dir');
  if (isPluginRead(command.trim())) return false;
  return shellTouchesFiles(command, files) || shellTouchesDirectories(command, input.cwd, dirs);
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
  if (SHELL_TOOLS.has(input.tool_name)) return shellTouchesProtected(input, entries);
  return false;
}

function writesOutsideWorkspace(input) {
  if (input.tool_name !== 'Write' || !REVIEW_AGENT.test(String(input.agent_type ?? ''))) return false;
  const target = input.tool_input?.file_path;
  return !target || !WORKSPACE_SEGMENT.test(normalize(path.resolve(input.cwd ?? '.', target)));
}

function decidePreTool(input, tmpRoot) {
  if (input.agent_id) return writesOutsideWorkspace(input) ? WORKSPACE_REASON : null;
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker || !Array.isArray(marker.protected)) return null;
  if (!touchesProtected(input, marker.protected)) return null;
  return `${COMMANDS[marker.command]?.reason ?? DEFAULT_REASON} Geblockt: ${blockedAction(input)}. ${ALLOWED_WAYS}`;
}

function blockedAction(input) {
  const toolInput = input.tool_input ?? {};
  const target = toolInput.command ?? toolInput[FILE_TOOLS[input.tool_name]] ?? toolInput.path ?? toolInput.pattern ?? '';
  const text = String(target).replace(/\s+/g, ' ').trim();
  return `${input.tool_name} ${text.length > 120 ? `${text.slice(0, 117)}...` : text}`.trim();
}

function clearMarker(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

// Gibt den Schutz frei; ein vorgemerkter Pflichttext bleibt für den Stop-Check am Zugende.
function release(sessionId, tmpRoot) {
  const marker = readMarker(sessionId, tmpRoot);
  if (marker?.mustShow) writeMarker(sessionId, { mustShow: marker.mustShow }, tmpRoot);
  else clearMarker(sessionId, tmpRoot);
}

function pause(sessionId, tmpRoot) {
  const marker = readMarker(sessionId, tmpRoot);
  if (marker) writeMarker(sessionId, { ...marker, paused: true }, tmpRoot);
}

function show(sessionId, file, tmpRoot) {
  if (!file) throw new Error('show braucht --file <datei>');
  const mustShow = mustShowOf(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), file);
  if (mustShow.anchors.length === 0) throw new Error(`keine Anker in ${file}`);
  writeMarker(sessionId, { ...(readMarker(sessionId, tmpRoot) ?? {}), mustShow }, tmpRoot);
}

// Das Anhalten gilt auch dann, wenn der Pflichttext nicht vorgemerkt werden kann.
function pauseWithShow(sessionId, file, tmpRoot) {
  pause(sessionId, tmpRoot);
  if (file) show(sessionId, file, tmpRoot);
}

function storeAfterTurn(sessionId, marker, mustShow, tmpRoot) {
  const next = { ...marker };
  delete next.mustShow;
  if (mustShow) next.mustShow = mustShow;
  if (Object.keys(next).length === 0) clearMarker(sessionId, tmpRoot);
  else writeMarker(sessionId, next, tmpRoot);
}

// Block-Grund, wenn der vorgemerkte Pflichttext im Zugtext fehlt; sonst `null`.
function onTurnEnd(input, tmpRoot) {
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker?.mustShow) return null;
  const shown = turnText(input.transcript_path, input.last_assistant_message);
  const { reason, mustShow } = decideTurnEnd(marker.mustShow, shown);
  storeAfterTurn(input.session_id, marker, mustShow, tmpRoot);
  return reason;
}

function writeBlock(reason) {
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
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
  const [event, argument, ...rest] = process.argv.slice(2);
  if (event === 'release') return release(argument);
  if (event === 'pause') return pauseWithShow(argument, flagValue(rest, '--show'));
  if (event === 'show') return show(argument, flagValue(rest, '--file'));
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'pretool') return writeDeny(decidePreTool(input));
  if (event === 'turn-end') return writeBlock(onTurnEnd(input));
  if (event === 'stop') return clearMarker(input.session_id);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge guard: ${error.message}\n`);
  }
}

module.exports = {
  COMMANDS, PLUGIN_ROOT, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release, clearMarker, pause, pauseWithShow, show, onTurnEnd,
};
