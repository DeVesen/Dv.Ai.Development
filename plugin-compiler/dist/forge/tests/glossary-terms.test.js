'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseGlossary, glossaryFiles, discardedTerms, termFindings } = require('../scripts/lib/glossary-terms');
const { glossaryFindings, SPEC_CHECKS } = require('../scripts/lib/spec-checks');
const { makeRepo, commitFile } = require('./lib/git-repo');
const { VALID_SPEC } = require('./lib/spec-fixtures');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'spec-terms.js');
const GLOSSARY = [
  '# Glossar — Verkauf', '', 'Alles rund um Aufträge.', '',
  '| Begriff | Bedeutung | Nicht verwenden |', '|---|---|---|',
  '| **Auftrag** | Eine Bestellung eines Kunden, die geliefert wird. | Bestellung, Order |',
  '| **Kunde** | Wer einen Auftrag erteilt. | Klient (alt), `Account`, — |',
  '',
].join('\n');

function specWith(...lines) {
  return VALID_SPEC.replace('- Spalten Name, Ort. · Aussage', lines.join('\n'));
}

function anchored(text) {
  return text.replace('Art: frei', 'Art: verankert');
}

test('parseGlossary_ContextFormat_ReturnsEachDiscardedSynonymWithItsTerm', () => {
  // Act
  const found = parseGlossary(GLOSSARY);

  // Assert
  assert.deepEqual(found, [
    { synonym: 'Bestellung', term: 'Auftrag' }, { synonym: 'Order', term: 'Auftrag' },
    { synonym: 'Klient', term: 'Kunde' }, { synonym: 'Account', term: 'Kunde' },
  ]);
});

test('parseGlossary_TableWithoutNichtVerwendenColumn_IsIgnored', () => {
  assert.deepEqual(parseGlossary('| Begriff | Bedeutung |\n|---|---|\n| **A** | b |\n'), []);
});

test('parseGlossary_ColumnOrderDiffers_StillFindsTheColumnByName', () => {
  const found = parseGlossary('| Nicht verwenden | Begriff |\n|---|---|\n| Zeitraum | **Frist** |\n');
  assert.deepEqual(found, [{ synonym: 'Zeitraum', term: 'Frist' }]);
});

test('discardedTerms_SynonymThatIsCanonicalElsewhere_Dropped', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-gloss-'));
  const file = path.join(dir, 'CONTEXT.md');
  fs.writeFileSync(file, '| Begriff | Bedeutung | Nicht verwenden |\n|---|---|---|\n| **Auftrag** | a | Bestellung |\n| **Bestellung** | b | Auftrag |\n');

  // Act
  const found = discardedTerms([file]);

  // Assert
  assert.deepEqual(found, []);
});

test('termFindings_DiscardedSynonymInAcAndSection_YellowWithSpot', () => {
  // Arrange
  const discarded = parseGlossary(GLOSSARY);
  const text = specWith('- Die Bestellungen erscheinen in der Liste. · Aussage').replace('dann hat die Datei drei Zeilen.', 'dann zeigt der Klient drei Zeilen.');

  // Act
  const found = termFindings(text, discarded);

  // Assert
  assert.deepEqual(found.map((entry) => [entry.location, entry.color, entry.category]), [['Soll-Vorgaben', 'yellow', 'detail'], ['AC-01', 'yellow', 'detail']]);
  assert.ok(found.some((entry) => entry.consequence === 'Die Spec nennt „Bestellung“; das Glossar verwirft den Begriff zugunsten „Auftrag“.'));
});

test('termFindings_SynonymInWEntryOrCodeSpan_NotReported', () => {
  // Arrange
  const text = VALID_SPEC.replace('- **W · Format** · Aussage — CSV.', '- **W · Format** · Aussage — Statt Bestellung heißt es Auftrag.')
    .replace('- Spalten Name, Ort. · Aussage', '- Spalte `Bestellung` bleibt technisch. · Aussage');

  // Act
  const found = termFindings(text, parseGlossary(GLOSSARY));

  // Assert
  assert.deepEqual(found, []);
});

test('termFindings_PartOfAnotherWord_NotReported', () => {
  assert.deepEqual(termFindings(specWith('- Die Orderliste ist leer. · Aussage', '- Bestellungsnummer fehlt nie. · Aussage'), parseGlossary(GLOSSARY)), []);
});

test('termFindings_Declension_Reported', () => {
  const found = termFindings(specWith('- Alle Klienten sehen das. · Aussage'), parseGlossary(GLOSSARY));
  assert.equal(found.length, 1);
});

