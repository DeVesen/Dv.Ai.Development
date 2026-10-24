'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { answerHalt, startEtappe, checkGo, artifactHashes } = require('../scripts/lib/session-chain-gate');
const { readState, writeState } = require('../scripts/lib/session-chain-store');
const { repoWithPlan } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-chain.js');
const NOW = new Date('2026-10-24T10:00:00Z');

function reviewed(state, etappe = 'plan-review') {
  return { ...state, etappen: [{ etappe, hashes: artifactHashes(state) }] };
}

test('answerHalt_GoAtGoHalt_RecordsAnswerAndClearsHalt', () => {
  const { spec, plan } = repoWithPlan();
  const state = answerHalt(reviewed({ spec, plan, halt: 'go' }), 'go', NOW);
  assert.equal(state.halt, null);
  assert.deepEqual(state.freigabe, { halt: 'go', antwort: 'go', zeit: '2026-10-24T10:00:00.000Z' });
  assert.equal(state.antworten.length, 1);
});

test('answerHalt_NoHaltWrongAnswerOrShowstopper_Throws', () => {
  assert.throws(() => answerHalt({}, 'go'), /Kein Haltepunkt offen/);
  assert.throws(() => answerHalt({ halt: 'spec' }, 'go'), /erlaubt planning, spec-nacharbeit, stopp; nicht go/);
  assert.throws(() => answerHalt({ halt: 'showstopper' }, 'weiter'), /endet mit dem nächsten final/);
});

test('answerHalt_PlanChangedSinceReview_ThrowsExceptStopp', () => {
  const { spec, plan } = repoWithPlan();
  const state = reviewed({ spec, plan, halt: 'go' });
  fs.appendFileSync(plan, 'nachträglich\n');
  assert.throws(() => answerHalt(state, 'go'), /Plan seit plan-review geändert/);
  assert.equal(answerHalt(state, 'stopp').freigabe.antwort, 'stopp');
});

test('startEtappe_OpenHalt_Throws', () => {
  assert.throws(() => startEtappe({ halt: 'spec' }, 'planning'), /Haltepunkt spec offen/);
});

test('startEtappe_FreigabeOrNextEtappe_OnlyThatEtappe', () => {
  assert.throws(() => startEtappe({ freigabe: { halt: 'spec', antwort: 'planning' } }, 'umsetzung'), /Als Nächstes startet planning, nicht umsetzung/);
  const started = startEtappe({ freigabe: { halt: 'spec', antwort: 'planning' } }, 'planning', { now: NOW });
  assert.deepEqual([started.freigabe, started.gestartet], [null, { etappe: 'planning', zeit: '2026-10-24T10:00:00.000Z' }]);
  assert.throws(() => startEtappe({ naechste: 'grill' }, 'spec-review'), /Als Nächstes startet grill/);
  assert.throws(() => startEtappe({ freigabe: { halt: 'go', antwort: 'stopp' } }, 'umsetzung'), /startet keine Etappe/);
  assert.equal(startEtappe({ freigabe: { halt: 'abweichung', antwort: 'weiter' } }, 'grill').gestartet.etappe, 'grill');
});

test('startEtappe_RunningEtappe_OnlyRestartWithErneut', () => {
  const state = { naechste: 'grill', gestartet: { etappe: 'grill', zeit: 'z' } };
  assert.throws(() => startEtappe(state, 'grill'), /läuft seit z ohne final; Neustart derselben Etappe nur mit --erneut/);
  assert.throws(() => startEtappe(state, 'spec-review', { erneut: true }), /läuft seit z/);
  assert.equal(startEtappe(state, 'grill', { erneut: true, now: NOW }).gestartet.zeit, '2026-10-24T10:00:00.000Z');
});

test('checkGo_WithoutGoAnswer_Throws', () => {
  assert.throws(() => checkGo({}), /nur nach `answer --antwort go`/);
  assert.throws(() => checkGo({ freigabe: { halt: 'go', antwort: 'plan-nacharbeit' } }), /nur nach/);
  assert.doesNotThrow(() => checkGo({ freigabe: { halt: 'go', antwort: 'go' } }));
});

test('cli_AnswerThenBrief_StartsChosenEtappeOnce', () => {
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', reviewed({ slug: 'x', basis: 'main', spec, plan, halt: 'go' }));
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: 'utf8' });

  assert.equal(run('brief', '--etappe', 'umsetzung', '--slug', 'x').status, 1);
  const answered = run('answer', '--slug', 'x', '--antwort', 'go');
  assert.equal(answered.stdout.trim(), 'FREIGABE=go go');
  assert.equal(run('commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x').status, 0);
  const brief = run('brief', '--etappe', 'umsetzung', '--slug', 'x');
  assert.equal(brief.status, 0, brief.stderr);
  assert.equal(readState(repo, 'x').gestartet.etappe, 'umsetzung');
  const again = run('brief', '--etappe', 'umsetzung', '--slug', 'x');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /--erneut/);
});

test('cli_EventsJsonl_RecordsHaltAnswerCommitAndStart', () => {
  const { readEvents } = require('../scripts/lib/session-chain-store');
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', reviewed({ slug: 'x', basis: 'main', spec, plan }));
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: 'utf8' });
  run('halt', '--slug', 'x', '--art', 'go');
  run('answer', '--slug', 'x', '--antwort', 'go');
  run('commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x');
  run('brief', '--etappe', 'umsetzung', '--slug', 'x');
  const events = readEvents(repo, 'x');
  assert.deepEqual(events.map((event) => event.typ), ['halt', 'antwort', 'commit', 'start']);
  assert.ok(events.every((event) => /^\d{4}-\d{2}-\d{2}T/.test(event.zeit)));
  assert.equal(events[3].modell, 'opus');
});
