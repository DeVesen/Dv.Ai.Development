'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'merge-conflict-resolution', 'SKILL.md');

test('mergeConflictResolution_Frontmatter_ModelInvocableWithNameAndDescriptionOnly', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'merge-conflict-resolution');
  assert.match(fields.description, /^Use when/);
});

test('mergeConflictResolution_Description_TriggersOnlyOnDirectRequest', () => {
  const { description } = readMarkdown(SKILL).fields;
  for (const trigger of ['/dv-forge:merge-conflict-resolution', 'löse den Merge-Konflikt', 'löse die Konflikte']) {
    assert.ok(description.includes(trigger), `${trigger} fehlt`);
  }
  assert.match(description, /Not when a conflict shows up while another dv-forge skill, agent or review loop is running/);
});

test('mergeConflictResolution_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('mergeConflictResolution_Body_FiveStepsInOrder', () => {
  const { body } = readMarkdown(SKILL);
  const steps = ['1. **Lage klären.**', '2. **Absicht beider Seiten verstehen.**', '3. **Jede Konfliktstelle auflösen.**',
    '4. **Projekt-Checks laufen lassen.**', '5. **Abschließen.**'].map((step) => body.indexOf(step));
  steps.forEach((position) => assert.ok(position >= 0));
  assert.deepEqual([...steps].sort((a, b) => a - b), steps);
});

test('mergeConflictResolution_Body_KeepsCoreRules', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /Commit-Messages, zugehörige PRs, ursprüngliche Issues oder Tickets/);
  assert.match(body, /Trade-off wird ausdrücklich benannt/);
  assert.match(body, /Kein Verhalten hinzuerfinden/);
  assert.match(body, /niemals `--abort`/);
  assert.match(body, /Typecheck, dann Tests, dann Formatierung/);
  assert.match(body, /bis jeder Commit übertragen ist/);
});

test('mergeConflictResolution_Body_StaysOutOfOtherForgeRuns', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Wann nicht/);
  assert.match(body, /Nur auf direkten Auftrag des Users/);
});

test('mergeConflictResolution_Body_GermanQuotesPairedAndNoAtLinks', () => {
  const text = readMarkdown(SKILL);
  const all = `${text.fields.description}\n${text.body}`;
  assert.equal((all.match(/„/g) || []).length, (all.match(/“/g) || []).length);
  assert.doesNotMatch(text.body, /(^|\s)@\S+\.md/m);
});

test('mergeConflictResolution_Body_ClosesLoopholesFromPressureTest', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /auch unter Zeitdruck und wenn der Mensch „nimm einfach eine Seite“ sagt/);
  assert.match(body, /Fehlt eine dieser Prüfungen im Projekt, entfällt sie/);
  assert.match(body, /Tests beider Seiten gehören in die Auflösung/);
});
