#!/usr/bin/env node
'use strict';

// Kurze Zeitleiste eines Protokolls; mit --entry ein Eintrag und seine Nachbarn im Detail. Ersetzt die Textsuche im Rohprotokoll.

const fs = require('node:fs');
const { RetroError, readEntries, lineCount, textOf, shorten, clock, callLabel, humanEvents, isSummary } = require('./lib/transcript');
const { resolveSession } = require('./lib/session-files');

const USAGE = 'Aufruf: node retro-timeline.js (--session <id> | --file <session.jsonl>) [--cwd <projektordner>] [--entry <n> | --from <n>]\n';
const FLAGS = { '--session': 'session', '--file': 'file', '--cwd': 'cwd', '--entry': 'entry', '--from': 'from' };
const NUMBER_OPTIONS = ['entry', 'from'];
const LINE_TEXT = 80;
const DETAIL_TEXT = 1500;
const NEIGHBOURS = 2;
// Obergrenze je Aufruf, damit die Zeitleiste einer langen Session den Kontext der Retrospektive nicht füllt; `--from` setzt fort.
const MAX_ROWS = 300;

function numberOf(value) {
  return value === undefined ? undefined : Number(value);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = FLAGS[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
  }
  if (!options.session && !options.file) return null;
  if (NUMBER_OPTIONS.some((key) => options[key] !== undefined && !/^\d+$/.test(options[key]))) return null;
  return { ...options, entry: numberOf(options.entry), from: numberOf(options.from) };
}

function partRows(entry, at, human) {
  const content = Array.isArray(entry.message?.content) ? entry.message.content : [];
  if (entry.type === 'assistant') {
    return content.flatMap((part) => {
      if (part.type === 'text' && part.text.trim()) return [`${at} Text: ${shorten(part.text, LINE_TEXT)}`];
      return part.type === 'tool_use' ? [`${at} Aufruf: ${shorten(callLabel(part), LINE_TEXT)}`] : [];
    });
  }
  if (entry.type !== 'user' || human) return [];
  return content.filter((part) => part.type === 'tool_result' && part.is_error).map((part) => `${at} Fehler: ${shorten(textOf(part.content), LINE_TEXT)}`);
}

function rowsOf(entry, humans, marked) {
  const at = `#${entry.entryNo} ${clock(entry.timestamp)}`;
  if (isSummary(entry, marked)) return [`${at} Zusammenfassung`];
  const own = humans.get(entry.entryNo) ?? [];
  const human = own.map((event) => `${at} ${event.kind === 'Eingabe' ? 'Mensch' : event.kind}: ${shorten(event.text, LINE_TEXT)}`);
  return [...human, ...partRows(entry, at, own.length > 0)];
}

// Höchstens MAX_ROWS Zeilen. Der Schnitt fällt vor den ersten Eintrag, der nicht mehr ganz passt, damit `--from` ihn ganz
// zeigt; ein Eintrag hat nur wenige Zeilen (Eingabe, Text, Aufrufe, Fehler).
function page(rows) {
  if (rows.length <= MAX_ROWS) return rows.map((row) => row.text);
  const next = rows[MAX_ROWS].entryNo;
  const shown = rows.filter((row) => row.entryNo < next);
  const hint = `… weitere ${rows.length - shown.length} Zeilen bis #${rows[rows.length - 1].entryNo}; mit --from ${next} fortsetzen oder --entry nutzen`;
  return [...shown.map((row) => row.text), hint];
}

// Je Eingabe, Text, Tool-Aufruf, Fehler und Zusammenfassung eine gekürzte Zeile, ab Eintrag `from`. Eingaben und
// Markierung kommen aus dem ganzen Protokoll, damit ein späterer Start dieselben Zeilen zeigt.
function timeline(entries, from = 1) {
  const humans = new Map();
  for (const event of humanEvents(entries)) humans.set(event.entryNo, [...(humans.get(event.entryNo) ?? []), event]);
  const marked = entries.some((entry) => entry.origin);
  const rows = entries.filter((entry) => entry.entryNo >= from)
    .flatMap((entry) => rowsOf(entry, humans, marked).map((text) => ({ entryNo: entry.entryNo, text })));
  return page(rows);
}

function partText(part) {
  if (typeof part === 'string') return part;
  if (part?.type === 'tool_use') return `Aufruf ${part.name}: ${JSON.stringify(part.input)}`;
  if (part?.type === 'tool_result') return `Ergebnis${part.is_error ? ' (Fehler)' : ''}: ${textOf(part.content)}`;
  if (part?.type === 'text') return part.text;
  return JSON.stringify(part);
}

function detailText(entry) {
  const content = entry.message?.content;
  const parts = Array.isArray(content) ? content : [content ?? entry.attachment ?? entry.content ?? ''];
  return parts.map(partText).join('\n').slice(0, DETAIL_TEXT);
}

function detail(entries, entryNo, total) {
  if (entryNo < 1 || entryNo > total) throw new RetroError(`Eintrag ${entryNo} liegt außerhalb des Protokolls (1-${total})`);
  return entries.filter((entry) => Math.abs(entry.entryNo - entryNo) <= NEIGHBOURS).map((entry) => [
    `## Eintrag ${entry.entryNo} · ${clock(entry.timestamp)} · ${entry.type}${entry.entryNo === entryNo ? ' ← gesucht' : ''}`,
    detailText(entry),
    '',
  ].join('\n'));
}

function linesFor(options) {
  const { file } = resolveSession(options);
  if (!fs.existsSync(file)) throw new RetroError(`Session-Datei nicht gefunden: ${file}`);
  const entries = readEntries(file);
  return options.entry === undefined ? timeline(entries, options.from ?? 1) : detail(entries, options.entry, lineCount(file));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${linesFor(options).join('\n')}\n`);
  } catch (error) {
    if (!(error instanceof RetroError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, timeline, detail };
