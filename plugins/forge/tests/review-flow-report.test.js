'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { flowStatus } = require('../scripts/lib/flow-report');
const { nextAttempt } = require('../scripts/lib/attempts');
const { SPEC, finding, setup, writeJsonFile, writeReviewer, flow, editDoc, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

const RED = (location) => finding({ location, quote: 'x', category: 'widerspruch' });
const VERDICT = (location, verdict) => ({ location, verdict, rationale: verdict === 'erledigt' ? 'ok' : 'F fehlt noch' });

function status(overrides) {
  return flowStatus({ failed: [], openQuestions: 0, openRed: 0, reworked: true, ...overrides });
}

function runReport(env, review = 'spec-review') {
  return flow('report', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', 'docs/x/spec.md');
}

function report(env, review = 'spec-review') {
  return runReport(env, review).stdout;
}

// Ganzer Lauf bis nach der Nachprüfung; `verification` ist das Ergebnis des Nachprüfers.
function runWithVerification(env, findings, results, verification) {
  runUntilRework(env, findings);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions: [] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  if (verification) writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
}

test('flowStatus_FailedAndQuestion_UnvollstaendigFirst', () => {
  // Act
  const text = status({ failed: ['nachprüfer'], openQuestions: 1, openRed: 2 });

  // Assert
  assert.equal(text, 'unvollständig, ausgefallen: nachprüfer');
});

test('flowStatus_QuestionAndNotDone_FragenOffen', () => {
  // Act
  const text = status({ openQuestions: 1, openRed: 1 });

  // Assert
  assert.equal(text, 'Fragen offen');
});

test('flowStatus_ThreeOpenRed_NichtBereitWithSum', () => {
  // Act
  const text = status({ openRed: 3 });

  // Assert
  assert.equal(text, 'nicht bereit, 3 × 🔴 offen');
});

test('flowStatus_NothingOpen_CleanAfterRoundOneOrVerification', () => {
  // Act
  const texts = [status({ reworked: false }), status({})];

  // Assert
  assert.deepEqual(texts, ['sauber nach Runde 1', 'sauber nach Nachprüfung']);
});

test('report_TwoHintsWithoutRework_CleanAfterRoundOneAndClosingForFollowup', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(path.join(env.workspace, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-01\n1. a\n**Bevorzugt: 1** — x\n\n### 🟡 AC-07\n1. b\n**Bevorzugt: 1** — y\n');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n=== BERICHT ===\n## Spec-Review: docs\/x\/spec\.md\n\n\*\*Status:\*\* sauber nach Runde 1\n\*\*Runden:\*\* 1 · \*\*Nacharbeiten:\*\* 0/);
  assert.match(fs.readFileSync(path.join(env.workspace, 'abschluss', 'scout.md'), 'utf8'), /### 🟡 AC-01[\s\S]*### 🟡 AC-07/);
});

test('report_NoRedInRoundOneWithoutRework_CleanAfterRoundOne', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n/);
});

test('report_RedInRoundOneWithoutRoundTwo_NichtBereitWithRedOfRoundOne', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'consistency', [RED('AC-04')]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
});

test('report_ReworkWithoutRoundTwo_ExitsWithOneAndReason', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed' }], questions: [] });

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: Nachprüfung fehlt: runde-2\/einstufung\.json/);
});

test('report_ReworkFailedWithInvalidEntries_ListsValidEvidenceWithoutCrash', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  // Verwertbar ist nur der letzte Eintrag (Leerraum um die Werte); davor: kein Objekt, ohne location, location kein Text, nicht changed.
  const results = [
    null,
    { status: 'changed', evidence: 'src/export.js' },
    { location: 42, status: 'changed', evidence: 'src/export.js' },
    { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung', evidence: 'src/export.js' },
    { location: ' AC-04 ', status: 'changed', evidence: ' src/export.js ' },
  ];
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions: [] });
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nacharbeit'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);
  assert.match(output, /### Neues Verhalten mit Beleg\n- AC-04 — src\/export\.js\n/);
});

test('report_ReworkResultNoJson_ReportsWithoutEvidenceSection', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), '{kaputt');
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nacharbeit'));

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);
  assert.doesNotMatch(result.stdout, /### Neues Verhalten mit Beleg/);
});

test('report_AllDone_CleanAfterVerificationWithVerdicts', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /### Nachprüfung\n\| Stelle \| Urteil \|\n\|---\|---\|\n\| AC-04 \| erledigt \|/);
});

