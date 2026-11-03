'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reviewStatusLine, parseReviewStatusLine } = require('../scripts/lib/review-status');

test('reviewStatusLine_ResultLineWithPrefix_DropsThePrefixAndNamesFollowupAndFile', () => {
  // Act
  const line = reviewStatusLine({ resultLine: '**Ergebnis:** ✅ Bereit zum Planen', followup: false, report: 'C:\\repo\\ablage\\bericht-review.md' });

  // Assert
  assert.equal(line, 'Review abgeschlossen: ✅ Bereit zum Planen · FOLLOWUP nein · Bericht: C:/repo/ablage/bericht-review.md');
});

test('reviewStatusLine_FollowupOffered_SaysJa', () => {
  // Act
  const line = reviewStatusLine({ resultLine: '⛔ Noch nicht bereit · 1 Hindernis offen', followup: true, report: '/r/bericht-review.md' });

  // Assert
  assert.equal(line, 'Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: /r/bericht-review.md');
});

test('parseReviewStatusLine_ValidLine_ReturnsResultFollowupAndFile', () => {
  // Act
  const parsed = parseReviewStatusLine('Review abgeschlossen: ✅ Bereit zum Planen · 2 kleine Hinweise offen · FOLLOWUP ja · Bericht: /r/a/bericht-followup-1.md');

  // Assert
  assert.deepEqual(parsed, { ergebnis: '✅ Bereit zum Planen · 2 kleine Hinweise offen', followup: true, bericht: '/r/a/bericht-followup-1.md' });
});

test('parseReviewStatusLine_OtherLine_ReturnsNull', () => {
  assert.equal(parseReviewStatusLine('[plan-review] STATUS=final · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none'), null);
  assert.equal(parseReviewStatusLine(''), null);
});
