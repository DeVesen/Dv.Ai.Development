'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, addWorktree } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { ablageDir, storeFiles, followupNumbers, nextFollowupName } = require('../scripts/lib/session-chain-ablage');

function scratchFile(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), name);
  fs.writeFileSync(file, text);
  return file;
}

test('storeFiles_FromWorktree_FilesAreReadableFromTheMainCheckout', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  const report = scratchFile('abschluss.md', '# Abschlussbericht\n');

  // Act
  storeFiles({ dir: worktree, slug: 'x', etappe: 'umsetzung', files: [report] });

  // Assert
  assert.equal(fs.readFileSync(path.join(ablageDir(repo, 'x', 'umsetzung'), 'abschluss.md'), 'utf8'), '# Abschlussbericht\n');
});

test('storeFiles_Fresh_RemovesOlderFilesOfTheEtappe', () => {
  // Arrange
  const repo = makeRepo();
  storeFiles({ dir: repo, slug: 'x', etappe: 'plan-review', files: [scratchFile('bericht-followup-1.json', '{}')] });

  // Act
  storeFiles({ dir: repo, slug: 'x', etappe: 'plan-review', files: [scratchFile('bericht-review.json', '{}')], fresh: true });

  // Assert
  assert.deepEqual(fs.readdirSync(ablageDir(repo, 'x', 'plan-review')), ['bericht-review.json']);
});

test('storeFiles_MissingFile_ThrowsAndStoresNothing', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.throws(() => storeFiles({ dir: repo, slug: 'x', etappe: 'planning', files: [path.join(repo, 'fehlt.md')] }), SessionChainError);
  assert.equal(fs.existsSync(ablageDir(repo, 'x', 'planning')), false);
});

test('ablageDir_UnknownEtappe_Throws', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.throws(() => ablageDir(repo, 'x', 'review'), /Etappe unbekannt, erlaubt: .+; nicht review/);
});

test('nextFollowupName_TwoRoundsStored_ReturnsThirdName', () => {
  // Arrange
  const dir = path.dirname(scratchFile('bericht-followup-1.json', '{}'));
  fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), '{}');

  // Act & Assert
  assert.equal(nextFollowupName(dir), 'bericht-followup-3');
  assert.equal(nextFollowupName(path.join(dir, 'fehlt')), 'bericht-followup-1');
});

test('followupNumbers_RoundsOutOfOrder_ReturnsThemAscending', () => {
  // Arrange
  const dir = path.dirname(scratchFile('bericht-followup-10.json', '{}'));
  fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), '{}');
  fs.writeFileSync(path.join(dir, 'bericht-review.json'), '{}');

  // Act
  const numbers = followupNumbers(dir);

  // Assert
  assert.deepEqual(numbers, [2, 10]);
});
