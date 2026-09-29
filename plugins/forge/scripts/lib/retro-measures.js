'use strict';

// Messwerte über die Einträge der Hauptsession: Zeit, Harness-Hinweise, Kontext und Tool-Läufe.

const { humanEvents, textOf, isToolResultEntry, callLabel, SLASH_COMMAND } = require('./transcript');
const { contextOf } = require('./retro-requests');

const MINUTE_MS = 60000;
const NOTICE_TAG = /^\s*<([a-z-]+)>/;

function timeOf(entry) {
  return entry.timestamp ? Date.parse(entry.timestamp) : null;
}

function minutes(ms) {
  return Math.round(ms / MINUTE_MS);
}

function hasText(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) && content.some((part) => part.type === 'text' && part.text.trim() !== '');
}

function isWork(entry) {
  return entry.type === 'assistant' || isToolResultEntry(entry);
}

// Warten = Zeit vom letzten Arbeitsschritt (Anfrage oder Tool-Ergebnis) bis zur nächsten Eingabe des Menschen; aktiv = Rest.
// Die Stille läuft von einer Eingabe oder einem Text an den Menschen bis zum nächsten Text; eine Eingabe beginnt sie neu.
function timeProfile(entries) {
  const inputs = new Set(humanEvents(entries).filter((event) => event.kind === 'Eingabe').map((event) => event.entryNo));
  const timed = entries.filter((entry) => timeOf(entry) !== null);
  let waiting = 0;
  let lastWork = null;
  let since = null;
  let silence = { ms: 0, from: null };
  for (const entry of timed) {
    const time = timeOf(entry);
    if (inputs.has(entry.entryNo)) {
      waiting += lastWork === null ? 0 : Math.max(0, time - lastWork);
      since = { time, entryNo: entry.entryNo };
    }
    if (entry.type === 'assistant' && hasText(entry) && since) {
      if (time - since.time > silence.ms) silence = { ms: time - since.time, from: since.entryNo };
      since = { time, entryNo: entry.entryNo };
    }
    if (isWork(entry)) lastWork = time;
  }
  const total = timed.length > 1 ? timeOf(timed[timed.length - 1]) - timeOf(timed[0]) : 0;
  return { active: minutes(total - waiting), waiting: minutes(waiting), silence: minutes(silence.ms), silenceFrom: silence.from };
}

function noticeTag(entry, human) {
  if (entry.type !== 'user' || !entry.message || human.has(entry.entryNo) || entry.isMeta || isToolResultEntry(entry)) return null;
  return textOf(entry.message.content).match(NOTICE_TAG)?.[1] ?? null;
}

