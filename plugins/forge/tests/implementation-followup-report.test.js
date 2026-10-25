'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseAnswer } = require('../scripts/lib/implementation-followup-report');
const { tempDir, writeJsonFile } = require('./lib/review-flow-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
const AGGREGATE = [
  '=== REWORK ===',
  '### 🔴 src/a.js:3 (risks)',
  '- [risks · fehlerfall] Zitat: „x“ · Konsequenz: Absturz bei leerer Liste · Begründung: b',
  '',
  '### 🟡 src/b.js:9 (design)',
  '- [design · lesbarkeit] Zitat: „y“ · Konsequenz: Schwer lesbar · Begründung: b',
  '',
].join('\n');
const SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 src/a.js:3', 'Titel: Leere Liste abfangen', 'Beschreibung: Eine leere Liste bringt die Summe zum Absturz.', 'Empfehlung: Früh zurückkehren, weil es am einfachsten ist.', '1. Früh zurückkehren.', '**Bevorzugt: 1** — klar.', '',
  '### 🟡 src/b.js:9', 'Titel: Schleife benennen', 'Beschreibung: Die Schleife ist schwer zu lesen.', 'Empfehlung: Funktion extrahieren, weil der Name erklärt.', '1. Extrahieren.', '**Bevorzugt: 1** — lesbar.', '',
].join('\n');
const CLEAN = ['### Findings', '- **Leere Liste** — behoben — src/a.js:4', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Außerhalb', '- keine', '', '### Urteil', '**Fix-Runde:** alle behoben, keine neuen 🔴'].join('\n');
const OPEN = ['### Findings', '- **Leere Liste** — nicht behoben — src/a.js:4', '', '### Neue Schäden im Fix-Diff', '- 🟡 `src/a.js:7` — Magische Zahl', '', '### Außerhalb', '- Logging fehlt in src/c.js', '', '### Urteil', '**Fix-Runde:** offen: Leere Liste'].join('\n');

function workspace(chosen) {
  const dir = tempDir('dv-forge-impl-followup-');
  writeJsonFile(path.join(dir, 'sicherung-vorher', 'aggregate.md'), AGGREGATE);
  writeJsonFile(path.join(dir, 'sicherung-vorher', 'scout.md'), SCOUT);
  const all = [{ nummer: 1, stufe: '🔴', stelle: 'src/a.js:3' }, { nummer: 2, stufe: '🟡', stelle: 'src/b.js:9' }];
  writeJsonFile(path.join(dir, 'followup.json'), {
    gewaehlt: all.filter((group) => chosen.includes(group.nummer)).map((group) => ({ ...group, vorschlag: 1 })),
    offen: all.filter((group) => !chosen.includes(group.nummer)),
  });
  return dir;
}

function run(dir, answer, extra = []) {
  const file = path.join(dir, 'bericht-followup.json');
  const result = spawnSync(process.execPath, [SCRIPT, 'followup', '--workspace', dir, '--bericht', file, ...extra], { encoding: 'utf8', input: answer });
  return { result, file, data: result.status === 0 ? JSON.parse(fs.readFileSync(file, 'utf8')) : null };
}

test('parseAnswer_CleanVerdict_CleanWithoutDamages', () => {
  // Act
  const answer = parseAnswer(CLEAN);

  // Assert
  assert.equal(answer.clean, true);
  assert.deepEqual(answer.damages, []);
  assert.deepEqual(answer.outside, []);
});

test('parseAnswer_MissingVerdictLine_NotClean', () => {
  // Act
  const answer = parseAnswer('### Findings\n- **x** — behoben — a.js:1');

  // Assert
  assert.equal(answer.verdict, null);
  assert.equal(answer.clean, false);
});

test('implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, file, data } = run(dir, CLEAN);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `ENDE sauber nach Nach-Review\nERGEBNIS ✅ Bereit zum Abschließen\nFOLLOWUP nein\nBERICHT ${file}\nBEHALTEN keine\n`);
  assert.deepEqual(data.changes.map((change) => [change.title, change.ok, change.choice]), [['Leere Liste abfangen', true, 1], ['Schleife benennen', true, 1]]);
  assert.equal(data.changes[0].key, 'src/a.js:3');
  assert.deepEqual(data.open, []);
  assert.equal(data.flowLine, 'Ablauf: 2 gewählte Vorschläge umgesetzt, ein Nach-Review.');
});

