'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const units = require('../scripts/lib/document-units.js');

const SPEC = [
  '# Demo',
  '',
  'Status: bestätigt am 2026-09-28',
  'Art: verankert',
  'Basis: 3ce509e',
  '',
  '## Theoretisches Verhalten nach Umsetzung',
  '1. **Runde 1, Suche:** Alle Reviewer prüfen.',
  '2. **Einstufung:** Ein Skript leitet ab.',
  '',
  'Ein neuer Lauf sucht wieder.',
  '',
  '## Soll-Vorgaben',
  '- **Deckel:** Höchstens zwei Runden.',
  '- **Kategorien und Farben:** · Aussage',
  '  - `widerspruch` → rot',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '- **AC-041** Gegeben E, dann F.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden.',
  '- **R1 · AC-04** — frage an den menschen — Gilt D auch leer?',
  '- **R1 · Soll-Vorgaben** — frage an den menschen — Welche Grenze?',
  '',
].join('\n');

const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '**Basis:** abc1234',
  '',
  '## Global Constraints',
  '- Node 20',
  '',
  '---',
  '',
  '### Task 1: Eins',
  'Schritt eins.',
  '',
  '### Task 2: Zwei',
  'Schritt zwei.',
  '',
  '## Entscheidungen',
  '- Keine Fragen an den Menschen.',
  '',
].join('\n');

const keyOf = (text, finding) => units.resolveUnit(finding, units.parseUnits(text)).key;

test('parseUnits_Spec_NamesHeaderStepsSollVorgabenAndAcs', () => {
  const keys = units.parseUnits(SPEC).units.map((unit) => `${unit.kind}:${unit.key}`);
  for (const key of ['header:Status', 'header:Art', 'header:Basis', 'item:Runde 1, Suche', 'item:Einstufung', 'item:Deckel',
    'item:Kategorien und Farben', 'item:AC-01', 'item:AC-04', 'section:Akzeptanzkriterien', 'decisions:Entscheidungen']) {
    assert.ok(keys.includes(key), `${key} fehlt`);
  }
});

test('parseUnits_Plan_TaskIsTheUnit', () => {
  const keys = units.parseUnits(PLAN).units.map((unit) => `${unit.kind}:${unit.key}`);
  for (const key of ['header:Basis', 'section:Global Constraints', 'task:Task 1', 'task:Task 2', 'decisions:Entscheidungen']) {
    assert.ok(keys.includes(key), `${key} fehlt`);
  }
});

test('resolveUnit_SeveralStellen_FirstNamedInLocationWins', () => {
  assert.equal(keyOf(SPEC, { location: 'AC-04, AC-01', quote: 'x' }), 'AC-04');
  assert.equal(keyOf(SPEC, { location: 'Deckel und AC-01', quote: 'x' }), 'Deckel');
});

test('resolveUnit_AcSpelledShort_MatchesAcOfDocument', () => {
  assert.equal(keyOf(SPEC, { location: 'ac-1', quote: 'x' }), 'AC-01');
  assert.equal(keyOf(SPEC, { location: 'AC-041', quote: 'x' }), 'AC-041');
});

test('resolveUnit_NoNamedUnit_SectionOfQuote', () => {
  assert.equal(keyOf(SPEC, { location: 'irgendwo', quote: 'Ein neuer Lauf sucht wieder.' }), 'Theoretisches Verhalten nach Umsetzung');
  assert.equal(keyOf(SPEC, { location: 'irgendwo', quote: 'Höchstens zwei Runden.' }), 'Soll-Vorgaben');
  assert.equal(keyOf(PLAN, { location: 'irgendwo', quote: 'Schritt zwei.' }), 'Task 2');
});

test('resolveUnit_HeaderLine_IsHeaderUnit', () => {
  const model = units.parseUnits(SPEC);
  assert.equal(units.resolveUnit({ location: 'Basis', quote: 'x' }, model).kind, 'header');
  assert.equal(units.resolveUnit({ location: 'Kopfzeile Status', quote: 'x' }, model).kind, 'header');
  assert.notEqual(units.resolveUnit({ location: 'Status am Ende', quote: 'Ein neuer Lauf sucht wieder.' }, model).kind, 'header');
});

test('resolveUnit_PlanReviewAcNotInPlan_KeepsAcKey', () => {
  assert.equal(keyOf(PLAN, { location: 'AC-07', quote: 'x' }), 'AC-07');
});

test('openQuestions_RWithoutLaterW_IsOpen', () => {
  assert.deepEqual(units.openQuestions(SPEC).map((question) => question.key), ['AC-04', 'Soll-Vorgaben']);
});

test('openQuestions_LaterWWithStelleInTitle_Answers', () => {
  const text = `${SPEC}- **W · AC-04 und Soll-Vorgaben** · Aussage — Ja.\n`;
  assert.deepEqual(units.openQuestions(text), []);
});

test('openQuestions_EarlierWWithSameStelle_DoesNotAnswer', () => {
  const text = SPEC.replace('- **W · Deckel** · Aussage — Zwei Runden.', '- **W · AC-04** · Aussage — Alt.');
  assert.deepEqual(units.openQuestions(text).map((question) => question.key), ['AC-04', 'Soll-Vorgaben']);
});

test('openQuestions_StelleMustBeWholeWordInExactForm', () => {
  const openAfter = (title) => units.openQuestions(`${SPEC}- **W · ${title}** · Aussage — x.\n`).map((question) => question.key);
  for (const title of ['AC-041', 'AC-04-b', 'ac-04', 'Soll']) assert.ok(openAfter(title).includes('AC-04'), title);
  assert.ok(openAfter('Soll').includes('Soll-Vorgaben'));
  for (const title of ['AC-04,', 'AC-04 und AC-07']) assert.ok(!openAfter(title).includes('AC-04'), title);
});

test('quoteFromW_WholeQuoteInsideWEntry_True', () => {
  assert.equal(units.quoteFromW('Zwei  Runden.', SPEC), true);
  assert.equal(units.quoteFromW('Höchstens zwei Runden. ↔ Zwei Runden.', SPEC), false);
  assert.equal(units.quoteFromW('', SPEC), false);
});

test('changedUnits_OnlyDecisionsChanged_Empty', () => {
  const after = `${SPEC}- **W · AC-04** · Aussage — Ja.\n`;
  assert.deepEqual(units.changedUnits(SPEC, after), []);
});

test('changedUnits_AcAndSectionTextChanged_ListsBoth', () => {
  const after = SPEC.replace('Gegeben C, dann D.', 'Gegeben C, dann E.').replace('Ein neuer Lauf sucht wieder.', 'Ein neuer Lauf sucht neu.');
  assert.deepEqual(units.changedUnits(SPEC, after).map((unit) => unit.key), ['Theoretisches Verhalten nach Umsetzung', 'AC-04']);
});

test('changedUnits_WhitespaceOnly_NotChanged', () => {
  assert.deepEqual(units.changedUnits(SPEC, SPEC.replace('Gegeben C, dann D.', 'Gegeben C,  dann D.')), []);
});
