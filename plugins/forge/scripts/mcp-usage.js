#!/usr/bin/env node
'use strict';

// Wertet das Session-Transkript aus: welche MCP-Server und nativen Tools
// wurden wie oft, von wem und mit welchem Ergebnis aufgerufen.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readEntries } = require('./lib/transcript');

const MCP_TOOL = /^mcp__(.+?)__(.+)$/;
const NATIVE_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'PowerShell', 'Edit', 'Write', 'MultiEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const AGENT_TOOLS = new Set(['Agent', 'Task']);
const SHELL_FALLBACK = /(?:^|&&|;|\|\|)\s*(dotnet|ng|npm|npx|pnpm|yarn|git\s+mv)\b/;
const READ_TOOLS = new Set(['Read', 'Grep', 'Glob']);
const READ_COMMANDS = new Set(['cat', 'head', 'tail', 'less', 'more', 'grep', 'egrep', 'rg', 'find', 'ls', 'sed', 'awk', 'wc',
  'get-content', 'gc', 'select-string', 'sls', 'get-childitem', 'gci', 'dir', 'type', 'findstr']);
const SHELL_KEYWORD = /^(?:do|then|else)\s+/;
const MAIN_AGENT = 'Hauptagent';
const MAX_FALLBACK_LINES = 10;
const USAGE = 'Aufruf: node mcp-usage.js (--session <id> | --transcript <pfad>) [--expect <server,...>] [--cwd <pfad>]\n';

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { expect: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!['--session', '--transcript', '--expect', '--cwd'].includes(flag) || value === undefined) {
      throw new UsageError(USAGE);
    }
    if (flag === '--expect') args.expect = value.split(',').map((name) => name.trim()).filter(Boolean);
    else args[flag.slice(2)] = value;
    index += 1;
  }
  if (!args.session && !args.transcript) throw new UsageError(USAGE);
  return args;
}

function configDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function findTranscript(sessionId, projectsDir = path.join(configDir(), 'projects')) {
  const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
  const hit = dirs.map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`)).find((file) => fs.existsSync(file));
  if (!hit) throw new UsageError(`Transkript zur Session ${sessionId} nicht gefunden unter ${projectsDir}\n`);
  return hit;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function contentBlocks(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) ? content : [];
}

function subagentFiles(transcript) {
  const dir = path.join(transcript.replace(/\.jsonl$/, ''), 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => path.join(dir, name));
}

function agentIdOf(file) {
  return path.basename(file, '.jsonl').replace(/^agent-/, '');
}

function agentTypesFromMain(entries) {
  const typeByToolUse = new Map();
  const typeByAgent = new Map();
  for (const entry of entries) {
    for (const block of contentBlocks(entry)) {
      if (block.type === 'tool_use' && AGENT_TOOLS.has(block.name)) {
        typeByToolUse.set(block.id, block.input?.subagent_type || 'general-purpose');
      }
      if (block.type === 'tool_result' && typeByToolUse.has(block.tool_use_id) && entry.toolUseResult?.agentId) {
        typeByAgent.set(entry.toolUseResult.agentId, typeByToolUse.get(block.tool_use_id));
      }
    }
  }
  return typeByAgent;
}

function agentLabel(agentId, file, typeByAgent) {
  const meta = file ? readJson(file.replace(/\.jsonl$/, '.meta.json')) : null;
  return meta?.agentType || typeByAgent.get(agentId) || `SubAgent ${String(agentId).slice(0, 8)}`;
}

function collectCalls(entries, labelOf) {
  const calls = new Map();
  for (const entry of entries) {
    const agent = labelOf(entry);
    for (const block of contentBlocks(entry)) {
      if (block.type === 'tool_use') {
        calls.set(block.id, { name: block.name, input: block.input ?? {}, agent, error: false });
      }
      if (block.type === 'tool_result' && calls.has(block.tool_use_id) && block.is_error) {
        calls.get(block.tool_use_id).error = true;
      }
    }
  }
  return [...calls.values()];
}

function availableServers(entries) {
  const servers = new Set();
  for (const entry of entries) {
    const attachment = entry.attachment ?? {};
    if (attachment.type === 'mcp_instructions_delta') (attachment.addedNames ?? []).forEach((name) => servers.add(name));
    if (attachment.type === 'deferred_tools_delta') {
      (attachment.addedNames ?? []).map((name) => name.match(MCP_TOOL)?.[1]).filter(Boolean).forEach((name) => servers.add(name));
    }
  }
  return servers;
}

function configuredServers(cwd) {
  const config = cwd ? readJson(path.join(cwd, '.mcp.json')) : null;
  return Object.keys(config?.mcpServers ?? {});
}

// entries/keepSubagent schränken auf einen Ausschnitt der Session ein; ohne sie zählt die ganze Session.
function loadSession(transcript, { entries, keepSubagent = () => true } = {}) {
  const all = readEntries(transcript);
  const main = entries ?? all;
  const typeByAgent = agentTypesFromMain(all);
  const inlineLabel = (entry) => (entry.isSidechain && entry.agentId
    ? agentLabel(entry.agentId, null, typeByAgent) : MAIN_AGENT);
  const calls = collectCalls(main, inlineLabel);
  let subagentCount = 0;
  for (const file of subagentFiles(transcript)) {
    const agentEntries = readEntries(file);
    if (!keepSubagent(agentEntries)) continue;
    subagentCount += 1;
    const label = agentLabel(agentIdOf(file), file, typeByAgent);
    calls.push(...collectCalls(agentEntries, () => label));
  }
  const cwd = all.find((entry) => entry.cwd)?.cwd;
  return { calls, available: availableServers(all), cwd, subagentCount };
}

function simplify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sameServer(used, wanted) {
  const [a, b] = [simplify(used), simplify(wanted)];
  return a === b || a.endsWith(b);
}

function increment(map, key, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

// Shell-Aufruf, der wie Read, Grep oder Glob Dateien liest oder durchsucht: ein Glied der Befehlskette beginnt mit einem Lese-Befehl.
function isReadFallback(command) {
  return command.split(/&&|\|\||;|\n/).map((segment) => segment.trim().replace(SHELL_KEYWORD, ''))
    .some((segment) => READ_COMMANDS.has((segment.split(/\s+/)[0] ?? '').toLowerCase()));
}

function countRead(reads, call) {
  if (READ_TOOLS.has(call.name)) reads[call.name] += 1;
  if (SHELL_TOOLS.has(call.name) && isReadFallback(String(call.input.command ?? ''))) reads.shell += 1;
}

function summarize(calls) {
  const servers = new Map();
  const native = new Map();
  const fallbacks = [];
  const reads = { Read: 0, Grep: 0, Glob: 0, shell: 0 };
  const seen = new Set();
  for (const call of calls) {
    countRead(reads, call);
    const mcp = call.name.match(MCP_TOOL);
    const key = mcp ? mcp[1] : call.name;
    const target = mcp ? servers : NATIVE_TOOLS.has(call.name) ? native : null;
    if (!target) continue;
    if (!target.has(key)) target.set(key, { calls: 0, errors: 0, repeats: 0, tools: new Map(), agents: new Map() });
    const row = target.get(key);
    const signature = `${call.agent}\u0000${call.name}\u0000${JSON.stringify(call.input)}`;
    row.calls += 1;
    row.errors += call.error ? 1 : 0;
    row.repeats += seen.has(signature) ? 1 : 0;
    seen.add(signature);
    if (mcp) increment(row.tools, mcp[2]);
    increment(row.agents, call.agent);
    const command = String(call.input.command ?? '');
    if (SHELL_TOOLS.has(call.name) && SHELL_FALLBACK.test(command)) fallbacks.push({ agent: call.agent, command });
  }
  return { servers, native, fallbacks, reads };
}

function listCounts(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} (${count})`).join(', ');
}

