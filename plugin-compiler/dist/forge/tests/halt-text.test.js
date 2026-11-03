'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderHalt, topicOf } = require('../scripts/lib/halt-text');

const LATER = 'später';
const FOOT = [
  `**Antwort:** \`1a\` · \u201E${LATER}\u201C lässt eine Frage offen.`,
  '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.',
];

const group = (overrides) => ({
  key: 'ac-4', label: 'AC-04', color: 'red', reviewers: ['completeness', 'clarity'], items: [{ finding: { consequence: 'Folge des Findings' } }], ...overrides,
});
const bundle = (overrides) => ({
  title: 'Token-Format im Produktivsystem', affects: 'Prüfung des Tokens', why: 'Alle Messungen stammen vom Testsystem.', reviewers: ['consistency'],
  options: [{ label: 'a', text: 'Erst umsetzen, wenn gemessen ist.', consequence: 'sicher, die Umsetzung wartet.' }, { label: 'b', text: 'Sofort umsetzen.', consequence: 'schnell, es kann scheitern.' }],
  recommendation: 'a', reason: 'ein Fehler träfe sonst alle Nutzer.', places: ['AC-01'], ...overrides,
});
const TEXTS = [
  { severity: '🔴', location: 'AC-04', title: 'Anmeldestatus und Browser-Tests', description: 'Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.', recommendation: 'Eine Variante festlegen, weil das Risiko sinkt.' },
  { severity: '🟡', location: 'AC-07', title: 'Antwort bei fremdem Token', description: 'Offen war, ob 401 oder 403 kommt.', recommendation: 'Eine Variante festlegen, weil das Risiko sinkt.' },
];

function input(overrides = {}) {
  return {
    topic: 'Zugriff mit dem Access-Token',
    groups: [group(), group({ key: 'ac-1', label: 'AC-01', reviewers: ['consistency'] }), group({ key: 'ac-7', label: 'AC-07', color: 'yellow', reviewers: ['clarity'] })],
    texts: TEXTS,
    results: [{ location: 'AC-04', status: 'changed', change: 'Beides steht jetzt als prüfbare Vorgabe in der Spec.' }, { location: 'AC-01', status: 'human-question', reason: 'neu' }],
    bundles: [bundle()],
    ...overrides,
  };
}

test('renderHalt_CorrectedNoticeAndOneQuestion_ShowsAgreedLayout', () => {
  // Act
  const text = renderHalt(input());

  // Assert
  assert.equal(text, [
    '## Spec-Review · Runde 1 · Zugriff mit dem Access-Token',
    '**Ergebnis:** 2 × 🔴 · 1 × 🟡 · 1 Frage braucht dich',
    '',
    '### Schon korrigiert (nichts zu tun)',
    '- 🔴 **Anmeldestatus und Browser-Tests** · Blickwinkel: Vollständigkeit, Klarheit',
    '  Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.',
    '  Änderung: Beides steht jetzt als prüfbare Vorgabe in der Spec.',
    '',
    '### Nur zur Kenntnis (nicht bearbeitet)',
    '- 🟡 **Antwort bei fremdem Token** · Blickwinkel: Klarheit',
    '  Offen war, ob 401 oder 403 kommt.',
    '',
    '### Frage 1 von 1 · Token-Format im Produktivsystem  (betrifft: Prüfung des Tokens)',
    '**Warum gefragt** (Blickwinkel: Widerspruchsfreiheit): Alle Messungen stammen vom Testsystem.',
    '- **a)** Erst umsetzen, wenn gemessen ist. Folge: sicher, die Umsetzung wartet.',
    '- **b)** Sofort umsetzen. Folge: schnell, es kann scheitern.',
    '**Empfehlung: a**, ein Fehler träfe sonst alle Nutzer.',
    '',
    ...FOOT,
  ].join('\n'));
});

