'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { violations, newTargets, parseTarget } = require('../scripts/lib/retro-draft');
const { VALID, SNAPSHOT, CORPUS } = require('./lib/retro-draft-fixture');

function check(text, snapshot = SNAPSHOT) {
  return violations(text, snapshot, CORPUS);
}

test('violations_ValidDraft_None', () => {
  assert.deepEqual(check(VALID), []);
});

test('violations_MissingSectionAndHeadField_BothReported', () => {
  const draft = VALID.replace('**Lauf:** Der Mensch ließ einen Plan schreiben.\n', '').replace('## Kleinigkeiten\n', '');

  const found = check(draft);

  assert.deepEqual(found, ['Pflichtfeld fehlt: **Lauf:**', 'Pflichtabschnitt fehlt: ## Kleinigkeiten']);
});

test('violations_MissingFindingField_NamesSectionNumberAndTitle', () => {
  const found = check(VALID.replace('   *Ursache:* Regel fehlt.\n', ''));

  assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: Pflichtfeld fehlt: *Ursache:*']);
});

test('violations_TargetInNoForm_Reported', () => {
  const found = check(VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* ein Skill für Pläne'));

  assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: Ziel-Zeile folgt keiner der Formen „<Art> · `<Name>`“, „<Art> · neu: <Arbeitsname>“, „Ziel offen“']);
});

test('violations_TargetOpenOrNewHook_Accepted', () => {
  const open = VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* Ziel offen');
  const hook = VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* Hook · neu: test-weg-guard');

  assert.deepEqual([check(open), check(hook)], [[], []]);
});

test('violations_SavingWithoutNumberOrImpression_Reported', () => {
  const found = check(VALID.replace('*Ersparnis:* weniger Anfragen · Eindruck', '*Ersparnis:* weniger Anfragen'));

  assert.deepEqual(found, ['Sparpotenzial 1 „Zeitleiste statt Textsuche“: *Ersparnis:* ohne Zahl und ohne „· Eindruck“']);
});

test('violations_CostWithoutNumberOrImpression_Reported', () => {
  const found = check(VALID.replace('*Kosten:* 2 Rückfragen.', '*Kosten:* viele Rückfragen.'));

  assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: *Kosten:* ohne Zahl und ohne „· Eindruck“']);
});

test('violations_CostAsImpression_Accepted', () => {
  assert.deepEqual(check(VALID.replace('*Kosten:* 2 Rückfragen.', '*Kosten:* viele Rückfragen · Eindruck')), []);
});

test('violations_ExpectedMcpWithoutRelevance_Reported', () => {
  const found = check(VALID, { ...SNAPSHOT, expected: ['dev-mcp', 'codebase-analyzer'] });

  assert.deepEqual(found, ['Relevanz-Zeile fehlt für erwartetes MCP: codebase-analyzer']);
});

test('violations_ProjectFileOutsideProjectField_ReportedWithLine', () => {
  const found = check(VALID.replace('*Situation:* Ein Suchbefehl wurde abgelehnt.', '*Situation:* Ein Suchbefehl in Shift.ts wurde abgelehnt.'));

  assert.deepEqual(found, ['Projekt-Dateiname außerhalb von *Im Projekt:*: Shift.ts (Zeile 16)']);
});

test('violations_QuoteNotInProtocol_Reported', () => {
  const found = check(VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Das hat niemand gesagt“'));

  assert.deepEqual(found, ['Zitat steht nicht im Protokoll: „Das hat niemand gesagt“ (Zeile 22)']);
});

test('violations_ThreeDefects_EachReportedSeparately', () => {
  const draft = VALID.replace('   *Ursache:* Regel fehlt.\n', '').replace('*Ersparnis:* weniger Anfragen · Eindruck', '*Ersparnis:* weniger').replace('## Positiv\n', '');

  assert.equal(check(draft).length, 3);
});

test('newTargets_NewTarget_CollectedWithArtAndFinding', () => {
  assert.deepEqual(newTargets(VALID), [{ art: 'Skript', name: 'protokoll-ausschnitt', finding: 'Zeitleiste statt Textsuche' }]);
});

test('parseTarget_ThreeForms_ArtNameAndKind', () => {
  const parsed = ['Skill · `dv-forge:plan-writing` (schreibt Pläne)', 'Skript · neu: protokoll-ausschnitt (klein)', 'Ziel offen'].map(parseTarget);

  assert.deepEqual(parsed, [
    { art: 'Skill', name: 'dv-forge:plan-writing', isNew: false, open: false },
    { art: 'Skript', name: 'protokoll-ausschnitt', isNew: true, open: false },
    { art: '', name: '', isNew: false, open: true },
  ]);
});

test('parseTarget_LegacyNewFormOrFreeText_Null', () => {
  assert.deepEqual(['Skript · `neu:` Skript · wait-results', 'ein Skill für Pläne', undefined].map(parseTarget), [null, null, null]);
});