test('termFindings_SameSynonymTwiceAtOneSpot_ReportedOnce', () => {
  const found = termFindings(specWith('- **Liste:** Die Bestellung steht oben.', '  Die Bestellung steht auch unten. · Aussage'), parseGlossary(GLOSSARY));
  assert.deepEqual(found.map((entry) => entry.location), ['Liste']);
});

function repoWithGlossary() {
  const repo = makeRepo();
  commitFile(repo, 'CONTEXT.md', GLOSSARY, 'docs: glossar');
  return repo;
}

test('glossaryFindings_VerankertSpecWithRepoGlossary_FindsSynonym', () => {
  // Arrange
  const repo = repoWithGlossary();
  const text = anchored(specWith('- Die Bestellung erscheint. · Aussage'));

  // Act
  const found = glossaryFindings(text, { repo });

  // Assert
  assert.equal(found.length, 1);
  assert.match(found[0].rationale, /CONTEXT\.md/);
});

test('glossaryFindings_ArtFreiOrNoRepoOrNoGlossary_NoFindings', () => {
  // Arrange
  const repo = repoWithGlossary();
  const free = specWith('- Die Bestellung erscheint. · Aussage');

  // Assert
  assert.deepEqual(glossaryFindings(free, { repo }), []);
  assert.deepEqual(glossaryFindings(anchored(free), { repo: null }), []);
  assert.deepEqual(glossaryFindings(anchored(free), { repo: makeRepo() }), []);
});

test('glossaryFindings_SpecWithoutArtLine_CountsAsVerankert', () => {
  const repo = repoWithGlossary();
  const text = specWith('- Die Bestellung erscheint. · Aussage').replace('Art: frei\n', '');
  assert.equal(glossaryFindings(text, { repo }).length, 1);
});

test('SPEC_CHECKS_Order_FormatFirstThenTerms', () => {
  assert.deepEqual(SPEC_CHECKS.map((check) => check.name), ['spec-format', 'spec-terms']);
});

test('glossaryFiles_DirectoryOrFile_ListsMarkdownFiles', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-gloss-'));
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'a.md'), 'x');
  fs.writeFileSync(path.join(dir, 'b.txt'), 'x');
  assert.deepEqual(glossaryFiles(dir).map((file) => path.basename(file)), ['a.md']);
  assert.deepEqual(glossaryFiles(path.join(dir, 'sub', 'a.md')).length, 1);
  assert.deepEqual(glossaryFiles(path.join(dir, 'fehlt')), []);
});

test('cli_SpecAndGlossary_PrintsHeadAndFindingLines', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-gloss-'));
  const spec = path.join(dir, 'spec.md');
  const glossary = path.join(dir, 'CONTEXT.md');
  fs.writeFileSync(spec, specWith('- Die Bestellung erscheint. · Aussage'));
  fs.writeFileSync(glossary, GLOSSARY);

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, spec, glossary], { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERME hinweise=1 glossare=1\nGELB Soll-Vorgaben: Die Spec nennt „Bestellung“; das Glossar verwirft den Begriff zugunsten „Auftrag“.\n');
  assert.equal(spawnSync(process.execPath, [SCRIPT, spec], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, path.join(dir, 'fehlt.md'), glossary], { encoding: 'utf8' }).status, 2);
});

test('writeScriptChecks_SpecReviewWithGlossary_StoresTermFindingBesideFormatFindings', () => {
  // Arrange
  const { writeScriptChecks } = require('../scripts/lib/script-checks');
  const { CONTEXT_FILE } = require('../scripts/workspace');
  const repo = repoWithGlossary();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-gloss-ws-'));
  const doc = path.join(repo, 'spec.md');
  fs.writeFileSync(doc, anchored(specWith('- Die Bestellung erscheint. · Aussage')));
  fs.writeFileSync(path.join(workspace, CONTEXT_FILE), JSON.stringify({ repo }));

  // Act
  writeScriptChecks({ review: 'spec-review', workspace, doc, round: 'runde-1' });

  // Assert
  const stored = JSON.parse(fs.readFileSync(path.join(workspace, 'runde-1', 'skript-pruefung.json'), 'utf8'));
  assert.deepEqual(stored.findings.filter((entry) => entry.check === 'spec-terms').map((entry) => [entry.location, entry.color]), [['Soll-Vorgaben', 'yellow']]);
});
