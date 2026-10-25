'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { lintRound, formatRound } = require('../scripts/lib/round-format');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'spec-lint.js');
const Q4 = '❓ **Q4** - **Leere Liste**: Was zeigt die Übersicht ohne Einträge? a) Hinweistext b) leere Tabelle';
const R4 = '➡️ a) Hinweistext · ungeklärt — Vermutung: gängigster Fall; der Anwender sieht sofort, dass nichts fehlt.';
const Q5 = '❓ **Q5** - **Export-Format**: CSV, Excel oder beides?';
const R5 = '➡️ CSV · Aussage — „wir brauchen das nur für den Import ins Altsystem“; das Altsystem liest CSV.';
const VALID = [Q4, '', R4, '', Q5, '', R5, ''].join('\n');

function rules(text) {
  return lintRound(text).issues.map((entry) => `${entry.severity} ${entry.rule} ${entry.location}`);
}

test('lintRound_ExampleFromGrillRounds_NoIssues', () => {
  // Act
  const { issues, metrics } = lintRound(VALID);

  // Assert
  assert.deepEqual(issues, []);
  assert.deepEqual(metrics, { fragen: 2, fehler: 0, warnungen: 0 });
});

test('lintRound_ShortenedRepeatAndReplacedLines_AreProseNotQuestions', () => {
  // Arrange
  const text = ['Q2 Rolle — Admin', 'Q3 entfällt, ersetzt durch Q6', Q4, R4].join('\n');

  // Act
  const { issues, metrics } = lintRound(text);

  // Assert
  assert.deepEqual(issues, []);
  assert.equal(metrics.fragen, 1);
});

test('lintRound_QuestionWithoutRecommendation_IsError', () => {
  assert.deepEqual(rules([Q4, '', Q5, R5].join('\n')), ['fehler empfehlung-fehlt Q4']);
});

test('lintRound_TwoRecommendationsForOneQuestion_IsError', () => {
  assert.deepEqual(rules([Q4, R4, R5].join('\n')), ['fehler empfehlung-doppelt Q4']);
});

test('lintRound_RecommendationWithoutQuestion_IsError', () => {
  assert.deepEqual(rules(R5), ['fehler empfehlung-ohne-frage Zeile 1']);
});

test('lintRound_MalformedQuestionLine_IsError', () => {
  assert.ok(rules(['❓ Q4 Leere Liste: was?', R4].join('\n')).includes('fehler frage-form Zeile 1'));
  assert.ok(rules([Q4.replace(' - **Leere Liste**:', ': **Leere Liste**'), R4].join('\n')).includes('fehler frage-form Zeile 1'));
});

test('lintRound_RecommendationWithoutTagOrReason_IsError', () => {
  assert.deepEqual(rules([Q5, '➡️ CSV — weil'].join('\n')), ['fehler empfehlung-form Q5']);
  assert.deepEqual(rules([Q5, '➡️ CSV · Meinung — weil'].join('\n')), ['fehler empfehlung-form Q5']);
  assert.deepEqual(rules([Q5, '➡️ CSV · Aussage —'].join('\n')), ['fehler empfehlung-form Q5']);
});

test('lintRound_TwoTagsInOneRecommendation_IsError', () => {
  assert.deepEqual(rules([Q5, '➡️ CSV · Aussage — das sagt der Mensch · Git — und das Log'].join('\n')), ['fehler mehrere-tags Q5']);
});

test('lintRound_NumbersWithGapOrRepeat_AreErrors', () => {
  // Arrange
  const gap = [Q4, R4, Q5.replace('Q5', 'Q7'), R5].join('\n');
  const repeat = [Q4, R4, Q5.replace('Q5', 'Q4'), R5].join('\n');

  // Assert
  assert.deepEqual(rules(gap), ['fehler nummer-luecke Q7']);
  assert.deepEqual(rules(repeat), ['fehler nummer-doppelt Q4']);
});

test('lintRound_UngeklaertWithoutPresumption_IsWarningOnly', () => {
  assert.deepEqual(rules([Q4, R4.replace('Vermutung: gängigster Fall; ', '')].join('\n')), ['warnung vermutung-fehlt Q4']);
});

test('lintRound_ExampleInsideCodeFence_IsIgnored', () => {
  assert.deepEqual(lintRound(['```', '❓ kaputt', '```', Q5, R5].join('\n')).issues, []);
});

test('lintRound_FirstNumberMayContinueFromEarlierRounds', () => {
  assert.equal(lintRound([Q4, R4].join('\n')).issues.length, 0);
});

test('formatRound_IssuesListed_HeadCountsErrorsAndWarnings', () => {
  // Act
  const text = formatRound(lintRound([Q4, R4.replace('Vermutung: ', ''), Q5].join('\n')));

  // Assert
  assert.equal(text, [
    'RUNDE fehler=1 warnungen=1 fragen=2',
    'WARNUNG vermutung-fehlt · Q4: Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung.',
    'FEHLER empfehlung-fehlt · Q5: Zur Frage fehlt die Empfehlung.',
  ].join('\n'));
});

function runCli(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('cli_RundeOption_PrintsHeadAndExitsOneOnErrors', () => {
  // Arrange
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-runde-'));
  const good = path.join(dir, 'gut.md');
  const bad = path.join(dir, 'schlecht.md');
  fs.writeFileSync(good, VALID);
  fs.writeFileSync(bad, Q4);

  // Act
  const ok = runCli(['--runde', good]);
  const failed = runCli(['--runde', bad]);

  // Assert
  assert.deepEqual([ok.status, ok.stdout], [0, 'RUNDE fehler=0 warnungen=0 fragen=2\n']);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /^RUNDE fehler=1 warnungen=0 fragen=1\nFEHLER empfehlung-fehlt · Q4: /);
});

test('cli_RundeOptionWithoutFileOrWithMissingFile_ExitTwo', () => {
  assert.equal(runCli(['--runde']).status, 2);
  assert.equal(runCli(['--runde', path.join(os.tmpdir(), 'gibt-es-nicht-runde.md')]).status, 2);
});
