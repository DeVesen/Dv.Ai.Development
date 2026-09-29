'use strict';

// Messwerte über die Einträge der Hauptsession: Zeit, Harness-Hinweise, Kontext und Tool-Läufe.

const { humanEvents, textOf, isToolResultEntry } = require('./transcript');
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

module.exports = { timeOf, minutes, timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds };
