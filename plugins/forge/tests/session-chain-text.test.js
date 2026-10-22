'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { goCall, specHalt, goHalt, noStatusHint, showstopperText, deviationText, adoptedText, finalReport } = require('../scripts/lib/session-chain-text');

const THREE_YELLOW = ['Begriff', 'Grenzfall', 'Reihenfolge'].map((titel, index) => ({ farbe: 'yellow', titel, key: String(index), herkunft: 'spec-review' }));
const GO_VALUES = { spec: 'C:/r/docs/forge/x/spec.md', plan: 'C:/r/docs/forge/x/plan.md', basis: 'dev' };

test('specHalt_ReadyWithThreeHints_ShowsResultRecommendationAllYellowAndChoice', () => {
  // Act
  const text = specHalt({ result: '✅ Bereit zum Planen · 3 kleine Hinweise offen', recommendation: { empfehlung: 'Planning', grund: null }, points: THREE_YELLOW });

  // Assert
  assert.equal(text, [
    '# Spec-Haltepunkt',
    '**Ergebnis:** ✅ Bereit zum Planen · 3 kleine Hinweise offen',
    '**Empfehlung:** Planning',
    '**Offene Punkte:**',
    '- 🟡 Begriff · spec-review',
    '- 🟡 Grenzfall · spec-review',
    '- 🟡 Reihenfolge · spec-review',
    '**Auswahl:** Planning · Spec-Nacharbeit · Stopp',
  ].join('\n'));
});

test('specHalt_IncompleteReview_RecommendsStoppWithReasonAndKeepsChoice', () => {
  // Act
  const text = specHalt({ result: '⚠️ Unvollständig · Nachprüfung ausgefallen', recommendation: { empfehlung: 'Stopp', grund: 'Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.' }, points: [] });

  // Assert
  assert.ok(text.includes('**Empfehlung:** Stopp — Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.'));
  assert.ok(text.includes('**Auswahl:** Planning · Spec-Nacharbeit · Stopp'));
});

test('goCall_WithAndWithoutWorkitem_FillsAllValues', () => {
  // Act
  const [withWi, withoutWi] = [{ ...GO_VALUES, wi: '311021' }, GO_VALUES].map(goCall);

  // Assert
  assert.equal(withWi, '/dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md 311021 --base dev');
  assert.equal(withoutWi, '/dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md --base dev');
});

test('goHalt_AfterPlanReview_ShowsPathsResultYellowAndFilledCall', () => {
  // Act
  const text = goHalt({ ...GO_VALUES, wi: '311021', result: '✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen', recommendation: { empfehlung: 'GO', grund: null }, points: [THREE_YELLOW[0]] });

  // Assert
  assert.equal(text, [
    '# GO-Haltepunkt',
    '**Spec:** C:/r/docs/forge/x/spec.md',
    '**Plan:** C:/r/docs/forge/x/plan.md',
    '**Ergebnis:** ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen',
    '**Empfehlung:** GO',
    '**Offene Punkte:**',
    '- 🟡 Begriff · spec-review',
    '**Aufruf:** /dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md 311021 --base dev',
    '**Auswahl:** GO · Plan-Nacharbeit · Stopp',
  ].join('\n'));
});

test('goHalt_WithoutPlanReviewResult_OmitsResultLineAndKeepsTheRest', () => {
  // Act
  const text = goHalt({ ...GO_VALUES, result: null, recommendation: { empfehlung: 'GO', grund: null }, points: [] });

  // Assert
  assert.ok(!text.includes('**Ergebnis:**'));
  for (const part of ['**Spec:** C:/r/docs/forge/x/spec.md', '**Plan:** C:/r/docs/forge/x/plan.md', '**Offene Punkte:**\nKeine.', '**Aufruf:** /dv-forge:implementation-orchestrator']) assert.ok(text.includes(part), part);
});

