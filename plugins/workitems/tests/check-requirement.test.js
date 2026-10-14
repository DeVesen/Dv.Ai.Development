'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse, check, reportLines, sentenceCount } = require('../scripts/lib/check-requirement');
const { lint } = require('../skills/definition-of-ready/scripts/dor-lint');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-requirement.js');
const LIMITS_FILE = path.join(__dirname, '..', 'skills', 'requirement-definition', 'limits.json');
const LIMITS = JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8'));

const VALID_BLOCK = `## Requirement: Nachname erfassen
Ziel: Ein Nutzer kann seinen Nachnamen eingeben und speichern.
Nutzen: Sachbearbeiter finden Personen künftig über den Nachnamen.
Nutzer: Sachbearbeiter
Scope: Eingabefeld und Speichern des Nachnamens
Nicht-Ziele: Adresse, Vorname
Abhängigkeiten: –
Annahmen / Risiken / Offene Punkte: –
Akzeptanzkriterien:
AC-01 Gegeben das Formular ist offen, wenn ich "Meier" eingebe, dann zeigt das Feld "Meier".
AC-02 (Negativ) Gegeben das Formular ist offen, wenn ich das Feld leer lasse und speichere, dann erscheint eine Meldung.

### Steps
1. Eingabefeld anzeigen
   Ziel: Das Formular zeigt ein Feld für den Nachnamen.
   Akzeptanzkriterien:
   - AC-03 Gegeben das Formular ist offen, wenn ich es anschaue, dann sehe ich das Feld "Nachname".
   - AC-04 (Negativ) Gegeben das Formular ist offen, wenn ich 100 Zeichen eingebe, dann wird die Eingabe abgewiesen.
   Abhängig von: –
2. Nachname speichern
   Ziel: Der eingegebene Nachname wird beim Speichern übernommen.
   Akzeptanzkriterien:
   - AC-05 Gegeben ein Nachname ist eingegeben, wenn ich speichere, dann sehe ich eine Bestätigung.
   - AC-06 (Negativ) Gegeben das Feld ist leer, wenn ich speichere, dann erscheint eine Meldung.
   Abhängig von: Step 1
`;

const EXTRA_STEP = '3. Noch ein Step\n   Ziel: Etwas Neues.\n   Akzeptanzkriterien:\n   - AC-07 Gegeben x, wenn y, dann z.\n   Abhängig von: –\n';

function messages(text, limits = LIMITS) {
  return check(text, limits).map((item) => `${item.level} ${item.where}: ${item.message}`);
}

function run(args, input) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { input, encoding: 'utf8' });
}

test('checkRequirement_ValidBlock_HasNoFindings', () => {
  assert.deepEqual(check(VALID_BLOCK, LIMITS), []);
});

test('checkRequirement_NoRequirementHeader_ReportsError', () => {
  const findings = check('Irgendein Text', LIMITS);

  assert.deepEqual(findings.map((item) => item.level), ['error']);
});

test('checkRequirement_MissingRequirementGoal_ReportsError', () => {
  const block = VALID_BLOCK.replace('Ziel: Ein Nutzer kann seinen Nachnamen eingeben und speichern.', 'Ziel:');

  assert.ok(messages(block).includes('error requirement: Ziel fehlt'));
});

test('checkRequirement_MissingStepGoal_ReportsError', () => {
  const block = VALID_BLOCK.replace('   Ziel: Das Formular zeigt ein Feld für den Nachnamen.\n', '');

  assert.ok(messages(block).includes('error step 1: Ziel fehlt'));
});

test('checkRequirement_EmptyBenefit_Warns', () => {
  const block = VALID_BLOCK.replace('Nutzen: Sachbearbeiter finden Personen künftig über den Nachnamen.', 'Nutzen:');

  assert.deepEqual(messages(block), ['warn requirement: Nutzen ist leer']);
});

test('checkRequirement_MissingRequirementField_Warns', () => {
  const block = VALID_BLOCK.replace('Nicht-Ziele: Adresse, Vorname\n', '');

  assert.deepEqual(messages(block), ['warn requirement: Feld „Nicht-Ziele" fehlt']);
});

test('checkRequirement_AsciiDependencyLabel_WarnsFieldMissing', () => {
  const block = VALID_BLOCK.replace('Abhängigkeiten: –', 'Abhaengigkeiten: –');

  assert.deepEqual(messages(block), ['warn requirement: Feld „Abhängigkeiten" fehlt']);
});

test('checkRequirement_TooManySteps_WarnsToSplitRequirement', () => {
  const limits = { ...LIMITS, requirement: { ...LIMITS.requirement, stepsMax: 1 } };

  const found = messages(VALID_BLOCK, limits);

  assert.ok(found.some((line) => line.startsWith('warn requirement: 2 Steps')));
});

test('checkRequirement_StepWithTooManyCriteria_Warns', () => {
  const limits = { ...LIMITS, step: { ...LIMITS.step, acMax: 1 } };

  const found = messages(VALID_BLOCK, limits);

  assert.ok(found.includes('warn step 1: 2 Kriterien, erlaubt sind 2 bis 1'));
});

test('checkRequirement_StepWithoutNegativeCriterion_Warns', () => {
  const block = VALID_BLOCK.replace('AC-06 (Negativ) Gegeben', 'AC-06 Gegeben');

  assert.ok(messages(block).includes('warn step 2: 0 Negativ-Kriterien, mindestens 1 verlangt'));
});

