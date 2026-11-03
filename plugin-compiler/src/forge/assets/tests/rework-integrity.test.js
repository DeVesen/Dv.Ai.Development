'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { integrityProblem, specProblem } = require('../scripts/lib/rework-integrity');
const { writeContext } = require('../scripts/workspace');
const { SPEC, finding, tempDir, setup, writeJsonFile, flow, editDoc, runUntilRework } = require('./lib/review-flow-fixture');
const { PLAN_SPEC, ALL_ACS, planTask, planText } = require('./lib/plan-fixtures');

const ABORT = '## Offen, bewusst nicht weiterverfolgt (Abbruch)\n- Export als PDF bleibt draußen.\n';
const SPEC_WITH_ABORT = `${SPEC}\n${ABORT}`;

function problem(from, to, review = 'spec-review') {
  return integrityProblem(from, to, review);
}

test('integrityProblem_OnlyTextChangedAndNewREntry_NoProblem', () => {
  // Arrange
  const after = SPEC.replace('dann F.', 'dann G.').replace('- **W · Deckel**', '- **R1 · AC-04** — geändert — Wortlaut.\n- **W · Deckel**');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_WEntryChanged_NamesShortTitle', () => {
  // Arrange
  const after = SPEC.replace('Zwei Runden, keine dritte.', 'Drei Runden.');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, 'W-Eintrag geändert: Deckel');
});

test('integrityProblem_WEntryRemoved_NamesShortTitle', () => {
  // Arrange
  const after = SPEC.replace('- **W · Deckel** · Aussage — Zwei Runden, keine dritte.\n', '');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, 'W-Eintrag geändert: Deckel');
});

test('integrityProblem_WEntriesReordered_NoProblem', () => {
  // Arrange
  const before = SPEC.replace('- **W · Deckel**', '- **W · Erstens** · Aussage — a.\n- **W · Deckel**');
  const after = before.replace('- **W · Erstens** · Aussage — a.\n- **W · Deckel** · Aussage — Zwei Runden, keine dritte.', '- **W · Deckel** · Aussage — Zwei Runden, keine dritte.\n- **W · Erstens** · Aussage — a.');

  // Act
  const result = problem(before, after);

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_AbortSectionChanged_Problem', () => {
  // Arrange
  const after = SPEC_WITH_ABORT.replace('bleibt draußen', 'kommt doch');

  // Act
  const result = problem(SPEC_WITH_ABORT, after);

  // Assert
  assert.equal(result, 'Abbruch-Abschnitt geändert');
});

test('integrityProblem_AbortSectionRemoved_Problem', () => {
  // Act
  const result = problem(SPEC_WITH_ABORT, SPEC);

  // Assert
  assert.equal(result, 'Abbruch-Abschnitt geändert');
});

test('integrityProblem_AbortSectionNewInRework_NoProblem', () => {
  // Act
  const result = problem(SPEC, SPEC_WITH_ABORT);

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_AcRenumbered_Problem', () => {
  // Arrange
  const after = SPEC.replace('**AC-04**', '**AC-02**').replace('**AC-07**', '**AC-03**');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, 'AC verschwunden: AC-04');
});

test('integrityProblem_AcOrderSwapped_Problem', () => {
  // Arrange
  const after = SPEC.replace('- **AC-04** Gegeben D, wenn E, dann F.\n- **AC-07** Gegeben G, wenn H, dann I.', '- **AC-07** Gegeben G, wenn H, dann I.\n- **AC-04** Gegeben D, wenn E, dann F.');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, 'AC-Nummerierung geändert');
});