test('noStatusHint_EtappeAndSession_NamesBothInOneLineWithLink', () => {
  // Act
  const line = noStatusHint({ etappe: 'spec-review', session: 'local_abc' });

  // Assert
  assert.equal(line, 'spec-review: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · [Session](#local_abc)');
});

test('showstopperText_AcWithoutTest_NamesAcAndLinksSession', () => {
  // Act
  const text = showstopperText({ gruende: ['AC-05 hat keinen beweisenden Test'], session: 'local_u' });

  // Assert
  assert.equal(text, '# Showstopper der Umsetzung\n- AC-05 hat keinen beweisenden Test\nKlären in der Umsetzungs-Session: [Session](#local_u)');
});

test('deviationText_UncommittedSpec_NamesItAndHolds', () => {
  // Act
  const text = deviationText({ etappe: 'spec-review', abweichungen: ['docs/forge/x/spec.md ist uncommittet'], session: 'local_s' });

  // Assert
  assert.ok(text.includes('- docs/forge/x/spec.md ist uncommittet'));
  assert.ok(text.includes('Die Kette hält.'));
});

test('adoptedText_StateWithBaseAndTwoYellow_NamesBaseAndBothPoints', () => {
  // Act
  const text = adoptedText({ slug: 'x', basis: 'dev', offen: THREE_YELLOW.slice(0, 2), entscheidungen: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] });

  // Assert
  for (const part of ['**Basis-Branch:** dev', '- 🟡 Begriff · spec-review', '- 🟡 Grenzfall · spec-review', '- spec-nacharbeit: 500 statt 404, keine Backend-Änderung']) assert.ok(text.includes(part), part);
});

test('finalReport_CommitSeenAndTestCountsReported_SeparatesCheckedFromReported', () => {
  // Arrange
  const state = { slug: 'x', etappen: [{ etappe: 'umsetzung', session: 'local_u', ergebnis: '✅ Bereit zum Abschließen', geprueft: ['Commit abc1234: src/a.js'], tests: '120 grün' }] };

  // Act
  const text = finalReport(state);

  // Assert
  const checked = text.slice(text.indexOf('## Geprüft'), text.indexOf('## Gemeldet'));
  const reported = text.slice(text.indexOf('## Gemeldet'), text.indexOf('## Offene Punkte'));
  assert.ok(checked.includes('- umsetzung: Commit abc1234: src/a.js'));
  assert.ok(reported.includes('- umsetzung: Testzahlen 120 grün'));
  assert.ok(!reported.includes('abc1234'));
});

test('finalReport_YellowFromSpecReviewAndGreenFromPlanReview_ListsBothWithOrigin', () => {
  // Arrange
  const state = { slug: 'x', offen: [{ farbe: 'yellow', titel: 'Begriff', herkunft: 'spec-review' }, { farbe: 'green', titel: 'Name', herkunft: 'plan-review' }] };

  // Act
  const text = finalReport(state);

  // Assert
  assert.ok(text.includes('## Offene Punkte\n- 🟡 Begriff · spec-review\n- 🟢 Name · plan-review'));
});

test('finalReport_StoppAtGo_NamesResumeCodewordAndNoWorkitemWithoutNumber', () => {
  // Arrange
  const state = { slug: 'x', halt: 'go', spec: 'C:/r/s.md', plan: 'C:/r/p.md' };

  // Act
  const text = finalReport(state, { stopp: true });

  // Assert
  assert.ok(text.includes('## Fortsetzen\n/dv-forge:session-orchestrator implementation C:/r/s.md C:/r/p.md'));
  assert.ok(!text.includes('finishing-workitem'));
});

test('finalReport_WithWorkitem_NamesOptionalFinishingWorkitemCall', () => {
  // Act
  const text = finalReport({ slug: 'x', wi: '311021' });

  // Assert
  assert.ok(text.includes('## Workitem\nOptional: `finishing-workitem 311021`'));
  assert.ok(!text.includes('## Fortsetzen'));
});