test('checkRequirement_GoalWithTwoSentences_Warns', () => {
  const block = VALID_BLOCK.replace('speichern.\nNutzen', 'speichern. Danach sieht er eine Bestätigung.\nNutzen');

  assert.ok(messages(block).includes('warn requirement: Ziel hat 2 Sätze, erlaubt sind 1'));
});

test('sentenceCount_AbbreviationsInside_AreNotCountedAsSentences', () => {
  assert.equal(sentenceCount('Der Nutzer sieht z. B. eine Meldung, d. h. einen Hinweis.'), 1);
});

test('checkRequirement_CriterionWithoutId_ReportsError', () => {
  const block = VALID_BLOCK.replace('AC-02 (Negativ) Gegeben', '(Negativ) Gegeben');

  assert.ok(messages(block).includes('error kriterien: Kriterium ohne AC-ID: Gegeben das Formular ist offen, wenn ich das Feld leer lasse und speichere, dann erscheint eine Meldung.'));
});

test('checkRequirement_IdGap_ReportsError', () => {
  const block = VALID_BLOCK.replace('AC-05', 'AC-07');

  assert.ok(messages(block).includes('error kriterien: AC-IDs nicht lückenlos ab AC-01: erwartet AC-05, gefunden AC-07'));
});

test('checkRequirement_SingleDigitId_ReportsError', () => {
  const block = VALID_BLOCK.replace('AC-01', 'AC-1');

  assert.ok(messages(block).includes('error kriterien: AC-1 ist nicht zweistellig'));
});

test('checkRequirement_StepDependsOnUnknownStep_ReportsError', () => {
  const block = VALID_BLOCK.replace('Abhängig von: Step 1', 'Abhängig von: Step 9');

  assert.ok(messages(block).includes('error step 2: hängt von unbekanntem Step 9 ab'));
});

test('checkRequirement_StepDependsOnItself_ReportsError', () => {
  const block = VALID_BLOCK.replace('Abhängig von: Step 1', 'Abhängig von: Step 2');

  assert.ok(messages(block).includes('error step 2: hängt von sich selbst ab'));
});

test('checkRequirement_DependencyCycle_ReportsError', () => {
  const block = VALID_BLOCK.replace('Abhängig von: –', 'Abhängig von: Step 2');

  assert.ok(messages(block).includes('error steps: Abhängigkeiten enthalten einen Zyklus'));
});

test('checkRequirement_StepNumberGap_ReportsError', () => {
  const block = VALID_BLOCK.replace('2. Nachname speichern', '3. Nachname speichern').replace('Step 1', 'Step 3');

  assert.ok(messages(block).some((line) => line.startsWith('error steps: Nummerierung')));
});

test('checkRequirement_NoStepsSection_WarnsOnly', () => {
  const block = VALID_BLOCK.slice(0, VALID_BLOCK.indexOf('### Steps'));

  assert.deepEqual(messages(block), ['warn requirement: Keine Steps vorhanden']);
});

test('checkRequirement_CrlfLineEndings_ParsesLikeLf', () => {
  assert.deepEqual(check(VALID_BLOCK.replace(/\n/g, '\r\n'), LIMITS), []);
});

test('checkRequirement_IncompleteLimits_Throws', () => {
  assert.throws(() => check(VALID_BLOCK, { requirement: {}, step: {} }), /limits\.json unvollständig/);
});

test('parse_ValidBlock_ReadsStepsDependenciesAndNegatives', () => {
  const model = parse(VALID_BLOCK);

  assert.deepEqual(model.steps.map((step) => step.abhaengig), [[], [1]]);
  assert.deepEqual(model.requirement.kriterien.map((criterion) => criterion.negative), [false, true]);
});

test('reportLines_NoFindings_ReportsOk', () => {
  assert.deepEqual(reportLines([]), ['OK: keine Befunde']);
});

test('dorLint_ValidBlock_SeesEveryCriterionWithoutAcFindings', () => {
  const result = lint(VALID_BLOCK);

  assert.equal(result.statistik.acZeilen, 6);
  assert.deepEqual(result.befunde.filter((item) => /^ac-/.test(item.regel)), []);
});

test('dorLint_ValidBlock_FindsTheFieldKeywordsOfTheBlock', () => {
  const missing = lint(VALID_BLOCK).befunde.filter((item) => item.regel === 'stichwort-fehlt').map((item) => item.text);

  assert.deepEqual(missing.sort(), ['Ansprechpartner', 'Quelle', 'Tests']);
});

test('script_ValidBlockOnStdin_ExitsZero', () => {
  const result = run([], VALID_BLOCK);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /OK: keine Befunde/);
});

test('script_ErrorFinding_ExitsOne', () => {
  const result = run([], 'Irgendein Text');

  assert.equal(result.status, 1);
  assert.match(result.stdout, /^FEHLER block:/);
});

test('script_WarningWithoutStrict_ExitsZero', () => {
  const result = run([], `${VALID_BLOCK}${EXTRA_STEP}`);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /WARNUNG step 3/);
});

test('script_WarningWithStrict_ExitsOne', () => {
  const result = run(['--strict'], `${VALID_BLOCK}${EXTRA_STEP}`);

  assert.equal(result.status, 1);
});

test('script_UnknownOption_PrintsUsageAndExitsTwo', () => {
  const result = run(['--unbekannt'], '');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf:/);
});

test('script_MissingLimitsFile_ExitsTwo', () => {
  const result = run(['--limits', path.join(__dirname, 'gibt-es-nicht.json')], VALID_BLOCK);

  assert.equal(result.status, 2);
});