function dash(value) {
  return value === 0 ? '–' : String(value);
}

function oneLine(command) {
  const line = command.replace(/\s+/g, ' ').trim();
  return line.length > 100 ? `${line.slice(0, 97)}...` : line;
}

// Kennzahlen der MCP-Nutzung. Erwartet sind nur die übergebenen Server; konfigurierte und angebotene gelten als verfügbar.
function measure({ calls, available, cwd }, { expect = [] } = {}) {
  const summary = summarize(calls);
  const used = [...summary.servers.keys()];
  const isUsed = (name) => used.some((server) => sameServer(server, name));
  const expected = [...new Set(expect)];
  const offered = [...new Set([...available, ...configuredServers(cwd)])];
  const expectedUnused = expected.filter((name) => !isUsed(name));
  const availableUnused = offered.filter((name) => !isUsed(name) && !expected.some((wanted) => sameServer(name, wanted)));
  return { ...summary, used, expectedUnused, availableUnused };
}

function render(session, { expect = [], transcript }) {
  const { servers, native, fallbacks, reads, used, expectedUnused, availableUnused } = measure(session, { expect });
  const mcpTotal = used.reduce((sum, name) => sum + servers.get(name).calls, 0);

  const lines = [
    '## MCP-Nutzung (gemessen)',
    '',
    `Quelle: \`${transcript}\` · Hauptagent + ${session.subagentCount} SubAgent(s) · ${session.calls.length} Tool-Aufrufe, davon ${mcpTotal} MCP`,
    '',
    '| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const name of used.sort((a, b) => servers.get(b).calls - servers.get(a).calls)) {
    const row = servers.get(name);
    lines.push(`| ${name} | genutzt | ${row.calls} | ${dash(row.errors)} | ${dash(row.repeats)} | ${listCounts(row.tools)} | ${listCounts(row.agents)} |`);
  }
  for (const name of expectedUnused) lines.push(`| ${name} | **erwartet, ungenutzt** | 0 | – | – | – | – |`);
  if (used.length === 0 && expectedUnused.length === 0) lines.push('| – | keine MCP-Calls | 0 | – | – | – | – |');
  if (expectedUnused.length > 0) {
    lines.push('', `Ersatz-Kandidaten für ungenutzte erwartete MCP: Read ${reads.Read}, Grep ${reads.Grep}, Glob ${reads.Glob}, Shell-Fallbacks ${reads.shell} (Shell-Aufrufe, die Dateien lesen oder durchsuchen)`);
  }
  if (availableUnused.length > 0) lines.push('', `Verfügbar, aber ungenutzt: ${availableUnused.sort().join(', ')}`);

  lines.push('', '### Native Tools', '', '| Tool | Aufrufe | Fehler | Wiederholt | Agents |', '|---|---|---|---|---|');
  if (native.size === 0) lines.push('| – | 0 | – | – | – |');
  for (const [name, row] of [...native.entries()].sort((a, b) => b[1].calls - a[1].calls)) {
    lines.push(`| ${name} | ${row.calls} | ${dash(row.errors)} | ${dash(row.repeats)} | ${listCounts(row.agents)} |`);
  }

  lines.push('', `### Shell-Fallback-Kandidaten (${fallbacks.length})`, '');
  if (fallbacks.length === 0) lines.push('Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.');
  for (const { agent, command } of fallbacks.slice(0, MAX_FALLBACK_LINES)) lines.push(`- ${agent}: \`${oneLine(command)}\``);
  if (fallbacks.length > MAX_FALLBACK_LINES) lines.push(`- … und ${fallbacks.length - MAX_FALLBACK_LINES} weitere`);
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const transcript = args.transcript ?? findTranscript(args.session);
    const session = loadSession(transcript);
    if (args.cwd) session.cwd = args.cwd;
    process.stdout.write(render(session, { expect: args.expect, transcript }));
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(error.message);
    process.exit(error.message === USAGE ? 2 : 1);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, findTranscript, loadSession, summarize, measure, render, sameServer };
