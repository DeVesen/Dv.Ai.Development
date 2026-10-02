'use strict';

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readEntries } = require('../scripts/lib/transcript');
const { rangeOf } = require('../scripts/lib/retro-range');
const { human, slash, request, say, call, result, hint, stamp, writeSession } = require('./lib/retro-session');

// Der Aufruf der Retrospektive in Eintrag 7 ist der laufende: Ihm folgt noch keine Modell-Anfrage.
function session({ withRetro = true } = {}) {
  return readEntries(writeSession([
    hint('skill_listing', '10:00', { content: '- dv-forge:domain-modeling: Use when terms are fuzzy' }),
    human('Plane X', '10:00'),
    slash('dv-forge:plan-review', 'plan.md', '10:10'),
    request('r1', '10:11', [call('t1', 'Read', { file_path: 'plan.md' })]),
    slash('dv-forge:plan-review', 'plan.md', '10:20'),
    request('r2', '10:21', [call('t2', 'Grep', { pattern: 'x' })]),
    ...(withRetro ? [slash('dv-forge:prozess-retrospektive', '', '10:30')] : []),
    slash('dv-forge:spec-review', 'spec.md', '10:40'),
  ]));
}

function agentAt(at) {
  return [{ type: 'assistant', timestamp: stamp(at), message: { content: [] } }];
}

test('rangeOf_BeforeRetro_EndsBeforeLastRetroCallAndNamesCut', () => {
  const range = rangeOf(session(), { beforeRetro: true });

  assert.deepEqual(range.entries.map((entry) => entry.entryNo), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(range.labels, ['Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 7 · 10:30)']);
  assert.equal(range.cutTime, '2026-09-27T10:30:00Z');
});

test('rangeOf_BeforeRetroWithoutRetroCall_KeepsWholeSession', () => {
  const entries = session({ withRetro: false });

  const range = rangeOf(entries, { beforeRetro: true });

  assert.equal(range.entries.length, entries.length);
  assert.deepEqual(range.labels, []);
  assert.equal(range.cutTime, null);
});

test('rangeOf_LastRetroAlreadyWroteReport_KeepsWholeSessionAndNamesIt', () => {
  const entries = readEntries(writeSession([
    human('Plane X', '10:00'),
    slash('dv-forge:prozess-retrospektive', '', '10:30'),
    request('r1', '10:35', [call('t1', 'Bash', { command: 'node "/p/scripts/retro-report.js" --session s1 --topic planung' })]),
    result('t1', '10:36', 'Bericht: docs/wishes/2026-09-27-planung.md\nPrüfung: 0 Verstöße'),
    human('Weiter', '10:40'),
  ]));

  const range = rangeOf(entries, { beforeRetro: true });

  assert.equal(range.entries.length, entries.length);
  assert.deepEqual(range.labels, ['Schnitt: keiner, der letzte Aufruf von prozess-retrospektive (Eintrag 2 · 10:30) hat seinen Bericht schon erzeugt']);
  assert.equal(range.cutTime, null);
});

test('rangeOf_LastRetroReportFailed_StillCutsBeforeIt', () => {
  const entries = readEntries(writeSession([
    human('Plane X', '10:00'),
    slash('dv-forge:prozess-retrospektive', '', '10:30'),
    request('r1', '10:35', [call('t1', 'Bash', { command: 'node "/p/scripts/retro-report.js" --session s1 --topic planung' })]),
    result('t1', '10:36', 'Exit code 1\n- Reibung 1: *Kosten:* fehlt', true),
    human('Weiter', '10:40'),
  ]));

  const range = rangeOf(entries, { beforeRetro: true });

  assert.deepEqual(range.entries.map((entry) => entry.entryNo), [1]);
  assert.deepEqual(range.labels, [
    'Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 2 · 10:30)',
    'Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von prozess-retrospektive (Eintrag 2); Arbeit danach fehlt',
  ]);
});

test('rangeOf_OnlyFactsRerunAfterRetroCall_CutsWithoutWarning', () => {
  const entries = readEntries(writeSession([
    human('Plane X', '10:00'),
    slash('dv-forge:prozess-retrospektive', '--since-command plan-review', '10:30'),
    request('r1', '10:31', [say('Ich hole die Fakten neu')]),
    request('r1', '10:31', [call('t1', 'Bash', { command: 'node "/p/scripts/session-facts.js" --session s1 --before-retro --snapshot' })]),
  ]));

  const range = rangeOf(entries, { beforeRetro: true });

  assert.deepEqual(range.labels, ['Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 2 · 10:30)']);
});

test('rangeOf_SinceCommandTwiceWithCut_StartsAtLastCallBeforeCut', () => {
  const range = rangeOf(session(), { sinceCommand: 'plan-review', beforeRetro: true });

  assert.deepEqual(range.entries.map((entry) => entry.entryNo), [5, 6]);
  assert.deepEqual(range.labels, [
    'Start: letzter Aufruf von plan-review (Eintrag 5 · 10:20)',
    'Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 7 · 10:30)',
  ]);
});

test('rangeOf_SinceCommandWithoutCut_StartsAtLastCallAndRunsToEnd', () => {
  const range = rangeOf(session(), { sinceCommand: 'plan-review' });

  assert.deepEqual(range.entries.map((entry) => entry.entryNo), [5, 6, 7, 8]);
});

test('rangeOf_StartOnlyAfterCut_ReportsEmptyRange', () => {
  assert.throws(() => rangeOf(session(), { sinceCommand: 'spec-review', beforeRetro: true }), /Leerer Bereich: kein Aufruf von spec-review vor dem Schnitt/);
});

test('rangeOf_ListedButNeverCalled_ReportsEmptyRange', () => {
  assert.throws(() => rangeOf(session(), { sinceCommand: 'domain-modeling' }), /Leerer Bereich: kein Aufruf von domain-modeling in der Session/);
});

test('rangeOf_UnknownCommand_Reported', () => {
  assert.throws(() => rangeOf(session(), { sinceCommand: 'gibt-es-nicht' }), /Unbekannter Befehl: gibt-es-nicht kommt in der Session nicht vor/);
});

test('rangeOf_Subagents_KeptOnlyWhenStartedInsideRange', () => {
  const range = rangeOf(session(), { sinceCommand: 'plan-review', beforeRetro: true });

  const kept = ['10:15', '10:25', '10:35'].map((at) => range.keepSubagent(agentAt(at)));

  assert.deepEqual(kept, [false, true, false]);
});

test('rangeOf_NoBounds_KeepsEverySubagent', () => {
  const range = rangeOf(session(), {});

  assert.equal(range.keepSubagent([{ type: 'assistant', message: { content: [] } }]), true);
});
