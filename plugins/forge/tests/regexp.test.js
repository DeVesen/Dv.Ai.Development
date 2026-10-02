'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegExp } = require('../scripts/lib/regexp');

test('escapeRegExp_SpecialCharacters_MatchedLiterally', () => {
  const name = 'a.b*(c)[d]+?^$|{e}\\f';

  assert.equal(new RegExp(`^${escapeRegExp(name)}$`).test(name), true);
});

test('escapeRegExp_Dot_DoesNotMatchOtherCharacter', () => {
  assert.equal(new RegExp(`^${escapeRegExp('Shift.ts')}$`).test('Shift_ts'), false);
});
