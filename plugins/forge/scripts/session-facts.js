#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mcpUsage = require('./mcp-usage.js');
const { RetroError: FactsError, readEntries, textOf, tokensOf, clock, callLabel, isCompactEntry, humanEvents } = require('./lib/transcript');
const { rangeOf } = require('./lib/retro-range');
const { requestsOf } = require('./lib/retro-requests');
const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads } = require('./lib/retro-measures');
const USAGE = 'Aufruf: node session-facts.js [--file <session.jsonl>] [--session <id>] [--cwd <projektordner>] [--expect <mcp-server,...>]'
  + ' [--since-command <name>] [--before-retro] [--lenient] [--skeleton <bericht.md>]\n';
const DENIAL = /denied|blocked|Permission|hook/i;
const RECENT_MS = 10 * 60 * 1000;
const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');
const FACTS_SLOT = '<ZAHLEN: schreibt session-facts.js --skeleton>';
const MCP_SLOT = '<MCP-NUTZUNG: schreibt session-facts.js --skeleton>';
const RESULT_SLOT = 'Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents';

function projectDir(cwd, home = os.homedir()) {
  return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^A-Za-z0-9]/g, '-'));
}

// Neueste Session im Projektordner. Wurden kurz davor weitere geschrieben, ist „neueste“ mehrdeutig: Warnung.
function newestSession(dir) {
  if (!fs.existsSync(dir)) throw new FactsError(`Kein Session-Ordner: ${dir}`);
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl'))
    .map((name) => ({ file: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) throw new FactsError(`Keine Session-Datei in ${dir}`);
  const [newest, ...others] = files;
  const rivals = others.filter(({ mtime }) => newest.mtime - mtime < RECENT_MS).map(({ file }) => path.basename(file, '.jsonl'));
  const warning = rivals.length === 0 ? null
    : `Warnung: ${rivals.length} weitere Session(s) in den letzten 10 min geschrieben (${rivals.join(', ')}); gelesen wird ${path.basename(newest.file, '.jsonl')}. Eigene Session mit --session <id> wählen.`;
  return { file: newest.file, warning };
}

function sessionById(dir, id) {
  const own = path.join(dir, `${id}.jsonl`);
  if (fs.existsSync(own)) return own;
  try {
    return mcpUsage.findTranscript(id, path.dirname(dir));
  } catch {
    throw new FactsError(`Session ${id} nicht gefunden unter ${path.dirname(dir)}`);
  }
}

function resolveSession(options) {
  if (options.file) return { file: path.resolve(options.file), warning: null };
  const dir = projectDir(options.cwd ?? process.cwd());
  if (options.session) return { file: sessionById(dir, options.session), warning: null };
  return newestSession(dir);
}

function shortError(text) {
  return textOf(text).replace(/\s+/g, ' ').trim().slice(0, 120);
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
    if (isCompactEntry(entry)) facts.compactions += 1;
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
  facts.humans = humanEvents(entries);
  facts.turns = facts.humans.filter((event) => event.kind === 'Eingabe').length;
  facts.time = timeProfile(entries);
  facts.hints = harnessHints(entries);
  const requests = requestsOf(entries);
  facts.context = requestContext(requests);
  facts.baseline = firstRequest(entries, requests);
  facts.rebuilds = cacheRebuilds(requests);
  facts.loads = contextLoads(entries, requests);
  return facts;
}

function minutes(first, last) {
  if (!first || !last) return '?';
  return Math.round((Date.parse(last) - Date.parse(first)) / 60000);
}

function thousands(value) {
  return `${Math.round(value / 1000)}k`;
}

function subagentRows(sessionFile, keep = () => true) {
  const dir = path.join(sessionFile.slice(0, -'.jsonl'.length), 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).flatMap((name) => {
    const entries = readEntries(path.join(dir, name));
    return keep(entries) ? [{ name, entries }] : [];
  }).map(({ name, entries }) => {
    const metaFile = path.join(dir, name.replace(/\.jsonl$/, '.meta.json'));
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
    const facts = analyze(entries);
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
  return ['## Sparpotenzial (Hauptsession und Subagents)', '', savingsLists(all)].join('\n');
}

function savingsLists(all) {
  const results = all.flatMap((facts) => facts.results).sort((a, b) => b.chars - a.chars).slice(0, TOP_RESULTS);
  const reads = [...all.reduce((map, facts) => merge(map, facts.reads), new Map())].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]);
  const commands = [...all.reduce((map, facts) => merge(map, facts.commands), new Map())].filter(([, count]) => count >= MIN_COMMAND_REPEATS).sort((a, b) => b[1] - a[1]);
  return [
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

function errorLinesOf(facts) {
  return [...facts.errors.entries()].flatMap(([tool, list]) => list.map((text) => `- ${tool}: ${text}`));
}

function timeLine(time) {
  const from = time.silenceFrom ? ` (ab Eintrag ${time.silenceFrom})` : '';
  return `- Zeit: aktiv ${time.active} min · Warten auf den Menschen ${time.waiting} min · längste Strecke ohne Text an den Menschen ${time.silence} min${from}`;
}

function contextLine(context) {
  return `- Kontext je Anfrage: ${context ? `Ø ${thousands(context.average)}, größte ${thousands(context.largest)}` : 'keine Anfrage'}`;
}

function baselineLine(baseline) {
  if (!baseline) return '- Grundlast erste Anfrage: keine Anfrage';
  const attachments = baseline.attachments.map((attachment) => `${attachment.name} ${thousands(attachment.tokens)}`).join(', ') || 'keine';
  return `- Grundlast erste Anfrage: ${thousands(baseline.context)} Kontext · größte Anhänge davor: ${attachments}`;
}

function rebuildLine(rebuilds) {
  const listed = rebuilds.map((rebuild) => `${clock(rebuild.time)} nach ${rebuild.pause} min Pause (${thousands(rebuild.created)} neu)`);
  return `- Cache-Neuaufbauten: ${listed.join(', ') || 'keiner'}`;
}

function factLines(facts, agents) {
  const tools = [...facts.tools.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', ') || '-';
  const skills = [...facts.skills.entries()].map(([name, count]) => `${name} ${count}`).join(', ') || '-';
  const agentTokens = agents.reduce((sum, agent) => sum + agent.tokens, 0);
  return [
    `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
    `- Eingaben des Menschen: ${facts.turns} · API-Anfragen: ${facts.requests} · Zusammenfassungen: ${facts.compactions}`,
    `- Tokens Hauptsession: ${thousands(facts.input)} neu gelesen, ${thousands(facts.cached)} aus dem Cache, ${thousands(facts.output)} Ausgabe`,
    `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
    `- Tool-Aufrufe: ${tools}`,
    `- Skills: ${skills}`,
    `- Tool-Fehler: ${errorLinesOf(facts).length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
    timeLine(facts.time),
    `- Harness-Hinweise: ${facts.hints.map(([kind, count]) => `${kind} ${count}`).join(', ') || 'keine'}`,
    contextLine(facts.context),
    baselineLine(facts.baseline),
    rebuildLine(facts.rebuilds),
  ];
}

function humanLines(humans) {
  if (humans.length === 0) return ['- keine'];
  return humans.map((event) => `- #${event.entryNo} ${clock(event.time)} ${event.kind}: ${event.text}`);
}

function listOrNone(lines) {
  return lines.length > 0 ? lines : ['- keine'];
}

function measureLines(facts) {
  return [
    'Größte Kontextlasten (Größe × folgende Anfragen, ab 1k Tokens):',
    ...listOrNone(facts.loads.map((load) => `- ${thousands(load.tokens)} × ${load.following} Anfragen = ${thousands(load.load)} · ${load.label} (Eintrag ${load.entryNo})`)),
    '',
  ];
}

function render(sessionFile, facts, agents, labels = []) {
  const errorLines = errorLinesOf(facts);
  return [
    `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
    '',
    ...labels.map((label) => `- ${label}`),
    ...factLines(facts, agents),
    '',
    ...measureLines(facts),
    '## Subagents (nach Tokens)',
    '| Auftrag | Typ | Modell | Tokens gesamt | davon neu | Tools | Fehler | min |',
    '|---|---|---|---|---|---|---|---|',
    ...agents.map((agent) => `| ${agent.description} | ${agent.type} | ${agent.model} | ${thousands(agent.tokens)} | ${thousands(agent.fresh)} | ${agent.tools} | ${agent.errors} | ${agent.duration} |`),
    '',
    '## Eingaben des Menschen',
    ...humanLines(facts.humans),
    '',
    '## Tool-Fehler der Hauptsession',
    ...(errorLines.length > 0 ? errorLines : ['- keine']),
    '',
  ].join('\n');
}

const FLAGS = {
  '--file': 'file', '--session': 'session', '--cwd': 'cwd', '--expect': 'expect',
  '--since-command': 'sinceCommand', '--skeleton': 'skeleton',
};
const SWITCHES = { '--before-retro': 'beforeRetro', '--lenient': 'lenient' };

// `--file` und `--session` dürfen zusammen stehen: ausgewertet wird die Datei, die Session benennt Snapshot und Entwurf.
function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (SWITCHES[flag]) {
      options[SWITCHES[flag]] = true;
      continue;
    }
    const key = FLAGS[flag];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
    index += 1;
  }
  if (options.expect) options.expect = options.expect.split(',').map((name) => name.trim()).filter(Boolean);
  return options;
}

// Berichtsgerüst aus references/report-format.md: Zahlen und MCP-Nutzung deterministisch, der Rest bleibt Platzhalter.
function skeleton({ facts, agents, mcp, lists }) {
  const format = fs.readFileSync(REPORT_FORMAT, 'utf8');
  const template = format.match(/```markdown\n([\s\S]*?)\n```/)?.[1];
  if (!template || ![FACTS_SLOT, MCP_SLOT, RESULT_SLOT].every((slot) => template.includes(slot))) {
    throw new FactsError(`Vorlage in ${REPORT_FORMAT} passt nicht zu --skeleton`);
  }
  const agentInput = agents.reduce((sum, agent) => sum + agent.facts.input, 0);
  const result = `Dauer ${minutes(facts.first, facts.last)} min, Eingaben des Menschen ${facts.turns}, Tokens neu ${thousands(facts.input)} Hauptsession und ${thousands(agentInput)} Subagents`;
  const mcpBody = mcp.replace(/^## MCP-Nutzung \(gemessen\)\n/, '').trimEnd();
  return `${template
    .replace(RESULT_SLOT, () => result)
    .replace(FACTS_SLOT, () => [...factLines(facts, agents), '', lists.trimEnd()].join('\n'))
    .replace(MCP_SLOT, () => mcpBody)}\n`;
}

function writeSkeleton(target, text) {
  const file = path.resolve(target);
  if (fs.existsSync(file)) throw new FactsError(`Bericht existiert schon, nichts geschrieben: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

function run(options) {
  const { file, warning } = resolveSession(options);
  if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
  const range = rangeOf(readEntries(file), options);
  const session = mcpUsage.loadSession(file, { entries: range.entries, keepSubagent: range.keepSubagent });
  if (options.cwd) session.cwd = options.cwd;
  const facts = analyze(range.entries);
  const agents = subagentRows(file, range.keepSubagent);
  const mcp = mcpUsage.render(session, { expect: options.expect, transcript: file });
  const allFacts = [facts, ...agents.map((agent) => agent.facts)];
  let output = `${render(file, facts, agents, range.labels)}\n${savings(allFacts)}\n${mcp}`;
  if (options.skeleton) {
    const written = writeSkeleton(options.skeleton, skeleton({ facts, agents, mcp, lists: savingsLists(allFacts) }));
    output += `\nGerüst geschrieben: ${written}\n`;
  }
  return { output, warning };
}

// Im fehlerverzeihenden Modus endet jeder Fehler mit einer Meldung auf stdout und Exit-Code 0, damit der
// Skill, der die Fakten beim Laden einbettet, trotzdem lädt.
function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    const { output, warning } = run(options);
    if (warning) process.stderr.write(`${warning}\n`);
    process.stdout.write(output);
  } catch (error) {
    if (options.lenient) {
      process.stdout.write(`Fakten nicht verfügbar: ${error.message}
`);
      return;
    }
    if (!(error instanceof FactsError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, run, parseArgs, resolveSession };