test('renderHalt_TwoQuestions_NumbersThemAndListsRecommendationsInFooter', () => {
  // Act
  const text = renderHalt(input({ bundles: [bundle(), bundle({ title: 'Zweite Frage', recommendation: 'b' })] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* 2 × 🔴 · 1 × 🟡 · 2 Fragen brauchen dich/);
  assert.match(text, /### Frage 1 von 2 · Token-Format/);
  assert.match(text, /### Frage 2 von 2 · Zweite Frage/);
  assert.ok(text.includes(`**Antwort:** \`1a, 2b\` · \u201E${LATER}\u201C lässt eine Frage offen.`));
});

test('renderHalt_RedUnchanged_ShownInNoticeWithReason', () => {
  // Arrange
  const results = [{ location: 'AC-04', status: 'unchanged', reason: 'Das Finding beruht auf einer Fehllesung.' }];

  // Act
  const text = renderHalt(input({ results, bundles: [] }));

  // Assert
  assert.ok(text.includes('### Nur zur Kenntnis (nicht bearbeitet)\n- 🔴 **Anmeldestatus und Browser-Tests** · Blickwinkel: Vollständigkeit, Klarheit\n  Es war nirgends festgelegt, woran die App erkennt, dass jemand angemeldet ist.\n  Grund: Das Finding beruht auf einer Fehllesung.'));
  assert.equal(text.includes('### Schon korrigiert'), false);
});

test('renderHalt_NoChangedAndNoNotice_OmitsBothSections', () => {
  // Arrange
  const only = { groups: [group({ key: 'ac-1', label: 'AC-01' })], results: [{ location: 'AC-01', status: 'human-question', reason: 'neu' }] };

  // Act
  const text = renderHalt(input(only));

  // Assert
  assert.equal(text.includes('### Schon korrigiert'), false);
  assert.equal(text.includes('### Nur zur Kenntnis'), false);
  assert.match(text, /\*\*Ergebnis:\*\* 1 × 🔴 · 1 Frage braucht dich/);
});

test('renderHalt_ScoutMissing_UsesLabelAndShortenedConsequenceWithNote', () => {
  // Arrange
  const long = 'x'.repeat(500);
  const groups = [group({ items: [{ finding: { consequence: long } }] })];

  // Act
  const text = renderHalt(input({ texts: [], groups, results: [{ location: 'AC-04', status: 'changed', change: 'Geändert.' }], bundles: [] }));

  // Assert
  assert.ok(text.includes(`- 🔴 **AC-04** · Blickwinkel: Vollständigkeit, Klarheit\n  ${'x'.repeat(399)}… (ohne Scout-Beschreibung)\n  Änderung: Geändert.`));
});

test('renderHalt_EmptyReviewers_OmitsAngleInQuestion', () => {
  const text = renderHalt(input({ bundles: [bundle({ reviewers: [] })] }));
  assert.ok(text.includes('**Warum gefragt**: Alle Messungen stammen vom Testsystem.'));
  assert.equal(text.includes('(Blickwinkel: )'), false);
});

test('renderHalt_ScoutTitleInvalid_UsesFallback', () => {
  const texts = [{ severity: '🔴', location: 'AC-04', title: 'Zu viele Wörter im Titel hier drin', description: 'Eine gültige Beschreibung.', recommendation: 'Eine Variante festlegen, weil das Risiko sinkt.' }];
  const text = renderHalt(input({ texts, groups: [group()], results: [{ location: 'AC-04', status: 'changed', change: 'Geändert.' }], bundles: [] }));
  assert.ok(text.includes('- 🔴 **AC-04** · Blickwinkel: Vollständigkeit, Klarheit\n  Folge des Findings (ohne Scout-Beschreibung)'));
});

test('renderHalt_NoTopic_OmitsTopicInHeading', () => {
  assert.ok(renderHalt(input({ topic: null })).startsWith('## Spec-Review · Runde 1\n'));
});

test('renderHalt_OptionTextWithLineBreaks_StaysOnOneLine', () => {
  // Arrange
  const options = [{ label: 'a', text: 'Erst\nmessen.', consequence: 'sicher,\n  aber langsam.' }, { label: 'b', text: 'Sofort.', consequence: 'schnell.' }];

  // Act
  const text = renderHalt(input({ bundles: [bundle({ options })] }));

  // Assert
  assert.ok(text.includes('- **a)** Erst messen. Folge: sicher, aber langsam.'));
});

test('topicOf_FirstLevelHeading_ReturnsItsText', () => {
  assert.equal(topicOf('Status: x\n# Demo-Spec\n\n## Teil\n# Zweite'), 'Demo-Spec');
  assert.equal(topicOf('## nur zweite Ebene'), null);
  assert.equal(topicOf('# Mit CRLF\r\n'), 'Mit CRLF');
});
