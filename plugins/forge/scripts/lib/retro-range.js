'use strict';

// Grenzen des ausgewerteten Bereichs: Start ab dem letzten Aufruf eines Befehls, Schnitt vor dem letzten Aufruf der Retrospektive.

const { RetroError, SLASH_COMMAND, textOf, clock, isToolResultEntry } = require('./transcript');

const RETRO = 'prozess-retrospektive';

function sameCommand(value, wanted) {
  const called = String(value ?? '').replace(/^\//, '');
  const target = wanted.replace(/^\//, '');
  return called === target || called.endsWith(`:${target}`);
}

// Aufruf per Slash-Befehl des Menschen oder per Skill-Tool des Modells.
function invokes(entry, name) {
  const content = entry.message?.content;
  if (entry.type === 'user') return sameCommand(textOf(content).match(SLASH_COMMAND)?.[1], name);
  if (entry.type !== 'assistant' || !Array.isArray(content)) return false;
  return content.some((part) => part.type === 'tool_use' && part.name === 'Skill' && sameCommand(part.input?.skill, name));
}

function indexesOf(entries, name) {
  return entries.flatMap((entry, index) => (invokes(entry, name) ? [index] : []));
}

// Eine Zeile der Skill-Liste lautet `- <plugin>:<skill>: <Beschreibung>`; der Name reicht bis zum Doppelpunkt vor dem Leerzeichen.
const LISTED_SKILL = /^- (\S+?):\s/gm;

function listedSkills(entries) {
  return entries.filter((entry) => entry.attachment?.type === 'skill_listing')
    .flatMap((entry) => [...String(entry.attachment.content ?? '').matchAll(LISTED_SKILL)].map((match) => match[1]));
}

function firstTime(entries, from) {
  for (let index = from; index < entries.length; index += 1) {
    if (entries[index].timestamp) return entries[index].timestamp;
  }
  return null;
}

function mark(entries, index) {
  return `Eintrag ${entries[index].entryNo} · ${clock(firstTime(entries, index))}`;
}

// Ein Befehl, der weder aufgerufen wurde noch in der Skill-Liste steht, gilt als unbekannt.
function startOf(entries, name, end, cut) {
  const calls = indexesOf(entries, name);
  if (calls.length === 0 && !listedSkills(entries).some((skill) => sameCommand(skill, name))) {
    throw new RetroError(`Unbekannter Befehl: ${name} kommt in der Session nicht vor`);
  }
  const before = calls.filter((index) => index < end);
  if (before.length === 0) throw new RetroError(`Leerer Bereich: kein Aufruf von ${name} ${cut ? 'vor dem Schnitt' : 'in der Session'}`);
  return before[before.length - 1];
}

function subagentFilter(entries, start, cutTime, bounded) {
  if (!bounded) return () => true;
  const from = Date.parse(firstTime(entries, start) ?? '') || -Infinity;
  const to = cutTime ? Date.parse(cutTime) : Infinity;
  return (agentEntries) => {
    const begin = Date.parse(firstTime(agentEntries, 0) ?? '');
    return !Number.isNaN(begin) && begin >= from && begin < to;
  };
}

const REPORT_RUN = /retro-report\.js\S*\s(?:.*\s)?--session\b/;
const REPORT_WRITTEN = /^Bericht: /m;

function reportCallIds(entry) {
  const content = entry.message?.content;
  if (entry.type !== 'assistant' || !Array.isArray(content)) return [];
  return content.filter((part) => part.type === 'tool_use' && REPORT_RUN.test(String(part.input?.command ?? ''))).map((part) => part.id);
}

// Erst das Ergebnis belegt den Bericht: kein Fehler und eine Zeile `Bericht: …`; ein Lauf mit Verstößen endet mit Exit 1.
function reportWritten(entry, ids) {
  if (!isToolResultEntry(entry)) return false;
  return entry.message.content.some((part) => part.type === 'tool_result' && ids.has(part.tool_use_id)
    && !part.is_error && REPORT_WRITTEN.test(textOf(part.content)));
}

// Hat eine Retrospektive ihren Bericht schon erzeugt, ist sie abgeschlossen: Der Aufruf der laufenden steht dann
// noch nicht im Protokoll, und ein Schnitt dort nähme nur die Arbeit bis zur früheren Retrospektive.
// Ungemessen ist, ob Claude Code den Slash-Befehl der laufenden Retrospektive schon vor ihren `!`-Befehlen ins Protokoll
// schreibt. Steht er noch nicht dort und brach die frühere vor ihrem Bericht ab, schneidet `rangeOf` vor der früheren;
// `workAfter` macht diesen Fall mit einer Warnung sichtbar, statt ihn still zu verlieren.
function finished(entries, index) {
  const later = entries.slice(index + 1);
  const ids = new Set(later.flatMap(reportCallIds));
  return ids.size > 0 && later.some((entry) => reportWritten(entry, ids));
}

const FACTS_RUN = /session-facts\.js/;

function isFactsRun(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) && content.some((part) => part.type === 'tool_use' && FACTS_RUN.test(String(part.input?.command ?? '')));
}

// Modell-Anfragen nach dem Aufruf; die Anfrage, die nur die Fakten neu holt (Schritt 1 des Skills), zählt nicht.
// Der laufenden Retrospektive folgt beim Lauf ihrer `!`-Befehle noch keine Anfrage.
function workAfter(entries, index) {
  const later = entries.slice(index + 1).filter((entry) => entry.type === 'assistant');
  const reruns = new Set(later.filter(isFactsRun).map((entry) => entry.requestId));
  return later.some((entry) => !reruns.has(entry.requestId));
}

function rangeOf(entries, { sinceCommand, beforeRetro } = {}) {
  const retroCalls = beforeRetro ? indexesOf(entries, RETRO) : [];
  const last = retroCalls.length > 0 ? retroCalls[retroCalls.length - 1] : null;
  const done = last !== null && finished(entries, last);
  const cut = last !== null && !done;
  const aborted = cut && workAfter(entries, last);
  const end = cut ? last : entries.length;
  const start = sinceCommand ? startOf(entries, sinceCommand, end, cut) : 0;
  const cutTime = cut ? firstTime(entries, end) : null;
  const labels = [
    ...(sinceCommand ? [`Start: letzter Aufruf von ${sinceCommand} (${mark(entries, start)})`] : []),
    ...(cut ? [`Schnitt: vor dem letzten Aufruf von ${RETRO} (${mark(entries, end)})`] : []),
    ...(done ? [`Schnitt: keiner, der letzte Aufruf von ${RETRO} (${mark(entries, last)}) hat seinen Bericht schon erzeugt`] : []),
    ...(aborted ? [`Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von ${RETRO} (Eintrag ${entries[last].entryNo}); Arbeit danach fehlt`] : []),
  ];
  const keepSubagent = subagentFilter(entries, start, cutTime, Boolean(sinceCommand) || cut);
  return { entries: entries.slice(start, end), keepSubagent, labels, cutTime };
}

module.exports = { RETRO, invokes, indexesOf, rangeOf };
