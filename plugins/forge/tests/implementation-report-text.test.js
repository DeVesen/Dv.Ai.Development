'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderImplementationReport, summaryOf } = require('../scripts/lib/implementation-report-text');

const LINES = [['Abnahmekriterien', 0, 0], ['Treue zum Plan', 0, 0], ['Aufbau', 0, 1], ['Tests', 0, 0], ['Risiken', 0, 0]]
  .map(([name, red, yellow]) => ({ name, red, yellow, failed: false }));
const HINT = {
  color: 'yellow', title: 'Rundung der Summe', angles: 'Aufbau', description: 'Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
  recommendation: 'die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.', hasProposal: true,
};
const HINDRANCE = { color: 'red', title: 'Fehler wird verschluckt', angles: 'Risiken', description: 'Ein Fehler bleibt unbemerkt.', recommendation: null, hasProposal: true };

function base(overrides = {}) {
  return {
    plan: 'docs/forge/x/plan.md', topic: 'Bestellsumme berechnen', openRed: 0, reviewerCount: 5, range: 'a1b2c3d..HEAD', fileCount: 14, testCount: 6,
    reviewerLines: LINES, failedLabels: [], open: [], notes: [], ...overrides,
  };
}

test('renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayoutWithoutNextSteps', () => {
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
});

test('renderImplementationReport_Blocked_ShowsHindrances', () => {
  // Arrange
  const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 2 } : line));

  // Act
  const text = renderImplementationReport(base({ openRed: 2, open: [HINDRANCE, { ...HINDRANCE, title: 'Zweites' }], reviewerLines: lines }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(text, /- Risiken: 2 Hindernisse, 0 Hinweise/);
  assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken\n  Ein Fehler bleibt unbemerkt\.\n- 🔴 \*\*Zweites\*\*/);
  assert.equal(text.includes('Vorschlag (empfohlen)'), false);
});

test('renderImplementationReport_Incomplete_NamesFailedReviewers', () => {
  // Arrange
  const lines = [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }];

  // Act
  const text = renderImplementationReport(base({ failedLabels: ['Risiken'], reviewerLines: lines, notes: ['Der Prüfer für Risiken ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.'] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
  assert.match(text, /- Risiken: ausgefallen/);
});

test('renderImplementationReport_OneHindranceAndSeveralHints_UsesSingularAndPlural', () => {
  // Act
  const one = renderImplementationReport(base({ openRed: 1, open: [{ ...HINT, color: 'red' }] }));
  const many = renderImplementationReport(base({ open: [HINT, { ...HINT, title: 'Zweiter' }] }));

  // Assert
  assert.match(one, /⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(many, /· 2 kleine Hinweise offen/);
});

test('renderImplementationReport_RedEntryButOpenRedZero_ReportsNotReady', () => {
  // Act
  const text = renderImplementationReport(base({ openRed: 0, open: [HINDRANCE] }));

  // Assert
  assert.equal(text.includes('Bereit zum Abschließen'), false);
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
});

test('renderImplementationReport_OpenRedAboveListedEntries_ReportsTheReportedCount', () => {
  // Act
  const text = renderImplementationReport(base({ openRed: 2, open: [HINDRANCE] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
});

test('renderImplementationReport_BlockedWithHint_ShowsFullLayout', () => {
  // Arrange
  const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 1 } : line));
  const hindrance = { ...HINDRANCE, recommendation: 'den Fehler an den Aufrufer weitergeben, weil er sonst unbemerkt bleibt.' };

  // Act
  const text = renderImplementationReport(base({ openRed: 1, open: [hindrance, HINT], reviewerLines: lines, reviewerCount: 5 }));

  // Assert
  assert.equal(text, [
    '## Implementierungs-Review · Ergebnis · Bestellsumme berechnen',
    '**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen',
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
    '- Risiken: 1 Hindernis, 0 Hinweise',
    '',
    '### Noch offen · Hindernis',
    '- 🔴 **Fehler wird verschluckt** · aus: Risiken',
    '  Ein Fehler bleibt unbemerkt.',
    '  Vorschlag (empfohlen): den Fehler an den Aufrufer weitergeben, weil er sonst unbemerkt bleibt.',
    '',
    '### Noch offen · kein Hindernis für das Abschließen',
    '- 🟡 **Rundung der Summe** · aus: Aufbau',
    '  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
    '  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
  ].join('\n'));
});

const KINDS = {
  ready: {},
  hints: { open: [HINT] },
  blocked: { openRed: 1, open: [HINDRANCE] },
  incomplete: { failedLabels: ['Risiken'], reviewerLines: [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }] },
};

for (const [kind, overrides] of Object.entries(KINDS)) {
  test(`renderImplementationReport_${kind}_NamesNoNextStepNoCommandAndNoWorktree`, () => {
    // Act
    const text = renderImplementationReport(base(overrides));

    // Assert
    assert.equal(/Wie es weitergeht|Worktree bleibt|Nicht gepusht/.test(text), false);
    assert.equal(/\/dv-forge:/.test(text), false);
    assert.equal(/frischen? Session/.test(text), false);
  });
}

test('summaryOf_AnyInput_ReturnsKindResultFlowCheckedAndFoundOnly', () => {
  // Act
  const summary = summaryOf(base({ open: [HINT] }));

  // Assert
  assert.deepEqual(Object.keys(summary).sort(), ['checked', 'flowLine', 'found', 'kind', 'resultLine']);
  assert.equal(summary.kind, 'hints');
});
