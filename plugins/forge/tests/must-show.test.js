'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { anchorsOf, mustShowOf, decideTurnEnd } = require('../scripts/lib/must-show');

const TEXT = ['## Spec-Review: docs/x/spec.md', '', '**Status:** sauber', '', '### Runde 1', '| a | b |', '', '### Offene Fragen', '- x'].join('\n');
const ANCHORS = ['## Spec-Review: docs/x/spec.md', '### Runde 1', '### Offene Fragen'];

test('anchorsOf_HeadingsAndQuestionLines_ReturnsThemTrimmed', () => {
  // Arrange
  const text = ['# Titel', '## Kopf', '#### zu tief', '  ### Eingerückt  ', '**Frage 1 — Regel**', 'Frage 2 von 2 · Titel', '- **Frage 3**', 'Fließtext'].join('\n');

  // Act
  const anchors = anchorsOf(text);

  // Assert
  assert.deepEqual(anchors, ['## Kopf', '### Eingerückt', '**Frage 1 — Regel**', 'Frage 2 von 2 · Titel']);
});

test('anchorsOf_CrlfText_ReturnsLinesWithoutCarriageReturn', () => {
  // Act
  const anchors = anchorsOf('## Kopf\r\n\r\n### Ende\r\n');

  // Assert
  assert.deepEqual(anchors, ['## Kopf', '### Ende']);
});

test('mustShowOf_Text_KeepsAnchorsLinesTextAndZeroAttempts', () => {
  // Act
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Assert
  assert.deepEqual(mustShow, { file: 'W/bericht.md', anchors: ANCHORS, lines: 6, text: TEXT, attempts: 0 });
});

test('decideTurnEnd_AllAnchorsAndEnoughLines_FreesWithoutReason', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Act
  const result = decideTurnEnd(mustShow, TEXT);

  // Assert
  assert.deepEqual(result, { reason: null, mustShow: null });
});

test('decideTurnEnd_ShownTextWrappedWithOtherWords_StillFinds', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');
  const shown = `Hier der Bericht:\r\n${TEXT.replace(/\n/g, '\r\n')}\r\nViel Erfolg`;

  // Act
  const result = decideTurnEnd(mustShow, shown);

  // Assert
  assert.equal(result.reason, null);
});

test('decideTurnEnd_AnchorMissing_BlocksNamesAnchorAndCarriesText', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');
  const shown = TEXT.replace('### Offene Fragen', 'Offene Fragen');

  // Act
  const result = decideTurnEnd(mustShow, shown);

  // Assert
  assert.match(result.reason, /^dv-forge: Gib den folgenden Text unverändert im Chat aus\. Es fehlt: ### Offene Fragen\. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks\.\n\n## Spec-Review/);
  assert.ok(result.reason.endsWith(TEXT));
  assert.equal(result.mustShow.attempts, 1);
});

test('decideTurnEnd_MoreThanThreeMissing_NamesOnlyThree', () => {
  // Arrange
  const text = ['## A', '## B', '## C', '## D', '## E'].join('\n');

  // Act
  const result = decideTurnEnd(mustShowOf(text, 'f.md'), 'nichts');

  // Assert
  assert.match(result.reason, /Es fehlt: ## A \| ## B \| ## C\./);
});

test('decideTurnEnd_AnchorsPresentButTooShort_BlocksWithTooShort', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Act
  const result = decideTurnEnd(mustShow, ANCHORS.join('\n'));

  // Assert
  assert.match(result.reason, /Der Text ist zu kurz\./);
});

test('decideTurnEnd_SecondAttemptStillMissing_BlocksAgainThenFrees', () => {
  // Arrange
  const first = decideTurnEnd(mustShowOf(TEXT, 'f.md'), 'nichts');
  const second = decideTurnEnd(first.mustShow, 'nichts');

  // Act
  const third = decideTurnEnd(second.mustShow, 'nichts');

  // Assert
  assert.equal(second.mustShow.attempts, 2);
  assert.ok(second.reason);
  assert.deepEqual(third, { reason: null, mustShow: null });
});

test('decideTurnEnd_MissingAttempts_CountsFromZeroAndStillTerminates', () => {
  // Arrange
  const { attempts: _entfernt, ...ohneZaehler } = mustShowOf(TEXT, 'f.md');

  // Act
  const first = decideTurnEnd(ohneZaehler, 'nichts');
  const second = decideTurnEnd(first.mustShow, 'nichts');
  const third = decideTurnEnd(second.mustShow, 'nichts');

  // Assert
  assert.equal(first.mustShow.attempts, 1);
  assert.equal(second.mustShow.attempts, 2);
  assert.deepEqual(third, { reason: null, mustShow: null });
});
