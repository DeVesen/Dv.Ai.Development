'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const stage = require('../scripts/lib/stage-guard');
const { buildBrief } = require('../scripts/lib/session-chain-brief');
const { parseStatusLine } = require('../scripts/lib/session-chain-turn');
const { etappeReport } = require('../scripts/lib/session-chain-report');
const { makeRepo, commitFile } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'stage-guard.js');
const SESSION = 'stage-session';
const EMPTY = { entscheidungen: [], dateien: [], anhang: [], luecken: [], acOhneTest: [] };
const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-stage-'));
}

function brief(etappe = 'planning') {
  return buildBrief({ etappe, values: { slug: 'x', spec: '/r/docs/forge/x/spec.md', wi: '12' } }).brief;
}

function started(etappe = 'planning') {
  const tmpRoot = tmp();
  stage.onPrompt({ session_id: SESSION, prompt: brief(etappe) }, tmpRoot);
  return tmpRoot;
}

function turnEnd(tmpRoot, last, extra = {}) {
  return stage.onTurnEnd({ session_id: SESSION, last_assistant_message: last, ...extra }, tmpRoot);
}

function line(fields) {
  const { etappe = 'planning', status = 'in-progress', rot = 0, gelb = 0, commit = 'none', bericht = 'none' } = fields;
  return `[${etappe}] STATUS=${status} · ROT=${rot} · GELB=${gelb} · COMMIT=${commit} · BERICHT=${bericht}`;
}

function writtenReport(etappe = 'planning', slug = 'x') {
  const repo = makeRepo();
  const input = path.join(repo, 'abschluss.md');
  fs.writeFileSync(input, '# Abschlussbericht\n**Ergebnis:** ok\n');
  return { repo, bericht: etappeReport({ ...EMPTY, etappe, slug, bericht: input }, repo) };
}

test('onPrompt_BriefOfStageSession_WritesMarkerWithEtappeAndSlug', () => {
  const tmpRoot = started('grill');
  const marker = stage.readMarker(SESSION, tmpRoot);
  assert.equal(marker.etappe, 'grill');
  assert.equal(marker.slug, 'x');
});

test('onPrompt_BriefWithoutSlugYet_StoresNullSlug', () => {
  const tmpRoot = tmp();
  const text = buildBrief({ etappe: 'whiteboarding', values: {}, kontext: 'Idee' }).brief;
  stage.onPrompt({ session_id: SESSION, prompt: text }, tmpRoot);
  assert.deepEqual([stage.readMarker(SESSION, tmpRoot).etappe, stage.readMarker(SESSION, tmpRoot).slug], ['whiteboarding', null]);
});

test('onPrompt_OrdinaryPrompt_WritesNoMarker', () => {
  const tmpRoot = tmp();
  stage.onPrompt({ session_id: SESSION, prompt: 'Hallo, Etappe planning bitte' }, tmpRoot);
  assert.equal(stage.readMarker(SESSION, tmpRoot), null);
});

test('onTurnEnd_NoMarkerAndNoTranscript_DoesNotBlock', () => {
  assert.equal(turnEnd(tmp(), 'irgendwas'), null);
});

test('onTurnEnd_ValidInProgressLine_Allows', () => {
  assert.equal(turnEnd(started(), `${line({})}\nStand: Schritt 1`), null);
});

test('onTurnEnd_NeedsUserLine_Allows', () => {
  assert.equal(turnEnd(started(), line({ status: 'needs-user' })), null);
});

test('onTurnEnd_NoStatusLine_BlocksWithTemplateFromBaseFile', () => {
  const reason = turnEnd(started(), 'Ich bin fertig.');
  assert.match(reason, /Statuszeile/);
  assert.ok(reason.includes('[planning] STATUS=<in-progress|needs-user|final> · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad|none>'));
});

test('statusTemplate_Filled_IsTheLineOfBaseSubAgent', () => {
  const base = fs.readFileSync(path.join(__dirname, '..', 'shared', 'session-chain', 'base-sub-agent.md'), 'utf8');
  assert.ok(base.includes(stage.statusTemplate('{{ETAPPE}}')));
  assert.ok(stage.statusTemplate('grill').startsWith('[grill] STATUS='));
});

test('onTurnEnd_StatusLineNotFirst_Blocks', () => {
  assert.ok(turnEnd(started(), `Kurz vorweg\n${line({})}`));
});

test('onTurnEnd_StatusLineOfOtherEtappe_BlocksAndNamesBoth', () => {
  const reason = turnEnd(started('planning'), line({ etappe: 'grill' }));
  assert.match(reason, /Etappe grill, deine ist planning/);
});

test('onTurnEnd_FinalWithoutReport_Blocks', () => {
  assert.match(turnEnd(started(), line({ status: 'final' })), /BERICHT=<pfad>/);
});

test('onTurnEnd_FinalWithMissingReportFile_Blocks', () => {
  assert.match(turnEnd(started(), line({ status: 'final', bericht: '/nix/da/bericht.md' })), /existiert nicht/);
});

test('onTurnEnd_FinalWithHandWrittenFileWithoutData_Blocks', () => {
  const dir = tmp();
  const file = path.join(dir, 'bericht.md');
  fs.writeFileSync(file, 'selbst geschrieben');
  assert.match(turnEnd(started(), line({ status: 'final', bericht: file.replace(/\\/g, '/') })), /Bericht-Daten/);
});

test('onTurnEnd_FinalWithReportOfOtherEtappe_Blocks', () => {
  const { bericht } = writtenReport('grill');
  assert.match(turnEnd(started('planning'), line({ status: 'final', bericht })), /gehört zur Etappe grill/);
});

