'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { linesOf, section, sectionsMatching, field, items, missingHeadings } = require('../scripts/lib/harness-markdown');

const TEXT = [
  '# Titel',
  '**Status:** abgabefähig',
  '## Eins',
  '- a',
  '### Unter',
  '- b',
  '## Zwei',
  'text',
].join('\r\n');

test('linesOf_WindowsLineEnds_SplitWithoutCarriageReturn', () => {
  assert.deepEqual(linesOf('a\r\nb'), ['a', 'b']);
});

test('section_HeadingWithSubheading_LinesUpToNextHeadingOfSameLevel', () => {
  assert.deepEqual(section(TEXT, '## Eins'), ['- a', '### Unter', '- b']);
  assert.deepEqual(section(TEXT, '## Zwei'), ['text']);
});

test('section_MissingHeading_Null', () => {
  assert.equal(section(TEXT, '## Drei'), null);
});

test('sectionsMatching_Pattern_AllMatchingSectionsInOrder', () => {
  const result = sectionsMatching('## Runde 1\nx\n## Runde 2\ny\n', /^## Runde (\d+)$/);

  assert.deepEqual(result.map((entry) => [entry.match[1], entry.lines]), [['1', ['x']], ['2', ['y', '']]]);
});

test('field_BoldNameWithColon_ValueOrNull', () => {
  const lines = linesOf(TEXT);

  assert.equal(field(lines, 'Status'), 'abgabefähig');
  assert.equal(field(lines, 'Welle'), null);
});

test('items_LinesAndNull_OnlyListLines', () => {
  assert.deepEqual(items(['- a', 'b', '-c', '- d']), ['- a', '- d']);
  assert.deepEqual(items(null), []);
});

test('missingHeadings_Headings_OnlyTheMissingOnes', () => {
  assert.deepEqual(missingHeadings(TEXT, ['## Eins', '## Drei']), ['## Drei']);
});
