'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SPEC, finding, setup, writeJsonFile, writeReviewer, flow, rate, readJsonFile } = require('./lib/review-flow-fixture');

const SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', '1. D festlegen.', '2. E streichen.', '**Bevorzugt: 1** — passt zum Bestand.', '',
  '### 🟡 AC-07', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');
const EVIDENCE_SCOUT = '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. Vorschlag A\n   Beleg: src/export.js\n2. Vorschlag B\n   Beleg: keiner\n**Bevorzugt: 1** — sicher\n';

test('rate_TwoHintsNoRedNoQuestion_ScoutForHintsWithoutRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=2 green=0 fragen=0 failed=-\nWEITER scout=hinweise nacharbeit=nein\n');
});

test('rate_RedFinding_ScoutForRedAndYellowThenRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout.split('\n')[1], 'WEITER scout=rot-und-gelb nacharbeit=ja');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-1', 'scout-eingabe.md'), 'utf8'), /### 🔴 AC-04[\s\S]*### 🟡 AC-07/);
});

test('rate_UnknownCategory_ReviewerFailsWithReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ category: 'ac-fehlt-im-plan' })]);

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=0 green=0 fragen=0 failed=clarity\nFEHLT clarity — Ergebnis ungültig: Kategorie unbekannt: ac-fehlt-im-plan (AC-01)\n');
});

test('rate_MissingResultFile_ReviewerFails', () => {
  // Arrange
  const env = setup();

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.match(result.stdout, /^FEHLT clarity — Ergebnis ungültig: Ergebnisdatei fehlt$/m);
});

test('rate_FindingAtBasisHeader_NeitherInReportNorInRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'Basis', quote: 'Basis: abc1234', category: 'widerspruch' })]);

  // Act
  rate(env, 'consistency');

  // Assert
  const aggregate = fs.readFileSync(path.join(env.workspace, 'runde-1', 'aggregate.md'), 'utf8');
  assert.equal(aggregate, 'Keine Findings.\n\n=== REWORK ===\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'einstufung.json')).dropped, [{ reviewer: 'consistency', location: 'Basis', reason: 'Kopfzeile' }]);
});

test('rate_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle', () => {
  // Arrange
  const env = setup(['# Export neu', '', 'Status: bestätigt am 2026-09-28', 'Art: verankert', '', '## Verhalten', 'Der Export läuft.', ''].join('\n'));
  writeReviewer(env, 'completeness', [finding({ location: 'Export neu', quote: 'Keine AC-ID in der Spec', category: 'fehlendes-verhalten' })]);

  // Act
  const result = rate(env, 'completeness');

  // Assert
  assert.equal(result.stdout, 'STATUS red=1 yellow=0 green=0 fragen=0 failed=-\nWEITER scout=rot-und-gelb nacharbeit=ja\n');
  const einstufung = readJsonFile(path.join(env.workspace, 'runde-1', 'einstufung.json'));
  assert.deepEqual(einstufung.groups.map((group) => `${group.color}:${group.label}`), ['red:Export neu']);
  assert.deepEqual(einstufung.dropped, []);
});

test('rate_RedAtPlaceWithOpenQuestion_DroppedAndQuestionCounted', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout, 'STATUS red=0 yellow=0 green=0 fragen=1 failed=-\nWEITER scout=keiner nacharbeit=ja\n');
});

test('rate_ScriptFindingAtPlaceWithOpenQuestion_StaysRed', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'consistency', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-04', quote: 'x', consequence: 'doppelte ID', rationale: 'Skript' }] });

  // Act
  const result = rate(env, 'consistency');

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=1 yellow=0 green=0 fragen=1 failed=-');
});

test('rate_AdvisoryReviewer_ContradictionIsYellow', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'profiles', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = rate(env, 'profiles', ['--beratend', 'profiles']);

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=0 yellow=1 green=0 fragen=0 failed=-');
});

test('rate_SameResultsTwice_SameFilesAndOutput', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'Basis' }), finding({ location: 'AC-07', category: 'formulierung' })]);
  const first = rate(env, 'clarity').stdout;
  const firstFile = fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8');

  // Act
  const second = rate(env, 'clarity').stdout;

  // Assert
  assert.equal(second, first);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'runde-1', 'einstufung.json'), 'utf8'), firstFile);
});

