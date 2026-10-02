'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findTranscript, subagentFiles } = require('../scripts/lib/session-files');
const { RetroError } = require('../scripts/lib/transcript');

test('subagentFiles_SubagentFolder_ListsOnlyJsonl', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-files-'));
  const transcript = path.join(dir, 's1.jsonl');
  const agents = path.join(dir, 's1', 'subagents');
  fs.mkdirSync(agents, { recursive: true });
  fs.writeFileSync(path.join(agents, 'agent-a.jsonl'), '');
  fs.writeFileSync(path.join(agents, 'agent-a.meta.json'), '{}');

  assert.deepEqual(subagentFiles(transcript), [path.join(agents, 'agent-a.jsonl')]);
});

test('subagentFiles_NoSubagentFolder_Empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-files-'));

  assert.deepEqual(subagentFiles(path.join(dir, 's1.jsonl')), []);
});

test('findTranscript_UnknownSession_ThrowsRetroErrorWithFolder', () => {
  const projects = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-projects-'));

  assert.throws(() => findTranscript('gibt-es-nicht', projects), (error) => error instanceof RetroError
    && error.message.includes(`Transkript zur Session gibt-es-nicht nicht gefunden unter ${projects}`));
});
