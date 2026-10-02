'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadSession, render, sameServer, findTranscript } = require('../scripts/mcp-usage.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'mcp-usage.js');
const SESSION = 'sess-1';

function toolUse(id, name, input = {}) {
  return { type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } };
}

function toolResult(id, isError = false, extra = {}) {
  return { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError }] }, ...extra };
}

function writeJsonl(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-mcp-'));
  const cwd = path.join(root, 'repo');
  fs.mkdirSync(cwd, { recursive: true });
  fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify({ mcpServers: { 'build-log-filter': {} } }));
  const transcript = path.join(root, 'projects', 'repo', `${SESSION}.jsonl`);
  writeJsonl(transcript, [
    { type: 'user', cwd, message: { content: 'los' } },
    { type: 'attachment', attachment: { type: 'mcp_instructions_delta', addedNames: ['Microsoft_Learn'] } },
    toolUse('t1', 'mcp__dev-mcp__find_file', { name: 'A.cs' }),
    toolResult('t1'),
    toolUse('t2', 'mcp__dev-mcp__find_file', { name: 'A.cs' }),
    toolResult('t2', true),
    toolUse('t3', 'Agent', { subagent_type: 'dv-forge:implementation-implementer' }),
    toolResult('t3', false, { toolUseResult: { agentId: 'abc' } }),
    toolUse('t4', 'Agent', { subagent_type: 'Explore' }),
    toolResult('t4', false, { toolUseResult: { agentId: 'def' } }),
    { ...toolUse('t5', 'Grep', { pattern: 'x' }), isSidechain: true, agentId: 'zzz' },
  ]);
  const subagents = path.join(root, 'projects', 'repo', SESSION, 'subagents');
  writeJsonl(path.join(subagents, 'agent-abc.jsonl'), [
    toolUse('s1', 'Bash', { command: 'cd src && dotnet test' }),
    toolUse('s2', 'mcp__plugin_dev_codebase-analyzer__index_project', {}),
  ]);
  writeJsonl(path.join(subagents, 'agent-def.jsonl'), [toolUse('s3', 'Read', { file_path: 'a' })]);
  fs.writeFileSync(path.join(subagents, 'agent-def.meta.json'), JSON.stringify({ agentType: 'Explore-Meta' }));
  return { root, transcript };
}

test('loadSession_MainAndSubagents_CollectsAllCallsWithAgentLabels', () => {
  const { transcript } = fixture();
  const session = loadSession(transcript);
  const byName = (name) => session.calls.filter((call) => call.name === name);
  assert.equal(session.subagentCount, 2);
  assert.equal(byName('Bash')[0].agent, 'dv-forge:implementation-implementer');
  assert.equal(byName('Read')[0].agent, 'Explore-Meta');
  assert.equal(byName('Grep')[0].agent, 'SubAgent zzz');
  assert.equal(byName('mcp__dev-mcp__find_file').filter((call) => call.error).length, 1);
});

test('render_ErrorsAndRepeats_AreCountedPerServer', () => {
  const { transcript } = fixture();
  const output = render(loadSession(transcript), { transcript });
  assert.match(output, /\| dev-mcp \| genutzt \| 2 \| 1 \| 1 \| find_file \(2\) \| Hauptagent \(2\) \|/);
});

test('render_ExpectedButUnused_MarkedAndConfiguredOnlyAvailable', () => {
  const { transcript } = fixture();

  const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp', 'codebase-analyzer', 'context7'] });

  assert.match(output, /\| context7 \| \*\*erwartet, ungenutzt\*\*/);
  assert.doesNotMatch(output, /\| build-log-filter \| \*\*erwartet/);
  assert.doesNotMatch(output, /\| codebase-analyzer \| \*\*erwartet/);
  assert.match(output, /Verfügbar, aber ungenutzt: Microsoft_Learn, build-log-filter/);
});

test('render_NoExpectedList_NoExpectedUnusedRow', () => {
  const { transcript } = fixture();

  const output = render(loadSession(transcript), { transcript });

  assert.doesNotMatch(output, /erwartet, ungenutzt/);
});

test('render_ShellToolchainCall_IsListedAsFallbackCandidate', () => {
  const { transcript } = fixture();
  const output = render(loadSession(transcript), { transcript });
  assert.match(output, /Shell-Fallback-Kandidaten \(1\)/);
  assert.match(output, /implementation-implementer: `cd src && dotnet test`/);
});

test('sameServer_PluginPrefixedName_MatchesPlainName', () => {
  assert.equal(sameServer('plugin_dev_codebase-analyzer', 'codebase-analyzer'), true);
  assert.equal(sameServer('dev-mcp', 'codebase-analyzer'), false);
});

test('findTranscript_SessionId_FindsFileInAnyProjectDir', () => {
  const { root, transcript } = fixture();
  assert.equal(findTranscript(SESSION, path.join(root, 'projects')), transcript);
});

test('cli_UnknownSession_ExitsWithOne', () => {
  const env = { ...process.env, CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'retro-empty-')) };
  const result = spawnSync(process.execPath, [SCRIPT, '--session', 'nope'], { encoding: 'utf8', env });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /nope/);
});

test('cli_NoArguments_ExitsWithTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 2);
});

function readSession(calls) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-reads-'));
  const transcript = path.join(root, `${SESSION}.jsonl`);
  writeJsonl(transcript, calls.map(([id, name, input]) => toolUse(id, name, input)));
  return transcript;
}

test('render_ExpectedUnused_NamesReadGrepGlobAndShellFallbacks', () => {
  const transcript = readSession([
    ['a', 'Read', { file_path: 'x' }], ['b', 'Grep', { pattern: 'y' }], ['c', 'Grep', { pattern: 'z' }], ['d', 'Glob', { pattern: '*.md' }],
    ['e', 'Bash', { command: 'cd src && cat a.txt' }], ['f', 'PowerShell', { command: 'Get-Content b.txt' }],
    ['g', 'Bash', { command: 'git status' }], ['h', 'Bash', { command: 'git log | head -5' }],
  ]);

  const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp'] });

  assert.match(output, /Ersatz-Kandidaten für ungenutzte erwartete MCP: Read 1, Grep 2, Glob 1, Shell-Fallbacks 2 \(Shell-Aufrufe, die Dateien lesen oder durchsuchen\)/);
});

test('render_AllExpectedUsed_NoReplacementLine', () => {
  const { transcript } = fixture();

  const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp'] });

  assert.doesNotMatch(output, /Ersatz-Kandidaten/);
});
