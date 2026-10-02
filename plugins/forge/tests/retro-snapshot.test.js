'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readEntries, humanEvents } = require('../scripts/lib/transcript');
const { specPaths, projectFiles, buildSnapshot } = require('../scripts/lib/retro-snapshot');
const { human, slash, request, call, writeSession } = require('./lib/retro-session');

test('specPaths_ToolPathsAndHumanArguments_NewestFirst', () => {
  const entries = readEntries(writeSession([
    slash('dv-forge:plan-writing', 'docs/forge/a/spec.md', '10:00'),
    request('r1', '10:01', [call('a', 'Read', { file_path: 'docs/specs/b.md' })]),
    request('r2', '10:02', [call('b', 'Read', { file_path: 'src/x.ts' })]),
  ]));

  assert.deepEqual(specPaths(entries, humanEvents(entries)), ['docs/specs/b.md', 'docs/forge/a/spec.md']);
});

test('projectFiles_TouchedFiles_OnlyProjectNamesOutsidePluginsAndClaude', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
  fs.mkdirSync(path.join(root, 'plugins', 'p', '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'plugins', 'p', '.claude-plugin', 'plugin.json'), '{}');
  const entries = readEntries(writeSession([
    request('r1', '10:00', [call('a', 'Edit', { file_path: path.join(root, 'src', 'Shift.ts') })]),
    request('r2', '10:01', [call('b', 'Read', { file_path: path.join(root, 'plugins', 'p', 'scripts', 'tool.js') })]),
    request('r3', '10:02', [call('c', 'Read', { file_path: path.join(root, '.claude', 'skills', 'x', 'SKILL.md') })]),
    request('r4', '10:03', [call('d', 'Read', { file_path: path.join(root, 'CLAUDE.md') })]),
    request('r5', '10:04', [call('e', 'Read', { file_path: path.join(os.tmpdir(), 'fremd.md') })]),
    request('r6', '10:05', [call('f', 'Grep', { pattern: 'x', path: path.join(root, 'src') })]),
    human('fertig', '10:06'),
  ]));

  assert.deepEqual(projectFiles(entries, root), ['Shift.ts']);
});

test('buildSnapshot_FactsAndSessionData_AssembledIntoFields', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
  const entries = readEntries(writeSession([
    { ...request('r1', '10:00', [call('a', 'Read', { file_path: 'docs/specs/b.md' })]), gitBranch: 'feature/x' },
  ]));
  const facts = { models: new Set(['claude-x']), humans: [], skills: new Map([['dv-forge:init', 1]]) };
  const range = { entries, cutTime: null, labels: ['Schnitt: keiner'] };

  const snapshot = buildSnapshot({
    id: 's1', transcript: 't.jsonl', ownTranscript: null, transcriptEntries: 1, cwd, range, facts,
    headline: 'Kopf', numbers: '- Dauer: 1 min', mcp: '## MCP-Nutzung (gemessen)\nQuelle: `t.jsonl`\n', expect: ['dev-mcp'],
  });

  assert.deepEqual(snapshot, {
    session: 's1', transcript: 't.jsonl', ownTranscript: null, transcriptEntries: 1, cwd, cut: null, labels: ['Schnitt: keiner'],
    branch: 'feature/x', specs: ['docs/specs/b.md'], expected: ['dev-mcp'], model: 'claude-x', skills: ['dv-forge:init'],
    headline: 'Kopf', numbers: '- Dauer: 1 min', mcp: 'Quelle: `t.jsonl`', projectFiles: ['b.md'],
  });
});
