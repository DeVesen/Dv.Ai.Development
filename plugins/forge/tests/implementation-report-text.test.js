'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderImplementationReport } = require('../scripts/lib/implementation-report-text');

const LINES = [['Abnahmekriterien', 0, 0], ['Treue zum Plan', 0, 0], ['Aufbau', 0, 1], ['Tests', 0, 0], ['Risiken', 0, 0]]
  .map(([name, red, yellow]) => ({ name, red, yellow, failed: false }));
const HINT = {
  color: 'yellow', title: 'Rundung der Summe', angles: 'Aufbau', description: 'Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
  recommendation: 'die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
};
const HINDRANCE = { color: 'red', title: 'Fehler wird verschluckt', angles: 'Risiken', description: 'Ein Fehler bleibt unbemerkt.', recommendation: null };

function base(overrides = {}) {
  return {
    plan: 'docs/forge/x/plan.md', topic: 'Bestellsumme berechnen', openRed: 0, reviewerCount: 5, range: 'a1b2c3d..HEAD', fileCount: 14, testCount: 6,
    reviewerLines: LINES, failedLabels: [], open: [], notes: [], ...overrides,
  };
}

test('renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayout', () => {
  // Act
  const text = renderImplementationReport(base({
    open: [HINT], notes: ['Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.'],
  }));

  // Assert
  assert.equal(text, [
    '## Implementierungs-Review · Ergebnis · Bestellsumme berechnen',
    '**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen',
    'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung.',
    '',
    '### Was geprüft wurde',
    '- Bereich: `a1b2c3d..HEAD`',
    '- 14 geänderte Dateien, davon 6 Tests',
    '- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken',
    '',
    '### Gefunden',
    '- Abnahmekriterien: 0 Hindernisse, 0 Hinweise',
    '- Treue zum Plan: 0 Hindernisse, 0 Hinweise',
    '- Aufbau: 0 Hindernisse, 1 Hinweis',
    '- Tests: 0 Hindernisse, 0 Hinweise',
    '- Risiken: 0 Hindernisse, 0 Hinweise',
    '',
    '### Noch offen · kein Hindernis für das Abschließen',
    '- 🟡 **Rundung der Summe** · aus: Aufbau',
    '  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
    '  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
    '',
    '### Hinweise zum Ablauf',
    '- Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.',
    '',
    '### Wie es weitergeht',
    '1. Den Hinweis einarbeiten lassen (optional):',
    '   `/dv-forge:review-followup docs/forge/x/plan.md alle`',
    '2. Arbeit abschließen:',
    '   `/dv-forge:finish-work`',
  ].join('\n'));
});

test('renderImplementationReport_ReadyWithoutOpenItems_OmitsOpenAndNotesAndTopic', () => {
  // Act
  const text = renderImplementationReport(base({ topic: null, reviewerCount: 1, fileCount: 1, testCount: 0, reviewerLines: [LINES[0]] }));

  // Assert
  assert.match(text, /^## Implementierungs-Review · Ergebnis\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen\nAblauf: Prüfung aus einem Blickwinkel, keine Überarbeitung\./);
  assert.match(text, /- 1 geänderte Datei, davon 0 Tests/);
  assert.equal(text.includes('Noch offen'), false);
  assert.equal(text.includes('Hinweise zum Ablauf'), false);
  assert.match(text, /### Wie es weitergeht\n1\. Arbeit abschließen:\n   `\/dv-forge:finish-work`$/);
});

test('renderImplementationReport_Blocked_ShowsHindrancesAndRerunStep', () => {
  // Arrange
  const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 2 } : line));

  // Act
  const text = renderImplementationReport(base({ openRed: 2, open: [HINDRANCE, { ...HINDRANCE, title: 'Zweites' }], reviewerLines: lines }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(text, /- Risiken: 2 Hindernisse, 0 Hinweise/);
  assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken\n  Ein Fehler bleibt unbemerkt\.\n- 🔴 \*\*Zweites\*\*/);
  assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  assert.match(text, /1\. Die 2 Hindernisse einarbeiten lassen \(oder selbst beheben\):\n   `\/dv-forge:review-followup docs\/forge\/x\/plan\.md alle`\n2\. Danach erneut prüfen:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`/);
});

test('renderImplementationReport_Incomplete_NamesFailedReviewersAndOffersRerun', () => {
  // Arrange
  const lines = [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }];

  // Act
  const text = renderImplementationReport(base({ failedLabels: ['Risiken'], reviewerLines: lines, notes: ['Der Prüfer für Risiken ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.'] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
  assert.match(text, /- Risiken: ausgefallen/);
  assert.match(text, /1\. Den Lauf in einer frischen Session erneut starten:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`/);
});