test('onTurnEnd_FinalWithReportOfOtherChain_Blocks', () => {
  const { bericht } = writtenReport('planning', 'anderes');
  assert.match(turnEnd(started(), line({ status: 'final', bericht })), /Kette anderes/);
});

test('onTurnEnd_FinalWithReportAndNoCommit_Allows', () => {
  const { bericht } = writtenReport();
  assert.equal(turnEnd(started(), line({ status: 'final', bericht })), null);
});

test('onTurnEnd_FinalWithExistingCommit_Allows', () => {
  const { repo, bericht } = writtenReport();
  const hash = commitFile(repo, 'a.txt', 'a', 'add a');
  assert.equal(turnEnd(started(), line({ status: 'final', bericht, commit: hash.slice(0, 10) }), { cwd: repo }), null);
});

test('onTurnEnd_FinalWithUnknownCommit_Blocks', () => {
  const { repo, bericht } = writtenReport();
  assert.match(turnEnd(started(), line({ status: 'final', bericht, commit: 'deadbeef' }), { cwd: repo }), /kein Commit/);
});

test('onTurnEnd_FinalWithCommitButCwdNotARepo_FailsOpen', () => {
  const { bericht } = writtenReport();
  assert.equal(turnEnd(started(), line({ status: 'final', bericht, commit: 'deadbeef' }), { cwd: tmp() }), null);
});

test('onTurnEnd_BlocksTwiceThenLetsTheTurnEnd', () => {
  const tmpRoot = started();
  assert.ok(turnEnd(tmpRoot, 'x'));
  assert.ok(turnEnd(tmpRoot, 'x', { stop_hook_active: true }));
  assert.equal(turnEnd(tmpRoot, 'x', { stop_hook_active: true }), null);
  assert.ok(turnEnd(tmpRoot, 'x'), 'nächster Zug beginnt neu');
});

test('onTurnEnd_StopHookActiveWithoutPriorBlock_DoesNotBlock', () => {
  assert.equal(turnEnd(started(), 'x', { stop_hook_active: true }), null);
});

test('onTurnEnd_ValidLineAfterBlock_ResetsCounter', () => {
  const tmpRoot = started();
  turnEnd(tmpRoot, 'x');
  assert.equal(turnEnd(tmpRoot, line({})), null);
  assert.equal(stage.readMarker(SESSION, tmpRoot).blocks, 0);
});

test('onTurnEnd_MarkerLostButTranscriptStartsWithBrief_StillChecks', () => {
  const tmpRoot = tmp();
  const file = path.join(tmp(), 't.jsonl');
  fs.writeFileSync(file, [human(brief()), said('Ich bin fertig.')].map((entry) => JSON.stringify(entry)).join('\n'));
  assert.match(turnEnd(tmpRoot, 'Ich bin fertig.', { transcript_path: file }), /Statuszeile/);
});

test('onTurnEnd_OrdinarySessionTranscript_DoesNotBlock', () => {
  const file = path.join(tmp(), 't.jsonl');
  fs.writeFileSync(file, [human('hallo'), said('Hi')].map((entry) => JSON.stringify(entry)).join('\n'));
  assert.equal(turnEnd(tmp(), 'Hi', { transcript_path: file }), null);
});

test('onTurnEnd_NoLastMessage_ReadsLastAssistantTextFromTranscript', () => {
  const tmpRoot = started();
  const file = path.join(tmp(), 't.jsonl');
  fs.writeFileSync(file, [human('los'), said(line({}))].map((entry) => JSON.stringify(entry)).join('\n'));
  assert.equal(turnEnd(tmpRoot, '', { transcript_path: file }), null);
});

test('clearMarker_Existing_RemovesIt', () => {
  const tmpRoot = started();
  stage.clearMarker(SESSION, tmpRoot);
  assert.equal(stage.readMarker(SESSION, tmpRoot), null);
});

function cli(tmpRoot, event, input) {
  return spawnSync(process.execPath, [SCRIPT, event], { input, encoding: 'utf8', env: { ...process.env, TMPDIR: tmpRoot, TMP: tmpRoot, TEMP: tmpRoot } });
}

test('cli_PromptThenTurnEndWithoutStatus_PrintsBlockJson', () => {
  const tmpRoot = tmp();
  cli(tmpRoot, 'prompt', JSON.stringify({ session_id: SESSION, prompt: brief() }));
  const result = cli(tmpRoot, 'turn-end', JSON.stringify({ session_id: SESSION, last_assistant_message: 'fertig' }));
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
});

test('cli_StopEvent_ClearsMarker', () => {
  const tmpRoot = tmp();
  cli(tmpRoot, 'prompt', JSON.stringify({ session_id: SESSION, prompt: brief() }));
  cli(tmpRoot, 'stop', JSON.stringify({ session_id: SESSION }));
  assert.equal(fs.existsSync(stage.markerPath(SESSION, tmpRoot)), false);
});

test('cli_BrokenJson_FailsOpen', () => {
  const result = cli(tmp(), 'turn-end', '{kaputt');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge stage-guard/);
});

test('cli_BrokenMarkerFile_FailsOpen', () => {
  const tmpRoot = tmp();
  fs.mkdirSync(path.join(tmpRoot, 'dv-forge'), { recursive: true });
  fs.writeFileSync(stage.markerPath(SESSION, tmpRoot), '{kaputt');
  const result = cli(tmpRoot, 'turn-end', JSON.stringify({ session_id: SESSION, last_assistant_message: 'x' }));
  assert.equal(result.stdout, '');
});
