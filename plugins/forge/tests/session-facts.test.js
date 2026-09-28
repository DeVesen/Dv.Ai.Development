'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const facts = require('../scripts/session-facts.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-facts.js');

function line(entry) {
  return JSON.stringify(entry);
}

function session() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-'));
  const file = path.join(dir, 's1.jsonl');
  const usage = { input_tokens: 10, cache_creation_input_tokens: 990, cache_read_input_tokens: 5000, output_tokens: 200 };
  const bash = { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } };
  fs.writeFileSync(file, [
    line({ type: 'user', timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: 'Mach X' } }),
    line({ type: 'assistant', requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { model: 'claude-x', usage, content: [bash] } }),
    line({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'Permission denied by hook' }] } }),
    line({ type: 'assistant', requestId: 'r2', message: { model: 'claude-x', usage, content: [{ ...bash, id: 't2' }, { type: 'tool_use', id: 't3', name: 'Skill', input: { skill: 'dv-forge:init' } }] } }),
    line({ type: 'user', message: { role: 'user', content: '<task-notification>fertig</task-notification>' } }),
    line({ type: 'system', subtype: 'compact_boundary' }),
    line({ type: 'user', timestamp: '2026-09-27T10:10:00Z', message: { role: 'user', content: [{ type: 'text', text: 'Danke' }] } }),
    'kein json',
  ].join('\n'));
  const agents = path.join(dir, 's1', 'subagents');
  fs.mkdirSync(agents, { recursive: true });
  fs.writeFileSync(path.join(agents, 'agent-a.jsonl'), line({ type: 'assistant', requestId: 'x', message: { model: 'sonnet', usage, content: [] } }));
  fs.writeFileSync(path.join(agents, 'agent-a.meta.json'), JSON.stringify({ description: 'Review Plan', agentType: 'dv-forge:plan-review-risks', model: 'sonnet' }));
  return file;
}

test('analyze_CountsTurnsTokensToolsErrorsRepeatsSkillsCompactions', () => {
  const result = facts.analyze(facts.readEntries(session()));
  assert.equal(result.turns, 2);
  assert.equal(result.requests, 2);
  assert.equal(result.input, 2000);
  assert.equal(result.cached, 10000);
  assert.equal(result.output, 400);
  assert.equal(result.tools.get('Bash'), 2);
  assert.equal(result.repeats, 1);
  assert.equal(result.denials, 1);
  assert.equal(result.skills.get('dv-forge:init'), 1);
  assert.equal(result.compactions, 1);
});

test('cli_File_RendersFactsAndSubagents', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Dauer: 10 min · Modelle: claude-x/);
  assert.match(result.stdout, /Tokens Hauptsession: 2k neu gelesen, 10k aus dem Cache, 0k Ausgabe/);
  assert.match(result.stdout, /\| Review Plan \| dv-forge:plan-review-risks \| sonnet \| 6k \| 1k \|/);
  assert.match(result.stdout, /- Bash: Permission denied by hook/);
});

test('cli_Expect_AppendsMeasuredMcpUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--expect', 'dev-mcp'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /## MCP-Nutzung \(gemessen\)/);
  assert.match(result.stdout, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  assert.match(result.stdout, /\| Bash \| 2 \| 1 \| 1 \| Hauptagent \(2\) \|/);
});

test('projectDir_EscapesPathLikeClaudeCode', () => {
  const [cwd, escaped] = process.platform === 'win32'
    ? ['C:\\Develop\\Dv.Ai.Development', 'C--Develop-Dv-Ai-Development']
    : ['/home/user/Dv.Ai.Development', '-home-user-Dv-Ai-Development'];
  assert.equal(facts.projectDir(cwd, '/root'), path.join('/root', '.claude', 'projects', escaped));
});

test('cli_BadArgsOrMissingFile_ExitCodes', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--foo'], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--file', '/gibt/es/nicht.jsonl'], { encoding: 'utf8' }).status, 1);
});

test('savings_LargeResultsRepeatedReadsAndCommands_Listed', () => {
  const use = (id, name, input) => ({ type: 'assistant', requestId: id, message: { content: [{ type: 'tool_use', id, name, input }] } });
  const result = (id, chars) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'x'.repeat(chars) }] } });
  const entries = [
    use('a', 'Read', { file_path: 'src/big.ts' }), result('a', 40000),
    use('b', 'Read', { file_path: 'src/big.ts' }), result('b', 40000),
    ...[1, 2, 3].flatMap((n) => [use(`t${n}`, 'Bash', { command: `cd src && FOO=1 dotnet test --filter X${n}` }), result(`t${n}`, 100)]),
    use('g', 'Bash', { command: 'git status' }), result('g', 10),
  ];
  const text = facts.savings([facts.analyze(entries)]);
  assert.match(text, /- 10k Tokens · Read src\/big\.ts/);
  assert.match(text, /Mehrfach gelesene Dateien:\n- 2× src\/big\.ts/);
  assert.match(text, /- 3× dotnet test/);
  assert.doesNotMatch(text, /git status/);
});
