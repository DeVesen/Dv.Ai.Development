'use strict';

// Baut Protokolle, wie Claude Code sie schreibt. `at` ist eine Uhrzeit in UTC am 2026-09-27, 'HH:MM' oder 'HH:MM:SS'.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function stamp(at) {
  return `2026-09-27T${at.length === 5 ? `${at}:00` : at}Z`;
}

function human(text, at) {
  return { type: 'user', origin: { kind: 'human' }, timestamp: stamp(at), message: { role: 'user', content: text } };
}

function slash(name, args, at) {
  const content = `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>\n<command-args>${args}</command-args>`;
  return { type: 'user', origin: { kind: 'human' }, timestamp: stamp(at), message: { role: 'user', content } };
}

function skillText(text, at) {
  return { type: 'user', isMeta: true, timestamp: stamp(at), message: { role: 'user', content: [{ type: 'text', text }] } };
}

// Zusammenfassung mit Marker, wie ältere Protokolle sie schreiben könnten.
function summary(text, at) {
  return { type: 'user', isCompactSummary: true, timestamp: stamp(at), message: { role: 'user', content: text } };
}

// So steht eine Zusammenfassung in echten Protokollen: ein Text-Eintrag des Nutzers ohne `origin` und ohne `isCompactSummary`.
function plainSummary(text, at) {
  return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: text } };
}

function interrupt(at) {
  return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: [{ type: 'text', text: '[Request interrupted by user]' }] } };
}

function usage(fresh, created, read, output = 100) {
  return { input_tokens: fresh, cache_creation_input_tokens: created, cache_read_input_tokens: read, output_tokens: output };
}

function request(id, at, parts = [], tokens = usage(10, 0, 0)) {
  return { type: 'assistant', requestId: id, timestamp: stamp(at), message: { model: 'claude-x', usage: tokens, content: parts } };
}

function say(text) {
  return { type: 'text', text };
}

function call(id, name, input) {
  return { type: 'tool_use', id, name, input };
}

function result(id, at, content, isError = false) {
  return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } };
}

function rejection(id, at) {
  return result(id, at, "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file).", true);
}

function hint(type, at, extra = {}) {
  return { type: 'attachment', timestamp: stamp(at), attachment: { type, ...extra } };
}

function writeSession(entries, id = 's1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-session-'));
  const file = path.join(dir, `${id}.jsonl`);
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

module.exports = { stamp, human, slash, skillText, summary, plainSummary, interrupt, usage, request, say, call, result, rejection, hint, writeSession };
