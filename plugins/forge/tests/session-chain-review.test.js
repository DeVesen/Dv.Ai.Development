'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { makeRepo } = require('./lib/git-repo');
const { storeFiles } = require('../scripts/lib/session-chain-ablage');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { reviewStand } = require('../scripts/lib/session-chain-review');

const EMPTY_PART = { open: [], green: [], changes: [] };

function scratch(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-rs-')), name);
  fs.writeFileSync(file, text);
  return file;
}

function specIn(repo) {
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  return spec;
}

// Repo mit Spec in docs/forge/x und dem Review im Whiteboarding in der Ablage; `parts`: Bericht-Daten je Dateiname.
function reviewed(result, parts) {
  const repo = makeRepo();
  const spec = specIn(repo);
  const files = [scratch('abschluss.md', `# Abschlussbericht\n**Ergebnis:** ${result}\n`), ...Object.entries(parts).map(([name, value]) => scratch(name, JSON.stringify(value)))];
  storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files, fresh: true });
  return spec;
}

test('reviewStand_ReadyWithoutAnyPoint_AsksNoQuestion', () => {
  // Arrange
  const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': EMPTY_PART });

  // Act
  const stand = reviewStand(spec);

  // Assert
  assert.deepEqual([stand.ergebnis, stand.punkte, stand.frage], ['✅ Bereit zum Planen', 0, false]);
  assert.match(stand.abschluss, /\/ablage\/whiteboarding\/abschluss\.md$/);
});

test('reviewStand_ReadyWithOneGreen_AsksTheQuestion', () => {
  // Arrange
  const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': { ...EMPTY_PART, green: [{ key: 'g', color: 'green', title: 'Grün' }] } });

  // Act
  const stand = reviewStand(spec);

  // Assert
  assert.deepEqual([stand.punkte, stand.frage], [1, true]);
});

test('reviewStand_BlockedWithOneRed_AsksTheQuestion', () => {
  // Arrange
  const spec = reviewed('⛔ Blockiert', { 'bericht-review.json': { ...EMPTY_PART, open: [{ key: 'r', color: 'red', title: 'Rot' }] } });

  // Act
  const stand = reviewStand(spec);

  // Assert
  assert.deepEqual([stand.ergebnis, stand.punkte, stand.frage], ['⛔ Blockiert', 1, true]);
});

test('reviewStand_FollowupChangedTheOnlyYellow_AsksNoQuestion', () => {
  // Arrange
  const spec = reviewed('✅ Bereit zum Planen', {
    'bericht-review.json': { ...EMPTY_PART, open: [{ key: 'a', color: 'yellow', title: 'Gelb' }] },
    'bericht-followup-1.json': { ...EMPTY_PART, changes: [{ key: 'a', ok: true }] },
  });

  // Act
  const stand = reviewStand(spec);

  // Assert
  assert.deepEqual([stand.punkte, stand.frage], [0, false]);
});

test('reviewStand_NoReviewInAblage_Throws', () => {
  // Arrange
  const spec = specIn(makeRepo());

  // Act & Assert
  assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError && error.message.startsWith('Kein Spec-Review in der Ablage: '));
});

// Scheitert das `store --neu` eines späteren Reviews still, liegt der Abschlussbericht des vorigen Reviews noch in der Ablage;
// die Spec wurde danach geändert, ist also jünger.
test('reviewStand_AbschlussOlderThanSpec_ThrowsAsNoReview', () => {
  // Arrange
  const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': EMPTY_PART });
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(spec, later, later);

  // Act & Assert
  assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError
    && error.message.startsWith('Kein Spec-Review in der Ablage: ') && error.message.endsWith('(Abschlussbericht älter als die Spec)'));
});

test('reviewStand_SpecMissing_ThrowsSessionChainError', () => {
  // Arrange
  const spec = path.join(makeRepo(), 'docs/forge/x/fehlt.md');

  // Act & Assert
  assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError && error.message.startsWith('Spec fehlt: '));
});
