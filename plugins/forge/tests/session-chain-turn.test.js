'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeRepo, addWorktree } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { parseStatusLine, turnAction, readTurns, writeTurns } = require('../scripts/lib/session-chain-turn');

const FINAL = '[planning] STATUS=final · ROT=0 · GELB=2 · COMMIT=none · BERICHT=C:/x/ablage/planning/bericht.md\nPlan steht unter …';

test('parseStatusLine_FirstLineIsStatusLine_ReturnsAllFields', () => {
  // Act
  const parsed = parseStatusLine(FINAL);

  // Assert
  assert.deepEqual(parsed, { etappe: 'planning', status: 'final', rot: 0, gelb: 2, commit: 'none', bericht: 'C:/x/ablage/planning/bericht.md' });
});

test('parseStatusLine_StatusLineNotFirst_ReturnsNull', () => {
  // Act & Assert
  assert.equal(parseStatusLine(`Zwischenstand\n${FINAL}`), null);
  assert.equal(parseStatusLine(''), null);
});

test('parseStatusLine_CommitWithShellSyntax_ReturnsNull', () => {
  // Act
  const parsed = ['COMMIT=$(rm -rf x)', 'COMMIT=--output=x'].map((commit) => parseStatusLine(`[grill] STATUS=final · ROT=0 · GELB=0 · ${commit} · BERICHT=none`));

  // Assert
  assert.deepEqual(parsed, [null, null]);
});

test('parseStatusLine_BerichtWithQuoteOrSemicolon_ReturnsNull', () => {
  // Act
  const parsed = ['C:/x.md"; rm -rf x', 'C:/x.md;whoami', 'C:/x.md`id`'].map((bericht) => parseStatusLine(`[grill] STATUS=final · ROT=0 · GELB=0 · COMMIT=none · BERICHT=${bericht}`));

  // Assert
  assert.deepEqual(parsed, [null, null, null]);
});

test('parseStatusLine_BerichtPathWithSpace_IsKept', () => {
  // Act
  const parsed = parseStatusLine('[umsetzung] STATUS=final · ROT=0 · GELB=0 · COMMIT=abc1234 · BERICHT=C:/Users/Max Muster/bericht.md');

  // Assert
  assert.equal(parsed.commit, 'abc1234');
  assert.equal(parsed.bericht, 'C:/Users/Max Muster/bericht.md');
});

test('turnAction_RejectedStatusLine_CountsAsTurnEndWithoutStatus', () => {
  // Act
  const result = turnAction(0, parseStatusLine('[grill] STATUS=final · ROT=0 · GELB=0 · COMMIT=$(id) · BERICHT=none'));

  // Assert
  assert.deepEqual(result, { aktion: 'schweigen', ohneStatus: 1 });
});

test('turnAction_InProgress_StaysSilentAndResetsCount', () => {
  // Act
  const result = turnAction(2, parseStatusLine('[grill] STATUS=in-progress · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none'));

  // Assert
  assert.deepEqual(result, { aktion: 'schweigen', ohneStatus: 0 });
});

test('turnAction_NeedsUserAndFinal_ReturnTheirAction', () => {
  // Act
  const actions = ['needs-user', 'final'].map((status) => turnAction(0, parseStatusLine(`[grill] STATUS=${status} · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none`)).aktion);

  // Assert
  assert.deepEqual(actions, ['needs-user', 'final']);
});

test('turnAction_TwoTurnEndsWithoutStatus_StaysSilent', () => {
  // Arrange
  const first = turnAction(0, null);

  // Act
  const second = turnAction(first.ohneStatus, null);

  // Assert
  assert.deepEqual([first.aktion, second.aktion], ['schweigen', 'schweigen']);
});

test('turnAction_ThirdTurnEndWithoutStatus_GivesHint', () => {
  // Act
  const third = turnAction(2, null);

  // Assert
  assert.deepEqual(third, { aktion: 'hinweis', ohneStatus: 3 });
});

test('writeTurns_CountPerSession_ReadBackFromWorktree', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  writeTurns(repo, 'local_abc-1', 2);

  // Assert
  assert.equal(readTurns(worktree, 'local_abc-1'), 2);
  assert.equal(readTurns(repo, 'local_neu'), 0);
  assert.throws(() => readTurns(repo, '../x'), SessionChainError);
});

test('turnAction_FourthAndSixthTurnEndWithoutStatus_HintAgainEveryThird', () => {
  assert.equal(turnAction(3, null).aktion, 'schweigen');
  assert.equal(turnAction(5, null).aktion, 'hinweis');
});
