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

function projectWith(sessions) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  const cwd = path.join(home, 'repo');
  const dir = facts.projectDir(cwd, home);
  fs.mkdirSync(dir, { recursive: true });
  const now = Date.now();
  for (const [id, ageMinutes] of sessions) {
    const file = path.join(dir, `${id}.jsonl`);
    fs.writeFileSync(file, line({ type: 'user', timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: `Session ${id}` } }));
    const time = new Date(now - ageMinutes * 60000);
    fs.utimesSync(file, time, time);
  }
  return { home, cwd };
}

function runIn({ home, cwd }, args) {
  return spawnSync(process.execPath, [SCRIPT, '--cwd', cwd, ...args], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
}

test('cli_Session_ReadsThatSessionEvenIfAnotherIsNewer', () => {
  const project = projectWith([['eigene', 30], ['fremde', 0]]);
  const result = runIn(project, ['--session', 'eigene']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Session-Fakten: eigene/);
  assert.equal(result.stderr, '');
});

test('cli_UnknownSession_ExitsWithOne', () => {
  const result = runIn(projectWith([['eigene', 0]]), ['--session', 'gibt-es-nicht']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /gibt-es-nicht/);
});

test('cli_NoSession_WarnsWhenOtherSessionsWereWrittenRecently', () => {
  const result = runIn(projectWith([['a', 0], ['b', 3], ['alt', 60]]), []);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Session-Fakten: a/);
  assert.match(result.stderr, /Warnung: 1 weitere Session/);
  assert.match(result.stderr, /--session/);
  assert.doesNotMatch(result.stderr, /alt/);
});

test('cli_NoSession_NoWarningWhenOnlyOneRecentSession', () => {
  const result = runIn(projectWith([['a', 0], ['alt', 60]]), []);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

function commandSession() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cmd-'));
  const file = path.join(dir, 's2.jsonl');
  const slash = (name, time) => line({ type: 'user', timestamp: time, message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>` } });
  const say = (text, time) => line({ type: 'user', timestamp: time, message: { role: 'user', content: text } });
  const tool = (id, name, input, time) => line({ type: 'assistant', requestId: id, timestamp: time, message: { model: 'claude-x', content: [{ type: 'tool_use', id, name, input }] } });
  fs.writeFileSync(file, [
    say('Plane X', '2026-09-27T10:00:00Z'),
    tool('p1', 'Bash', { command: 'git status' }, '2026-09-27T10:01:00Z'),
    slash('dv-forge:prozess-retrospektive', '2026-09-27T11:00:00Z'),
    tool('r1', 'Write', { file_path: 'bericht.md' }, '2026-09-27T11:02:00Z'),
    say('commit den Bericht', '2026-09-27T11:05:00Z'),
    tool('s1', 'Skill', { skill: 'dv-forge:prozess-retrospektive' }, '2026-09-27T11:10:00Z'),
    tool('r2', 'Read', { file_path: 'x.md' }, '2026-09-27T11:11:00Z'),
  ].join('\n'));
  const agents = path.join(dir, 's2', 'subagents');
  fs.mkdirSync(agents, { recursive: true });
  const agent = (name, time) => fs.writeFileSync(path.join(agents, `agent-${name}.jsonl`),
    line({ type: 'assistant', requestId: name, timestamp: time, message: { model: 'sonnet', content: [{ type: 'tool_use', id: `${name}-t`, name: 'Grep', input: {} }] } }));
  agent('vorher', '2026-09-27T10:30:00Z');
  agent('waehrend', '2026-09-27T11:03:00Z');
  return file;
}

test('cli_SinceCommand_CountsOnlyFromLastInvocation', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'prozess-retrospektive'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Start: letzter Aufruf von prozess-retrospektive \(Eintrag 6 · 11:10\)/);
  assert.match(result.stdout, /- Tool-Aufrufe: Skill 1, Read 1\n/);
  assert.match(result.stdout, /Tokens Subagents: 0k in 0 Agents/);
});

test('cli_BeforeRetro_CutsBeforeLastRetroCallAndKeepsEarlierSubagents', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--before-retro'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Schnitt: vor dem letzten Aufruf von prozess-retrospektive \(Eintrag 6 · 11:10\)/);
  assert.match(result.stdout, /- Tool-Aufrufe: Bash 1, Write 1\n/);
  assert.match(result.stdout, /Tokens Subagents: 0k in 2 Agents/);
});

test('cli_BeforeRetroWithoutRetroCall_KeepsWholeSession', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--before-retro'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Schnitt:/);
  assert.match(result.stdout, /- Eingaben des Menschen: 2 · /);
});

test('cli_SinceCommandAndBeforeRetro_CountsOnlyBetweenBothBounds', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'prozess-retrospektive', '--before-retro'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- Start: letzter Aufruf von prozess-retrospektive \(Eintrag 3 · 11:00\)\n- Schnitt: /);
  assert.match(result.stdout, /- Tool-Aufrufe: Write 1\n/);
  assert.match(result.stdout, /Tokens Subagents: 0k in 1 Agents/);
});

test('cli_SinceCommandUnknown_ExitsWithOneAndNamesCommand', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'gibt-es-nicht'], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unbekannter Befehl: gibt-es-nicht/);
});

test('cli_FileAndSession_EvaluatesFile', () => {
  const project = projectWith([['eigene', 0]]);

  const result = runIn(project, ['--file', session(), '--session', 'eigene']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Session-Fakten: s1/);
});

test('cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest', () => {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-')), 'docs', 'wishes', 'bericht.md');
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--expect', 'dev-mcp', '--skeleton', target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Gerüst geschrieben: ${target.replace(/\\/g, '\\\\')}`));
  const text = fs.readFileSync(target, 'utf8');
  assert.match(text, /^# Erfahrungsbericht <Art der Arbeit, allgemein>/);
  assert.match(text, /Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents\./);
  assert.match(text, /## Zahlen\n- Dauer: 10 min · Modelle: claude-x\n/);
  assert.match(text, /Mehrfach gelesene Dateien:\n- keine/);
  assert.match(text, /## MCP-Nutzung\n\nQuelle: /);
  assert.match(text, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  assert.doesNotMatch(text, /MCP-Nutzung \(gemessen\)|## Sparpotenzial \(Hauptsession|\| Auftrag \| Typ \|/);
  assert.doesNotMatch(text, /session-facts\.js/);
  for (const heading of ['## Positiv', '## Reibung', '## Sparpotenzial', '## Neue Ideen', '## Kleinigkeiten', '**Relevanz:**']) {
    assert.ok(text.includes(heading), `${heading} fehlt`);
  }
});

test('cli_Skeleton_ExistingTarget_RefusesAndKeepsFile', () => {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-')), 'bericht.md');
  fs.writeFileSync(target, 'alt');
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--skeleton', target], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /existiert/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'alt');
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
