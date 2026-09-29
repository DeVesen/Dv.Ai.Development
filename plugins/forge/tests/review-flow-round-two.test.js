'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { finding, setup, writeJsonFile, flow, readJsonFile, editDoc, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

const RED = (location) => finding({ location, quote: 'x', category: 'widerspruch' });
// Antwort auf „R1 · AC-04“ (U+201E, U+201C)
const ANSWER_ENTRY = '- **W · AC-04** · Aussage — Antwort auf „R1 · AC-04“: ja.';

function finishRework(env, results, questions = []) {
  writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results, questions });
  return flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function checklist(env) {
  return flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function verify(env, verification) {
  if (verification) writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), verification);
  return flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc).stdout;
}

function checklistItems(env) {
  return readJsonFile(path.join(env.workspace, 'runde-2', 'pruefliste.json')).items.map((item) => `${item.label}:${item.source}`);
}

test('checklist_ThreeRedPlacesWithoutQuestion_ExactlyTheseThree', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-01'), RED('AC-04'), RED('AC-07')]);
  editDoc(env, 'dann C.', 'dann C2.');
  finishRework(env, ['AC-01', 'AC-04', 'AC-07'].map((location) => ({ location, status: 'changed' })));

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=3 skript=0 bereiche=1\nNACHPRUEFER ja\n');
  assert.deepEqual(checklistItems(env), ['AC-01:ki', 'AC-04:ki', 'AC-07:ki']);
});

test('checklist_AnsweredQuestion_PlaceOnChecklist', () => {
  // Arrange
  const env = setup();
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  runUntilRework(env, []);
  finishRework(env, [], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);
  addEntries(env, ANSWER_ENTRY);

  // Act
  checklist(env);

  // Assert
  assert.deepEqual(checklistItems(env), ['AC-04:ki']);
});

test('checklist_RedWithAnsweredQuestion_PlaceOnceOnChecklist', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  finishRework(env, [{ location: 'AC-04', status: 'human-question', reason: 'neu' }], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);
  addEntries(env, ANSWER_ENTRY);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=1 skript=0 bereiche=0\nNACHPRUEFER ja\n');
  assert.deepEqual(checklistItems(env), ['AC-04:ki']);
});

test('checklist_QuestionAnsweredLater_NotOnChecklistAndNoVerifierWithoutChanges', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — frage an den menschen — F?');
  finishRework(env, [{ location: 'AC-04', status: 'human-question', reason: 'neu' }], [{ rule: 'R', question: 'F?', places: ['AC-04'], cases: ['a) ja'], recommendation: 'a' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=0 skript=0 bereiche=0\nNACHPRUEFER nein\n');
});

test('checklist_ReworkChangedOnlyDecisions_NoArea', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — nicht geändert — Fehllesung');
  finishRework(env, [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=1 skript=0 bereiche=0\nNACHPRUEFER ja\n');
});

test('checklist_UnchangedWithReason_PointShowsOutcomeAndReason', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  addEntries(env, '- **R1 · AC-04** — nicht geändert — Fehllesung');
  finishRework(env, [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }]);

  // Act
  checklist(env);

  // Assert
  const shown = fs.readFileSync(path.join(env.workspace, 'runde-2', 'pruefliste.md'), 'utf8');
  assert.match(shown, /### AC-04\n- \[[^\n]*\n- Ausgang: nicht geändert — Fehllesung\n/);
});

test('checklist_ChangedWithoutReason_PointShowsOutcomeOnly', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'dann C.', 'dann C2.');
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);

  // Act
  checklist(env);

  // Assert
  const shown = fs.readFileSync(path.join(env.workspace, 'runde-2', 'pruefliste.md'), 'utf8');
  assert.match(shown, /### AC-04\n- \[[^\n]*\n- Ausgang: geändert\n/);
});

test('checklist_ScriptFindingOfRoundOne_JudgedByScript', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  finishRework(env, [{ location: 'AC-07', status: 'changed' }]);

  // Act
  const output = checklist(env);

  // Assert
  assert.equal(output, 'PRUEFLISTE punkte=0 skript=1 bereiche=0\nNACHPRUEFER nein\n');
});

test('verify_ContradictionInSideChangedArea_StaysRed', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  editDoc(env, 'Höchstens zwei Runden.', 'Höchstens drei Runden.');
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ location: 'Deckel', quote: 'Höchstens drei Runden.', category: 'widerspruch' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=1 hinweise=0\nWEITER scout=keiner\n');
});

test('verify_FindingOutsideChecklist_IsHintForScout', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'unchanged', reason: 'Fehllesung' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ location: 'AC-07', category: 'fehlendes-verhalten' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=0 hinweise=1\nWEITER scout=hinweise\n');
  assert.match(fs.readFileSync(path.join(env.workspace, 'runde-2', 'scout-eingabe.md'), 'utf8'), /### 🟡 AC-07 \(nachprüfer\)/);
});

test('verify_ScriptReportsAgain_PointNotDoneAndRed', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, []);
  writeJsonFile(path.join(env.workspace, 'runde-1', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
  finishRework(env, [{ location: 'AC-07', status: 'changed' }]);
  checklist(env);
  writeJsonFile(path.join(env.workspace, 'runde-2', 'skript-pruefung.json'), { findings: [{ location: 'AC-07', quote: 'x', consequence: 'doppelt', rationale: 'Skript' }] });

  // Act
  const output = verify(env);

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ok offen=1 hinweise=0\nWEITER scout=keiner\n');
  assert.deepEqual(readJsonFile(path.join(env.workspace, 'runde-2', 'einstufung.json')).verdicts, [{ location: 'AC-07', source: 'skript', rationale: 'Skript-Prüfung', verdict: 'nicht erledigt' }]);
});

test('verify_MissingVerdict_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04'), RED('AC-07')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }, { location: 'AC-07', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Urteil fehlt oder doppelt: AC-07\n');
});

test('verify_VerdictForPlaceNotOnChecklist_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }, { location: 'AC-07', verdict: 'nicht erledigt', rationale: 'x' }], findings: [] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Urteil ohne Punkt der Prüfliste: AC-07\n');
});

test('verify_FindingWithColor_Invalid', () => {
  // Arrange
  const env = setup();
  runUntilRework(env, [RED('AC-04')]);
  finishRework(env, [{ location: 'AC-04', status: 'changed' }]);
  checklist(env);

  // Act
  const output = verify(env, { verdicts: [{ location: 'AC-04', verdict: 'erledigt', rationale: 'ok' }], findings: [finding({ severity: 'red' })] });

  // Assert
  assert.equal(output, 'NACHPRUEFUNG ungültig: Farbe im Finding: AC-01\n');
});

test('scriptChecks_RoundTwo_WritesIntoRoundTwoFolder', () => {
  // Arrange
  const env = setup();

  // Act
  const output = flow('script-checks', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--runde', 'runde-2').stdout;

  // Assert
  assert.match(output, /^SKRIPT befunde=\d+\n$/);
  assert.ok(fs.existsSync(path.join(env.workspace, 'runde-2', 'skript-pruefung.json')));
  assert.ok(!fs.existsSync(path.join(env.workspace, 'runde-1', 'skript-pruefung.json')));
});
