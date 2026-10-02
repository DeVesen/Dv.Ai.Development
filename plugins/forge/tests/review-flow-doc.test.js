'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, wordCount } = require('./lib/markdown');

const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');
const LOOP = path.join(__dirname, '..', 'shared', 'review-loop', 'loop.md');
const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.';

function section(text, title) {
  const start = text.indexOf(`## ${title}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_BuildingBlocks_AllNamed', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const block of ['Eingaben', 'Reviewer', 'Beratend', 'Skript-Prüfungen', 'Nacharbeiter', 'Nachprüfer', 'Scout', 'Bericht']) {
    assert.ok(text.includes(`| ${block} |`), `${block} fehlt`);
  }
});

test('flow_Steps_CallEveryReviewFlowCommand', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const command of ['rate <FLAGS> --expect <aktiv>', 'scout-check --review <rolle> --dir "<D>"', 'rework-input <FLAGS>', 'rework-check <FLAGS>', 'answers-check <FLAGS>',
    'checklist <FLAGS>', 'verify <FLAGS>', 'report <FLAGS> --titel', 'attempt --dir "<W>" --instanz <name>', 'attempt --dir "<W>" --instanz nacharbeit --art buendelung']) {
    assert.ok(text.includes(`node "<PLUGIN>/scripts/review-flow.js" ${command}`), `${command} fehlt`);
  }
});

test('flow_Retry_RequestRestartFailed', () => {
  // Act
  const retry = section(readText(FLOW), 'Nachfordern');

  // Assert
  for (const part of ['`NACHFORDERN`', '`SendMessage`', '`NEUSTART`', '`AUSGEFALLEN`', 'ohne seine Vorschläge weiter']) assert.ok(retry.includes(part), `${part} fehlt`);
});

test('flow_Pause_ShowsQuestionsPausesGuardAndForwardsAnswers', () => {
  // Act
  const pause = section(readText(FLOW), 'Anhalten');

  // Assert
  for (const part of ['=== FRAGEN ===', 'guard-orchestrator.js" pause <SESSION>', 'Antworten des Menschen: <antwort wörtlich>', 'Ergebnis: <W>/runde-1/antworten.json',
    'der Zähler gilt für die ganze Nacharbeit']) {
    assert.ok(pause.includes(part), `${part} fehlt`);
  }
});

test('flow_Verification_NoReviewerAgainAndNoFurtherRework', () => {
  // Act
  const verification = section(readText(FLOW), 'Nachprüfung');

  // Assert
  for (const part of ['Prüfliste: <W>/runde-2/pruefliste.md', 'Ergebnis: <W>/runde-2/nachpruefung.json', '`NACHPRUEFER nein`: Er startet nicht.',
    'Kein Reviewer läuft ein zweites Mal.', 'Es gibt keine weitere Nacharbeit und keine weitere Runde.', 'Instanz `scout-nachpruefung`']) {
    assert.ok(verification.includes(part), `${part} fehlt`);
  }
});

test('flow_End_ReportSaveCleanupRelease', () => {
  // Act
  const end = section(readText(FLOW), 'Ende');

  // Assert
  const order = ['review-flow.js" report', 'followup.js" save <rolle> <slug> "<W>/abschluss"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  const positions = order.map((part) => end.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('flow_End_ReportEndsWithNextStepOfSkillForStatus', () => {
  // Arrange
  const end = section(readText(FLOW), 'Ende');
  const selection = 'Die Zeile `ENDE <status>` wählt den nächsten Schritt.';

  // Act
  const report = end.split('\n').find((line) => line.includes('Bericht im Chat:'));

  // Assert
  assert.ok(end.includes(selection), `${selection} fehlt`);
  assert.ok(report, 'Schritt Bericht im Chat fehlt');
  assert.ok(report.split('; ').at(-1).startsWith('zuletzt `Nächster Schritt: <Text des Skills für den Status>`'), report);
});

test('flow_Role_ReferencesLoopRulesInsteadOfCopyingThem', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  const role = section(text, 'Rolle');
  for (const part of ['`<PLUGIN>/shared/review-loop/loop.md`', 'Rolle', 'Hintergrund oder Vordergrund', 'gibt die Antwort des Menschen den Hook nicht frei', 'mit Exit 1']) {
    assert.ok(role.includes(part), `${part} fehlt`);
  }
  assert.doesNotMatch(text, /Du orchestrierst, sonst nichts|Nie `run_in_background: true`|der Hook blockt jede Verkettung/);
  assert.match(text, /in EINER Nachricht je aktivem Reviewer einen `Agent`-Call/);
});

test('flow_Text_NoRoundCapOrStandstillLeft', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.doesNotMatch(text, /Cap erreicht|Stillstand|--rounds|hochgestuft/);
  assert.ok(wordCount(text) < 1000);
});

test('flow_ScriptChecks_RunInRoundOneAndVerification', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('review-flow.js" script-checks <FLAGS> --runde <runde>'), 'script-checks fehlt');
  assert.ok(section(text, 'Runde 1').includes('Danach die Skript-Prüfungen des Skills.'), 'Skript-Prüfungen in Runde 1 fehlen');
  assert.ok(section(text, 'Nachprüfung').includes('Danach die Skript-Prüfungen des Skills mit `D = <W>/runde-2`.'), 'Skript-Prüfungen in der Nachprüfung fehlen');
});

test('flow_Pause_ShowsQuestionsFileAndPutsPriorityFirst', () => {
  // Act
  const pause = section(readText(FLOW), 'Anhalten');

  // Assert
  assert.ok(pause.includes('guard-orchestrator.js" pause <SESSION> --show "<W>/runde-1/fragen.md"'));
  assert.ok(pause.includes(PRIO));
});

test('flow_End_ShowsReportFileBeforeCleanupAndKeepsPriority', () => {
  // Act
  const end = section(readText(FLOW), 'Ende');

  // Assert
  const order = ['review-flow.js" report', 'guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  const positions = order.map((part) => end.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(end.includes(PRIO));
});

test('loop_Closing_KeepsPriorityForTheReport', () => {
  // Act
  const closing = section(readText(LOOP), 'Abschluss');

  // Assert
  assert.ok(closing.includes(PRIO));
});
