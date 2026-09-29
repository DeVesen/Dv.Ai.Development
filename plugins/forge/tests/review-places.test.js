'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePlaces, resolvePlace, changedPlaces, decisionLines } = require('../scripts/lib/places');
const { SPEC } = require('./lib/review-flow-fixture');

const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '',
  '## Global Constraints',
  '- Nur node:-Module.',
  '',
  '---',
  '',
  '### Task 1: Eins',
  '',
  '- Create: `a.js`',
  '',
  '```markdown',
  '## Entscheidungen',
  '```',
  '',
  '### Task 2: Zwei',
  'Text zwei.',
  '',
  '## Entscheidungen',
  '- Keine Fragen an den Menschen.',
  '',
].join('\n');

test('parsePlaces_Spec_NamesHeadAcsSollVorgabenAndSections', () => {
  // Act
  const labels = [...parsePlaces(SPEC).values()].map((place) => place.label);

  // Assert
  assert.deepEqual(labels, ['Kopf', 'Was, wie, wo, warum', 'Soll-Vorgaben', 'Deckel', 'Schreibweise', 'Akzeptanzkriterien', 'AC-01', 'AC-04', 'AC-07', 'Entscheidungen']);
});

test('parsePlaces_Plan_TaskKeepsListsAndFencedHeadings', () => {
  // Act
  const places = parsePlaces(PLAN);

  // Assert
  assert.match(places.get('task 1').text, /- Create: `a.js`[\s\S]*## Entscheidungen/);
  assert.equal(places.get('entscheidungen').text, '## Entscheidungen\n- Keine Fragen an den Menschen.');
});

test('parsePlaces_ItemNamedLikeSection_GetsSectionPrefix', () => {
  // Arrange
  const text = '## Soll-Vorgaben\n- **Entscheidungen:** Änderungen dort zählen nicht.\n\n## Entscheidungen\n- **W · X** · Aussage — y\n';

  // Act
  const labels = [...parsePlaces(text).values()].map((place) => place.label);

  // Assert
  assert.deepEqual(labels, ['Kopf', 'Soll-Vorgaben', 'Soll-Vorgaben · Entscheidungen', 'Entscheidungen']);
});

test('parsePlaces_NumberedStep_UsesBoldNameWithoutColon', () => {
  // Arrange
  const text = '## Theoretisches Verhalten nach Umsetzung\n1. **Runde 1, Suche:** Alle prüfen.\n2. **Einstufung:** Ein Skript stuft ein.\n\nEin neuer Lauf sucht wieder.\n';

  // Act
  const places = parsePlaces(text);

  // Assert
  assert.equal(places.get('runde 1, suche').text, '1. **Runde 1, Suche:** Alle prüfen.');
  assert.match(places.get('theoretisches verhalten nach umsetzung').text, /Ein neuer Lauf sucht wieder\./);
});

test('resolvePlace_SeveralPlacesInLocation_TakesFirstKnownPlace', () => {
  // Act
  const place = resolvePlace('AC-7, AC-04', 'x', parsePlaces(SPEC));

  // Assert
  assert.equal(place.label, 'AC-07');
});

test('resolvePlace_UnnamedLocation_TakesSectionOfQuote', () => {
  // Act
  const place = resolvePlace('Randfall', 'Höchstens zwei Runden.', parsePlaces(SPEC));

  // Assert
  assert.equal(place.label, 'Soll-Vorgaben');
});

test('resolvePlace_UnknownLocationAndQuote_KeepsLocationAsGiven', () => {
  // Act
  const place = resolvePlace('AC-99', 'nirgends', parsePlaces(SPEC));

  // Assert
  assert.deepEqual(place, { key: 'ac-99', label: 'AC-99' });
});

test('resolvePlace_UnknownLocationWithLineBreak_LabelOnOneLine', () => {
  // Act
  const place = resolvePlace('Rand\n### 🔴 Fall', 'nirgends', parsePlaces(SPEC));

  // Assert
  assert.deepEqual(place, { key: 'rand ### 🔴 fall', label: 'Rand ### 🔴 Fall' });
});

test('changedPlaces_AcAndDecisionChanged_ListsOnlyAc', () => {
  // Arrange
  const after = SPEC.replace('dann F.', 'dann G.').replace('- **W · Deckel**', '- **R1 · AC-04** — geändert — x\n- **W · Deckel**');

  // Act
  const changed = changedPlaces(SPEC, after);

  // Assert
  assert.deepEqual(changed, ['AC-04']);
});

test('changedPlaces_OnlyDecisionsChanged_ListsNothing', () => {
  // Arrange
  const after = SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — nicht geändert — x\n- **W · Deckel**');

  // Act
  const changed = changedPlaces(SPEC, after);

  // Assert
  assert.deepEqual(changed, []);
});

test('decisionLines_Spec_ReturnsEntriesOfDecisionSection', () => {
  // Act
  const lines = decisionLines(SPEC);

  // Assert
  assert.deepEqual(lines, ['- **W · Deckel** · Aussage — Zwei Runden, keine dritte.']);
});
