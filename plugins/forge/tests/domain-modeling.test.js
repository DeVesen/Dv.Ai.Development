'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText, readMarkdown, wordCount, listMarkdown } = require('./lib/markdown');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'domain-modeling');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['glossary-target.md', 'context-format.md', 'adr-format.md'];

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('domainModeling_Frontmatter_OnlyNameAndDescription', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'domain-modeling');
  assert.match(fields.description, /^Use when/);
});

test('domainModeling_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('domainModeling_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('domainModeling_Body_WritesClarifiedTermsImmediately', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /Sofort schreiben/);
  assert.match(body, /nicht gesammelt/);
  assert.match(body, /Keine Implementierungsdetails, keine Spec-Inhalte/);
});

test('glossaryTarget_Rules_PrefersWorkingCapturingElseContextFile', () => {
  const text = reference('glossary-target.md');
  assert.ok(text.includes('`dv-working-capturing:glossary`'));
  assert.ok(text.indexOf('dv-working-capturing:glossary') < text.indexOf('CONTEXT.md'));
  assert.ok(text.includes('CONTEXT-MAP.md'));
  assert.match(text, /ausschließlich über diesen Skill/);
  assert.match(text, /Modul- und Feature-Profile/);
  assert.match(text, /erst anlegen, wenn der erste Begriff geklärt ist/);
});

test('contextFormat_Template_HasTitleAndThreeColumnTable', () => {
  const text = reference('context-format.md');
  assert.ok(text.includes('# Glossar — <Bereich>'));
  assert.ok(text.includes('| Begriff | Bedeutung | Nicht verwenden |'));
  assert.ok(text.includes('| **<kanonischer Begriff>** | <was er IST, höchstens zwei Sätze> | <Synonyme, kommagetrennt> |'));
  assert.match(text, /keine allgemeinen Programmierbegriffe/);
});

test('adrFormat_Template_HasHeaderStatusAndFourSectionsInOrder', () => {
  const text = reference('adr-format.md');
  assert.ok(text.includes('# ADR-<NNNN>: <Titel>'));
  assert.ok(text.includes('<YYYY-MM-DD> · Status: angenommen'));
  const positions = ['## Kontext', '## Entscheidung', '## Verworfene Alternativen', '## Folgen'].map((heading) => text.indexOf(`\n${heading}\n`));
  positions.forEach((position) => assert.ok(position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('adrFormat_Offer_RequiresAllThreeCriteria', () => {
  const text = reference('adr-format.md');
  for (const criterion of ['Schwer umkehrbar', 'Ohne Kontext überraschend', 'Echter Trade-off']) {
    assert.ok(text.includes(criterion), `${criterion} fehlt`);
  }
  assert.match(text, /alle drei/);
  assert.ok(text.includes('docs/adr/NNNN-<slug>.md'));
});

test('plugin_Texts_NoThirdPartyTextOrNotice', () => {
  assert.ok(!fs.existsSync(path.join(PLUGIN_ROOT, 'THIRD-PARTY-NOTICES.md')));
  for (const file of listMarkdown(path.join(PLUGIN_ROOT, 'skills'))) {
    assert.doesNotMatch(readText(file), /mattpocock/i, file);
  }
});
