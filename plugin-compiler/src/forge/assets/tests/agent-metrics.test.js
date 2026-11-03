'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { measure, recordAgent } = require('../scripts/lib/agent-metrics');
const { makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'agent-check.js');

const user = (timestamp) => ({ type: 'user', timestamp, message: { role: 'user', content: 'go' } });
const assistant = (id, timestamp, usage, content) => ({ type: 'assistant', timestamp, message: { id, role: 'assistant', usage, content } });
const toolUse = (id) => ({ type: 'tool_use', id, name: 'Bash', input: {} });
const text = { type: 'text', text: 'done' };

const ENTRIES = [
  user('2026-10-25T00:00:00.000Z'),
  assistant('m1', '2026-10-25T00:00:01.000Z', { input_tokens: 2, cache_creation_input_tokens: 4000, cache_read_input_tokens: 0, output_tokens: 70 }, [toolUse('t1')]),
  { type: 'attachment', timestamp: '2026-10-25T00:00:02.000Z' },
  assistant('m2', '2026-10-25T00:00:05.000Z', { input_tokens: 3, cache_creation_input_tokens: 100, cache_read_input_tokens: 4000, output_tokens: 30 }, [toolUse('t2'), toolUse('t3')]),
  assistant('m3', '2026-10-25T00:00:09.500Z', { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 4100, output_tokens: 5 }, [text]),
];

function transcript(entries) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-am-')), 'agent.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

function lines(repo) {
  const file = path.join(repo, '.git', 'dv-forge', 'metrics', 'agents.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [];
}

test('measure_ThreeMessages_SumsTokensDurationAndToolCalls', () => {
  assert.deepEqual(measure(ENTRIES), { tokens: { input: 4106, cached: 8100, output: 105 }, dauerMs: 9500, toolAufrufe: 3 });
});

test('measure_MessageSplitOverSeveralEntries_CountsItsTokensOnce', () => {
  const split = [
    assistant('m1', '2026-10-25T00:00:01.000Z', { input_tokens: 2, output_tokens: 10 }, [toolUse('t1')]),
    assistant('m1', '2026-10-25T00:00:02.000Z', { input_tokens: 2, output_tokens: 10 }, [text]),
  ];
  assert.deepEqual(measure(split).tokens, { input: 2, cached: 0, output: 10 });
});

test('measure_SingleEntryOrNoTimestamps_HasNoDuration', () => {
  assert.equal(measure([user('2026-10-25T00:00:00.000Z')]).dauerMs, null);
  assert.equal(measure([{ type: 'assistant', message: { id: 'a', content: [] } }]).dauerMs, null);
});

test('recordAgent_AnyAgentType_AppendsOneLineToCommonDirMetrics', () => {
  const repo = makeRepo();
  const file = recordAgent({ agent_type: 'general-purpose', agent_id: 'a1', cwd: repo, agent_transcript_path: transcript(ENTRIES) }, new Date('2026-10-25T01:00:00.000Z'));
  assert.ok(file.endsWith(path.join('dv-forge', 'metrics', 'agents.jsonl')));
  assert.deepEqual(lines(repo), [{
    format: 1, zeit: '2026-10-25T01:00:00.000Z', agent_type: 'general-purpose', agent_id: 'a1',
    tokens: { input: 4106, cached: 8100, output: 105 }, dauerMs: 9500, toolAufrufe: 3,
  }]);
});

test('recordAgent_SecondAgent_AppendsInsteadOfOverwriting', () => {
  const repo = makeRepo();
  recordAgent({ agent_type: 'a', cwd: repo, agent_transcript_path: transcript(ENTRIES) });
  recordAgent({ agent_type: 'b', cwd: repo, agent_transcript_path: transcript(ENTRIES) });
  assert.deepEqual(lines(repo).map((line) => line.agent_type), ['a', 'b']);
});

test('recordAgent_WorktreeAndMain_ShareOneFile', () => {
  const repo = makeRepo();
  const { addWorktree } = require('./lib/git-repo');
  const worktree = addWorktree(repo, 'feature');
  recordAgent({ agent_type: 'a', cwd: worktree, agent_transcript_path: transcript(ENTRIES) });
  assert.equal(lines(repo).length, 1);
});

test('recordAgent_MissingTranscript_WritesLineWithoutMeasurements', () => {
  const repo = makeRepo();
  recordAgent({ agent_type: 'a', agent_id: 'x', cwd: repo, agent_transcript_path: '/nix/da.jsonl' });
  const [line] = lines(repo);
  assert.deepEqual([line.agent_type, line.tokens, line.dauerMs, line.toolAufrufe], ['a', null, null, null]);
});

test('recordAgent_NotAGitRepo_WritesNothingAndDoesNotThrow', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-am-'));
  assert.equal(recordAgent({ agent_type: 'a', cwd: dir, agent_transcript_path: transcript(ENTRIES) }), null);
  assert.equal(recordAgent({}), recordAgent({}));
});

function run(input) {
  return spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(input), encoding: 'utf8' });
}

test('cli_AgentOutsideDvForge_IsMeasuredAndNotBlocked', () => {
  const repo = makeRepo();
  const result = run({ agent_type: 'Explore', agent_id: 'e1', cwd: repo, agent_transcript_path: transcript(ENTRIES), last_assistant_message: 'x' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.deepEqual(lines(repo).map((line) => line.agent_type), ['Explore']);
});

test('cli_BlockedReviewerAttempt_WritesNoLineYet', () => {
  const repo = makeRepo();
  const input = { agent_type: 'dv-forge:implementation-task-reviewer', agent_id: 'cli-metrics-1', cwd: repo, agent_transcript_path: transcript(ENTRIES), last_assistant_message: 'keine Urteilszeile' };
  assert.equal(JSON.parse(run(input).stdout).decision, 'block');
  assert.equal(lines(repo).length, 0);
  fs.rmSync(path.join(os.tmpdir(), 'dv-forge', 'blocks-cli-metrics-1.json'), { force: true });
});

test('readme_Messdaten_NamesAgentsJsonl', () => {
  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  assert.match(readme, /\*\*Messdaten:\*\*[^\n]*metrics\/agents\.jsonl[^\n]*toolAufrufe/);
});