test('integrityProblem_AcAppendedAtEnd_NoProblem', () => {
  // Arrange
  const after = SPEC.replace('dann I.\n', 'dann I.\n- **AC-08** Gegeben J, wenn K, dann L.\n');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_AcStruck_KeptAsStruckLine_NoProblem', () => {
  // Arrange
  const after = SPEC.replace('- **AC-04** Gegeben D, wenn E, dann F.', '- **AC-04** (entfällt, siehe Entscheidungen)');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_PlanTaskDropped_Problem', () => {
  // Arrange
  const before = planText(planTask('1', 'AC-01'), planTask('2', 'AC-03'));
  const after = planText(planTask('1', 'AC-01'));

  // Act
  const result = problem(before, after, 'plan-review');

  // Assert
  assert.equal(result, 'Task verschwunden: Task 2');
});

test('integrityProblem_PlanTaskSplit_NoProblem', () => {
  // Arrange
  const before = planText(planTask('1', 'AC-01'), planTask('2', 'AC-03'));
  const after = planText(planTask('1', 'AC-01'), planTask('2', 'AC-03'), planTask('3', 'AC-05'));

  // Act
  const result = problem(before, after, 'plan-review');

  // Assert
  assert.equal(result, null);
});

test('integrityProblem_OldREntryChanged_Problem', () => {
  // Arrange
  const before = SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — geändert — Wortlaut.\n- **W · Deckel**');
  const after = before.replace('Wortlaut.', 'Alles neu.');

  // Act
  const result = problem(before, after);

  // Assert
  assert.equal(result, 'Eintrag geändert: AC-04');
});

test('integrityProblem_OldEAndFEntryRemoved_Problem', () => {
  // Arrange
  const before = planText(planTask('1', 'AC-01')).replace('- Keine Fragen an den Menschen.', '- **E · Spalte** · Planer — Wahl.\n- **F · Task 1** — geändert — Vorschlag 1: ok.');
  const withoutE = before.replace('- **E · Spalte** · Planer — Wahl.\n', '');
  const withoutF = before.replace('- **F · Task 1** — geändert — Vorschlag 1: ok.\n', '');

  // Act
  const results = [problem(before, withoutE, 'plan-review'), problem(before, withoutF, 'plan-review')];

  // Assert
  assert.deepEqual(results, ['Eintrag geändert: Spalte', 'Eintrag geändert: Task 1']);
});

test('integrityProblem_NewREntryOutsideDecisions_Problem', () => {
  // Arrange
  const after = SPEC.replace('- **AC-01**', '- **R1 · AC-01** — geändert — Wortlaut.\n- **AC-01**');

  // Act
  const result = problem(SPEC, after);

  // Assert
  assert.match(result, /^Eintrag außerhalb von Entscheidungen: /);
});

test('integrityProblem_HeadLineChanged_Problem', () => {
  // Arrange
  const cases = [SPEC.replace('Basis: abc1234', 'Basis: fff9999'), SPEC.replace('Status: bestätigt am 2026-01-01', 'Status: Entwurf')];

  // Act
  const results = cases.map((after) => problem(SPEC, after));

  // Assert
  assert.deepEqual(results, ['Kopf geändert: Basis', 'Kopf geändert: Status']);
});

test('integrityProblem_PlanBasisChanged_Problem', () => {
  // Arrange
  const before = planText(planTask('1', 'AC-01'));

  // Act
  const result = problem(before, before.replace('**Basis:** abc', '**Basis:** def'), 'plan-review');

  // Assert
  assert.equal(result, 'Kopf geändert: Basis');
});

test('specProblem_HashesDifferOrMissing_OnlyDifferenceIsProblem', () => {
  // Act
  const results = [specProblem('aa', 'aa'), specProblem(null, 'bb'), specProblem('aa', 'bb'), specProblem('aa', null)];

  // Assert
  assert.deepEqual(results, [null, null, 'Spec geändert', 'Spec geändert']);
});

function check(env, review = 'spec-review') {
  return flow('rework-check', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--quelle', 'runde-1').stdout;
}

function writeResult(env, location = 'AC-04') {
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location, status: 'changed', change: 'Wortlaut geschärft.' }] });
}

function reworkedSpec(edit) {
  const env = setup();
  runUntilRework(env, [finding({ location: 'AC-04', category: 'widerspruch' })]);
  writeResult(env);
  edit(env);
  return check(env);
}

