'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { quoteStatus, quoteCounts } = require('../scripts/lib/quotes');
const { finding, setup, writeReviewer, flow, readJsonFile } = require('./lib/review-flow-fixture');

const DOC = '## Akzeptanzkriterien\n- **AC-01** Gegeben „A“, wenn B, dann C.\n- **AC-02** Gegeben D, wenn E, dann F.\n';

test('quoteStatus_LiteralIgnoringMarkupAndQuotes_Belegt', () => {
  assert.equal(quoteStatus('**AC-01** Gegeben "A", wenn B', [DOC]), 'belegt');
  assert.equal(quoteStatus('Gegeben  „A“,\nwenn B', [DOC]), 'belegt');
});

test('quoteStatus_TwoQuotesOrEllipsis_EveryPartMustExist', () => {
  assert.equal(quoteStatus('dann C. ↔ dann F.', [DOC]), 'belegt');
  assert.equal(quoteStatus('Gegeben D … dann F.', [DOC]), 'belegt');
  assert.equal(quoteStatus('dann C. ↔ dann Z.', [DOC]), 'unbelegt');
});

test('quoteStatus_SecondSource_Counts', () => {
  assert.equal(quoteStatus('nur in der Spec', [DOC, 'Text nur in der Spec.']), 'belegt');
});

test('quoteStatus_SourcePrefixAndFixedQuote_Quelle', () => {
  assert.equal(quoteStatus('Quelle: Ticket sagt X', [DOC]), 'quelle');
  assert.equal(quoteStatus('Keine AC-ID in der Spec', [DOC]), 'quelle');
});

test('quoteStatus_InventedOrTooShort_Unbelegt', () => {
  assert.equal(quoteStatus('Gegeben X, wenn Y', [DOC]), 'unbelegt');
  assert.equal(quoteStatus('x', [DOC]), 'unbelegt');
});

test('quoteCounts_PerReviewer_SkipsScriptItems', () => {
  const items = [{ reviewer: 'a', quote: 'belegt' }, { reviewer: 'a', quote: 'unbelegt' }, { reviewer: 'b', quote: 'quelle' }, { reviewer: 'skript', script: true }];
  assert.deepEqual(quoteCounts(items), { a: { belegt: 1, unbelegt: 1, quelle: 0 }, b: { belegt: 0, unbelegt: 0, quelle: 1 } });
});

test('rate_SpecReviewInventedQuote_CappedAtYellowAndCounted', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [
    finding({ location: 'AC-01', quote: 'Gegeben A, wenn B, dann C.', category: 'widerspruch' }),
    finding({ location: 'AC-04', quote: 'Gegeben Q, wenn R, dann S.', category: 'widerspruch' }),
  ]);

  // Act
  const result = flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');

  // Assert
  assert.match(result.stdout, /^STATUS red=1 yellow=1 /);
  const einstufung = readJsonFile(path.join(env.workspace, 'runde-1', 'einstufung.json'));
  assert.deepEqual(einstufung.groups.map((group) => `${group.color}:${group.label}`).sort(), ['red:AC-01', 'yellow:AC-04']);
  assert.deepEqual(einstufung.belege, { consistency: { belegt: 1, unbelegt: 1, quelle: 0 } });
});

test('aggregateFindings_FileLocations_CountsEvidencePerReviewer', () => {
  // Arrange
  const fs = require('node:fs');
  const os = require('node:os');
  const { spawnSync } = require('node:child_process');
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-evidence-'));
  fs.mkdirSync(path.join(repo, 'src'));
  fs.writeFileSync(path.join(repo, 'src', 'a.js'), 'function total(items) { return items.length; }\n');
  const dir = path.join(repo, '.forge', 'r1');
  fs.mkdirSync(dir, { recursive: true });
  const item = (location, quote) => ({ location, quote, severity: 'red', consequence: 'c', rationale: 'r' });
  fs.writeFileSync(path.join(dir, 'design.json'), JSON.stringify({ reviewer: 'design', findings: [
    item('src/a.js:1', 'return items.length;'), item('src/a.js', 'return items.size;'), item('src/fehlt.js:3', 'x = 1'), item('AC-01', 'irgendwas'),
  ] }));

  // Act
  spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'aggregate-findings.js'), '--dir', dir, '--repo', repo, '--expect', 'design'], { encoding: 'utf8' });

  // Assert
  const result = JSON.parse(fs.readFileSync(path.join(dir, 'ergebnis.json'), 'utf8'));
  assert.deepEqual(result.belege, { design: { belegt: 1, unbelegt: 1, quelle: 0, 'datei-fehlt': 1, ungeprueft: 1 } });
});
