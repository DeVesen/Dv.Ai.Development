'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evidenceProblem } = require('../scripts/lib/rework-check');
const { finding, setup, writeJsonFile, flow, readJsonFile, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

function prepareRework(env, review = 'spec-review', findings = [finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]) {
  runUntilRework(env, findings, review);
}

function writeRework(env, value, source = 'runde-1') {
  writeJsonFile(path.join(env.workspace, source, 'rework.json'), value);
}

function checkRework(env, review = 'spec-review', source = 'runde-1') {
  return flow('rework-check', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--quelle', source).stdout;
}

const LATER = 'später';

function bundle(places) {
  return {
    title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['consistency'],
    options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem' }],
    recommendation: 'a', reason: 'Fehler fallen früh auf.', places,
  };
}

test('reworkCheck_EveryRedPlaceOneOutcome_Ok', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'Wortlaut geschärft.' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_RedPlaceWithoutOutcome_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'Wortlaut geschärft.' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: Ausgang fehlt: ac-7\n');
});

test('reworkCheck_UnchangedWithoutReason_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'Wortlaut geschärft.' }, { location: 'AC-07', status: 'unchanged' }] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: reason fehlt (AC-07)\n');
});

function changedWith(evidence) {
  return { location: 'AC-04', status: 'changed', change: 'Wortlaut geschärft.', evidence };
}

test('evidenceProblem_FourBelegForms_NoProblem', () => {
  // Arrange
  const forms = ['src/export.js', 'Spec · AC-02', 'docs/glossary/terms.md · Export', 'docs/keiner.md'];

  // Act
  const problems = forms.map((evidence) => evidenceProblem(changedWith(evidence)));

  // Assert
  assert.deepEqual(problems, forms.map(() => null));
});

test('evidenceProblem_SpecPlaceWithMiddleDot_NoProblem', () => {
  // Arrange
  const forms = ['Spec · W · Beleg und bevorzugter Vorschlag', 'Spec · R1 · AC-02'];

  // Act
  const problems = forms.map((evidence) => evidenceProblem(changedWith(evidence)));

  // Assert
  assert.deepEqual(problems, forms.map(() => null));
});

test('evidenceProblem_BlankText_NotText', () => {
  // Act
  const problem = evidenceProblem(changedWith(' '));

  // Assert
  assert.equal(problem, 'evidence ist kein Text (AC-04)');
});

test('evidenceProblem_KeinerVariants_NoBeleg', () => {
  // Arrange
  const variants = [' Keiner ', 'keiner.'];

  // Act
  const problems = variants.map((evidence) => evidenceProblem(changedWith(evidence)));

  // Assert
  assert.deepEqual(problems, variants.map(() => 'evidence keiner ist kein Beleg (AC-04)'));
});

test('evidenceProblem_OtherShapes_NoBelegForm', () => {
  // Arrange
  const shapes = ['kein Beleg', 'Spec', 'Spec · ', 'src/export.js · Export · Import'];

  // Act
  const problems = shapes.map((evidence) => evidenceProblem(changedWith(evidence)));

  // Assert
  assert.deepEqual(problems, shapes.map(() => 'evidence hat keine Beleg-Form (AC-04)'));
});

test('evidenceProblem_OnHumanQuestion_OnlyOnChanged', () => {
  // Act
  const problem = evidenceProblem({ location: 'AC-04', status: 'human-question', reason: 'neu', evidence: 'src/export.js' });

  // Assert
  assert.equal(problem, 'evidence nur bei changed (AC-04)');
});

test('reworkCheck_ChangedWithEvidence_Ok', () => {
  // Arrange
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  writeRework(env, { results: [changedWith('src/export.js')] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_EvidenceKeiner_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-04', category: 'widerspruch' })]);
  writeRework(env, { results: [changedWith('keiner')] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: evidence keiner ist kein Beleg (AC-04)\n');
});

test('reworkCheck_QuestionsBundled_PausesAndWritesHaltText', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?', '- **R1 · AC-07** — frage an den menschen — Gilt I?');
  writeRework(env, {
    results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }, { location: 'AC-07', status: 'human-question', reason: 'neue Regel' }],
    questions: [bundle(['AC-04', 'AC-07'])],
  });

  // Act
  const output = checkRework(env);

  // Assert
  const shown = [
    '## Spec-Review · Runde 1 · Demo-Spec',
    '**Ergebnis:** 2 × 🔴 · 1 Frage braucht dich',
    '',
    '### Frage 1 von 1 · Leere Eingabe  (betrifft: Eingabe prüfen)',
    '**Warum gefragt** (Blickwinkel: Widerspruchsfreiheit): Es ist offen, was bei leerer Eingabe gilt.',
    '- **a)** Fehler melden. Folge: streng',
    '- **b)** Standardwert nehmen. Folge: bequem',
    '**Empfehlung: a**, Fehler fallen früh auf.',
    '',
    `**Antwort:** \`1a\` · \u201E${LATER}\u201C lässt eine Frage offen.`,
    '**Danach:** Ich trage deine Antworten ein, prüfe die Änderungen nach und zeige dir den Abschlussbericht.',
  ].join('\n');
  assert.equal(output, `NACHARBEIT ok fragen=2 anhalten=ja\n=== FRAGEN ===\n${shown}\n`);
  assert.equal(fs.readFileSync(path.join(env.workspace, 'runde-1', 'fragen.md'), 'utf8'), `${shown}\n`);
});

test('reworkCheck_OneOfThreeQuestionPlacesMissing_BundlingFaulty', () => {
  // Arrange
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04'])] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'BUENDELUNG fehlerhaft: Stelle fehlt in den Fragen: ac-7\n');
});

test('reworkCheck_QuestionWithoutREntry_Invalid', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'human-question', reason: 'neu' }, { location: 'AC-07', status: 'changed', change: 'Wortlaut geschärft.' }], questions: [] });

  // Act
  const output = checkRework(env);

  // Assert
  assert.equal(output, 'NACHARBEIT ungültig: R-Eintrag fehlt: AC-04\n');
});

