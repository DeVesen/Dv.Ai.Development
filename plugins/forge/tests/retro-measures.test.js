'use strict';

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readEntries } = require('../scripts/lib/transcript');
const measures = require('../scripts/lib/retro-measures');
const { human, request, say, call, result, hint, stamp, writeSession } = require('./lib/retro-session');

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
