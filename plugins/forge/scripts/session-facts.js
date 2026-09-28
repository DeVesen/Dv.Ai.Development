#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mcpUsage = require('./mcp-usage.js');

const USAGE = 'Aufruf: node session-facts.js [--file <session.jsonl>] [--cwd <projektordner>] [--expect <mcp-server,...>]\n';
const NOTICE = /^\s*<(?:task-notification|agent-message|system-reminder|command-|local-command)/;
const DENIAL = /denied|blocked|Permission|hook/i;

class FactsError extends Error {}

function projectDir(cwd, home = os.homedir()) {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^A-Za-z0-9]/g, '-'));
}

function newestSession(dir) {
  if (!fs.existsSync(dir)) throw new FactsError(`Kein Session-Ordner: ${dir}`);
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl'))
    .map((name) => path.join(dir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (files.length === 0) throw new FactsError(`Keine Session-Datei in ${dir}`);
  return files[0];
}

function readEntries(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim() !== '').flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('\n');
}

function tokensOf(usage = {}) {
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  return { input, cached: usage.cache_read_input_tokens ?? 0, output: usage.output_tokens ?? 0 };
}

function shortError(text) {
  return textOf(text).replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Kurzform eines Aufrufs für die Sparpotenzial-Liste: Tool plus wichtigstes Argument.
function callLabel(part) {
  const input = part.input ?? {};
  const detail = input.command ?? input.file_path ?? input.pattern ?? input.path ?? input.skill ?? input.description ?? '';
  return `${part.name}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
}

// Die ersten zwei Wörter eines Shell-Befehls, z. B. "git status" oder "dotnet test".
function commandHead(part) {
  if (!['Bash', 'PowerShell'].includes(part.name) || typeof part.input?.command !== 'string') return null;
  const segments = part.input.command.split(/&&|;|\|\||\n/).map((segment) => segment.trim());
  const words = (segments.find((segment) => segment && !/^cd\s/.test(segment)) ?? '')
    .split(/\s+/).filter((word) => !/^\w+=/.test(word));
  if (words.length === 0) return null;
  return words.slice(0, /^[a-z][\w:-]*$/i.test(words[1] ?? '') ? 2 : 1).join(' ');
}

function analyze(entries) {
  const facts = {
    turns: 0, requests: 0, input: 0, cached: 0, output: 0, models: new Set(), tools: new Map(), errors: new Map(),
    denials: 0, repeats: 0, skills: new Map(), compactions: 0, first: null, last: null,
    results: [], reads: new Map(), commands: new Map(),
  };
  const names = new Map();
  const calls = new Map();
  let previousCall = null;
  const seenRequests = new Set();
  for (const entry of entries) {
    if (entry.timestamp) {
      facts.first ??= entry.timestamp;
      facts.last = entry.timestamp;
    }
    if (entry.type === 'system' && /compact/i.test(`${entry.subtype ?? ''} ${entry.content ?? ''}`)) facts.compactions += 1;
    const message = entry.message;
    if (!message) continue;
    if (entry.type === 'assistant') {
      if (message.model) facts.models.add(message.model);
      if (!seenRequests.has(entry.requestId ?? entry.uuid)) {
        seenRequests.add(entry.requestId ?? entry.uuid);
        facts.requests += 1;
        const tokens = tokensOf(message.usage);
        facts.input += tokens.input;
        facts.cached += tokens.cached;
        facts.output += tokens.output;
      }
      for (const part of Array.isArray(message.content) ? message.content : []) {
        if (part.type !== 'tool_use') continue;
        names.set(part.id, part.name);
        calls.set(part.id, callLabel(part));
        if (part.name === 'Read' && part.input?.file_path) facts.reads.set(part.input.file_path, (facts.reads.get(part.input.file_path) ?? 0) + 1);
        const head = commandHead(part);
        if (head) facts.commands.set(head, (facts.commands.get(head) ?? 0) + 1);
        facts.tools.set(part.name, (facts.tools.get(part.name) ?? 0) + 1);
        if (part.name === 'Skill' && part.input?.skill) facts.skills.set(part.input.skill, (facts.skills.get(part.input.skill) ?? 0) + 1);
        const call = `${part.name}:${JSON.stringify(part.input)}`;
        if (call === previousCall) facts.repeats += 1;
        previousCall = call;
      }
    }
    if (entry.type === 'user') {
      const content = message.content;
      if (typeof content === 'string' ? !NOTICE.test(content) : !content.some((part) => part.type === 'tool_result') && !NOTICE.test(textOf(content))) {
        facts.turns += 1;
      }
      for (const part of Array.isArray(content) ? content : []) {
        if (part.type === 'tool_result') facts.results.push({ call: calls.get(part.tool_use_id) ?? 'unbekannt', chars: textOf(part.content).length });
        if (part.type !== 'tool_result' || !part.is_error) continue;
        const tool = names.get(part.tool_use_id) ?? 'unbekannt';
        const text = shortError(part.content);
        if (DENIAL.test(text)) facts.denials += 1;
        const list = facts.errors.get(tool) ?? [];
        list.push(text);
        facts.errors.set(tool, list);
      }
    }
  }
  return facts;
}

function minutes(first, last) {
  if (!first || !last) return '?';
  return Math.round((Date.parse(last) - Date.parse(first)) / 60000);
}

function thousands(value) {
  return `${Math.round(value / 1000)}k`;
}

function subagentRows(sessionFile) {
  const dir = path.join(sessionFile.slice(0, -'.jsonl'.length), 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => {
    const metaFile = path.join(dir, name.replace(/\.jsonl$/, '.meta.json'));
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const facts = analyze(readEntries(path.join(dir, name)));
    const errors = [...facts.errors.values()].reduce((sum, list) => sum + list.length, 0);
    return {
      facts,
      description: meta.description ?? name, type: meta.agentType ?? '?', model: meta.model ?? [...facts.models].join(','),
      tokens: facts.input + facts.cached + facts.output, fresh: facts.input + facts.output, tools: [...facts.tools.values()].reduce((a, b) => a + b, 0), errors,
      duration: minutes(facts.first, facts.last),
    };
  }).sort((a, b) => b.tokens - a.tokens);
}

const TOP_RESULTS = 5;
const MIN_COMMAND_REPEATS = 3;

function merge(target, map) {
  for (const [key, count] of map) target.set(key, (target.get(key) ?? 0) + count);
  return target;
}

// Sparpotenzial über Hauptsession und Subagents: wo viel Kontext floss oder Arbeit sich wiederholte.
function savings(all) {
  const results = all.flatMap((facts) => facts.results).sort((a, b) => b.chars - a.chars).slice(0, TOP_RESULTS);
  const reads = [...all.reduce((map, facts) => merge(map, facts.reads), new Map())].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);
  const commands = [...all.reduce((map, facts) => merge(map, facts.commands), new Map())].filter(([, count]) => count >= MIN_COMMAND_REPEATS).sort((a, b) => b[1] - a[1]);
  return [
    '## Sparpotenzial (Hauptsession und Subagents)',
    '',
    'Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):',
    ...(results.length > 0 ? results.map((r) => `- ${thousands(r.chars / 4)} Tokens · ${r.call}`) : ['- keine']),
    '',
    'Mehrfach gelesene Dateien:',
    ...(reads.length > 0 ? reads.slice(0, 10).map(([file, count]) => `- ${count}× ${file}`) : ['- keine']),
    '',
    `Wiederkehrende Shell-Befehle (ab ${MIN_COMMAND_REPEATS}×):`,
    ...(commands.length > 0 ? commands.slice(0, 10).map(([head, count]) => `- ${count}× ${head}`) : ['- keine']),
    '',
  ].join('\n');
}

function render(sessionFile, facts, agents) {
  const tools = [...facts.tools.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', ') || '-';
  const skills = [...facts.skills.entries()].map(([name, count]) => `${name} ${count}`).join(', ') || '-';
  const errorLines = [...facts.errors.entries()].flatMap(([tool, list]) => list.map((text) => `- ${tool}: ${text}`));
  const agentTokens = agents.reduce((sum, agent) => sum + agent.tokens, 0);
  return [
    `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
    '',
    `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
    `- Eingaben des Menschen: ${facts.turns} · API-Anfragen: ${facts.requests} · Zusammenfassungen: ${facts.compactions}`,
    `- Tokens Hauptsession: ${thousands(facts.input)} neu gelesen, ${thousands(facts.cached)} aus dem Cache, ${thousands(facts.output)} Ausgabe`,
    `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
    `- Tool-Aufrufe: ${tools}`,
    `- Skills: ${skills}`,
    `- Tool-Fehler: ${errorLines.length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
    '',
    '## Subagents (nach Tokens)',
    '| Auftrag | Typ | Modell | Tokens gesamt | davon neu | Tools | Fehler | min |',
    '|---|---|---|---|---|---|---|---|',
    ...agents.map((agent) => `| ${agent.description} | ${agent.type} | ${agent.model} | ${thousands(agent.tokens)} | ${thousands(agent.fresh)} | ${agent.tools} | ${agent.errors} | ${agent.duration} |`),
    '',
    '## Tool-Fehler der Hauptsession',
    ...(errorLines.length > 0 ? errorLines : ['- keine']),
    '',
  ].join('\n');
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--file': 'file', '--cwd': 'cwd', '--expect': 'expect' }[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
  }
  if (options.expect) options.expect = options.expect.split(',').map((name) => name.trim()).filter(Boolean);
  return options;
}

function run(options) {
  const file = options.file ? path.resolve(options.file) : newestSession(projectDir(options.cwd ?? process.cwd()));
  if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
  const session = mcpUsage.loadSession(file);
  if (options.cwd) session.cwd = options.cwd;
  const facts = analyze(readEntries(file));
  const agents = subagentRows(file);
  const mcp = mcpUsage.render(session, { expect: options.expect, transcript: file });
  return `${render(file, facts, agents)}\n${savings([facts, ...agents.map((agent) => agent.facts)])}\n${mcp}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(run(options));
  } catch (error) {
    if (!(error instanceof FactsError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, run };
