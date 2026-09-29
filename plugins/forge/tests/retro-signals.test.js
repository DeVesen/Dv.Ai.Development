'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { signalHints } = require('../scripts/lib/retro-signals');
const { human, request, say, call, result, writeSession } = require('./lib/retro-session');

const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');
const ZERO = {
  errors: 0, denials: 0, rejections: 0, interruptions: 0, repeats: 0, compactions: 0, expectedUnused: 0, toolchainShell: 0,
  baselineTokens: 0, cacheRebuilds: 0, contextLoads: 0, longRuns: 0, idleReruns: 0, repeatedReads: 0, recurringCommands: 0, silenceMinutes: 0,
};

function facts(file) {
  return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cwd-')) });
}

test('signalHints_NoSignal_SaysNone', () => {
  assert.deepEqual(signalHints(ZERO), ['- keine Messwert-Signale']);
});

test('signalHints_TwoSignals_OneLineEach', () => {
  const lines = signalHints({ ...ZERO, errors: 2, cacheRebuilds: 1 });

  assert.equal(lines.length, 2);
  assert.match(lines[0], /^- Tool-Fehler: /);
  assert.match(lines[1], /^- Cache-Neuaufbau: /);
});

test('signalHints_EveryMeasuredField_FiresExactlyOneSignal', () => {
  for (const key of Object.keys(ZERO)) {
    assert.equal(signalHints({ ...ZERO, [key]: 1000000 }).length, 1, key);
  }
});

test('signalHints_Thresholds_BaselineFortyThousandAndSilenceTenMinutes', () => {
  const fired = [39999, 40000].map((tokens) => signalHints({ ...ZERO, baselineTokens: tokens })[0]);
  const silent = [9, 10].map((minutes) => signalHints({ ...ZERO, silenceMinutes: minutes })[0]);

  assert.deepEqual(fired.map((line) => line.startsWith('- Hohe Grundlast')), [false, true]);
  assert.deepEqual(silent.map((line) => line.startsWith('- Lange Stille')), [false, true]);
});

test('cli_SessionWithError_HintsSectionNamesToolErrors', () => {
  const file = writeSession([
    human('Los', '10:00'),
    request('r1', '10:01', [call('t1', 'Bash', { command: 'ls' })]),
    result('t1', '10:01', 'kaputt', true),
  ]);

  const output = facts(file);

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /## Hinweise zu den Signalen\n- Tool-Fehler: /);
});

test('cli_QuietSession_HintsSectionSaysNone', () => {
  const output = facts(writeSession([human('Los', '10:00'), request('r1', '10:01', [say('Hallo')])]));

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /## Hinweise zu den Signalen\n- keine Messwert-Signale\n/);
});
