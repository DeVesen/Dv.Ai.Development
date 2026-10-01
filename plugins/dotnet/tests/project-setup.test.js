'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const setup = require('../scripts/lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };
const count = (text, part) => text.split(part).length - 1;
const tempProject = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-project-'));

test('withStackBlock_EmptyText_CreatesBlockNamingSkillWithoutCommandOrPath', () => {
  const text = setup.withStackBlock('', STACK);
  assert.ok(text.includes('`dv-dotnet:toolchain`'));
  assert.doesNotMatch(text, /dv-dotnet-(build|test|lint)|--path|[\\/]/);
  assert.ok(text.endsWith('\n'));
});

test('withStackBlock_ExistingText_AppendsAfterBlankLineAndKeepsEveryLine', () => {
  const old = '# Projekt\n\n- Build und Test über dev-mcp\n';
  const text = setup.withStackBlock(old, STACK);
  assert.ok(text.startsWith(`${old}\n<!-- dv-dotnet:start -->`));
});

test('withStackBlock_CalledTwice_KeepsExactlyOneBlock', () => {
  const once = setup.withStackBlock('# Projekt\n', STACK);
  const twice = setup.withStackBlock(once, STACK);
  assert.equal(twice, once);
  assert.equal(count(twice, '<!-- dv-dotnet:start -->'), 1);
});

test('withStackBlock_StaleBlock_ReplacesContentBetweenMarkers', () => {
  const stale = '# P\n<!-- dv-dotnet:start -->\nalt\n<!-- dv-dotnet:end -->\nRest\n';
  const text = setup.withStackBlock(stale, STACK);
  assert.ok(!text.includes('alt'));
  assert.ok(text.includes('`dv-dotnet:toolchain`'));
  assert.ok(text.endsWith('<!-- dv-dotnet:end -->\nRest\n'));
});

test('withStackBlock_CrlfText_UsesCrlfThroughout', () => {
  const text = setup.withStackBlock('# P\r\n', STACK);
  assert.ok(text.includes('\r\n'));
  assert.ok(!/(?<!\r)\n/.test(text));
});

test('withMcpSentence_NewServer_CreatesBlockWithOneSentence', () => {
  const text = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.ok(text.includes('`context7`'));
});

test('withMcpSentence_SecondServer_AddsSentenceToTheSameBlock', () => {
  const text = setup.withMcpSentence(setup.withMcpSentence('# P\n', 'context7'), 'microsoft-learn');
  assert.equal(count(text, '<!-- dv-mcp:start -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('withMcpSentence_SentenceAlreadyThere_LeavesTextUnchanged', () => {
  const once = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(setup.withMcpSentence(once, 'context7'), once);
});

test('withMcpServer_NoFile_CreatesConfigWithHttpEntry', () => {
  const { status, text } = setup.withMcpServer(null, 'context7');
  assert.equal(status, 'angelegt');
  assert.deepEqual(JSON.parse(text), { mcpServers: { context7: { type: 'http', url: 'https://mcp.context7.com/mcp' } } });
});

test('withMcpServer_MicrosoftLearn_UsesOfficialEndpoint', () => {
  const { text } = setup.withMcpServer(null, 'microsoft-learn');
  assert.equal(JSON.parse(text).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
});

test('withMcpServer_EntryExists_KeepsFileUntouched', () => {
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  const result = setup.withMcpServer(json, 'context7');
  assert.deepEqual(result, { status: 'vorhanden', text: json });
});

test('withMcpServer_OtherEntries_StayUnchangedWhenServerIsAdded', () => {
  const foo = { command: 'x', args: ['--y'] };
  const { status, text } = setup.withMcpServer(JSON.stringify({ other: 1, mcpServers: { foo } }), 'context7');
  assert.equal(status, 'ergaenzt');
  const config = JSON.parse(text);
  assert.deepEqual(config.mcpServers.foo, foo);
  assert.equal(config.other, 1);
  assert.ok(config.mcpServers.context7);
});

test('withMcpServer_InvalidJson_ReportsInvalidAndKeepsText', () => {
  assert.deepEqual(setup.withMcpServer('{ kaputt', 'context7'), { status: 'ungueltig', text: '{ kaputt' });
  assert.equal(setup.withMcpServer('[]', 'context7').status, 'ungueltig');
  assert.equal(setup.withMcpServer('{"mcpServers": []}', 'context7').status, 'ungueltig');
});

test('applyClaudeMd_MissingFile_CreatesItAndReportsChange', () => {
  const root = tempProject();
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), true);
  assert.ok(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').includes('dv-dotnet:toolchain'));
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), false);
});

test('applyMcpServer_InvalidFile_LeavesBytesUnchanged', () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  assert.equal(setup.applyMcpServer(root, 'context7'), 'ungueltig');
  assert.equal(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8'), '{ kaputt');
});

test('applyMcpServer_NoFile_WritesConfigToProjectRoot', () => {
  const root = tempProject();
  assert.equal(setup.applyMcpServer(root, 'microsoft-learn'), 'angelegt');
  assert.ok(JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')).mcpServers['microsoft-learn']);
});

test('hookEnabled_MarkerWritten_IsFoundFromSubfolder', () => {
  const root = tempProject();
  const sub = path.join(root, 'src', 'Api');
  fs.mkdirSync(sub, { recursive: true });
  setup.writeHookMarker(root, STACK);
  assert.equal(setup.hookEnabled(sub, STACK), true);
});

test('hookEnabled_NoMarkerOrFalseOrBroken_IsFalse', () => {
  const root = tempProject();
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.mkdirSync(path.join(root, '.claude'));
  fs.writeFileSync(path.join(root, '.claude', 'dv-dotnet.json'), '{"hook": false}');
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.writeFileSync(path.join(root, '.claude', 'dv-dotnet.json'), '{ kaputt');
  assert.equal(setup.hookEnabled(root, STACK), false);
});
