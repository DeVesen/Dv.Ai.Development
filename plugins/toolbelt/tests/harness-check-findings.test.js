'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkFindings, checkProtocol } = require('../scripts/lib/harness-check-findings');
const { validFiles, replaced } = require('./lib/harness-fixture');

const FILES = validFiles();

function findingsWith(from, to) {
  return checkFindings(replaced(FILES, 'BEFUNDE.md', from, to)['BEFUNDE.md']);
}

function protocolWith(from, to, withPlan = true) {
  return checkProtocol(replaced(FILES, 'PRUEFPROTOKOLL.md', from, to)['PRUEFPROTOKOLL.md'], withPlan);
}

test('checkFindings_ValidReport_NoErrorsResultAndGreenFindings', () => {
  const result = checkFindings(FILES['BEFUNDE.md']);

  assert.deepEqual(result.errors, []);
  assert.equal(result.result, 'Umbau');
  assert.deepEqual([...result.green], ['B-02']);
});

test('checkFindings_MissingSectionNichtBelegbar_Error', () => {
  const result = findingsWith('## Nicht belegbar\n', '');

  assert.deepEqual(result.errors, ['BEFUNDE.md: Abschnitt fehlt: ## Nicht belegbar']);
});

test('checkFindings_UnknownResult_Error', () => {
  const result = findingsWith('**Ergebnis:** Umbau', '**Ergebnis:** vielleicht');

  assert.deepEqual(result.errors, ['BEFUNDE.md: Ergebnis fehlt oder ist keiner von: Umbau | kein Umbau nötig | außerhalb des Scopes']);
});

test('checkFindings_FindingWithoutLineOrRating_Error', () => {
  const noLine = findingsWith('README.md:3`', 'README.md`');
  const noRating = findingsWith('**B-02** 🟢', '**B-02**');

  assert.equal(noLine.errors.length, 1);
  assert.match(noLine.errors[0], /^BEFUNDE\.md: Befund ohne Kennung, Einstufung oder Datei:Zeile: - \*\*B-02\*\*/);
  assert.equal(noRating.errors.length, 1);
});

test('checkFindings_FeedbackWithoutAssignment_Error', () => {
  const result = findingsWith('lange → nicht zuordenbar', 'lange');

  assert.deepEqual(result.errors, ['BEFUNDE.md: Rückmeldung ohne Kennung oder Zuordnung: - **R-02** Session-Start dauert lange']);
});

test('checkFindings_UnassignedFeedbackWithoutReason_Error', () => {
  const result = findingsWith('- **R-02** App-Verhalten, im Code nicht sichtbar.\n', '');

  assert.deepEqual(result.errors, ['BEFUNDE.md: R-02 ist nicht zuordenbar, steht aber ohne Grund unter Nicht zuordenbar']);
});

test('checkFindings_OutOfScopeResultWithEmptySection_Error', () => {
  const result = findingsWith('**Ergebnis:** Umbau', '**Ergebnis:** außerhalb des Scopes');

  assert.deepEqual(result.errors, ['BEFUNDE.md: Ergebnis außerhalb des Scopes, aber der Abschnitt Außerhalb des Scopes ist leer']);
});

test('checkProtocol_ValidProtocolWithPlan_NoErrors', () => {
  assert.deepEqual(checkProtocol(FILES['PRUEFPROTOKOLL.md'], true), []);
});

test('checkProtocol_MoreThanFourCheckers_Error', () => {
  assert.deepEqual(protocolWith('**Prüf-Subagents:** 2', '**Prüf-Subagents:** 5'), ['PRUEFPROTOKOLL.md: Prüf-Subagents fehlt oder liegt nicht zwischen 1 und 4']);
});

test('checkProtocol_NoOldBlockOrDryRunEntry_Error', () => {
  const result = protocolWith('- keine Lücke\n', '');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: kein Eintrag unter ## Probelauf-Prüfung']);
});

test('checkProtocol_OnlyOneRound_Error', () => {
  const result = protocolWith('## Plan-Prüfrunde 2\n**Offen 🔴:** 0\n- keine Anmerkungen\n', '');

  assert.ok(result.includes('PRUEFPROTOKOLL.md: 1 Plan-Prüfrunden, erlaubt sind 2 bis 8'), result.join('\n'));
});

test('checkProtocol_OpenCountDiffersFromOpenRedAnnotations_Error', () => {
  const result = protocolWith('**Offen 🔴:** 1', '**Offen 🔴:** 0');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 1: Offen 🔴 passt nicht zu 1 offenen 🔴-Anmerkungen']);
});

test('checkProtocol_AnnotationWithoutCorrection_Error', () => {
  const result = protocolWith(' → Korrektur: Test ergänzt', '');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 1: Anmerkung ohne Einstufung oder Korrektur: - 🔴 T-01 ohne roten Test']);
});

test('checkProtocol_RedOpenAfterLastRoundBelowEight_StatusAndRoundErrors', () => {
  const result = protocolWith('**Offen 🔴:** 0\n- keine Anmerkungen', '**Offen 🔴:** 1\n- 🔴 noch offen → offen');

  assert.deepEqual(result, [
    'PRUEFPROTOKOLL.md: Status muss nicht abgabefähig lauten',
    'PRUEFPROTOKOLL.md: 🔴 offen nach Plan-Prüfrunde 2, aber weniger als 8 Runden',
  ]);
});

test('checkProtocol_EightRoundsRedStillOpenNotDeliverable_NoErrors', () => {
  const rounds = Array.from({ length: 8 }, (_, index) => `## Plan-Prüfrunde ${index + 1}\n**Offen 🔴:** 1\n- 🔴 Lücke bleibt → offen\n`).join('\n');
  const text = `**Prüf-Subagents:** 1\n**Status:** nicht abgabefähig\n\n## Alt-Block-Prüfung\n- gefunden\n## Probelauf-Prüfung\n- keine Lücke\n${rounds}`;

  assert.deepEqual(checkProtocol(text, true), []);
});

test('checkProtocol_RoundAfterCleanRound_Error', () => {
  const extra = '## Plan-Prüfrunde 3\n**Offen 🔴:** 0\n- keine Anmerkungen\n';

  const result = checkProtocol(`${FILES['PRUEFPROTOKOLL.md']}\n${extra}`, true);

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 3 folgt auf eine Runde ohne offenes 🔴']);
});

test('checkProtocol_PackageWithoutPlan_OnlyCheckerCountChecked', () => {
  assert.deepEqual(checkProtocol('# Prüfprotokoll\n\n**Prüf-Subagents:** 0\n', false), []);
});

test('checkProtocol_RoundNumberOutOfOrder_Error', () => {
  const result = protocolWith('## Plan-Prüfrunde 2', '## Plan-Prüfrunde 3');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 3 steht an Stelle 2']);
});

test('checkProtocol_RoundWithoutAnnotationLine_Error', () => {
  const result = protocolWith('**Offen 🔴:** 0\n- keine Anmerkungen', '**Offen 🔴:** 0');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 2 ohne Anmerkungszeile']);
});

test('checkProtocol_RoundWithoutOpenField_Error', () => {
  const result = protocolWith('**Offen 🔴:** 0\n- keine Anmerkungen', '- keine Anmerkungen');

  assert.deepEqual(result, ['PRUEFPROTOKOLL.md: Plan-Prüfrunde 2: Offen 🔴 passt nicht zu 0 offenen 🔴-Anmerkungen']);
});
