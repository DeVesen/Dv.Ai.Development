'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runDir, render } = require('../scripts/aggregate-findings.js');
const { progress } = require('../scripts/rework-outcome.js');
const resultCheck = require('../scripts/result-check.js');
const guard = require('../scripts/guard-orchestrator.js');

const SCRIPTS = path.join(__dirname, '..', 'scripts');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-files-'));
}

function finding(location, severity, consequence = 'c') {
  return { location, quote: 'q', severity, consequence, rationale: 'r' };
}

function writeReview(dir, reviewer, findings, summary = `${reviewer} geprüft`) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${reviewer}.json`), JSON.stringify({ reviewer, summary, findings }));
}

test('aggregateDir_FileMissing_ReviewerFailedWithReasonAndRound', () => {
  const dir = tmp();
  writeReview(dir, 'coverage', []);
  const output = render(runDir(dir, ['coverage', 'risks'], undefined, '2'));
  assert.match(output, /^STATUS clean=false red=0 yellow=0 green=0 failed=risks$/m);
  assert.match(output, /- coverage: coverage geprüft/);
  assert.match(output, /- risks: ausgefallen in Review 2 — Ergebnisdatei fehlt/);
});

test('aggregateDir_NameMismatchOrInvalid_CountsAsFailedAndNamesError', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'risks.json'), JSON.stringify({ reviewer: 'coverage', findings: [] }));
  fs.writeFileSync(path.join(dir, 'coverage.json'), '{kein json');
  const output = render(runDir(dir, ['coverage', 'risks']));
  assert.match(output, /failed=coverage,risks/);
  assert.match(output, /ERROR Dateiname risks\.json passt nicht zu reviewer coverage/);
  assert.match(output, /- risks: ausgefallen — Ergebnis ungültig/);
});

test('aggregateDir_SeveralFindingsOneLocation_ShowsCountAndAllConsequences', () => {
  const dir = tmp();
  writeReview(dir, 'coverage', [finding('Task 1', 'red', 'erstens'), finding('Task 1', 'yellow', 'zweitens')]);
  writeReview(dir, 'risks', [finding('Task 01', 'green', 'drittens')]);
  const output = render(runDir(dir, ['coverage', 'risks']));
  assert.match(output, /\| Stufe \| Stelle \| Anzahl \| Reviewer \| Konsequenzen \|/);
  assert.match(output, /\| 🔴 \| Task 1 \| 3 \| coverage, risks \| 🔴 erstens<br>🟡 zweitens<br>🟢 drittens \|/);
});

test('aggregateCli_Dir_WritesAggregateFileAndIgnoresReworkJson', () => {
  const dir = tmp();
  writeReview(dir, 'coverage', [finding('AC-01', 'red')]);
  fs.writeFileSync(path.join(dir, 'rework.json'), '{"results":[]}');
  const result = spawnSync(process.execPath, [path.join(SCRIPTS, 'aggregate-findings.js'), '--dir', dir, '--expect', 'coverage', '--round', '1'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'aggregate.md'), 'utf8'), result.stdout);
  assert.doesNotMatch(result.stdout, /Unerwarteter Reviewer/);
});

function round(workspace, r, reds, changed, consequence = 'c') {
  const dir = path.join(workspace, `runde-${r}`);
  writeReview(dir, 'coverage', reds.map((location) => finding(location, 'red', consequence)));
  const output = spawnSync(process.execPath, [path.join(SCRIPTS, 'aggregate-findings.js'), '--dir', dir, '--expect', 'coverage'], { encoding: 'utf8' });
  assert.equal(output.status, 0);
  if (changed) fs.writeFileSync(path.join(dir, 'rework.json'), JSON.stringify({ results: changed.map((location) => ({ location, status: 'changed' })) }));
}

test('progress_RedChangedAndGone_IsProgress', () => {
  const workspace = tmp();
  round(workspace, 1, ['Task 1', 'Task 2'], ['Task 1']);
  round(workspace, 2, ['Task 2']);
  assert.deepEqual(progress(workspace, 1), { progress: true, fixed: ['task 1'], renewed: [] });
});

test('progress_OnlyNotesOrRedReturns_IsStandstill', () => {
  const workspace = tmp();
  round(workspace, 1, ['Task 1'], ['Task 1']);
  round(workspace, 2, ['Task 01']);
  assert.equal(progress(workspace, 1).progress, false);
  const notesOnly = tmp();
  round(notesOnly, 1, ['Task 1'], []);
  round(notesOnly, 2, []);
  assert.equal(progress(notesOnly, 1).progress, false);
});

test('progress_RedAgainAtSameLocationWithOtherContent_IsProgress', () => {
  const workspace = tmp();
  round(workspace, 1, ['AC-08'], ['AC-08'], 'Tooltip ungeprüft');
  round(workspace, 2, ['AC-08'], null, 'Popup ungeprüft');
  assert.deepEqual(progress(workspace, 1), { progress: true, fixed: [], renewed: ['ac-8'] });
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'rework-outcome.js'), 'progress', '--dir', workspace, '--round', '1'], { encoding: 'utf8' });
  assert.equal(run.stdout, 'PROGRESS true\nRENEWED ac-8\n');
});

test('progress_RedAgainWithOtherContentButNotChanged_IsStandstill', () => {
  const workspace = tmp();
  round(workspace, 1, ['AC-08'], [], 'Tooltip ungeprüft');
  round(workspace, 2, ['AC-08'], null, 'Popup ungeprüft');
  assert.equal(progress(workspace, 1).progress, false);
});

test('reworkOutcomeCli_HumanQuestion_EscalatesSpecFindingToHuman', () => {
  const workspace = tmp();
  round(workspace, 1, ['AC-18'], null);
  const dir = path.join(workspace, 'runde-1');
  fs.writeFileSync(path.join(dir, 'rework.json'), JSON.stringify({ results: [{ location: 'AC-18', status: 'human-question' }] }));
  const result = spawnSync(process.execPath, [path.join(SCRIPTS, 'rework-outcome.js'), '--escalation-status', 'human-question', '--dir', dir], { encoding: 'utf8' });
  assert.equal(result.stdout, 'OUTCOME all-red-escalated=true escalated=1\nESCALATED AC-18\n');
});

test('reworkOutcomeCli_DirMode_ReadsAggregateAndReworkFile', () => {
  const workspace = tmp();
  round(workspace, 1, ['Task 1'], []);
  const dir = path.join(workspace, 'runde-1');
  fs.writeFileSync(path.join(dir, 'rework.json'), JSON.stringify({ results: [{ location: 'Task 1', status: 'spec-question' }] }));
  const script = path.join(SCRIPTS, 'rework-outcome.js');
  const result = spawnSync(process.execPath, [script, '--escalation-status', 'spec-question', '--dir', dir], { encoding: 'utf8' });
  assert.equal(result.stdout, 'OUTCOME all-red-escalated=true escalated=1\nESCALATED Task 1\n');
  const progressRun = spawnSync(process.execPath, [script, 'progress', '--dir', workspace, '--round', '1'], { encoding: 'utf8' });
  assert.equal(progressRun.stdout, 'PROGRESS false\n');
  assert.equal(spawnSync(process.execPath, [script, 'progress', '--dir', workspace], { encoding: 'utf8' }).status, 2);
});

function transcript(prompt) {
  const file = path.join(tmp(), 'agent.jsonl');
  fs.writeFileSync(file, `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: prompt }] } })}\n`);
  return file;
}

test('resultCheck_FileMissing_BlocksStopWithPath', () => {
  const target = path.join(tmp(), 'risks.json');
  const decision = resultCheck.decide({ agent_transcript_path: transcript(`Plan: /x/plan.md\nErgebnis: ${target}`) });
  assert.equal(decision.decision, 'block');
  assert.ok(decision.reason.includes(target));
});

test('resultCheck_ValidFileOrNoResultLineOrSecondStop_AllowsStop', () => {
  const target = path.join(tmp(), 'risks.json');
  fs.writeFileSync(target, JSON.stringify({ reviewer: 'risks', summary: 's', findings: [] }));
  assert.equal(resultCheck.decide({ agent_transcript_path: transcript(`- \`Ergebnis:\` ${target}`) }), null);
  assert.equal(resultCheck.decide({ agent_transcript_path: transcript('Brief: /x') }), null);
  assert.equal(resultCheck.decide({ stop_hook_active: true, agent_transcript_path: transcript('Ergebnis: /fehlt.json') }), null);
});

