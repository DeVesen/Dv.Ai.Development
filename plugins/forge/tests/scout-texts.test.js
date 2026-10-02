'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scoutTexts } = require('../scripts/lib/scout-check');
const { parseScout } = require('../scripts/followup');

const WITH_TEXTS = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Eingabe bei leerem Feld', 'Beschreibung: Offen ist, was bei leerer Eingabe gilt.', '1. D festlegen.', '   Beleg: keiner', '2. E streichen.', '**Bevorzugt: 1** — passt.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.',
];
const WITHOUT_TEXTS = WITH_TEXTS.filter((line) => !/^(Titel|Beschreibung): /.test(line));

test('scoutTexts_GroupsWithTexts_ReturnsTitleAndDescriptionPerGroup', () => {
  assert.deepEqual(scoutTexts(WITH_TEXTS), [
    { severity: '🔴', location: 'AC-04', title: 'Eingabe bei leerem Feld', description: 'Offen ist, was bei leerer Eingabe gilt.' },
    { severity: '🟡', location: 'AC-07', title: 'Eindeutige Formulierung', description: 'Der Satz hat zwei Lesarten.' },
  ]);
});

test('scoutTexts_GroupWithoutTexts_ReturnsNulls', () => {
  assert.deepEqual(scoutTexts(WITHOUT_TEXTS).map((group) => [group.title, group.description]), [[null, null], [null, null]]);
});

test('scoutTexts_TitleLineInsideProposal_IsIgnored', () => {
  const lines = ['## Scout-Vorschläge', '', '### 🔴 AC-04', '1. Text', 'Titel: im Vorschlag', '**Bevorzugt: 1** — x'];
  assert.equal(scoutTexts(lines)[0].title, null);
});

test('scoutTexts_NoScoutSection_ReturnsEmptyList', () => {
  assert.deepEqual(scoutTexts(['nichts']), []);
});

test('parseScout_WithAndWithoutTextLines_ReturnsTheSameProposals', () => {
  assert.deepEqual(parseScout(WITH_TEXTS), parseScout(WITHOUT_TEXTS));
});
