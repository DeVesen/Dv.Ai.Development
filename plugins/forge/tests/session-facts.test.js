'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const facts = require('../scripts/session-facts.js');
const { makeRepo, commitFile } = require('./lib/git-repo');

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

test('cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet: dev-mcp, codebase-analyzer\n', 'config');

  const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  assert.match(result.stdout, /\| codebase-analyzer \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
});

test('cli_ProjectWithoutExpectedList_NoExpectedUnusedRow', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet:\n', 'config');

  const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /erwartet, ungenutzt/);
});

test('cli_ForeignProtocol_ExpectationFromProtocolProject', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet: dev-mcp\n', 'config');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-')), 's3.jsonl');
  fs.writeFileSync(file, `${[
    line({ type: 'user', cwd: repo, timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: 'Los' } }),
    line({ type: 'assistant', cwd: repo, requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { model: 'claude-x', usage: { input_tokens: 10, output_tokens: 1 }, content: [] } }),
  ].join('\n')}\n`);

  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8', cwd: os.tmpdir() });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
});

test('projectOf_OwnSession_UsesProcessCwd', () => {
  const first = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-erststart-'));

  assert.equal(facts.projectOf({ session: 'eigene' }, { cwd: first }), path.resolve(process.cwd()));
});

test('projectOf_ForeignFileMissingCwd_FallsBackWithWarning', () => {
  const missing = path.join(os.tmpdir(), 'retro-gibt-es-nicht-8f3a');
  const warnings = [];

  const project = facts.projectOf({ file: 'x.jsonl' }, { cwd: missing }, (text) => warnings.push(text));

  assert.equal(project, path.resolve(process.cwd()));
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes(missing));
  assert.ok(warnings[0].includes('--cwd <projektordner>'));
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

test('cli_LenientAndUnknownSession_ReportsReasonAndExitsWithZero', () => {
  const result = runIn(projectWith([['eigene', 0]]), ['--session', 'gibt-es-nicht', '--lenient']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Fakten nicht verfügbar: Session gibt-es-nicht nicht gefunden/);
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

function snapshotHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
}

function withHome(home, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, TZ: 'UTC' } });
}

function readSnapshotOf(home, id) {
  return JSON.parse(fs.readFileSync(path.join(home, '.dv-forge', 'retro', `${id}.snapshot.json`), 'utf8'));
}

test('cli_Snapshot_WritesSnapshotOutsideProjectAndNamesDraft', () => {
  const home = snapshotHome();
  const file = session();

  const result = withHome(home, ['--file', file, '--snapshot']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`Snapshot: ${path.join(home, '.dv-forge', 'retro', 's1.snapshot.json')}`));
  assert.ok(result.stdout.includes(`Entwurf: ${path.join(home, '.dv-forge', 'retro', 's1.entwurf.md')}`));
});

test('cli_Snapshot_HoldsNumbersMcpAndSessionFacts', () => {
  const home = snapshotHome();
  const file = session();
  withHome(home, ['--file', file, '--snapshot']);

  const snapshot = readSnapshotOf(home, 's1');

  assert.equal(snapshot.transcript, file);
  assert.equal(snapshot.model, 'claude-x');
  assert.deepEqual(snapshot.skills, ['dv-forge:init']);
  assert.equal(snapshot.cut, null);
  assert.match(snapshot.numbers, /^- Dauer: 10 min · Modelle: claude-x\n/);
  assert.match(snapshot.mcp, /^Quelle: /);
  assert.equal(snapshot.headline, 'Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents');
  for (const key of ['branch', 'specs', 'expected', 'projectFiles', 'ownTranscript', 'cwd', 'transcriptEntries', 'labels']) assert.ok(key in snapshot, `${key} fehlt`);
});

test('cli_Snapshot_RecordsLastEntryOfProtocolForQuoteCheck', () => {
  const home = snapshotHome();
  const file = session();

  withHome(home, ['--file', file, '--snapshot']);

  assert.equal(readSnapshotOf(home, 's1').transcriptEntries, facts.readEntries(file).at(-1).entryNo);
});

test('cli_SnapshotWithCut_RecordsCutTime', () => {
  const home = snapshotHome();

  withHome(home, ['--file', commandSession(), '--before-retro', '--snapshot']);

  assert.equal(readSnapshotOf(home, 's2').cut, '2026-09-27T11:10:00Z');
});

test('cli_SnapshotOfTwoSessions_BothKept', () => {
  const home = snapshotHome();

  withHome(home, ['--file', session(), '--snapshot']);
  withHome(home, ['--file', commandSession(), '--snapshot']);

  assert.deepEqual(fs.readdirSync(path.join(home, '.dv-forge', 'retro')).sort(), ['s1.snapshot.json', 's2.snapshot.json']);
});

test('cli_SnapshotWithFileAndSession_NamedAfterOwnSession', () => {
  const project = projectWith([['eigene', 0]]);
  const other = session();

  const result = spawnSync(process.execPath, [SCRIPT, '--cwd', project.cwd, '--file', other, '--session', 'eigene', '--snapshot'], { encoding: 'utf8', env: { ...process.env, HOME: project.home, USERPROFILE: project.home } });

  assert.equal(result.status, 0, result.stderr);
  const snapshot = readSnapshotOf(project.home, 'eigene');
  assert.equal(snapshot.transcript, other);
  assert.equal(snapshot.ownTranscript, path.join(facts.projectDir(project.cwd, project.home), 'eigene.jsonl'));
});

test('cli_Snapshot_RemovesStaleDraftOfSameSession', () => {
  const home = snapshotHome();
  const stale = path.join(home, '.dv-forge', 'retro', 's1.entwurf.md');
  fs.mkdirSync(path.dirname(stale), { recursive: true });
  fs.writeFileSync(stale, '# alter Entwurf\n');

  const result = withHome(home, ['--file', session(), '--snapshot']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(stale), false);
});

test('cli_WithoutSnapshot_NoSkeletonFlagAnymore', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--file', session(), '--skeleton', 'x.md'], { encoding: 'utf8' }).status, 2);
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
