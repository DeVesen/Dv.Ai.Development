'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'spec-whiteboarding');

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('specFormat_Template_HasFiveSectionsInOrder', () => {
  const text = reference('spec-format.md');
  const headings = ['## Was, wie, wo, warum', '## Theoretisches Verhalten nach Umsetzung', '## Soll-Vorgaben', '## Akzeptanzkriterien', '## Entscheidungen'];
  const positions = headings.map((heading) => text.indexOf(`\n${heading}\n`));
  headings.forEach((heading, index) => assert.ok(positions[index] >= 0, `${heading} fehlt`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('specFormat_Template_UsesStatusAcIdsAndWEntries', () => {
  const text = reference('spec-format.md');
  assert.ok(text.includes('Status: bestätigt am <YYYY-MM-DD>'));
  assert.ok(text.includes('- **AC-01** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.'));
  assert.ok(text.includes('- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>'));
});

test('specFormat_Abort_DefinesStatusLineAndOpenSection', () => {
  const text = reference('spec-format.md');
  assert.ok(text.includes('Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen'));
  assert.ok(text.includes('## Offen, bewusst nicht weiterverfolgt (Abbruch)'));
  assert.ok(text.includes('- **<Kurztitel>** · ungeklärt — <was offen ist>'));
});

test('specFormat_Rules_SelfContainedWithoutLegacySection', () => {
  const text = reference('spec-format.md');
  assert.match(text, /keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente/);
  assert.match(text, /lückenlos ab `AC-01`/);
  assert.match(text, /WAS statt WIE/);
  assert.ok(!text.includes('Bereits geklärte Fragen'));
});

test('grillRounds_Format_QuestionAndRecommendationLines', () => {
  const text = reference('grill-rounds.md');
  assert.ok(text.includes('❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>'));
  assert.ok(text.includes('➡️ <Empfehlung> · <Beleg-Tag> — <Grund>'));
});

test('grillRounds_Rules_FullFrontierAndDependentQuestionsLater', () => {
  const text = reference('grill-rounds.md');
  assert.match(text, /kompletten? Frontier/);
  assert.match(text, /spätere Runde/);
  assert.match(text, /SubAgent/);
  assert.match(text, /Vermutung/);
});

test('acRules_Rules_GivenWhenThenAndForbiddenPhrases', () => {
  const text = reference('ac-rules.md');
  assert.ok(text.includes('Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.'));
  for (const phrase of ['funktioniert korrekt', 'ist möglich', 'sollte', 'idealerweise']) {
    assert.ok(text.includes(`„${phrase}\u201C`), `${phrase} fehlt`);
  }
  assert.match(text, /Negativ- oder Randfall/);
});

const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['spec-format.md', 'grill-rounds.md', 'ac-rules.md'];

test('skill_Frontmatter_OnlyNameAndDescription', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'spec-whiteboarding');
  assert.match(fields.description, /^Use when/);
});

test('skill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('skill_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('skill_Body_WritesOnlyTheForgeSpecFile', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('docs/forge/YYYY-MM-DD-<slug>/spec.md'));
  assert.match(body, /Nie überschreiben/);
  for (const banned of [/\bADO\b/, /Nur Chat/, /AskUserQuestion/, /writing-workitem/, /(^|\s)@\S+\.md/m]) {
    assert.doesNotMatch(body, banned);
  }
});

test('skill_Body_ConfirmsContentTitleAndSlug', () => {
  assert.match(readMarkdown(SKILL).body, /Inhalt, Titel und Slug/);
});

test('skill_Body_HandsOverWithoutCommit', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('/dv-forge:spec-review docs/forge/<…>/spec.md'));
  assert.match(body, /frischen Session/);
  assert.match(body, /Kein Commit, kein automatischer Start/);
});

test('skill_Body_AbortNeedsSecondInformedRefusal', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /genau einmal eine verdichtete Abschlussrunde/);
  assert.match(body, /Zweite, informierte Ablehnung/);
});
