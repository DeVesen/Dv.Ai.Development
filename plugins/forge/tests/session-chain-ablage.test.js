'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo, addWorktree } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { ablageDir, storeFiles, followupNumbers, nextFollowupName, storeReviewReport } = require('../scripts/lib/session-chain-ablage');

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

test('storeReviewReport_Review_StartsTheAblageAnewAndWritesJsonAndText', () => {
  // Arrange
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), 'ablage');
  storeReviewReport({ target, followup: false, data: { format: 2, status: 'alt' }, text: 'alt' });
  storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'Runde' });

  // Act
  const stored = storeReviewReport({ target, followup: false, data: { format: 2, status: 'neu' }, text: '# Bericht' });

  // Assert
  assert.deepEqual(fs.readdirSync(target).sort(), ['bericht-review.json', 'bericht-review.md']);
  assert.equal(stored.json, path.join(target, 'bericht-review.json').replace(/\\/g, '/'));
  assert.equal(stored.md, path.join(target, 'bericht-review.md').replace(/\\/g, '/'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'bericht-review.json'), 'utf8')).status, 'neu');
  assert.equal(fs.readFileSync(path.join(target, 'bericht-review.md'), 'utf8'), '# Bericht\n');
});

test('storeReviewReport_Followups_AreNumberedBesideTheReview', () => {
  // Arrange
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), 'ablage');
  storeReviewReport({ target, followup: false, data: { format: 2 }, text: 'a' });

  // Act
  const first = storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'b' });
  const second = storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'c' });

  // Assert
  assert.deepEqual(fs.readdirSync(target).filter((name) => name.endsWith('.json')).sort(), ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
  assert.ok(first.md.endsWith('/bericht-followup-1.md'));
  assert.ok(second.md.endsWith('/bericht-followup-2.md'));
});
