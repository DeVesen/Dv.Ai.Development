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
  const checked = flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
  assert.match(checked, /^NACHARBEIT ok/);
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
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Wortlaut geschärft.' }], questions: [] });

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge review-flow: Nachprüfung fehlt: runde-2\/einstufung\.json/);
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

test('report_AnyRun_WritesReportTextToClosingFile', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  const written = fs.readFileSync(path.join(env.workspace, 'abschluss', 'bericht.md'), 'utf8');
  assert.equal(output.split('=== BERICHT ===\n')[1].trimEnd(), written.trimEnd());
  assert.match(written, /^## Spec-Review · Ergebnis · Demo-Spec\n/);
});

const QUESTION_BUNDLE = {
  title: 'Leere Eingabe', affects: 'Eingabe prüfen', why: 'Es ist offen, was bei leerer Eingabe gilt.', reviewers: ['clarity'],
  options: [{ label: 'a', text: 'Fehler melden.', consequence: 'streng' }, { label: 'b', text: 'Standardwert nehmen.', consequence: 'bequem' }],
  recommendation: 'a', reason: 'Fehler fallen früh auf.', places: ['AC-04'],
};
const CHANGE = 'Wortlaut geschärft.';

function checkedFile(env, ...parts) {
  return path.join(env.workspace, ...parts);
}

test('report_TwoHintsWithoutRework_ReadyWithTwoHintsAndClosingKeepsBothGroups', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' }), finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 AC-01\n1. a\n**Bevorzugt: 1** — x\n\n### 🟡 AC-07\n1. b\n**Bevorzugt: 1** — y\n');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Runde 1\n=== BERICHT ===\n## Spec-Review · Ergebnis · Demo-Spec\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen · 2 kleine Hinweise offen\nAblauf: Prüfung aus einem Blickwinkel, keine Überarbeitung, keine Nachprüfung\./);
  assert.match(output, /### Noch offen · kein Hindernis für den Plan\n- 🟡 \*\*AC-01\*\* · aus: Klarheit\n  Folge \(ohne Scout-Beschreibung\)/);
  assert.match(fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8'), /### 🟡 AC-01[\s\S]*### 🟡 AC-07/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'bericht.md'), 'utf8'), `${output.split('=== BERICHT ===\n')[1].trimEnd()}\n`);
});

test('report_ScoutTexts_ShowTitleDescriptionAndRecommendationOfOpenGroup', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-07' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), [
    '## Scout-Vorschläge', '', '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.',
    'Empfehlung: Eine Lesart festlegen, weil Tests sonst streiten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
  ].join('\n'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /- 🟡 \*\*Eindeutige Formulierung\*\* · aus: Klarheit\n  Der Satz hat zwei Lesarten\.\n  Vorschlag \(empfohlen\): Eine Lesart festlegen, weil Tests sonst streiten\./);
});

test('report_ReworkFailedWithInvalidEntries_UnvollstaendigWithNoteAndNoChangeSection', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [null, { status: 'changed' }, { location: ' AC-04 ', status: 'changed', evidence: ' src/export.js ' }], questions: [] });
  ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'nacharbeit'));

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Überarbeitung ausgefallen/);
  assert.doesNotMatch(output, /### Was sich/);
  assert.match(output, /- Die Überarbeitung ist ausgefallen\. Das Dokument wurde nicht überarbeitet\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*/);
});

test('report_ReworkResultNoJson_ReportsWithoutChangeSection', () => {
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
  assert.doesNotMatch(result.stdout, /### Was sich/);
});

test('report_AllDone_CleanAfterVerificationWithoutOpenSections', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ✅ Bereit zum Planen\nAblauf: Prüfung aus einem Blickwinkel, eine Überarbeitung, eine Nachprüfung\./);
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
});

