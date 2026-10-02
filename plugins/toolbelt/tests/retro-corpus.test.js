'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { corpusOf } = require('../scripts/lib/retro-corpus');

test('corpusOf_TextResultsAndInputs_JoinedAsPlainText', () => {
  const entries = [
    { type: 'user', message: { content: 'Hallo' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Antwort' }, { type: 'tool_use', name: 'Bash', input: { command: 'ls' } }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'datei.txt' }] }] } },
  ];

  assert.equal(corpusOf(entries), 'Hallo\nAntwort\nls\ndatei.txt');
});

test('corpusOf_QuotedCommandHookTextAndSystemEntry_KeptVerbatim', () => {
  const entries = [
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'git commit -m "fix: x"' } }] } },
    { type: 'attachment', attachment: { type: 'hook_additional_context', content: ['Hook sagt: Tests zuerst'] } },
    { type: 'system', subtype: 'informational', content: 'Kontext wird knapp' },
  ];

  const corpus = corpusOf(entries);

  assert.deepEqual(['git commit -m "fix: x"', 'Hook sagt: Tests zuerst', 'Kontext wird knapp'].map((text) => corpus.includes(text)), [true, true, true]);
});