test('implementationFollowup_NotClean_ChosenStayOpenAsHindranceWithNewDamageAndVerdictNote', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result, data } = run(dir, OPEN);

  // Assert
  assert.match(result.stdout, /^ENDE offen nach Nach-Review\nERGEBNIS ⛔ Noch nicht bereit · 1 Hindernis offen\n/);
  assert.equal(data.changes[0].ok, false);
  assert.deepEqual(data.open.map((entry) => [entry.color, entry.title]), [['yellow', 'Schleife benennen'], ['red', 'Leere Liste abfangen'], ['yellow', 'src/a.js:7']]);
  assert.equal(data.open[2].description, 'Magische Zahl');
  assert.deepEqual(data.notes, ['Nach-Review: offen: Leere Liste', 'Außerhalb des Fix-Diffs: Logging fehlt in src/c.js']);
});

test('implementationFollowup_UnchosenGroupLeft_CleanStatusNamesOpenGroups', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result, data } = run(dir, CLEAN);

  // Assert
  assert.match(result.stdout, /^ENDE sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen\nERGEBNIS ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\n/);
  assert.deepEqual(data.open.map((entry) => entry.title), ['Schleife benennen']);
});

test('implementationFollowup_WithoutReReview_BlockedAndChangeNotVerified', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result, data } = run(dir, '', ['--ohne', 'blockiert']);

  // Assert
  assert.match(result.stdout, /^ENDE blockiert\nERGEBNIS ⛔ Noch nicht bereit · 1 Hindernis offen\n/);
  assert.equal(data.changes[0].ok, null);
  assert.deepEqual(data.notes, ['Kein Nach-Review: blockiert.']);
  assert.equal(data.flowLine, 'Ablauf: 1 gewählter Vorschlag umgesetzt, kein Nach-Review.');
});

test('implementationFollowup_UnknownWithoutValue_ExitsWithOne', () => {
  // Act
  const { result } = run(workspace([1]), '', ['--ohne', 'vielleicht']);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--ohne erlaubt: blockiert, keine-aenderung/);
});

const GROUP_LINES = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — nicht behoben — src/b.js:9', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Urteil', '**Fix-Runde:** offen: src/b.js:9'].join('\n');
const ALL_FIXED_NEW_RED = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — behoben — src/b.js:10', '', '### Neue Schäden im Fix-Diff', '- 🔴 `src/c.js:2` — Neuer Absturz bei null', '', '### Urteil', '**Fix-Runde:** offen: neues 🔴 in src/c.js'].join('\n');

test('parseAnswer_GroupVerdictLines_JudgedByPlaceKeyAndGreenDamagesSeparate', () => {
  // Arrange
  const text = GROUP_LINES.replace('- keine', '- 🟢 `src/d.js:1` — Name holpert\n- 🟡 `src/e.js:2` — Magische Zahl');

  // Act
  const answer = parseAnswer(text);

  // Assert
  assert.equal(answer.judged.get('src/a.js:3'), 'behoben');
  assert.equal(answer.judged.get('src/b.js:9'), 'nicht behoben');
  assert.deepEqual(answer.damages.map((match) => match[1]), ['🟡']);
  assert.deepEqual(answer.greens.map((match) => match[1]), ['🟢']);
});

test('implementationFollowup_OneChosenGroupNotConfirmed_KeepsOnlyItsProposalAndOffersFollowup', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, data } = run(dir, GROUP_LINES);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
  assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
  assert.deepEqual(data.open.map((entry) => [entry.color, entry.title, entry.hasProposal]), [['yellow', 'Schleife benennen', true]]);
  assert.equal(data.offersFollowup, true);
  assert.match(result.stdout, /^ENDE offen nach Nach-Review\n/);
});

