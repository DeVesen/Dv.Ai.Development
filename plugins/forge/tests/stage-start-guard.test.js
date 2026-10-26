'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo } = require('./lib/git-repo');
const { readState, writeState, chainDir } = require('../scripts/lib/session-chain-store');
const { decideStart, briefHashOf, sessionModel, OPUS_REASON } = require('../scripts/lib/stage-start-guard');

const GUARD = path.join(__dirname, '..', 'scripts', 'start-guard.js');
const CHAIN = path.join(__dirname, '..', 'scripts', 'session-chain.js');
const BRIEF = '/dv-forge:plan-orchestrator docs/forge/x/spec.md\n\n## Werte\n- Slug: x\n- Spec: docs/forge/x/spec.md\n';
const assistant = (model) => ({ type: 'assistant', message: { model, content: [{ type: 'text', text: 'ok' }] } });

function transcript(entries) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-start-')), 't.jsonl');
  fs.writeFileSync(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
  return file;
}

// Repo mit gestarteter Etappe `planning` (Modell opus) der Kette x.
function started({ modell = 'opus', brief = BRIEF, etappe = 'planning', hash = briefHashOf(brief) } = {}) {
  const repo = makeRepo();
  writeState(repo, 'x', { slug: 'x', gestartet: { etappe, zeit: 'z', briefHash: hash, modell } });
  return repo;
}

function call(repo, toolInput, model = 'claude-opus-5-5') {
  const base = { initiation: 'user_asked', context: 'fresh', use_worktree: false, title: 'Planning x', prompt: BRIEF };
  return decideStart({ cwd: repo, transcript_path: transcript([assistant(model)]), tool_name: 'mcp__ccd_session__start_session', tool_input: { ...base, ...toolInput } });
}

test('decideStart_ValidOpusStart_Allows', () => {
  assert.equal(call(started(), {}), null);
});

test('decideStart_ValidSonnetStart_Allows', () => {
  const repo = started({ modell: 'sonnet' });
  assert.equal(call(repo, { model: 'claude-sonnet-5-5' }), null);
});

test('decideStart_LeadSessionNotOnOpus_DeniesEvenForUnknownChain', () => {
  assert.equal(call(makeRepo(), {}, 'claude-sonnet-5-5'), OPUS_REASON);
  assert.equal(call(started(), {}, 'claude-haiku-5-5'), OPUS_REASON);
});

test('decideStart_ModelNotReadable_DoesNotDenyByModel', () => {
  const repo = started();
  const input = { cwd: repo, tool_input: { initiation: 'user_asked', context: 'fresh', use_worktree: false, prompt: BRIEF } };
  assert.equal(decideStart({ ...input, transcript_path: '/nix/da.jsonl' }), null);
  assert.equal(decideStart({ ...input, transcript_path: transcript([{ type: 'user', message: { content: 'hi' } }]) }), null);
  assert.equal(decideStart({ ...input }), null);
});

test('sessionModel_LastRealAssistantEntry_WinsOverSyntheticOnes', () => {
  assert.equal(sessionModel(transcript([assistant('claude-opus-5-5'), assistant('<synthetic>')])), 'claude-opus-5-5');
  assert.equal(sessionModel(transcript([assistant('claude-sonnet-5-5'), assistant('claude-opus-5-5')])), 'claude-opus-5-5');
});

test('decideStart_PromptDiffersFromBrief_Denies', () => {
  assert.match(call(started(), { prompt: `${BRIEF}\nZusatz` }), /weicht vom Brief ab/);
});

test('decideStart_PromptWithOnlyOuterWhitespaceChange_Allows', () => {
  assert.equal(call(started(), { prompt: `\n${BRIEF}\n\n` }), null);
});

test('decideStart_UseWorktreeNotFalse_Denies', () => {
  assert.match(call(started(), { use_worktree: true }), /use_worktree muss false sein/);
  assert.match(call(started(), { use_worktree: undefined }), /use_worktree muss false sein/);
});