test('renderImplementationReport_OneHindranceAndSeveralHints_UsesSingularAndPlural', () => {
  // Act
  const one = renderImplementationReport(base({ openRed: 1, open: [{ ...HINT, color: 'red' }] }));
  const many = renderImplementationReport(base({ open: [HINT, { ...HINT, title: 'Zweiter' }] }));

  // Assert
  assert.match(one, /⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(one, /1\. Das Hindernis einarbeiten lassen/);
  assert.match(many, /· 2 kleine Hinweise offen/);
  assert.match(many, /1\. Die 2 Hinweise einarbeiten lassen \(optional\):/);
});

test('renderImplementationReport_BlockedWithoutProposal_RecommendsOwnFixInsteadOfFollowup', () => {
  // Act
  const text = renderImplementationReport(base({ openRed: 1, open: [{ ...HINDRANCE, hasProposal: false }] }));

  // Assert
  assert.equal(text.includes('review-followup'), false);
  assert.match(text, /### Wie es weitergeht\n1\. Das Hindernis hat keinen Lösungsvorschlag\. Selbst beheben, dann erneut prüfen:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`$/);
});

test('renderImplementationReport_BlockedPartlyWithProposal_SplitsFollowupAndOwnFix', () => {
  // Arrange
  const open = [{ ...HINDRANCE, hasProposal: true }, { ...HINDRANCE, title: 'Zweites', hasProposal: false }, { ...HINDRANCE, title: 'Drittes', hasProposal: false }];

  // Act
  const text = renderImplementationReport(base({ openRed: 3, open }));

  // Assert
  assert.match(text, /1\. Das Hindernis mit Lösungsvorschlag einarbeiten lassen:\n   `\/dv-forge:review-followup docs\/forge\/x\/plan\.md alle`\n2\. Die 2 übrigen Hindernisse haben keinen Lösungsvorschlag\. Selbst beheben, dann erneut prüfen:\n   `\/dv-forge:implementation-review docs\/forge\/x\/plan\.md`$/);
});

test('renderImplementationReport_HintsWithoutProposal_OffersOwnFixAndFinish', () => {
  // Act
  const text = renderImplementationReport(base({ open: [{ ...HINT, recommendation: null, hasProposal: false }] }));

  // Assert
  assert.equal(text.includes('review-followup'), false);
  assert.match(text, /### Wie es weitergeht\n1\. Der Hinweis hat keinen Lösungsvorschlag\. Bei Bedarf selbst beheben \(optional\)\.\n2\. Arbeit abschließen:\n   `\/dv-forge:finish-work`$/);
});

test('renderImplementationReport_HintsPartlyWithProposal_SplitsFollowupAndOwnFix', () => {
  // Act
  const text = renderImplementationReport(base({ open: [HINT, { ...HINT, title: 'Zweiter', hasProposal: false }] }));

  // Assert
  assert.match(text, /1\. Den Hinweis mit Lösungsvorschlag einarbeiten lassen \(optional\):\n   `\/dv-forge:review-followup docs\/forge\/x\/plan\.md alle`\n2\. Der übrige Hinweis hat keinen Lösungsvorschlag\. Bei Bedarf selbst beheben \(optional\)\.\n3\. Arbeit abschließen:/);
});
