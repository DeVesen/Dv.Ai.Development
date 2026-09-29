'use strict';

// Liest ein Claude-Code-Protokoll (JSONL) und erkennt, was der Mensch getan hat.

const fs = require('node:fs');

const NOTICE = /^\s*<(?:task-notification|agent-message|system-reminder|command-|local-command)/;
const SLASH_COMMAND = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
const SLASH_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
const INTERRUPT = /^\[Request interrupted by user/;
const REJECTION = /The user doesn't want to proceed with this tool use/;
const COMPACT = /compact/i;
const HUMAN_TEXT_MAX = 100;

class RetroError extends Error {}

// Jeder Eintrag trägt als `entryNo` seine Zeilennummer im Protokoll (ab 1); kaputte Zeilen fallen weg.
function readEntries(file) {
  return fs.readFileSync(file, 'utf8').split('\n').flatMap((text, index) => {
    if (text.trim() === '') return [];
    try {
      return [{ ...JSON.parse(text), entryNo: index + 1 }];
    } catch {
      // Eine unvollständig geschriebene Zeile ist kein Eintrag.
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

function shorten(text, max) {
  const line = String(text).replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function clock(timestamp) {
  return timestamp ? new Date(timestamp).toTimeString().slice(0, 5) : '--:--';
}

// Kurzform eines Aufrufs: Tool plus wichtigstes Argument.
function callLabel(part) {
  const input = part.input ?? {};
  const detail = input.command ?? input.file_path ?? input.pattern ?? input.path ?? input.skill ?? input.description ?? '';
  return `${part.name}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
}

function isToolResultEntry(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) && content.some((part) => part.type === 'tool_result');
}

// Die eine Regel für Zusammenfassungen als system-Eintrag; Zählung (`analyze`) und Zeitleiste (`isSummary`) nutzen sie beide.
function isCompactEntry(entry) {
  return entry.type === 'system' && COMPACT.test(`${entry.subtype ?? ''} ${entry.content ?? ''}`);
}

// Text-Eintrag des Nutzers ohne Skill-Text, Tool-Ergebnis, Unterbrechung und Harness-Hinweis; Grundlage für Eingaben und Zusammenfassungen.
function isPlainUserText(entry) {
  if (entry.type !== 'user' || !entry.message || entry.isMeta || isToolResultEntry(entry)) return false;
  const text = textOf(entry.message.content);
  return !INTERRUPT.test(text) && !NOTICE.test(text);
}

// Ein Slash-Befehl beginnt mit `<command-message>` und sähe sonst wie ein Harness-Hinweis aus.
function isSlashCommand(entry) {
  return entry.type === 'user' && !entry.isMeta && SLASH_COMMAND.test(textOf(entry.message?.content));
}

// Protokolle mit `origin` markieren Eingaben des Menschen selbst; in älteren erkennt man sie am Text.
function isHumanInput(entry, marked) {
  if (entry.isCompactSummary) return false;
  const typed = isPlainUserText(entry) || isSlashCommand(entry);
  return marked ? typed && entry.origin?.kind === 'human' : typed;
}

function slashText(text) {
  const args = text.match(SLASH_ARGS)?.[1]?.trim() ?? '';
  return `/${text.match(SLASH_COMMAND)[1]}${args ? ` ${args}` : ''}`;
}

function rejectionsOf(entry) {
  return entry.message.content.filter((part) => part.type === 'tool_result' && REJECTION.test(textOf(part.content)));
}

function eventsOf(entry, marked) {
  const at = { entryNo: entry.entryNo, time: entry.timestamp ?? null };
  if (isToolResultEntry(entry)) return rejectionsOf(entry).map(() => ({ ...at, kind: 'Ablehnung', text: 'Tool-Aufruf abgelehnt' }));
  const text = textOf(entry.message.content);
  if (INTERRUPT.test(text)) return [{ ...at, kind: 'Unterbrechung', text: shorten(text, HUMAN_TEXT_MAX) }];
  if (!isHumanInput(entry, marked)) return [];
  return [{ ...at, kind: 'Eingabe', text: shorten(SLASH_COMMAND.test(text) ? slashText(text) : text, HUMAN_TEXT_MAX) }];
}

// Jede Eingabe, Unterbrechung und Ablehnung des Menschen in Protokoll-Reihenfolge.
function humanEvents(entries) {
  const marked = entries.some((entry) => entry.origin);
  return entries.filter((entry) => entry.type === 'user' && entry.message).flatMap((entry) => eventsOf(entry, marked));
}

module.exports = { RetroError, SLASH_COMMAND, readEntries, textOf, tokensOf, shorten, clock, callLabel, isToolResultEntry, isCompactEntry, humanEvents };
