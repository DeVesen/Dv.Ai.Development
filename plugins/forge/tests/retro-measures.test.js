'use strict';

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readEntries } = require('../scripts/lib/transcript');
const measures = require('../scripts/lib/retro-measures');
const { human, request, say, call, result, hint, stamp, skillText, usage, writeSession } = require('./lib/retro-session');
const { requestsOf } = require('../scripts/lib/retro-requests');

const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

function facts(file) {
  return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
}

function timedSession() {
  return writeSession([
    human('Los', '10:00'),
    hint('total_tokens_reminder', '10:00'),
    request('r1', '10:01', [say('Ich schaue nach')]),
    request('r2', '10:05', [call('t1', 'Bash', { command: 'npm test' })]),
    result('t1', '10:06', 'ok'),
    hint('total_tokens_reminder', '10:06'),
    request('r3', '10:13', [say('Fertig')]),
    { type: 'user', timestamp: stamp('10:13'), message: { role: 'user', content: '<system-reminder>Plan-Modus</system-reminder>' } },
    hint('hook_additional_context', '10:29'),
    human('Weiter', '10:30'),
    request('r4', '10:31', [say('Ok')]),
  ]);
}

test('timeProfile_WaitBeforeInput_SplitsActiveAndWaitingMinutes', () => {
  const profile = measures.timeProfile(readEntries(timedSession()));

  assert.deepEqual(profile, { active: 14, waiting: 17, silence: 12, silenceFrom: 3 });
});

test('harnessHints_AttachmentsAndNotices_CountedByKind', () => {
  const hints = measures.harnessHints(readEntries(timedSession()));

  assert.deepEqual(hints, [['total_tokens_reminder', 2], ['hook_additional_context', 1], ['system-reminder', 1]]);
});

test('cli_TimedSession_NamesActiveWaitingSilenceAndHints', () => {
  const output = facts(timedSession());

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /- Zeit: aktiv 14 min · Warten auf den Menschen 17 min · längste Strecke ohne Text an den Menschen 12 min \(ab Eintrag 3\)\n/);
  assert.match(output.stdout, /- Harness-Hinweise: total_tokens_reminder 2, hook_additional_context 1, system-reminder 1\n/);
});

function contextSession() {
  return writeSession([
    hint('prompt_snapshot', '10:00', { systemPrompt: ['x'.repeat(8000)] }),
    hint('skill_listing', '10:00', { content: 'y'.repeat(4000) }),
    skillText('z'.repeat(400), '10:00'),
    hint('date', '10:00', { date: '2026-09-27' }),
    human('Los', '10:00'),
    request('r1', '10:00', [say('a')], usage(5, 30000, 0)),
    request('r2', '10:02', [say('b')], usage(5, 1000, 30000)),
    request('r3', '10:40', [say('c')], usage(5, 31000, 0)),
    request('r4', '10:41', [say('d')], usage(5, 500, 31000)),
  ]);
}

test('requestContext_FourRequests_AverageAndLargest', () => {
  const context = measures.requestContext(requestsOf(readEntries(contextSession())));

  assert.deepEqual(context, { average: 30880, largest: 31505 });
});

test('firstRequest_AttachmentsBefore_ThreeLargestNamed', () => {
  const entries = readEntries(contextSession());

  const baseline = measures.firstRequest(entries, requestsOf(entries));

  assert.equal(baseline.context, 30005);
  assert.deepEqual(baseline.attachments.map((attachment) => attachment.name), ['prompt_snapshot', 'skill_listing', 'Skill-Text']);
});

test('cacheRebuilds_BigWriteAfterPauseWithLittleCacheRead_Listed', () => {
  const rebuilds = measures.cacheRebuilds(requestsOf(readEntries(contextSession())));

  assert.deepEqual(rebuilds, [{ time: stamp('10:40'), pause: 38, created: 31000 }]);
});

test('cacheRebuilds_BigWriteButCacheReadHalfOrMore_NotListed', () => {
  const entries = readEntries(writeSession([
    request('r1', '10:00', [], usage(5, 30000, 0)),
    request('r2', '10:30', [], usage(5, 25000, 16000)),
    request('r3', '10:31', [], usage(5, 10000, 0)),
  ]));

  assert.deepEqual(measures.cacheRebuilds(requestsOf(entries)), []);
});

test('cli_ContextSession_NamesContextBaselineAndRebuild', () => {
  const output = facts(contextSession());

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /- Kontext je Anfrage: Ø 31k, größte 32k\n/);
  assert.match(output.stdout, /- Grundlast erste Anfrage: 30k Kontext · größte Anhänge davor: prompt_snapshot 2k, skill_listing 1k, Skill-Text 0k\n/);
  assert.match(output.stdout, /- Cache-Neuaufbauten: 10:40 nach 38 min Pause \(31k neu\)\n/);
});

test('cli_NoRebuild_SaysNone', () => {
  const output = facts(timedSession());

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /- Cache-Neuaufbauten: keiner\n/);
});