test('reworkCheck_PlanSpecQuestion_CountsWithoutPause', () => {
  // Arrange
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'spec-question', reason: 'Spec legt X nicht fest' }] });

  // Act
  const output = checkRework(env, 'plan-review');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=1 anhalten=nein\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-1', 'fragen.json')), [{ place: 'Task 1', key: 'task 1', question: 'Spec legt X nicht fest' }]);
});

test('reworkCheck_FollowupSource_ExpectsChosenGroups', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), '=== REWORK ===\n### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: „x“\n');
  writeRework(env, { results: [{ location: 'AC-07', status: 'changed' }] }, 'nacharbeit');

  // Act
  const output = checkRework(env, 'spec-review', 'nacharbeit');

  // Assert
  assert.equal(output, 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

test('reworkCheck_ChangedWithoutChange_Invalid', () => {
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: change: leer (AC-04)\n');
});

test('reworkCheck_ChangeOrUnchangedReasonWithShorthand_Invalid', () => {
  const env = setup();
  prepareRework(env);
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'AC-04 umformuliert.' }, { location: 'AC-07', status: 'unchanged', reason: 'Fehllesung' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: change: Kürzel AC-04 (AC-04)\n');
  writeRework(env, { results: [{ location: 'AC-04', status: 'changed', change: 'Umformuliert.' }, { location: 'AC-07', status: 'unchanged', reason: 'Siehe W · Deckel' }] });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: reason: Kürzel W · (AC-07)\n');
});

test('reworkCheck_OldCasesFormat_AsksForNewRun', () => {
  const env = setup();
  prepareRework(env);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeRework(env, {
    results: [{ location: 'AC-04', status: 'human-question', reason: 'neu' }, { location: 'AC-07', status: 'changed', change: 'Geschärft.' }],
    questions: [{ rule: 'Regel', question: 'Was gilt?', places: ['AC-04'], cases: ['a) x'], recommendation: 'a' }],
  });
  assert.equal(checkRework(env), 'NACHARBEIT ungültig: rework.json im alten Format (cases); Lauf neu starten\n');
});

test('reworkCheck_PlanReviewChangedWithoutChange_StaysOk', () => {
  const env = setup('# Plan\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
  prepareRework(env, 'plan-review', [finding({ location: 'Task 1', quote: 'Text.', category: 'umsetzer-steckt-fest' })]);
  writeRework(env, { results: [{ location: 'Task 1', status: 'changed' }] });
  assert.equal(checkRework(env, 'plan-review'), 'NACHARBEIT ok fragen=0 anhalten=nein\n');
});

function answersSetup() {
  const env = setup();
  prepareRework(env, 'spec-review', [finding({ location: 'AC-01', category: 'widerspruch' }), finding({ location: 'AC-04', category: 'widerspruch' }), finding({ location: 'AC-07', category: 'widerspruch' })]);
  addEntries(env, '- **R1 · AC-01** — frage an den menschen — C?', '- **R1 · AC-04** — frage an den menschen — F?', '- **R1 · AC-07** — frage an den menschen — I?');
  const asked = ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'human-question', reason: 'neu' }));
  writeRework(env, { results: asked, questions: [bundle(['AC-01', 'AC-04', 'AC-07'])] });
  checkRework(env);
  return env;
}

test('answersCheck_OneAnsweredOneUnclearOneLater_OneAnsweredTwoOpen', () => {
  // Arrange
  const env = answersSetup();
  addEntries(env, '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: F gilt immer.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ok beantwortet=1 offen=2\n');
});

test('answersCheck_AnsweredWithoutWEntry_Invalid', () => {
  // Arrange
  const env = answersSetup();
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-01', status: 'open' }, { location: 'AC-04', status: 'answered' }, { location: 'AC-07', status: 'open' }] });

  // Act
  const result = flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Assert
  assert.equal(result.stdout, 'ANTWORTEN ungültig: Antwort passt nicht zum Dokument: AC-04\n');
});

test('reworkCheck_InputFileMissing_FailsWithFileMissing', () => {
  // Arrange
  const env = setup();
  prepareRework(env);
  fs.rmSync(path.join(env.workspace, 'runde-1', 'nacharbeit-eingabe.md'));
  writeRework(env, { results: [] });

  // Act
  const result = flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--quelle', 'runde-1');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Datei fehlt: .*nacharbeit-eingabe\.md/);
});