test('reworkInput_RedAndYellowPlace_OnlyRedWithScoutProposals', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' }), finding({ location: 'AC-01', category: 'formulierung' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT);

  // Act
  const result = flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=1 fragen=0\nEINTRAG R1\n');
  const input = fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8');
  assert.match(input, /### 🔴 AC-04 \(consistency\)\n- \[consistency · widerspruch\][^\n]*\nScout-Vorschläge:\n1\. D festlegen\.\n2\. E streichen\.\n\*\*Bevorzugt: 1\*\*/);
  assert.doesNotMatch(input, /AC-07|AC-01/);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'vorher.md'), 'utf8'), SPEC);
});

test('reworkInput_ProposalsWithEvidenceLines_EvidenceReachesRework', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), EVIDENCE_SCOUT);

  // Act
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  const input = fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8');
  assert.ok(input.includes('Scout-Vorschläge:\n1. Vorschlag A\n   Beleg: src/export.js\n2. Vorschlag B\n   Beleg: keiner\n**Bevorzugt: 1**'));
});

test('reworkInput_TwoPreferredLines_NoPreferredLine', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n**Bevorzugt: 1** — x\n**Bevorzugt: 2** — y\n');

  // Act
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  const input = fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8');
  assert.match(input, /Scout-Vorschläge:\n1\. a\n2\. b\n/);
  assert.doesNotMatch(input, /\*\*Bevorzugt:/);
});

test('reworkInput_PreferredNumberBeyondProposals_NoPreferredLine', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n**Bevorzugt: 3** — x\n');

  // Act
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  const input = fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8');
  assert.match(input, /Scout-Vorschläge:\n1\. a\n2\. b\n/);
  assert.doesNotMatch(input, /\*\*Bevorzugt:/);
});

test('reworkInput_OpenQuestionWithoutRed_ListsQuestionOnly', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R2 · AC-04** — frage an den menschen — Gilt F?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  rate(env, 'clarity');

  // Act
  const result = flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=0 fragen=1\nEINTRAG R3\n');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'), 'utf8'), /Keine 🔴-Stellen\.\n\n## Offene Fragen\n- R2 · AC-04 — Gilt F\?/);
});

test('rate_PlanReviewWithQuestionEntryOfEarlierRun_FindingStaysAndNoQuestion', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Legt die Spec F fest?\n- **W · Deckel**'));
  writeReviewer(env, 'risks', [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Act
  const result = flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'risks');

  // Assert
  assert.equal(result.stdout.split('\n')[0], 'STATUS red=1 yellow=0 green=0 fragen=0 failed=-');
});

test('reworkInput_PlanReviewWithQuestionEntryOfEarlierRun_ListsNoQuestion', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — Legt die Spec F fest?\n- **W · Deckel**'));
  writeReviewer(env, 'risks', []);
  flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'risks');

  // Act
  const result = flow('rework-input', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'NACHARBEIT stellen=0 fragen=0\nEINTRAG R2\n');
});

test('scoutCheck_OneToThreeProposalsOnePreferred_Ok', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT);

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ok\n');
});

test('scoutCheck_ProposalsWithEvidenceLines_Ok', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), EVIDENCE_SCOUT);

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ok\n');
});

test('scoutCheck_FourProposals_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n3. c\n4. d\n**Bevorzugt: 1** — x\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: 4 Vorschläge statt 1 bis 3\n');
});

test('scoutCheck_TwoPreferredLines_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n**Bevorzugt: 1** — x\n**Bevorzugt: 2** — y\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: nicht genau ein bevorzugter Vorschlag\n');
});

test('scoutCheck_DeviatingPreferredLineBesideValidOne_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n**Bevorzugt: 1** — x\n**Bevorzugt: 2 und 1** — y\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: nicht genau ein bevorzugter Vorschlag\n');
});

test('scoutCheck_NoPreferredLine_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: nicht genau ein bevorzugter Vorschlag\n');
});

test('scoutCheck_PreferredNumberBeyondProposals_Invalid', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. a\n2. b\n**Bevorzugt: 3** — x\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ungültig: 🔴 AC-04: kein gültiger bevorzugter Vorschlag\n');
});

test('scoutCheck_HintOnlyScope_RedGroupNotExpected', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-01** — frage an den menschen — Gilt C?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', [finding({ location: 'AC-07' })]);
  rate(env, 'clarity');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-07\n1. H schärfen.\n**Bevorzugt: 1** — eindeutig.\n');

  // Act
  const result = flow('scout-check', '--dir', path.join(env.workspace, 'runde-1'));

  // Assert
  assert.equal(result.stdout, 'SCOUT ok\n');
});