test('report_ChangedAndConfirmed_ShowsChangeVerdictAndEvidence', () => {
  // Arrange
  const env = setup();
  const results = [
    { location: 'AC-04', status: 'changed', change: CHANGE, evidence: 'src/export.js' },
    { location: 'AC-07', status: 'changed', change: CHANGE, evidence: 'docs/glossary/terms.md · Export' },
    { location: 'AC-01', status: 'changed', change: CHANGE },
  ];
  const verdicts = ['AC-01', 'AC-04', 'AC-07'].map((location) => VERDICT(location, 'erledigt'));
  runWithVerification(env, [RED('AC-01'), RED('AC-04'), RED('AC-07')], results, { verdicts, findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /### Was sich in der Spec geändert hat\n- ✅ \*\*AC-04\*\* · gefunden aus: Widerspruchsfreiheit\n  Folge \(ohne Scout-Beschreibung\)\n  Änderung: Wortlaut geschärft\.\n  Beleg: src\/export\.js\n  Nachprüfung: bestätigt\./);
  assert.equal(output.match(/Beleg:/g).length, 2);
  assert.doesNotMatch(output, /### Noch offen/);
});

test('report_TwoNotDone_NichtBereitWithTwoHindrances', () => {
  // Arrange
  const env = setup();
  const results = [{ location: 'AC-04', status: 'changed', change: CHANGE }, { location: 'AC-07', status: 'changed', change: CHANGE }];
  runWithVerification(env, [RED('AC-04'), RED('AC-07')], results, { verdicts: [VERDICT('AC-04', 'nicht erledigt'), VERDICT('AC-07', 'nicht erledigt')], findings: [] });

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 2 × 🔴 offen\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(output, /- ⚠️ \*\*AC-04\*\*[\s\S]*Nachprüfung: nicht erledigt\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*[^\n]*\n[^\n]*\n- 🔴 \*\*AC-07\*\*/);
  assert.match(output, /1\. Die 2 Hindernisse einarbeiten lassen/);
});

test('report_NotDoneVerifierFindingAndScriptFinding_ThreeHindrancesWithPlainAngles', () => {
  // Arrange
  const env = setup();
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-01', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  const verification = { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] };
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: CHANGE }], questions: [] });
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE nicht bereit, 3 × 🔴 offen\n/);
  assert.match(output, /- 🔴 \*\*Deckel\*\* · aus: Nachprüfung/);
  assert.match(output, /- 🔴 \*\*AC-01\*\* · aus: Skript-Prüfung/);
});

test('report_QuestionOpenAndPointNotDone_FragenOffenListsQuestionAndHindrance', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [] });
  addEntries(env, '- **R1 · AC-07** — frage an den menschen — Gilt I?');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
  assert.match(output, /### Offene Fragen\n- \*\*AC-07\*\*: Gilt I\?/);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*AC-04\*\*/);
});

test('report_TwoOpenQuestions_ListsBothFallbackLines', () => {
  // Arrange
  const env = setup(SPEC.replace('- **W · Deckel**', '- **R1 · AC-04** — frage an den menschen — F?\n- **R1 · AC-07** — frage an den menschen — I?\n- **W · Deckel**'));
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 2 Fragen offen/);
  assert.match(output, /### Offene Fragen\n- \*\*AC-04\*\*: F\?\n- \*\*AC-07\*\*: I\?/);
});

test('report_GreenFinding_NotShownAndNotInClosing', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', consequence: 'Satz holpert' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  assert.doesNotMatch(output, /Satz holpert|Anmerkungen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  assert.equal(fs.existsSync(checkedFile(env, 'abschluss', 'scout.md')), false);
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
  assert.match(output, /### Hinweise zum Ablauf\n- Der Scout ist ausgefallen\. Es gibt keine Lösungsvorschläge; Beschreibungen stammen aus den Prüfergebnissen\./);
});

test('report_AttemptsAndPreparedHints_ListedInPlainLanguage', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  writeJsonFile(path.join(env.workspace, 'hinweise.json'), ['Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.']);
  nextAttempt(env.workspace, 'clarity');
  ['NACHFORDERN', 'NEUSTART'].forEach(() => nextAttempt(env.workspace, 'nachprüfer'));
  nextAttempt(env.workspace, 'nacharbeit', 'buendelung');

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /- Der Prüfer für Fachbegriffe wurde nicht gestartet/);
  assert.match(output, /- Der Prüfer für Klarheit hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt\./);
  assert.match(output, /- Die Nachprüfung musste neu gestartet werden, weil die Antwort nicht gültig war\./);
  assert.match(output, /- Die Bündelung der Fragen musste korrigiert werden\./);
});

