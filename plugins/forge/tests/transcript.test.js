'use strict';

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readEntries, humanEvents } = require('../scripts/lib/transcript');
const { human, slash, skillText, summary, plainSummary, interrupt, request, call, rejection, writeSession } = require('./lib/retro-session');

function sessionWithSkillAndSummary() {
  return writeSession([
    human('Mach X', '10:00'),
    slash('dv-forge:plan-writing', 'docs/forge/x/spec.md', '10:01'),
    skillText('Base directory for this skill: /plugins/forge/skills/plan-writing', '10:01'),
    request('r1', '10:02', [call('t1', 'Write', { file_path: 'a.md' })]),
    rejection('t1', '10:03'),
    interrupt('10:04'),
    summary('This session is being continued from a previous conversation that ran out of context.', '10:30'),
    human('Danke', '10:40'),
  ]);
}

// Die `human`-Einträge tragen `origin`, damit gilt das Protokoll als markiert; die Zusammenfassung hat weder `origin` noch Marker.
function sessionWithUnmarkedSummary() {
  return writeSession([
    human('Mach X', '10:00'),
    plainSummary('This session is being continued from a previous conversation that ran out of context.', '10:30'),
    human('Danke', '10:40'),
  ]);
}

test('humanEvents_UnmarkedSummaryInMarkedSession_IsNoInput', () => {
  const entries = readEntries(sessionWithUnmarkedSummary());

  const events = humanEvents(entries);

  assert.deepEqual(events.map((event) => event.text), ['Mach X', 'Danke']);
});

test('humanEvents_SkillTextAndSummary_AreNoInput', () => {
  const entries = readEntries(sessionWithSkillAndSummary());

  const inputs = humanEvents(entries).filter((event) => event.kind === 'Eingabe');

  assert.deepEqual(inputs.map((event) => event.text), ['Mach X', '/dv-forge:plan-writing docs/forge/x/spec.md', 'Danke']);
});

test('humanEvents_InterruptAndRejection_ListedWithEntryNumber', () => {
  const entries = readEntries(sessionWithSkillAndSummary());

  const events = humanEvents(entries);

  assert.deepEqual(events.map((event) => [event.entryNo, event.kind]), [[1, 'Eingabe'], [2, 'Eingabe'], [5, 'Ablehnung'], [6, 'Unterbrechung'], [8, 'Eingabe']]);
});

test('humanEvents_LongText_ShortenedToOneLine', () => {
  const entries = readEntries(writeSession([human(`Zeile eins\n${'x'.repeat(200)}`, '10:00')]));

  const [event] = humanEvents(entries);

  assert.equal(event.text.length, 100);
  assert.ok(event.text.startsWith('Zeile eins x'));
  assert.ok(event.text.endsWith('…'));
});
