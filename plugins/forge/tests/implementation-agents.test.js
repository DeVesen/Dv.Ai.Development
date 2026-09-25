'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');

const AGENTS = path.join(__dirname, '..', 'agents');
const TYPOGRAPHIC_QUOTES = /[\u201C\u201D\u201E]/;

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

for (const name of ['implementation-task-reviewer', 'implementation-re-reviewer']) {
  test(`${name}_Frontmatter_ReadOnlyToolsSonnet`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, 'Read, Grep, Glob, Bash, PowerShell');
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });
}

test('implementation-task-reviewer_Body_TwoPartsSeverityAndVerdict', () => {
  const { body } = readAgent('implementation-task-reviewer');
  for (const part of ['## Teil 1: Spec-Treue', '## Teil 2: Qualität', '## Dem Bericht nicht trauen',
    '⚠️ nicht aus dem Diff prüfbar', '`plan-vorgeschrieben`', '**Task:** freigegeben | nachbessern', '`datei:zeile`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /keinen SubAgent/);
});

test('implementation-re-reviewer_Body_VerdictPerFindingAndScope', () => {
  const { body } = readAgent('implementation-re-reviewer');
  for (const part of ['behoben | nicht behoben', '### Neue Schäden im Fix-Diff', '### Außerhalb',
    '**Fix-Runde:** alle behoben, keine neuen 🔴 | offen: <Liste>']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('implementation-final-reviewer_Frontmatter_OpusReadOnly', () => {
  const { fields } = readAgent('implementation-final-reviewer');
  assert.equal(fields.name, 'implementation-final-reviewer');
  assert.equal(fields.tools, 'Read, Grep, Glob, Bash, PowerShell');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('implementation-final-reviewer_Body_DeferredTriageAndHandoverVerdict', () => {
  const { body } = readAgent('implementation-final-reviewer');
  for (const part of ['`Zurückgestellt:`', '### Zurückgestellt', 'beheben | bleibt', '**Übergabe:** ja | mit Korrekturen | nein']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /Fehler im Plan selbst/);
});

test('implementationAgents_Text_NoTypographicQuotes', () => {
  for (const name of ['implementation-implementer', 'implementation-task-reviewer', 'implementation-re-reviewer', 'implementation-final-reviewer']) {
    const { body } = readAgent(name);
    assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES, `${name} enthält typografische Anführungszeichen`);
  }
});
