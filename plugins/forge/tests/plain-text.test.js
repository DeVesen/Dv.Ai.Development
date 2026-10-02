'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { plainProblem } = require('../scripts/lib/plain-text');

test('plainProblem_PlainSentence_ReturnsNull', () => {
  assert.equal(plainProblem('Anmeldestatus und Browser-Tests'), null);
});

test('plainProblem_ShorthandInText_NamesIt', () => {
  const cases = [['Siehe AC-07 dazu', 'Kürzel AC-07'], ['Task 3 fehlt', 'Kürzel Task 3'], ['Eintrag R5 offen', 'Kürzel R5'],
    ['F · Stelle', 'Kürzel F ·'], ['Antwort W · Stelle', 'Kürzel W ·']];
  for (const [text, expected] of cases) assert.equal(plainProblem(text), expected, text);
});

test('plainProblem_LookalikesWithoutShorthand_ReturnsNull', () => {
  assert.equal(plainProblem('Der Wert R2D2 und AC/DC und Taskleiste 3 und F und W'), null);
});

test('plainProblem_EmptyOrNoText_ReturnsLeer', () => {
  for (const value of ['', '   ', undefined, null, 5]) assert.equal(plainProblem(value), 'leer');
});

test('plainProblem_ExactlyFourHundredCharacters_ReturnsNull', () => {
  assert.equal(plainProblem('x'.repeat(400)), null);
});

test('plainProblem_FourHundredOneCharacters_NamesLength', () => {
  assert.equal(plainProblem('x'.repeat(401)), 'länger als 400 Zeichen (401)');
});