// Eingeblendete Hinweise des Harness nach Art: Anhänge und Hinweis-Nachrichten, die nicht vom Menschen stammen.
function harnessHints(entries) {
  const human = new Set(humanEvents(entries).map((event) => event.entryNo));
  const counts = new Map();
  for (const entry of entries) {
    const kind = entry.type === 'attachment' ? entry.attachment?.type : noticeTag(entry, human);
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const REBUILD_MIN_CREATED = 20000;
const CHARS_PER_TOKEN = 4;
const TOP_ATTACHMENTS = 3;

function requestContext(requests) {
  if (requests.length === 0) return null;
  const sizes = requests.map((request) => contextOf(request.usage));
  return { average: sizes.reduce((sum, size) => sum + size, 0) / sizes.length, largest: Math.max(...sizes) };
}

function attachmentOf(entry) {
  const body = entry.attachment ?? entry.message?.content ?? '';
  return { name: entry.attachment?.type ?? 'Skill-Text', tokens: Math.round(JSON.stringify(body).length / CHARS_PER_TOKEN) };
}

// Kontext der ersten Anfrage und die größten Anhänge davor: Harness-Anhänge und eingeblendete Skill-Texte.
function firstRequest(entries, requests) {
  if (requests.length === 0) return null;
  const [first] = requests;
  const attachments = entries.filter((entry) => entry.entryNo < first.entryNo && (entry.type === 'attachment' || entry.isMeta))
    .map(attachmentOf).sort((a, b) => b.tokens - a.tokens).slice(0, TOP_ATTACHMENTS);
  return { context: contextOf(first.usage), attachments };
}

function pauseBetween(previous, request) {
  return request.time && previous.time ? minutes(Date.parse(request.time) - Date.parse(previous.time)) : 0;
}

// Neuaufbau: mindestens 20k Tokens neu in den Cache geschrieben und weniger als die Hälfte des vorigen Kontexts aus dem Cache gelesen.
function cacheRebuilds(requests) {
  return requests.slice(1).flatMap((request, index) => {
    const previous = requests[index];
    const created = request.usage.cache_creation_input_tokens ?? 0;
    const read = request.usage.cache_read_input_tokens ?? 0;
    if (created < REBUILD_MIN_CREATED || read >= contextOf(previous.usage) / 2) return [];
    return [{ time: request.time, pause: pauseBetween(previous, request), created }];
  });
}

const LOAD_MIN_TOKENS = 1000;
const TOP_LOADS = 5;

function toolUses(entry) {
  const content = entry.message?.content;
  return entry.type === 'assistant' && Array.isArray(content) ? content.filter((part) => part.type === 'tool_use') : [];
}

function tokensOfText(text) {
  return Math.round(text.length / CHARS_PER_TOKEN);
}

// Jedes Tool-Ergebnis und jeder eingeblendete Skill-Text mit seiner Größe; der Skill-Text nennt den Aufruf, der ihn auslöste.
function loadItems(entries) {
  const calls = new Map();
  const items = [];
  let trigger = 'unbekannt';
  for (const entry of entries) {
    for (const part of toolUses(entry)) {
      calls.set(part.id, callLabel(part));
      if (part.name === 'Skill') trigger = callLabel(part);
    }
    if (entry.type !== 'user' || !entry.message) continue;
    const content = entry.message.content;
    const command = entry.isMeta ? null : textOf(content).match(SLASH_COMMAND)?.[1];
    if (command) trigger = `/${command}`;
    if (entry.isMeta) items.push({ entryNo: entry.entryNo, tokens: tokensOfText(textOf(content)), label: `Skill-Text nach ${trigger}` });
    const results = Array.isArray(content) ? content.filter((part) => part.type === 'tool_result') : [];
    items.push(...results.map((part) => ({ entryNo: entry.entryNo, tokens: tokensOfText(textOf(part.content)), label: calls.get(part.tool_use_id) ?? 'unbekannt' })));
  }
  return items;
}

// Kontextlast = Größe mal Zahl der Anfragen, die das Stück danach mitlesen.
function contextLoads(entries, requests) {
  return loadItems(entries).filter((item) => item.tokens >= LOAD_MIN_TOKENS)
    .map((item) => ({ ...item, following: requests.filter((request) => request.entryNo > item.entryNo).length }))
    .map((item) => ({ ...item, load: item.tokens * item.following }))
    .sort((a, b) => b.load - a.load)
    .slice(0, TOP_LOADS);
}

const LONG_RUN_MS = 60000;
const MAX_LONG_RUNS = 10;
const CHANGE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const RUN_WORD = /^(?:build|test|lint|vitest|jest|eslint|tsc|--test)(?::[\w-]+)?$/i;
const TOOLCHAIN_SCRIPT = /(?:^|[\\/])(?:angular|dotnet)-(?:build|test|lint)(?:\.js)?$/i;
const MCP_RUN = /^mcp__.+__.*(?:build|test|lint)/i;

function resultsOf(entry) {
  return isToolResultEntry(entry) ? entry.message.content.filter((part) => part.type === 'tool_result') : [];
}

// Start jedes Aufrufs nach seiner Kennung.
function startsOf(entries) {
  return new Map(entries.flatMap((entry) => toolUses(entry)
    .map((part) => [part.id, { time: timeOf(entry), label: callLabel(part), entryNo: entry.entryNo }])));
}

function runOf(start, end) {
  const ms = start && start.time !== null && end !== null ? end - start.time : 0;
  return ms >= LONG_RUN_MS ? [{ seconds: Math.round(ms / 1000), label: start.label, entryNo: start.entryNo }] : [];
}

// Dauer eines Laufs = Zeit vom Aufruf bis zu seinem Ergebnis.
function longRuns(entries) {
  const started = startsOf(entries);
  return entries.flatMap((entry) => resultsOf(entry).flatMap((part) => runOf(started.get(part.tool_use_id), timeOf(entry))))
    .sort((a, b) => b.seconds - a.seconds).slice(0, MAX_LONG_RUNS);
}

function isBuildTestLint(command) {
  return command.split(/[\s;&|]+/).map((word) => word.replace(/^["']|["']$/g, ''))
    .some((word) => RUN_WORD.test(word) || TOOLCHAIN_SCRIPT.test(word));
}

// Schlüssel eines Build-, Test- oder Lint-Laufs: der ganze Befehl, bei MCP-Tools Name und Eingabe; sonst null.
function runKey(part) {
  if (SHELL_TOOLS.has(part.name)) {
    const command = String(part.input?.command ?? '').replace(/\s+/g, ' ').trim();
    return isBuildTestLint(command) ? command : null;
  }
  return MCP_RUN.test(part.name) ? `${part.name} ${JSON.stringify(part.input ?? {})}` : null;
}

// Schritte eines Eintrags in Protokoll-Reihenfolge: der Hinweis auf eine geänderte Datei, dann jeder Aufruf.
function stepsOf(entry) {
  const notice = entry.attachment?.type === 'edited_text_file' ? [{ change: true, key: null }] : [];
  return [...notice, ...toolUses(entry).map((part) => ({ change: CHANGE_TOOLS.has(part.name), key: runKey(part) }))];
}

// Eine Änderung macht alle Läufe wieder nötig; ein Lauf, der seit der letzten Änderung schon lief, zählt als erneut.
function countRerun(state, step) {
  if (step.change) state.clean.clear();
  if (!step.key) return state;
  if (state.clean.has(step.key)) state.reruns.set(step.key, (state.reruns.get(step.key) ?? 0) + 1);
  state.clean.add(step.key);
  return state;
}

// Build-, Test- und Lint-Läufe, die genauso erneut liefen, ohne dass dazwischen eine Datei geändert wurde.
function idleReruns(entries) {
  const { reruns } = entries.flatMap(stepsOf).reduce(countRerun, { clean: new Set(), reruns: new Map() });
  return [...reruns.entries()].map(([command, count]) => ({ command, count })).sort((a, b) => b.count - a.count);
}

module.exports = { timeOf, minutes, timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads, longRuns, idleReruns };