test('report_PlanSpecQuestion_FragenOffenWithReasonLine', () => {
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
  assert.match(output, /### Offene Fragen\n- Spec lässt X offen/);
  assert.match(output, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
});

function answeredRun(env) {
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }], questions: [QUESTION_BUNDLE] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  addEntries(env, '- **W · AC-04** · Aussage \u2014 Antwort auf \u201ER1 · AC-04\u201C: F gilt immer.');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'antworten.json'), { results: [{ location: 'AC-04', status: 'answered', decision: 'F gilt immer.', change: 'Die Spec legt jetzt fest, dass F immer gilt.' }] });
  flow('answers-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
}

test('report_AnsweredQuestion_ShowsDecisionAndChangeAndKeepsGroupOutOfOpen', () => {
  // Arrange
  const env = setup();
  answeredRun(env);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n/);
  assert.match(output, /### Was sich in der Spec geändert hat\n- ✅ \*\*Leere Eingabe\*\* · gefunden aus: Klarheit\n  Die Spec legt jetzt fest, dass F immer gilt\.\n  Nachprüfung: bestätigt\./);
  assert.match(output, /### Deine Entscheidungen\n- \*\*Leere Eingabe:\*\* F gilt immer\./);
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
});

test('report_QuestionLaterAnswered_ListsBundleTitleUnderOpenQuestions', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — Gilt F?');
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'human-question', reason: 'neue Regel' }], questions: [QUESTION_BUNDLE] });
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts: [], findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);

  // Act
  const output = report(env);

  // Assert
  assert.match(output, /^ENDE Fragen offen\n/);
  assert.match(output, /### Offene Fragen\n- \*\*Leere Eingabe\*\* \(betrifft: Eingabe prüfen\)/);
});

const BLOCK_AC04 = '### 🔴 AC-04 (consistency)\n- [consistency · widerspruch] Zitat: \u201Ex\u201C · Konsequenz: Folge A · Begründung: b';
const BLOCK_AC07 = '### 🟡 AC-07 (clarity)\n- [clarity · detail] Zitat: \u201Ex\u201C · Konsequenz: Folge B · Begründung: b';
const SAVED_AGGREGATE = `=== REWORK ===\n${BLOCK_AC04}\n\n${BLOCK_AC07}\n`;
const SAVED_SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 AC-04', 'Titel: Grenzwert festlegen', 'Beschreibung: Der Grenzwert ist nicht bestimmt.', 'Empfehlung: Den Wert festlegen, weil Tests ihn brauchen.', '1. D festlegen.', '**Bevorzugt: 1** — klar.', '',
  '### 🟡 AC-07', 'Titel: Eindeutige Formulierung', 'Beschreibung: Der Satz hat zwei Lesarten.', 'Empfehlung: Eine Lesart festlegen, weil Tests sonst streiten.', '1. H schärfen.', '**Bevorzugt: 1** — eindeutig.', '',
].join('\n');

function followupRun(env, { chosen, open, results, verdicts }) {
  flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'aggregate.md'), SAVED_AGGREGATE);
  writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'scout.md'), SAVED_SCOUT);
  writeJsonFile(path.join(env.workspace, 'followup.json'), { gewaehlt: chosen, offen: open });
  const blocks = chosen.map((entry) => (entry.stelle === 'AC-04' ? BLOCK_AC04 : BLOCK_AC07));
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), `=== REWORK ===\n${blocks.join('\n\n')}\n`);
  writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results });
  const source = ['--quelle', 'nacharbeit'];
  flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), { verdicts, findings: [] });
  flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
  return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source).stdout;
}

