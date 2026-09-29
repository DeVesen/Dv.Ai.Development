'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compose } = require('../scripts/lib/retro-compose');
const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');

function section(text, name) {
  const start = text.indexOf(`## ${name}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? text.length : end);
}

test('compose_Header_ModelSkillsDateAndScriptNumbersBeforeSections', () => {
  const text = compose(VALID, SNAPSHOT, '2026-09-29');

  assert.ok(text.startsWith([
    '# Erfahrungsbericht Planung eines Skripts',
    '',
    '**Session:** Modell claude-x · Skills dv-forge:plan-writing · 2026-09-29',
    '**Lauf:** Der Mensch ließ einen Plan schreiben.',
    '**Ergebnis:** Plan fertig.',
    '**Kennzahlen:** Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents.',
    '',
    '## Zahlen',
    '- Dauer: 10 min · Modelle: claude-x',
    '',
    '## MCP-Nutzung',
    '',
    'Quelle: `s1.jsonl`',
    '',
    '**Relevanz:**',
    '- dev-mcp: verzichtbar in dieser Session.',
    '',
    '## Positiv',
    '',
    '1. **Tests liefen sofort grün.** Beleg: 12 Tests.',
  ].join('\n')));
});

test('compose_NewTargetMissingInIdeas_AddedAndNoneRemoved', () => {
  const ideas = section(compose(VALID, SNAPSHOT, '2026-09-29'), 'Neue Ideen');

  assert.equal(ideas, '## Neue Ideen\n\n- **protokoll-ausschnitt** (`neu:` Skript): sichtbar geworden an „Zeitleiste statt Textsuche"\n');
});

test('compose_NewTargetNamedTwiceInIdeas_KeptOnce', () => {
  const idea = '- **protokoll-ausschnitt** (`neu:` Skript): schon da';
  const draft = VALID.replace('## Neue Ideen\n\n- keine\n', `## Neue Ideen\n\n${idea}\n${idea}\n`);

  const text = compose(draft, SNAPSHOT, '2026-09-29');

  assert.equal(text.split('- **protokoll-ausschnitt**').length - 1, 1);
});

test('compose_Sections_KeptInDraftOrderAndEndWithOneNewline', () => {
  const text = compose(VALID, SNAPSHOT, '2026-09-29');

  const headings = text.split('\n').filter((line) => line.startsWith('## '));

  assert.deepEqual(headings, ['## Zahlen', '## MCP-Nutzung', '## Positiv', '## Reibung', '## Sparpotenzial', '## Neue Ideen', '## Kleinigkeiten']);
  assert.ok(text.endsWith('- keine\n'));
});