test('report_ReworkWroteNewBehaviourAtTwoPlaces_ListsBothWithEvidence', () => {
  // Arrange
  const env = setup();
  const results = [
    { location: 'AC-04', status: 'changed', evidence: 'src/export.js' },
    { location: 'AC-07', status: 'changed', evidence: 'docs/glossary/terms.md · Export' },
    { location: 'AC-01', status: 'changed' },
  ];
  const verdicts = ['AC-01', 'AC-04', 'AC-07'].map((location) => VERDICT(location, 'erledigt'));
  runWithVerification(env, [RED('AC-01'), RED('AC-04'), RED('AC-07')], results, { verdicts, findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Neues Verhalten mit Beleg\n- AC-04 — src\/export\.js\n- AC-07 — docs\/glossary\/terms\.md · Export\n/);
  assert.doesNotMatch(output, /- AC-01 — /);
});

test('report_ReworkWithoutEvidence_NoEvidenceSection', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed' }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.doesNotMatch(output, /### Neues Verhalten mit Beleg/);
});

test('report_TwoNotDone_NichtBereitTwo', () => {
  // Arrange
  const env = setup();
  const results = [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }];
  runWithVerification(env, [RED('AC-04'), RED('AC-07')], results, { verdicts: [VERDICT('AC-04', 'nicht erledigt'), VERDICT('AC-07', 'nicht erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 2 × 🔴 offen\n/);
  assert.match(output, /\| AC-04 \| nicht erledigt — F fehlt noch \|/);
});

test('report_NotDoneContradictionAndScript_NichtBereitThree', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-01', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  const verification = { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] };
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed' }], questions: [] });
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 3 × 🔴 offen\n/);
  assert.match(output, /### Widersprüche\n- 🔴 Deckel: Folge/);
  assert.match(output, /### Skript-Prüfungen\n- 🔴 AC-01: doppelt/);
});

test('report_QuestionOpenAndPointNotDone_FragenOffenShowsPoint', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed' }], { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [] });
  addEntries(env, '- **R1 · AC-07** — frage an den menschen — Gilt I?');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /\| AC-04 \| nicht erledigt — F fehlt noch \|/);
  assert.match(output, /### Offene Fragen\n- AC-07: Gilt I\?/);
});

test('report_TwoOpenQuestions_ListsBothWithPlaces', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — F?\n- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Offene Fragen\n- AC-04: F\?\n- AC-07: I\?/);
});

test('report_VerifierFailedWithOpenQuestion_Unvollstaendig', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nachprüfer'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE unvollständig, ausgefallen: nachprüfer\n/);
});

test('report_GreenFinding_ListedWithoutScoutAndNotInClosing', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', consequence: 'Satz holpert' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Anmerkungen \(🟢\)\n- 🟢 AC-01: Satz holpert/);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('report_ScoutFailed_NotedWithoutChangingStatus', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'scout'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n/);
  assert.match(output, /### Scout\n- Scout ausgefallen/);
});

test('report_PlanSpecQuestion_FragenOffenWithQuestion', () => {
  // Arrange
  const env = setup('# Plan\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  writeReviewer(env, 'coverage', [finding({ location: 'Task 1', quote: 'Text.', category: 'ac-fehlt-im-plan' })]);
  flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'coverage');
  flow('rework-input', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Spec lässt X offen' }] });
  flow('rework-check', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);
  flow('verify', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env, 'plan-review');

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /### Offene Fragen\n- Task 1: Spec lässt X offen/);
});

test('report_FollowupWithNotDonePoint_NichtBereitOne', () => {
  // Arrange
  const env = setup();
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-07', status: 'changed' }] });
  const source = ['--quelle', 'nacharbeit'];
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [VERDICT('AC-07', 'nicht erledigt')], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);

  // Act
  const output = flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source).stdout;

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n=== BERICHT ===\n## Review-Followup \(spec-review\): docs\/x\/spec\.md/);
});

test('report_FollowupReworkWithEvidence_ListsIt', () => {
  // Arrange
  const env = setup();
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🔴 AC-04 (consistency)\n- [consistency · widerspruch] Zitat: „x“\n\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', evidence: 'src/export.js' }, { location: 'AC-07', status: 'changed' }] });
  const source = ['--quelle', 'nacharbeit'];
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [VERDICT('AC-04', 'erledigt'), VERDICT('AC-07', 'erledigt')], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);

  // Act
  const output = flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source).stdout;

  // Assert
  assert.match(output, /### Neues Verhalten mit Beleg\n- AC-04 — src\/export\.js\n/);
  assert.doesNotMatch(output, /- AC-07 — /);
});
