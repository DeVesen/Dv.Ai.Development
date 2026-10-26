'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resultOf, abortOf, acsWithoutTestOf, recommendation, showstoppers, nextStep } = require('../scripts/lib/session-chain-decide');

const READY_REPORT = { result: '✅ Bereit zum Abschließen', pruefung: 'gruen', luecken: [], acOhneTest: [] };

test('resultOf_ReportWithResultLine_ReturnsTextAfterLabel', () => {
  // Act
  const result = resultOf('# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen · 3 kleine Hinweise offen\nAblauf: …');

  // Assert
  assert.equal(result, '✅ Bereit zum Planen · 3 kleine Hinweise offen');
});

test('resultOf_NoResultLine_ReturnsNull', () => {
  // Act & Assert
  assert.equal(resultOf('# Bericht\nnichts'), null);
});

test('recommendation_SpecReadyWithHints_RecommendsPlanning', () => {
  // Act
  const result = recommendation('spec', '✅ Bereit zum Planen · 3 kleine Hinweise offen');

  // Assert
  assert.deepEqual(result, { empfehlung: 'Planning', grund: null });
});

test('recommendation_SpecBlockedOrQuestions_RecommendsSpecNacharbeit', () => {
  // Act
  const results = ['⛔ Noch nicht bereit · 1 Hindernis offen', '❓ 2 Fragen offen'].map((line) => recommendation('spec', line).empfehlung);

  // Assert
  assert.deepEqual(results, ['Spec-Nacharbeit', 'Spec-Nacharbeit']);
});

test('recommendation_SpecIncomplete_RecommendsStoppWithReason', () => {
  // Act
  const result = recommendation('spec', '⚠️ Unvollständig · Nachprüfung ausgefallen');

  // Assert
  assert.deepEqual(result, { empfehlung: 'Stopp', grund: 'Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.' });
});

test('recommendation_GoAfterBlockedPlanReview_RecommendsPlanNacharbeit', () => {
  // Act
  const result = recommendation('go', '⛔ Noch nicht bereit · 2 Hindernisse offen');

  // Assert
  assert.equal(result.empfehlung, 'Plan-Nacharbeit');
});

test('recommendation_GoWithoutPlanReview_RecommendsGo', () => {
  // Act
  const result = recommendation('go', null);

  // Assert
  assert.deepEqual(result, { empfehlung: 'GO', grund: null });
});

test('nextStep_StagesBeforeReview_StartTheNextStage', () => {
  // Act
  const steps = ['whiteboarding', 'grill', 'spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => nextStep(etappe).start);

  // Assert
  assert.deepEqual(steps, ['grill', 'spec-review', 'spec-review', 'plan-review']);
});

test('nextStep_ReviewStages_HoldAtTheirHaltepunkt', () => {
  // Act
  const halts = ['spec-review', 'planning', 'plan-review'].map((etappe) => nextStep(etappe).halt);

  // Assert
  assert.deepEqual(halts, ['spec', 'go', 'go']);
});

test('nextStep_UmsetzungReadyGreenAllAcTested_StartsAbschluss', () => {
  // Act & Assert
  assert.deepEqual(nextStep('umsetzung', READY_REPORT), { start: 'abschluss' });
  assert.deepEqual(nextStep('abschluss'), { ende: true });
});

test('nextStep_UmsetzungCheckRedOrNone_IsShowstopper', () => {
  // Act
  const [red, none] = ['rot', 'keine'].map((pruefung) => nextStep('umsetzung', { ...READY_REPORT, pruefung }));

  // Assert
  assert.deepEqual(red, { halt: 'showstopper', gruende: ['Prüfergebnis ist nicht grün: rot'] });
  assert.deepEqual(none.gruende, ['Prüfergebnis ist nicht grün: keine']);
});

test('showstoppers_LintCommandNotRunnable_NamesEnvironmentGapWithCommand', () => {
  // Act
  const gruende = showstoppers({ ...READY_REPORT, luecken: ['npm run lint'] });

  // Assert
  assert.deepEqual(gruende, ['Umgebungslücke: npm run lint ist nicht lauffähig']);
});

test('showstoppers_ReadyButAcWithoutTest_NamesTheAc', () => {
  // Act
  const gruende = showstoppers({ ...READY_REPORT, acOhneTest: ['AC-05'] });

  // Assert
  assert.deepEqual(gruende, ['AC-05 hat keinen beweisenden Test']);
});

test('showstoppers_ResultNotReady_IsShowstopper', () => {
  // Act
  const gruende = showstoppers({ ...READY_REPORT, result: '⛔ Noch nicht bereit · 1 Hindernis offen' });

  // Assert
  assert.deepEqual(gruende, ['Ergebnis ist nicht ✅: ⛔ Noch nicht bereit · 1 Hindernis offen']);
});

test('abortOf_ReportWithAbortLine_ReturnsTextAfterLabel', () => {
  // Act
  const text = abortOf('# Abschlussbericht\n**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen\nIterationen: 8 von 8\nAbbruch: Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.\n');

  // Assert
  assert.equal(text, 'Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.');
  assert.equal(abortOf('# Abschlussbericht\n**Ergebnis:** ✅ Bereit\n'), null);
});

test('acsWithoutTestOf_ReportLine_ReturnsTheAcs', () => {
  // Act & Assert
  assert.deepEqual(acsWithoutTestOf('x\nAC ohne beweisenden Test: AC-02, AC-05\ny'), ['AC-02', 'AC-05']);
  assert.deepEqual(acsWithoutTestOf('kein Treffer'), []);
});
