'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'prozess-retrospektive');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['signals.md', 'report-format.md', 'common-mistakes.md'];

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('prozessRetrospektive_Frontmatter_OnlyNameAndDescription', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'prozess-retrospektive');
  assert.match(fields.description, /^Use when/);
});

test('prozessRetrospektive_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('prozessRetrospektive_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('prozessRetrospektive_Body_RunsFactsScriptFromPluginRoot', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js"'));
  assert.ok(fs.existsSync(path.join(PLUGIN_ROOT, 'scripts', 'session-facts.js')));
  assert.ok(fs.existsSync(path.join(PLUGIN_ROOT, 'scripts', 'mcp-usage.js')));
});

test('prozessRetrospektive_Body_ReadsOwnSessionAndWritesSkeleton', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('--session ${CLAUDE_SESSION_ID}'));
  assert.ok(body.includes('--since-command <skill>'));
  assert.ok(body.includes('--skeleton docs/wishes/<YYYY-MM-DD>-<thema>.md'));
});

test('reportFormat_Template_HasSlotsTheSkeletonFills', () => {
  const text = reference('report-format.md');
  for (const slot of ['<ZAHLEN: schreibt session-facts.js --skeleton>', '<MCP-NUTZUNG: schreibt session-facts.js --skeleton>',
    'Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents']) {
    assert.ok(text.includes(slot), `${slot} fehlt`);
  }
});

test('prozessRetrospektive_Body_LooksBeyondForge', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /nicht nur in dv-forge/);
  assert.match(body, /wiederkehrende oder unnötige Läufe/);
  assert.match(body, /ohne jede Kenntnis des Projekts/);
});

test('reportFormat_EveryFinding_HasSituationBetterApproachTargetAndProjectLine', () => {
  const text = reference('report-format.md');
  const template = text.slice(text.indexOf('## Reibung'), text.indexOf('## Neue Ideen'));
  for (const slot of ['*Situation:*', '*Besser gewesen:*', '*Vorschlag:*', '*Ziel:*', '*Im Projekt:*']) {
    assert.equal(template.split(slot).length - 1, 2, `${slot} nicht in Reibung und Sparpotenzial`);
  }
  assert.match(text, /## Neue Ideen/);
  assert.match(text, /Kein Befund ohne \*Besser gewesen:\*/);
});

test('reportFormat_Outsiders_RolesInsteadOfProjectNamesToolsByName', () => {
  const text = reference('report-format.md');
  assert.match(text, /## Für Außenstehende schreiben/);
  assert.match(text, /als ihre \*\*Rolle\*\*/);
  assert.match(text, /beim \*\*Namen\*\*/);
  assert.match(text, /nur unter \*Im Projekt:\*/);
});

test('reportFormat_QuotesAndCommands_UsePlaceholdersForProjectNames', () => {
  const text = reference('report-format.md');
  assert.match(text, /Platzhalter in eckigen Klammern/);
  assert.ok(text.includes('`dotnet build <Solution>`'));
  assert.match(text, /Vor dem Speichern gehst du jeden Befund durch/);
});

test('signals_Savings_CoverNeedlessRuns', () => {
  const text = reference('signals.md');
  assert.match(text, /Lauf ohne neue Information/);
  assert.match(text, /breiter Lauf, wo ein schmaler reicht/);
  assert.match(text, /Ergebnis erzeugt, aber nie genutzt/);
});

test('commonMistakes_Table_KeepsRowsAndAddsRuleQuotesAndCountedNumbers', () => {
  const text = reference('common-mistakes.md');
  for (const row of ['Aus dem Gedächtnis schätzen', 'Zahlen oder MCP-Tabellen abtippen', 'Bericht nur im Chat']) {
    assert.ok(text.includes(row), `${row} fehlt`);
  }
  assert.match(text, /Regel eines anderen Werkzeugs aus dem Gedächtnis/);
  assert.ok(text.includes('`datei:zeile`'));
  assert.ok(text.includes('`grep -c`'));
});

test('prozessRetrospektive_Body_TableMovedOutAndLinked', () => {
  const { body } = readMarkdown(SKILL);
  assert.doesNotMatch(body, /\| Aus dem Gedächtnis schätzen \|/);
  assert.ok(body.includes('references/common-mistakes.md'));
});

test('prozessRetrospektive_Body_CommitWithConventionAndSessionWorkitem', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('forge-config.js" get Commit-Konvention'));
  assert.match(body, /Workitem-Nummer.*unklar.*fragst du/);
});

test('prozessRetrospektive_Body_LargeContextSuggestsFreshSession', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /frischen? Session/);
  assert.ok(body.includes('--file <pfad>'));
  assert.match(body, /200k/);
});

test('reportFormat_ToolErrorIsNeverTrivialAndRawDataExempt', () => {
  const text = reference('report-format.md');
  assert.match(text, /Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit/);
  assert.match(text, /„Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen/);
});