test('decideStart_ContextNotFresh_Denies', () => {
  assert.match(call(started(), { context: 'fork' }), /context muss fresh sein/);
  assert.match(call(started(), { context: undefined }), /context muss fresh sein/);
});

test('decideStart_OpusEtappeWithModelField_Denies', () => {
  assert.match(call(started(), { model: 'claude-sonnet-5-5' }), /Lass das Feld model weg/);
});

test('decideStart_SonnetEtappeWithoutOrWrongModel_Denies', () => {
  const repo = started({ modell: 'sonnet' });
  assert.match(call(repo, {}), /sonnet-Modell-ID/);
  assert.match(call(repo, { model: 'claude-opus-5-5' }), /sonnet-Modell-ID/);
});

test('decideStart_UnknownChainOrNoSlugOrNoStart_DoesNotDeny', () => {
  const repo = started();
  assert.equal(call(repo, { prompt: BRIEF.replace('Slug: x', 'Slug: anders') }), null);
  assert.equal(call(repo, { prompt: 'Hallo' }), null);
  const idle = makeRepo();
  writeState(idle, 'x', { slug: 'x', gestartet: null });
  assert.equal(call(idle, {}), null);
});

test('decideStart_OlderStateWithoutHashOrModel_ChecksOnlyWhatIsKnown', () => {
  const repo = makeRepo();
  writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: 'z' } });
  assert.equal(call(repo, { prompt: `${BRIEF}anders` }), null);
  assert.match(call(repo, { use_worktree: true }), /Worktree/);
});

test('decideStart_UnknownToolSchema_ChecksOnlyTheOpusRule', () => {
  const repo = started();
  const input = { cwd: repo, transcript_path: transcript([assistant('claude-opus-5-5')]) };
  assert.equal(decideStart({ ...input, tool_input: { text: BRIEF, worktree: true } }), null);
  assert.equal(decideStart({ ...input, tool_input: { prompt: BRIEF } }), null);
  assert.equal(decideStart({ ...input }), null);
});

test('decideStart_UnreadableStateFile_FailsOpen', () => {
  const repo = started();
  fs.writeFileSync(path.join(chainDir(repo, 'x'), 'zustand.json'), '[1]');
  assert.equal(call(repo, { use_worktree: true }), null);
});

function guard(input, tmpEnv = {}) {
  return spawnSync(process.execPath, [GUARD], { input, encoding: 'utf8', env: { ...process.env, ...tmpEnv } });
}

test('cli_Violation_PrintsDenyJson', () => {
  const repo = started();
  const input = JSON.stringify({ cwd: repo, transcript_path: transcript([assistant('claude-opus-5-5')]), tool_name: 'mcp__ccd_session__start_session', tool_input: { initiation: 'user_asked', prompt: BRIEF, context: 'fork', use_worktree: false } });
  const result = guard(input);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('cli_BrokenInput_FailsOpen', () => {
  const result = guard('{kaputt');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge start-guard/);
});

test('brief_Cli_StoresHashOfBriefTextAndModelInStartedState', () => {
  const repo = makeRepo();
  const spec = path.join(repo, 'docs', 'forge', 'x', 'spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  const run = (...args) => spawnSync(process.execPath, [CHAIN, ...args, ...(args[0] === 'brief' ? ['--leit', 'local_leit-1'] : [])], { cwd: repo, encoding: 'utf8' });
  assert.equal(run('set', '--slug', 'x', '--spec', spec).status, 0);
  const result = run('brief', '--etappe', 'planning', '--slug', 'x');
  assert.equal(result.status, 0, result.stderr);
  const text = result.stdout.split('=== BRIEF ===\n')[1];
  const { gestartet } = readState(repo, 'x');
  assert.equal(gestartet.briefHash, briefHashOf(text));
  assert.equal(gestartet.modell, 'opus');
});

test('hooksJson_StartGuard_MatchesTheStartTool', () => {
  const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
  const entry = hooks.PreToolUse.find((candidate) => candidate.matcher === 'mcp__ccd_session__start_session');
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/start-guard.js"');
});
