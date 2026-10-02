'use strict';

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readEntries, humanEvents } = require('../scripts/lib/transcript');
const { human, slash, skillText, summary, plainSummary, interrupt, request, call, rejection, writeSession } = require('./lib/retro-session');

const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

function sessionWithSkillAndSummary() {
  return writeSession([
    human('Mach X', '10:00'),
    slash('acme:plan-writing', 'docs/forge/x/spec.md', '10:01'),
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

function facts(file) {
  return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
}

test('humanEvents_UnmarkedSummaryInMarkedSession_IsNoInput', () => {
  const entries = readEntries(sessionWithUnmarkedSummary());

  const events = humanEvents(entries);

  assert.deepEqual(events.map((event) => event.text), ['Mach X', 'Danke']);
});

test('cli_UnmarkedSummary_NotCountedAsHumanInput', () => {
  const result = facts(sessionWithUnmarkedSummary());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Eingaben des Menschen: 2 · /);
});

test('humanEvents_SkillTextAndSummary_AreNoInput', () => {
  const entries = readEntries(sessionWithSkillAndSummary());

  const inputs = humanEvents(entries).filter((event) => event.kind === 'Eingabe');

  assert.deepEqual(inputs.map((event) => event.text), ['Mach X', '/acme:plan-writing docs/forge/x/spec.md', 'Danke']);
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

test('cli_SkillTextAndSummary_NotCountedAsHumanInput', () => {
  const result = facts(sessionWithSkillAndSummary());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Eingaben des Menschen: 3 · /);
});

test('cli_HumanEvents_ListedWithEntryTimeAndText', () => {
  const result = facts(sessionWithSkillAndSummary());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /## Eingaben des Menschen\n- #1 10:00 Eingabe: Mach X\n- #2 10:01 Eingabe: \/acme:plan-writing docs\/forge\/x\/spec\.md\n- #5 10:03 Ablehnung: Tool-Aufruf abgelehnt\n- #6 10:04 Unterbrechung: \[Request interrupted by user\]\n- #8 10:40 Eingabe: Danke\n/);
});
