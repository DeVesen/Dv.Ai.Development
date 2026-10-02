'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { turnText } = require('../scripts/lib/turn-text');

const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const toolCall = () => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } });
const toolResult = () => ({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });

function transcript(entries) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-turn-')), 't.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

test('turnText_TextBeforeToolCall_IsKept', () => {
  // Arrange
  const file = transcript([human('los'), said('FRUEH'), toolCall(), toolResult(), said('spaet')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.match(text, /FRUEH[\s\S]*spaet/);
});

test('turnText_TextBeforeLastHumanInput_IsDropped', () => {
  // Arrange
  const file = transcript([human('eins'), said('ALT'), human('zwei'), said('NEU')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.equal(text.includes('ALT'), false);
  assert.equal(text.includes('NEU'), true);
});

test('turnText_ToolResultAndHarnessNotice_AreNoBoundary', () => {
  // Arrange
  const notice = human('<task-notification>\n<task-id>x</task-id>');
  const file = transcript([human('los'), said('ERSTER'), toolResult(), notice, said('ZWEITER')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.match(text, /ERSTER[\s\S]*ZWEITER/);
});

test('turnText_LastMessage_IsAppended', () => {
  // Arrange
  const file = transcript([human('los'), said('A')]);

  // Act
  const text = turnText(file, 'LETZTE');

  // Assert
  assert.ok(text.endsWith('LETZTE'));
});

test('turnText_SidechainAssistant_IsIgnored', () => {
  // Arrange
  const file = transcript([human('los'), { ...said('FREMD'), isSidechain: true }, said('EIGEN')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.equal(text.includes('FREMD'), false);
});

test('turnText_NoHumanInput_UsesAllAssistantText', () => {
  // Arrange
  const file = transcript([said('A'), said('B')]);

  // Act
  const text = turnText(file, undefined);

  // Assert
  assert.match(text, /A[\s\S]*B/);
});

test('turnText_MissingFile_Throws', () => {
  // Act and Assert
  assert.throws(() => turnText(path.join(os.tmpdir(), 'dv-forge-gibt-es-nicht.jsonl'), ''));
});