test('report_FollowupDoneAndOneUnchosen_ShowsChangeChoiceAndKeepsUnchosenOpen', () => {
  // Arrange
  const env = setup();
  const chosen = [{ nummer: 1, stufe: '🔴', stelle: 'AC-04', vorschlag: 1 }];
  const open = [{ nummer: 2, stufe: '🟡', stelle: 'AC-07' }];

  // Act
  const output = followupRun(env, {
    chosen, open, results: [{ location: 'AC-04', status: 'changed', change: 'Der Grenzwert steht jetzt in der Spec.', evidence: 'src/export.js' }], verdicts: [VERDICT('AC-04', 'erledigt')],
  });

  // Assert
  assert.match(output, /^ENDE sauber nach Nachprüfung\n=== BERICHT ===\n## Review-Followup \(spec-review\) · Ergebnis · Demo-Spec\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen · 1 kleiner Hinweis offen\nAblauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
  assert.match(output, /- ✅ \*\*Grenzwert festlegen\*\* · gefunden aus: Widerspruchsfreiheit\n  Der Grenzwert ist nicht bestimmt\.\n  Änderung: Der Grenzwert steht jetzt in der Spec\.\n  Beleg: src\/export\.js\n  Gewählt: Vorschlag 1\n  Nachprüfung: bestätigt\./);
  assert.match(output, /### Noch offen · kein Hindernis für den Plan\n- 🟡 \*\*Eindeutige Formulierung\*\*[^\n]*\n[^\n]*\n  Vorschlag \(empfohlen\): Eine Lesart festlegen/);
  assert.doesNotMatch(output, /Deine Entscheidungen/);
  const scout = fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8');
  assert.match(scout, /### 🟡 AC-07/);
  assert.doesNotMatch(scout, /AC-04/);
});

test('report_FollowupChosenNotDone_ShowsWarningAndKeepsGroupAsHindranceWithItsSeverityHeading', () => {
  // Arrange
  const env = setup();
  const chosen = [{ nummer: 2, stufe: '🟡', stelle: 'AC-07', vorschlag: 1 }];

  // Act
  const output = followupRun(env, {
    chosen, open: [{ nummer: 1, stufe: '🔴', stelle: 'AC-04' }], results: [{ location: 'AC-07', status: 'changed', change: 'Der Satz hat jetzt eine Lesart.' }], verdicts: [VERDICT('AC-07', 'nicht erledigt')],
  });

  // Assert
  assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
  assert.match(output, /- ⚠️ \*\*Eindeutige Formulierung\*\*[\s\S]*Nachprüfung: nicht erledigt\./);
  assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*Grenzwert festlegen\*\*[\s\S]*- 🔴 \*\*Eindeutige Formulierung\*\*/);
  assert.match(fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8'), /### 🔴 AC-04[\s\S]*### 🟡 AC-07/);
});


const AC04_SCOUT = ['## Scout-Vorschläge', '', '### 🔴 AC-04', 'Titel: Grenzwert festlegen', 'Beschreibung: Der Grenzwert ist nicht bestimmt.', 'Empfehlung: Wert festlegen.', '1. D festlegen.', '**Bevorzugt: 1** — klar.', ''].join('\n');

test('report_CorrectedGroupWithScoutText_AppearsNeitherInReportNorInClosingScout', () => {
  // Arrange
  const env = setup();
  runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [] });
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), AC04_SCOUT);

  // Act
  const output = report(env);

  // Assert
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.existsSync(checkedFile(env, 'abschluss', 'scout.md')), false);
  assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
});

test('report_AnswerDecidedGroupWithScoutText_NotInClosingScoutNorOpenList', () => {
  // Arrange
  const env = setup();
  answeredRun(env);
  fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), AC04_SCOUT);

  // Act
  const output = report(env);

  // Assert
  assert.doesNotMatch(output, /### Noch offen/);
  assert.equal(fs.existsSync(checkedFile(env, 'abschluss', 'scout.md')), false);
});

test('report_OldWorkspaceWithoutHinweiseAndReviewers_ReportsWithoutCrash', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', [finding({ location: 'AC-01' })]);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
  const ratedFile = path.join(env.workspace, 'runde-1', 'einstufung.json');
  const rated = JSON.parse(fs.readFileSync(ratedFile, 'utf8'));
  delete rated.reviewers;
  writeJsonFile(ratedFile, rated);
  fs.rmSync(path.join(env.workspace, 'hinweise.json'), { force: true });

  // Act
  const result = runReport(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE sauber nach Runde 1\n=== BERICHT ===\n## Spec-Review · Ergebnis · Demo-Spec\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen · 1 kleiner Hinweis offen\nAblauf: Prüfung aus einem Blickwinkel/);
});

test('buildInput_UnknownStatus_ThrowsInsteadOfReportingReady', () => {
  // Arrange
  const { buildInput } = require('../scripts/lib/report-data');

  // Act
  const build = () => buildInput({}, {}, 'Bereit', []);

  // Assert
  assert.throws(build, /Unbekannter Berichtsstatus: Bereit/);
});