test('implementationFollowup_YellowGroupNotConfirmedByOwnVerdict_ResultReadyWithOneHintAndFollowupJa', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, data } = run(dir, GROUP_LINES);

  // Assert
  assert.match(result.stdout, /\nERGEBNIS ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\nFOLLOWUP ja\n/);
  assert.equal(data.kind, 'hints');
  assert.equal(data.openRed, 0);
});

test('implementationFollowup_RedGroupNotConfirmedByOwnVerdict_StaysHindrance', () => {
  // Arrange
  const dir = workspace([1, 2]);
  const answer = GROUP_LINES.replace('- **src/a.js:3** — behoben', '- **src/a.js:3** — nicht behoben').replace('- **src/b.js:9** — nicht behoben', '- **src/b.js:9** — behoben');

  // Act
  const { result, data } = run(dir, answer);

  // Assert
  assert.match(result.stdout, /\nERGEBNIS ⛔ Noch nicht bereit · 1 Hindernis offen\nFOLLOWUP ja\n/);
  assert.deepEqual(data.open.map((entry) => entry.color), ['red']);
});

test('implementationFollowup_YellowGroupWithoutOwnVerdictAndNotCleanAnswer_CountsAsHindrance', () => {
  // Arrange
  const dir = workspace([1, 2]);
  const answer = ['### Findings', '- keine', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Urteil', '**Fix-Runde:** offen: beide'].join('\n');

  // Act
  const { result, data } = run(dir, answer);

  // Assert
  assert.match(result.stdout, /\nERGEBNIS ⛔ Noch nicht bereit · 2 Hindernisse offen\n/);
  assert.deepEqual(data.open.map((entry) => [entry.color, entry.title]), [['red', 'Leere Liste abfangen'], ['red', 'Schleife benennen']]);
});

test('parseAnswer_TitleWithReviewerBracket_JudgesTheGroup', () => {
  // Arrange
  const dir = workspace([1, 2]);
  const text = GROUP_LINES.replace('- **src/a.js:3** —', '- **src/a.js:3 (risks)** —').replace('- **src/b.js:9** —', '- **src/b.js:9 (design)** —');

  // Act
  const { result, data } = run(dir, text);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
  assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
});

test('implementationFollowup_AllChosenConfirmedButNewRedWithoutProposal_FollowupNeinNothingKeptDamageOpen', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, data } = run(dir, ALL_FIXED_NEW_RED);

  // Assert
  assert.match(result.stdout, /\nFOLLOWUP nein\nBERICHT [^\n]+\nBEHALTEN keine\n$/);
  assert.deepEqual(data.changes.map((change) => change.ok), [true, true]);
  assert.deepEqual(data.open.map((entry) => [entry.color, entry.title, entry.hasProposal]), [['red', 'src/c.js:2', false]]);
  assert.equal(data.offersFollowup, false);
});

test('implementationFollowup_UnchosenGroupLeftAndChosenConfirmed_KeepsUnchosenAndOffersFollowup', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result } = run(dir, CLEAN);

  // Assert
  assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
});

test('implementationFollowup_WithoutReReview_FollowupNeinAndSaveUnchanged', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result, data } = run(dir, '', ['--ohne', 'keine-aenderung']);

  // Assert
  assert.match(result.stdout, /\nFOLLOWUP nein\nBERICHT [^\n]+\nBEHALTEN unveraendert\n$/);
  assert.equal(data.offersFollowup, false);
});

test('implementationFollowup_GreenDamageInFixDiff_ListedAsGreenAndNotOpen', () => {
  // Arrange
  const dir = workspace([1, 2]);
  const answer = CLEAN.replace('### Neue Schäden im Fix-Diff\n- keine', '### Neue Schäden im Fix-Diff\n- 🟢 `src/d.js:1` — Name holpert');

  // Act
  const { data } = run(dir, answer);

  // Assert
  assert.deepEqual(data.green.map((entry) => [entry.color, entry.title, entry.description, entry.hasProposal]), [['green', 'src/d.js:1', 'Name holpert', false]]);
  assert.deepEqual(data.open, []);
});