test('resultCheck_InvalidJson_Blocks', () => {
  const target = path.join(tmp(), 'risks.json');
  fs.writeFileSync(target, '{"reviewer":"risks"}');
  assert.match(resultCheck.decide({ agent_transcript_path: transcript(`Ergebnis: ${target}`) }).reason, /weder "findings" noch "results"/);
});

test('guard_ReviewAgentWritesOutsideWorkspace_Denied', () => {
  const cwd = tmp();
  const base = { session_id: 's', cwd, agent_id: 'a1', tool_name: 'Write' };
  const outside = guard.decidePreTool({ ...base, agent_type: 'dv-forge:plan-review-risks', tool_input: { file_path: path.join(cwd, 'src', 'a.js') } });
  assert.match(outside, /nur in den Arbeitsbereich \.forge\//);
  const inside = { ...base, agent_type: 'dv-forge:plan-review-risks', tool_input: { file_path: path.join(cwd, '.forge', 'plan-review', 'x', 'runde-1', 'risks.json') } };
  assert.equal(guard.decidePreTool(inside), null);
  assert.ok(guard.decidePreTool({ ...base, agent_type: 'dv-forge:spec-rework', tool_input: { file_path: path.join(cwd, 'spec.md') } }));
});

test('guard_ImplementerOrMainSessionWrites_NotRestricted', () => {
  const cwd = tmp();
  const file = path.join(cwd, 'src', 'a.js');
  assert.equal(guard.decidePreTool({ session_id: 's', cwd, agent_id: 'a1', agent_type: 'dv-forge:implementation-implementer', tool_name: 'Write', tool_input: { file_path: file } }), null);
  assert.equal(guard.decidePreTool({ session_id: 's', cwd, agent_id: 'a1', agent_type: 'dv-forge:plan-review-risks', tool_name: 'Edit', tool_input: { file_path: file } }), null);
  assert.equal(guard.decidePreTool({ session_id: 'ohne-marker', cwd, tool_name: 'Write', tool_input: { file_path: file } }, tmp()), null);
});