test('reworkCheck_ValidRework_Ok', () => {
  // Act
  const output = reworkedSpec((env) => editDoc(env, 'dann F.', 'dann G.'));

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_WEntryChanged_Invalid', () => {
  // Act
  const output = reworkedSpec((env) => editDoc(env, 'Zwei Runden, keine dritte.', 'Drei Runden.'));

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: W-Eintrag geändert: Deckel\n');
});

test('reworkCheck_AcRenumbered_Invalid', () => {
  // Act
  const output = reworkedSpec((env) => editDoc(env, '**AC-07**', '**AC-05**'));

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: AC verschwunden: AC-07\n');
});

test('reworkCheck_HeadChanged_Invalid', () => {
  // Act
  const output = reworkedSpec((env) => editDoc(env, 'Art: verankert', 'Art: frei'));

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Kopf geändert: Art\n');
});

test('reworkCheck_AbortSectionChanged_Invalid', () => {
  // Arrange
  const env = setup(SPEC_WITH_ABORT);
  runUntilRework(env, [finding({ location: 'AC-04', category: 'widerspruch' })]);
  writeResult(env);
  editDoc(env, 'bleibt draußen', 'kommt doch');

  // Act
  const output = check(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Abbruch-Abschnitt geändert\n');
});

test('reworkCheck_WithoutVorherFile_SkipsIntegrity', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [finding({ location: 'AC-04', category: 'widerspruch' })]);
  writeResult(env);
  fs.rmSync(path.join(env.workspace, 'vorher.md'));
  editDoc(env, 'Zwei Runden, keine dritte.', 'Drei Runden.');

  // Act
  const output = check(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

// Plan-Review: Spec neben dem Plan, Kontext wie von prepare.js.
function planRework() {
  const root = tempDir('dv-forge-plan-');
  const env = { root, doc: path.join(root, 'plan.md'), workspace: path.join(root, '.forge', 'ws'), spec: path.join(root, 'spec.md') };
  fs.writeFileSync(env.doc, planText(planTask('1', ALL_ACS)));
  fs.writeFileSync(env.spec, PLAN_SPEC);
  fs.mkdirSync(env.workspace, { recursive: true });
  writeContext(env.workspace, { spec: env.spec, repo: root });
  runUntilRework(env, [finding({ location: 'Task 1', quote: 'Text.', category: 'detail' })], 'plan-review');
  writeResult(env, 'Task 1');
  return env;
}

test('snapshot_PlanReviewWithSpecInContext_WritesSpecHash', () => {
  // Act
  const env = planRework();

  // Assert
  assert.match(fs.readFileSync(path.join(env.workspace, 'vorher-spec.sha256'), 'utf8'), /^[0-9a-f]{64}\n$/);
});

test('snapshot_SpecReview_WritesNoSpecHash', () => {
  // Arrange
  const env = setup();

  // Act
  runUntilRework(env, [finding({ location: 'AC-04', category: 'widerspruch' })]);

  // Assert
  assert.equal(fs.existsSync(path.join(env.workspace, 'vorher-spec.sha256')), false);
});

test('reworkCheck_PlanReviewSpecUnchanged_Ok', () => {
  // Arrange
  const env = planRework();
  fs.writeFileSync(env.doc, fs.readFileSync(env.doc, 'utf8').replace('Text.', 'Neuer Text.'));

  // Act
  const output = check(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_PlanReviewSpecChanged_Invalid', () => {
  // Arrange
  const env = planRework();
  fs.appendFileSync(env.spec, '\nNachtrag.\n');

  // Act
  const output = check(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Spec geändert\n');
});

test('reworkCheck_PlanReviewTaskDropped_Invalid', () => {
  // Arrange
  const env = planRework();
  fs.writeFileSync(env.doc, planText());

  // Act
  const output = check(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Task verschwunden: Task 1\n');
});
