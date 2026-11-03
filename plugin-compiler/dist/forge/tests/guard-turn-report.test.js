'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');
const { renderOrchestratorReport } = require('../scripts/lib/orchestrator-report-text');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'guard-orchestrator.js');
const SESSION = 'report-session';
const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

function env(skill = 'plan-orchestrator') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-report-'));
  if (skill) guard.onPrompt({ session_id: SESSION, cwd: dir, prompt: `/dv-forge:${skill} s.md` }, dir);
  return { tmpRoot: dir, cwd: dir };
}

function turnEnd(e, entries, extra = {}) {
  const file = path.join(e.cwd, 't.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return guard.onTurnEnd({ session_id: SESSION, transcript_path: file, last_assistant_message: '', ...extra }, e.tmpRoot);
}

const FULL = '# Abschlussbericht\n**Ergebnis:** ok\n\n# Was sich im Plan geändert hat\nnichts\n\n# Was ist noch offen\n- nichts';

for (const skill of guard.STAGE_RUNS) {
  test(`onTurnEnd_${skill}WithoutReport_BlocksOnce`, () => {
    const e = env(skill);
    const reason = turnEnd(e, [human('los'), said('Fertig, alles erledigt.')]);
    assert.match(reason, /Der Lauf endet ohne Abschlussbericht/);
    assert.match(reason, /orchestrator-report\.js/);
    assert.match(reason, /--abbruch/);
    assert.equal(turnEnd(e, [human('los'), said('Fertig, alles erledigt.')]), null);
  });
}

test('onTurnEnd_SessionOrchestratorWithoutReport_DoesNotBlock', () => {
  const e = env('session-orchestrator');
  assert.equal(turnEnd(e, [human('los'), said('Etappe läuft.')]), null);
});

test('onTurnEnd_NoRun_DoesNotBlock', () => {
  const e = env(null);
  assert.equal(turnEnd(e, [human('los'), said('Hallo')]), null);
});

test('onTurnEnd_FullReportShown_Allows', () => {
  const e = env();
  assert.equal(turnEnd(e, [human('los'), said(FULL)]), null);
});

test('onTurnEnd_ReportOnlyInLastMessage_Allows', () => {
  const e = env();
  assert.equal(turnEnd(e, [human('los'), said('x')], { last_assistant_message: FULL }), null);
});

test('onTurnEnd_AbortReportWithOneHeadingOfTheThree_Allows', () => {
  for (const heading of ['# Abschlussbericht', '# Was sich im Spec geändert hat', '# Was ist noch offen']) {
    const e = env('spec-review-orchestrator');
    assert.equal(turnEnd(e, [human('los'), said(`${heading}\ntext`)]), null, heading);
  }
});

test('onTurnEnd_HeadingOnlyMentionedInsideSentence_Blocks', () => {
  const e = env();
  assert.ok(turnEnd(e, [human('los'), said('Ich gebe gleich den # Abschlussbericht aus.')]));
});

test('onTurnEnd_QuestionToTheHumanAtTheEnd_Allows', () => {
  const e = env();
  assert.equal(turnEnd(e, [human('los'), said('Welche Workitem-Nummer gilt?\n\n')]), null);
});

test('onTurnEnd_QuestionInTheMiddleButStatementAtTheEnd_Blocks', () => {
  const e = env();
  assert.ok(turnEnd(e, [human('los'), said('Was nun?\nIch warte.')]));
});

test('onTurnEnd_ReviewMarkerPaused_Allows', () => {
  const e = env();
  guard.writeMarker(SESSION, { command: '/dv-forge:plan-review', protected: [], paused: true }, e.tmpRoot);
  assert.equal(turnEnd(e, [human('los'), said('Bitte antworte.')]), null);
});

test('onTurnEnd_ReviewMarkerNotPaused_Blocks', () => {
  const e = env();
  guard.writeMarker(SESSION, { command: '/dv-forge:plan-review', protected: [] }, e.tmpRoot);
  assert.ok(turnEnd(e, [human('los'), said('Bitte antworte.')]));
});

test('onTurnEnd_MustShowPending_LeavesItToTheMustShowCheck', () => {
  const e = env();
  guard.writeMarker(SESSION, { mustShow: { anchors: ['# A'], lines: 1, text: '# A', file: 'x', attempts: 0 } }, e.tmpRoot);
  assert.match(turnEnd(e, [human('los'), said('nichts')]), /Gib den folgenden Text unverändert/);
});

// Bericht eines Orchestrators, wie orchestrator-report.js ihn schreibt: drei Abschnitte, keiner für einen nächsten Schritt.
const CLOSING_REPORT = renderOrchestratorReport({
  art: 'spec', resultLine: '**Ergebnis:** ✅ Bereit zum Planen', flowLines: [], checked: [], found: [], notes: [], changes: [], decisions: [], open: [], questions: [], green: [],
}, { lines: [] });

test('onTurnEnd_ClosingReportWithoutNextStepsSectionShownInFull_PassesTheMustShowCheck', () => {
  // Arrange
  const e = env();
  const file = path.join(e.cwd, 'abschluss.md');
  fs.writeFileSync(file, `${CLOSING_REPORT}\n`);
  guard.show(SESSION, file, e.tmpRoot);

  // Act
  const reason = turnEnd(e, [human('los'), said(CLOSING_REPORT)]);

  // Assert
  assert.equal(reason, null);
  assert.deepEqual(CLOSING_REPORT.split('\n').filter((line) => line.startsWith('# ')), ['# Abschlussbericht', '# Was sich in der Spec geändert hat', '# Was ist noch offen']);
});

test('onTurnEnd_ShortenedClosingReportMissingASection_IsBlockedAndNamesTheMissingHeading', () => {
  // Arrange
  const e = env();
  const file = path.join(e.cwd, 'abschluss.md');
  fs.writeFileSync(file, `${CLOSING_REPORT}\n`);
  guard.show(SESSION, file, e.tmpRoot);
  const shortened = CLOSING_REPORT.slice(0, CLOSING_REPORT.indexOf('# Was ist noch offen')).trimEnd();

  // Act
  const reason = turnEnd(e, [human('los'), said(shortened)]);

  // Assert
  assert.match(reason, /# Was ist noch offen/);
});

test('onTurnEnd_StopHookActive_DoesNotBlock', () => {
  const e = env();
  assert.equal(turnEnd(e, [human('los'), said('Fertig.')], { stop_hook_active: true }), null);
});

test('onTurnEnd_AfterRunEnd_DoesNotBlock', () => {
  const e = env();
  guard.endRun(SESSION, e.tmpRoot);
  assert.equal(turnEnd(e, [human('los'), said('Fertig.')]), null);
});

test('onTurnEnd_BlockedOnce_RunMarkerStillGuardsGit', () => {
  const e = env();
  turnEnd(e, [human('los'), said('Fertig.')]);
  assert.equal(guard.readRun(SESSION, e.tmpRoot).skill, 'plan-orchestrator');
});

test('cli_TurnEndWithoutReport_PrintsBlockJson', () => {
  const e = env();
  const file = path.join(e.cwd, 't.jsonl');
  fs.writeFileSync(file, `${JSON.stringify(human('los'))}\n${JSON.stringify(said('Fertig.'))}\n`);
  const tmp = { ...process.env, TMPDIR: e.tmpRoot, TMP: e.tmpRoot, TEMP: e.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input: JSON.stringify({ session_id: SESSION, transcript_path: file }), encoding: 'utf8', env: tmp });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
});

test('cli_TurnEndUnreadableTranscriptDuringRun_FailsOpen', () => {
  const e = env();
  const tmp = { ...process.env, TMPDIR: e.tmpRoot, TMP: e.tmpRoot, TEMP: e.tmpRoot };
  const input = JSON.stringify({ session_id: SESSION, transcript_path: path.join(e.cwd, 'fehlt.jsonl') });
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input, encoding: 'utf8', env: tmp });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});
