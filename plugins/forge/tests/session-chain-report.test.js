'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { repoWithPlan } = require('./lib/git-repo');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');
const { etappeReport, readData } = require('../scripts/lib/session-chain-report');

const EMPTY = { entscheidungen: [], dateien: [], anhang: [], luecken: [], acOhneTest: [] };

function scratch(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-sc-')), name);
  fs.writeFileSync(file, text);
  return file;
}

test('etappeReport_AllParts_WritesFullReportDecisionsFilesAndTestCounts', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');

  // Act
  const file = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss, entscheidungen: ['nur CSV'], dateien: [path.join(repo, 'CONTEXT.md')], tests: '12 grün' }, repo);

  // Assert
  const text = fs.readFileSync(file, 'utf8');
  for (const part of ['# Bericht der Etappe planning\n# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung', '# Entscheidungen des Menschen\n- nur CSV', '/CONTEXT.md`', '# Testzahlen\n12 grün']) {
    assert.ok(text.includes(part), part);
  }
  assert.equal(path.dirname(file), ablageDir(repo, 'x', 'planning').replace(/\\/g, '/'));
});

test('etappeReport_WhiteboardingWithoutReport_TakesSlugFromSpecAndSaysSo', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const file = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec }, repo);

  // Assert
  assert.ok(fs.readFileSync(file, 'utf8').includes('Kein Bericht des Skills.'));
  assert.equal(readData(file).data.slug, 'x');
});

test('etappeReport_JsonPath_ReadsSiblingMarkdown', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const markdown = scratch('bericht-followup-1.md', '# Review-Followup\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
  fs.writeFileSync(markdown.replace(/\.md$/, '.json'), '{}');

  // Act
  const file = etappeReport({ ...EMPTY, etappe: 'plan-review', slug: 'x', bericht: markdown.replace(/\.md$/, '.json') }, repo);

  // Assert
  assert.equal(readData(file).data.ergebnis, '✅ Bereit zur Umsetzung');
  assert.ok(fs.readFileSync(file, 'utf8').includes('# Review-Followup'));
});

test('etappeReport_MissingBericht_ThrowsWithPathAndWritesNothing', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const missing = path.join(repo, 'fehlt.md');

  // Act & Assert
  assert.throws(() => etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: missing }, repo),
    (error) => error instanceof SessionChainError && error.message === `Bericht nicht lesbar: ${path.resolve(missing).replace(/\\/g, '/')}`);
  assert.equal(fs.existsSync(ablageDir(repo, 'x', 'planning')), false);
});

test('readData_BrokenJson_ThrowsWithPath', () => {
  // Arrange
  const bericht = scratch('bericht.md', '# Bericht\n');
  fs.writeFileSync(path.join(path.dirname(bericht), 'bericht.json'), '{kaputt');

  // Act & Assert
  assert.throws(() => readData(bericht), (error) => error instanceof SessionChainError && error.message.startsWith('Bericht-Daten kein JSON: '));
});

test('readData_SameData_ReturnsTheSameHash', () => {
  // Arrange
  const first = scratch('bericht.md', '# Bericht\n');
  const second = scratch('bericht.md', '# Bericht\n');
  for (const file of [first, second]) fs.writeFileSync(path.join(path.dirname(file), 'bericht.json'), '{"etappe":"grill"}\n');

  // Act
  const hashes = [first, second].map((file) => readData(file).hash);

  // Assert
  assert.equal(hashes[0], hashes[1]);
  assert.match(hashes[0], /^[0-9a-f]{40}$/);
});