test('implementationFollowup_GroupLinesConfirmedButNoVerdictLine_ChosenStayOpenAsHindranceAndFollowupJa', () => {
  // Arrange
  const dir = workspace([1, 2]);
  const answer = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — behoben — src/b.js:10', '', '### Neue Schäden im Fix-Diff', '- keine'].join('\n');

  // Act
  const { result, data } = run(dir, answer);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE offen nach Nach-Review\nERGEBNIS ⛔ Noch nicht bereit · 2 Hindernisse offen\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 1,2\n$/);
  assert.deepEqual(data.changes.map((change) => change.ok), [false, false]);
  assert.deepEqual(data.open.map((entry) => entry.color), ['red', 'red']);
  assert.equal(data.kind, 'blocked');
  assert.deepEqual(data.notes, ['Nach-Review: kein Urteil geliefert']);
});

function runStandalone(dir, answer, extra = []) {
  const result = spawnSync(process.execPath, [SCRIPT, 'followup', '--workspace', dir, '--artefakt', 'plans/p.md', ...extra], { encoding: 'utf8', input: answer });
  return { result, file: path.join(dir, 'abschluss', 'bericht.md') };
}

test('implementationFollowup_StandaloneWithReReview_WritesReportFileAndPrintsItAfterMarker', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, file } = runStandalone(dir, CLEAN);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const report = fs.readFileSync(file, 'utf8');
  assert.equal(result.stdout, `ENDE sauber nach Nach-Review\nERGEBNIS ✅ Bereit zum Abschließen\nBEHALTEN keine\n=== BERICHT ===\n${report}`);
  assert.ok(report.startsWith('## Review-Followup (implementation-review): plans/p.md\n\n**Status:** sauber nach Nach-Review\n**Reviews:** 1 · **Nacharbeiten:** 1\n\n### Letztes Review\n### Findings\n'), report);
  assert.ok(report.includes(`${CLEAN}\n\n### Umgesetzt\n- 1 · 🔴 src/a.js:3 · Vorschlag 1\n- 2 · 🟡 src/b.js:9 · Vorschlag 1\n`), report);
  assert.equal(report.includes('Hinweise des Orchestrators'), false);
});

test('implementationFollowup_StandaloneWithoutReReview_ReportsZeroReviewsAndNotesTheReason', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const { result, file } = runStandalone(dir, '', ['--ohne', 'blockiert', '--hinweis', 'Implementer: needs-context, Schema fehlt']);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  const report = fs.readFileSync(file, 'utf8');
  assert.ok(report.includes('**Status:** blockiert\n**Reviews:** 0 · **Nacharbeiten:** 1'), report);
  assert.ok(report.includes('### Letztes Review\nKein Nach-Review: blockiert.'), report);
  assert.ok(report.includes('### Hinweise des Orchestrators\n- Kein Nach-Review: blockiert.\n- Implementer: needs-context, Schema fehlt\n\n### Umgesetzt\n- 1 · 🔴 src/a.js:3 · Vorschlag 1'), report);
});

test('implementationFollowup_StandaloneOpen_KeepsAnswerUnchangedAndStatusOffen', () => {
  // Arrange
  const dir = workspace([1, 2]);

  // Act
  const { result, file } = runStandalone(dir, OPEN);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.readFileSync(file, 'utf8').includes(`### Letztes Review\n${OPEN}\n\n### Umgesetzt`));
  assert.ok(result.stdout.startsWith('ENDE offen nach Nach-Review\nERGEBNIS ⛔ Noch nicht bereit'), result.stdout);
});

test('implementationFollowup_NeitherBerichtNorArtefakt_UsageExitTwo', () => {
  // Arrange
  const dir = workspace([1]);

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'followup', '--workspace', dir], { encoding: 'utf8', input: CLEAN });

  // Assert
  assert.equal(result.status, 2);
});
