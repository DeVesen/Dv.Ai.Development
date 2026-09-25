'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');

const AGENTS = path.join(__dirname, '..', 'agents');
const TYPOGRAPHIC_QUOTES = /[""„]/;

function readAgent(name) {
  return readMarkdown(path.join(AGENTS, `${name}.md`));
}

test('implementation-implementer_Frontmatter_SonnetInheritsAllTools', () => {
  const { fields } = readAgent('implementation-implementer');
  assert.equal(fields.name, 'implementation-implementer');
  assert.equal(fields.model, 'sonnet');
  assert.equal(fields.tools, undefined);
  assert.match(fields.description, /^Use when/);
});

test('implementation-implementer_Body_InputsStatusAndNoSubagents', () => {
  const { body } = readAgent('implementation-implementer');
  for (const part of ['`Brief:`', '`Bericht:`', '`Repo:`', '`Kontext:`', '`Findings:`',
    '`Status: done | done-with-concerns | blocked | needs-context`', 'git add -A', 'Projekt-`CLAUDE.md`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /## Keine SubAgents/);
  assert.match(body, /höchstens 15 Zeilen/);
  assert.match(body, /ROT mit Befehl/);
});
