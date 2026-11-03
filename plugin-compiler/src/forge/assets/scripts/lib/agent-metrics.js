'use strict';

// Messzeile je Sub-Agent (SubagentStop): Tokens, Dauer und Zahl der Tool-Aufrufe aus dem Transkript des Sub-Agents.
// Rohdaten für die Auswertung außerhalb von dv-forge; alles best effort, nie ein Grund zu blocken.

const { readEntries, tokensOf } = require('./transcript');
const { appendMetric } = require('./metrics');

function assistantMessages(entries) {
  const byId = new Map();
  entries.filter((entry) => entry.type === 'assistant' && entry.message).forEach((entry, index) => {
    byId.set(entry.message.id ?? `#${index}`, entry.message);
  });
  return [...byId.values()];
}

function toolCallCount(entries) {
  const ids = new Set();
  let anonymous = 0;
  for (const entry of entries.filter((candidate) => candidate.type === 'assistant')) {
    const content = Array.isArray(entry.message?.content) ? entry.message.content : [];
    for (const part of content.filter((candidate) => candidate?.type === 'tool_use')) {
      if (part.id) ids.add(part.id);
      else anonymous += 1;
    }
  }
  return ids.size + anonymous;
}

function durationMs(entries) {
  const times = entries.map((entry) => Date.parse(entry.timestamp)).filter(Number.isFinite);
  return times.length > 1 ? Math.max(...times) - Math.min(...times) : null;
}

function sumTokens(messages) {
  return messages.map((message) => tokensOf(message.usage)).reduce(
    (sum, tokens) => ({ input: sum.input + tokens.input, cached: sum.cached + tokens.cached, output: sum.output + tokens.output }),
    { input: 0, cached: 0, output: 0 },
  );
}

// Kennzahlen aus den Einträgen eines Transkripts.
function measure(entries) {
  return { tokens: sumTokens(assistantMessages(entries)), dauerMs: durationMs(entries), toolAufrufe: toolCallCount(entries) };
}

function readMeasure(file) {
  try {
    return measure(readEntries(file));
  } catch {
    return { tokens: null, dauerMs: null, toolAufrufe: null };
  }
}

// Hängt die Zeile an <git-common-dir>/dv-forge/metrics/agents.jsonl; gibt die Datei oder null zurück.
function recordAgent(input, now = new Date()) {
  try {
    const record = { agent_type: input.agent_type ?? null, agent_id: input.agent_id ?? null, ...readMeasure(input.agent_transcript_path) };
    return appendMetric(input.cwd ?? process.cwd(), 'agents', record, now);
  } catch {
    return null;
  }
}

module.exports = { measure, recordAgent };