test('snapshot_SpecWithoutDecisions_EntryStartsAtOne', () => {
  // Arrange
  const env = setup(SPEC.replace(/## Entscheidungen[\s\S]*$/, ''));

  // Act
  const result = flow('snapshot', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'EINTRAG R1\n');
});

test('attempt_Cli_PrintsNextStep', () => {
  // Arrange
  const env = setup();

  // Act
  const result = flow('attempt', '--dir', env.workspace, '--instanz', 'clarity');

  // Assert
  assert.equal(result.stdout, 'NACHFORDERN\n');
});

test('cli_UnknownStepOrReview_ExitsWithTwo', () => {
  // Arrange
  const env = setup();

  // Act
  const results = [flow('rounds'), flow('rate', '--review', 'implementation-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'a')];

  // Assert
  assert.deepEqual(results.map((result) => result.status), [2, 2]);
});

test('cli_NameWithPathParts_ExitsWithTwo', () => {
  // Arrange
  const env = setup();

  // Act
  const results = [rate(env, '../clarity'), rate(env, 'clarity', ['--beratend', 'a/b']), flow('attempt', '--dir', env.workspace, '--instanz', '..\\x')];

  // Assert
  assert.deepEqual(results.map((result) => result.status), [2, 2, 2]);
});

test('attempt_InstanceNameWithUmlaut_Accepted', () => {
  // Arrange
  const env = setup();

  // Act
  const result = flow('attempt', '--dir', env.workspace, '--instanz', 'nachprüfer');

  // Assert
  assert.equal(result.stdout, 'NACHFORDERN\n');
});

test('rate_ScriptCheckFileNoJson_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), 'kein json');

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: kein gültiges JSON: /);
});

test('rate_ScriptFindingWithoutLocation_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ quote: 'x', consequence: 'y', rationale: 'z' }] });

  // Act
  const result = rate(env, 'clarity');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: skript-pruefung\.json verletzt das Format/);
});

const PLAIN_SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Eingabe bei leerem Feld', 'Beschreibung: Offen ist, was bei leerer Eingabe gilt.', '1. D festlegen.', '2. E streichen.', '**Bevorzugt: 1** — passt zum Bestand.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');

function scoutCheckSpec(scoutText, review = 'spec-review') {
  const env = setup();
  writeReviewer(env, 'consistency', [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07' })]);
  rate(env, 'consistency');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), scoutText);
  const args = review ? ['--review', review] : [];
  return flow('scout-check', ...args, '--dir', path.join(env.workspace, 'runde-1')).stdout;
}

test('scoutCheck_SpecReviewWithTitleAndDescription_Ok', () => {
  assert.equal(scoutCheckSpec(PLAIN_SCOUT), 'SCOUT ok\n');
});

test('scoutCheck_SpecReviewWithoutTitle_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Titel: Eingabe bei leerem Feld\n', '');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Titel fehlt\n');
});

test('scoutCheck_SpecReviewWithoutDescription_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Beschreibung: Offen ist, was bei leerer Eingabe gilt.\n', '');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung fehlt\n');
});

test('scoutCheck_SpecReviewTitleWithOneOrSevenWords_Invalid', () => {
  assert.equal(scoutCheckSpec(PLAIN_SCOUT.replace('Eingabe bei leerem Feld', 'Eingabe')), 'SCOUT ungültig: 🔴 AC-04: Titel hat 1 Wörter statt 2 bis 6\n');
  assert.equal(scoutCheckSpec(PLAIN_SCOUT.replace('Eingabe bei leerem Feld', 'a b c d e f g')), 'SCOUT ungültig: 🔴 AC-04: Titel hat 7 Wörter statt 2 bis 6\n');
});

test('scoutCheck_SpecReviewShorthandInDescription_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Offen ist, was bei leerer Eingabe gilt.', 'Siehe AC-07 für den Fall.');
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung: Kürzel AC-07\n');
});

test('scoutCheck_SpecReviewDescriptionOverFourHundred_Invalid', () => {
  const text = PLAIN_SCOUT.replace('Offen ist, was bei leerer Eingabe gilt.', 'x'.repeat(401));
  assert.equal(scoutCheckSpec(text), 'SCOUT ungültig: 🔴 AC-04: Beschreibung: länger als 400 Zeichen (401)\n');
});

test('scoutCheck_PlanReviewOrNoReviewWithoutTexts_StaysOk', () => {
  const plain = PLAIN_SCOUT.replace(/^(Titel|Beschreibung): .*\n/gm, '');
  assert.equal(scoutCheckSpec(plain, 'plan-review'), 'SCOUT ok\n');
  assert.equal(scoutCheckSpec(plain, null), 'SCOUT ok\n');
});
