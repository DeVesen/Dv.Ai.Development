'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { initProject, parseArgs } = require('../scripts/init');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'init.js');
const count = (text, part) => text.split(part).length - 1;
const project = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-init-'));
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const args = (root, overrides = {}) => ({ cwd: root, hook: 'nein', mcp: [], ...overrides });

test('parseArgs_NoArguments_DefaultsToNoHookAndNoMcp', () => {
  const parsed = parseArgs([]);
  assert.equal(parsed.hook, 'nein');
  assert.deepEqual(parsed.mcp, []);
});

test('parseArgs_AllFlags_AreRead', () => {
  assert.deepEqual(parseArgs(['--cwd', 'x', '--hook', 'ja', '--mcp', 'context7,microsoft-learn']),
    { cwd: 'x', hook: 'ja', mcp: ['context7', 'microsoft-learn'] });
});

test('parseArgs_UnknownFlagHookValueOrMcp_Throws', () => {
  assert.throws(() => parseArgs(['--foo', 'x']), /Aufruf:/);
  assert.throws(() => parseArgs(['--hook', 'vielleicht']), /Aufruf:/);
  assert.throws(() => parseArgs(['--mcp', 'unbekannt']), /Unbekannter MCP: unbekannt/);
  assert.throws(() => parseArgs(['--hook']), /Aufruf:/);
});

test('initProject_NoClaudeMd_CreatesItWithHintBlockAndNothingElse', () => {
  const root = project();
  initProject(args(root));
  const text = read(root, 'CLAUDE.md');
  assert.ok(text.includes('`dv-angular:toolchain`'));
  assert.doesNotMatch(text, /dv-angular-(build|test|lint)|--path/);
  assert.ok(!fs.existsSync(path.join(root, '.mcp.json')));
  assert.ok(!fs.existsSync(path.join(root, '.claude', 'dv-angular.json')));
  assert.ok(!text.includes('dv-mcp'));
});

test('initProject_RunTwice_KeepsExactlyOneBlock', () => {
  const root = project();
  initProject(args(root));
  initProject(args(root));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-angular:start -->'), 1);
});

test('initProject_OldDevMcpRule_StaysUnchanged', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n- Build und Test über dev-mcp\n');
  initProject(args(root));
  assert.ok(read(root, 'CLAUDE.md').startsWith('# P\n\n- Build und Test über dev-mcp\n'));
});

test('initProject_HookYes_WritesTheSwitchFile', () => {
  const root = project();
  const lines = initProject(args(root, { hook: 'ja' }));
  assert.deepEqual(JSON.parse(read(root, '.claude/dv-angular.json')), { hook: true });
  assert.ok(lines.some((line) => line.startsWith('Hook: eingerichtet')));
});

test('initProject_Context7Yes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers.context7.url, 'https://mcp.context7.com/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_MicrosoftLearnYes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['microsoft-learn'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('initProject_ExistingEntries_StayUnchangedAndSentenceIsStillWritten', () => {
  const root = project();
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  fs.writeFileSync(path.join(root, '.mcp.json'), json);
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), json);
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_SentenceWrittenByTheOtherPlugin_IsNotWrittenAgain', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n<!-- dv-mcp:start -->\n## MCP-Server\n\n- Anderer Wortlaut. <!-- dv-mcp:context7 -->\n<!-- dv-mcp:end -->\n');
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_InvalidMcpJson_KeepsFileWarnsAndStillWritesBlockAndHook', () => {
  const root = project();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  const lines = initProject(args(root, { hook: 'ja', mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), '{ kaputt');
  assert.ok(lines.some((line) => /WARNUNG MCP context7: \.mcp\.json ist kein gültiges JSON/.test(line)));
  assert.ok(!read(root, 'CLAUDE.md').includes('dv-mcp:context7'));
  assert.ok(read(root, 'CLAUDE.md').includes('`dv-angular:toolchain`'));
  assert.ok(fs.existsSync(path.join(root, '.claude', 'dv-angular.json')));
});

test('cli_DefaultAnswers_PrintsReportAndExitsZero', () => {
  const root = project();
  const result = spawnSync(process.execPath, [SCRIPT, '--cwd', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CLAUDE\.md: Hinweisblock dv-angular geschrieben/);
  assert.match(result.stdout, /Hook: nicht eingerichtet/);
});

test('cli_BadArguments_ExitsTwoWithUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--hook', 'vielleicht'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf:/);
});
