'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');
const { makeRepo, commitFile, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'guard-orchestrator.js');
const HOOKS = path.join(__dirname, '..', 'hooks', 'hooks.json');
const SESSION = 'session-a';

function setup() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-repo-'));
  const specPath = path.join(cwd, 'docs', 'spec.md');
  guard.onPrompt({ session_id: SESSION, cwd, prompt: '/dv-forge:spec-review docs/spec.md --rounds 2' }, tmpRoot);
  return { tmpRoot, cwd, specPath };
}

function preTool(env, overrides) {
  return guard.decidePreTool({ session_id: SESSION, cwd: env.cwd, ...overrides }, env.tmpRoot);
}

test('parseSkillCall_SpecReviewPlainAndQuoted_ProtectsSpec', () => {
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review docs/spec.md'),
    { command: '/dv-forge:spec-review', files: ['docs/spec.md'] });
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review "my docs/spec.md" q.md --rounds 2').files, ['my docs/spec.md']);
});

test('parseSkillCall_OtherPrompt_ReturnsNull', () => {
  assert.equal(guard.parseSkillCall('bitte review docs/spec.md'), null);
  assert.equal(guard.parseSkillCall('/dv-forge:spec-review'), null);
});

test('onPrompt_SpecReview_WritesMarkerWithAbsoluteFileEntry', () => {
  const env = setup();
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
  assert.equal(marker.command, '/dv-forge:spec-review');
  assert.deepEqual(marker.protected, [{ path: env.specPath, kind: 'file' }]);
});

test('decidePreTool_MainSessionReadsSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
});

test('decidePreTool_MainSessionEditsSpecViaRelativePath_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Edit', tool_input: { file_path: 'docs/spec.md' } }));
});

test('decidePreTool_MainSessionGrepsSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: env.specPath } }));
});

test('decidePreTool_MainSessionGrepsSpecDirectory_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.cwd, 'docs') } }));
});

test('decidePreTool_MainSessionGrepsWithoutPath_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x' } }));
});

test('decidePreTool_MainSessionGrepsSiblingDirectory_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.cwd, 'src') } }), null);
});

test('decidePreTool_ShellCommandNamesSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/SPEC.md' } }));
});

test('decidePreTool_ShellCommandIsFileHash_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/file-hash.js" "${env.specPath}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_ShellCommandIsAggregate_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/aggregate-findings.js" --expect clarity <<'EOF'\nspec.md erwähnt\nEOF`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_SubagentReadsSpec_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { agent_id: 'agent-1', tool_name: 'Edit', tool_input: { file_path: env.specPath } }), null);
});

test('decidePreTool_OtherFile_Allows', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.cwd, 'other.md') } }), null);
});

test('decidePreTool_ForeignSession_Allows', () => {
  const env = setup();
  const input = { session_id: 'session-b', cwd: env.cwd, tool_name: 'Read', tool_input: { file_path: env.specPath } };
  assert.equal(guard.decidePreTool(input, env.tmpRoot), null);
});

test('release_ExistingMarker_RemovesItAndAllowsAgain', () => {
  const env = setup();
  guard.release(SESSION, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('release_NoMarker_DoesNotThrow', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  assert.doesNotThrow(() => guard.release('nobody', tmpRoot));
});

test('cli_PretoolOnSpec_PrintsDenyJson', () => {
  const env = setup();
  const input = JSON.stringify({ session_id: SESSION, cwd: env.cwd, tool_name: 'Read', tool_input: { file_path: env.specPath } });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'pretool'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('hooksJson_EveryCommand_PointsToExistingPluginScript', () => {
  const { hooks } = JSON.parse(fs.readFileSync(HOOKS, 'utf8'));
  assert.ok(hooks.UserPromptSubmit && hooks.PreToolUse && hooks.SessionEnd && hooks.SubagentStop);
  assert.match(hooks.Stop[0].hooks[0].command, / turn-end$/, 'Stop prüft nur den Pflichttext und gibt den Guard nie frei');
  const commands = Object.values(hooks).flat().flatMap((entry) => entry.hooks.map((hook) => hook.command));
  for (const command of commands) {
    const match = /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/([a-z-]+\.js)/.exec(command);
    assert.ok(match, command);
    assert.ok(fs.existsSync(path.join(path.dirname(SCRIPT), match[1])), match[1]);
  }
});

function setupPlanReview(prompt = '/dv-forge:plan-review docs/forge/x/plan.md') {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-repo-'));
  guard.onPrompt({ session_id: SESSION, cwd, prompt }, tmpRoot);
  return {
    tmpRoot, cwd,
    planPath: path.join(cwd, 'docs', 'forge', 'x', 'plan.md'),
    specPath: path.join(cwd, 'docs', 'forge', 'x', 'spec.md'),
  };
}

function setupDirectory() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-dir-'));
  const repo = path.join(base, 'repo');
  guard.writeMarker(SESSION, { command: '/dv-forge:test', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  return { tmpRoot, cwd: base, repo, sibling: path.join(base, 'repo-alt') };
}

test('parseSkillCall_PlanReviewWithoutSpec_UsesSpecInPlanFolder', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review docs/forge/x/plan.md --rounds 2');
  assert.equal(call.command, '/dv-forge:plan-review');
  assert.equal(call.files[0], 'docs/forge/x/plan.md');
  assert.ok(call.files[1].replace(/\\/g, '/').endsWith('docs/forge/x/spec.md'));
});

test('parseSkillCall_FileMentionWithAt_StripsAt', () => {
  assert.deepEqual(guard.parseSkillCall('/dv-forge:spec-review @docs/spec.md').files, ['docs/spec.md']);
  assert.equal(guard.parseSkillCall('/dv-forge:plan-review @docs/forge/x/plan.md').files[0], 'docs/forge/x/plan.md');
});

test('parseSkillCall_PlanReviewWithSpec_ProtectsBoth', () => {
  const call = guard.parseSkillCall('/dv-forge:plan-review "my plans/plan.md" other/spec.md --rounds 2');
  assert.deepEqual(call.files, ['my plans/plan.md', 'other/spec.md']);
});

test('decidePreTool_PlanReviewMainSessionReadsPlan_DeniesWithPlanReason', () => {
  const env = setupPlanReview();
  const reason = preTool(env, { tool_name: 'Read', tool_input: { file_path: env.planPath } });
  assert.match(reason, /dv-forge:plan-review läuft/);
});

test('decidePreTool_PlanReviewMainSessionReadsSpecInPlanFolder_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
});

test('decidePreTool_PlanReviewShellNamesPlan_Denies', () => {
  const env = setupPlanReview();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/forge/x/PLAN.md' } }));
});

test('decidePreTool_PlanReviewShellIsReworkOutcome_Allows', () => {
  const env = setupPlanReview();
  const command = `node "/plugins/forge/scripts/rework-outcome.js" --escalation-status spec-question <<'EOF'\nplan.md\nEOF`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_ReviewFlowScriptNamesSpec_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/review-flow.js" round1 spec-review "${env.specPath}" "${env.cwd}/.forge/ws" clarity`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('pause_HumanAnswersAfterHalt_GuardStaysOnceThenReleases', () => {
  const env = setup();
  guard.pause(SESSION, env.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'F1: b, F2: später' }, env.tmpRoot);
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }));
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'danke' }, env.tmpRoot);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('pause_NoMarker_CreatesNone', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.pause('ohne-marker', tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath('ohne-marker', tmpRoot)), false);
});

test('decidePreTool_PlanReviewSubagentEditsPlan_Allows', () => {
  const env = setupPlanReview();
  assert.equal(preTool(env, { agent_id: 'agent-1', tool_name: 'Edit', tool_input: { file_path: env.planPath } }), null);
});

test('decidePreTool_DirectoryEntryFileInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.repo, 'src', 'x.cs') } }));
});

test('decidePreTool_DirectoryEntrySiblingWithSamePrefix_Allows', () => {
  const env = setupDirectory();
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.sibling, 'x.cs') } }), null);
});

test('decidePreTool_DirectoryEntryGrepInside_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Grep', tool_input: { pattern: 'x', path: path.join(env.repo, 'src') } }));
});

test('decidePreTool_DirectoryEntryFollowupScriptNamesWorkspace_Allows', () => {
  const env = setupDirectory();
  const command = `node "/plugins/forge/scripts/followup.js" save review demo "${path.join(env.repo, '.forge', 'review', 'demo', 'runde-1')}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('decidePreTool_DirectoryEntryShellNamesDirectory_Denies', () => {
  const env = setupDirectory();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `ls "${env.repo}"` } }));
});

function setupRepoAroundPlugin() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const repo = path.resolve(guard.PLUGIN_ROOT, '..', '..');
  guard.writeMarker(SESSION, { command: '/dv-forge:test', protected: [{ path: repo, kind: 'dir' }] }, tmpRoot);
  return { tmpRoot, cwd: repo };
}

test('decidePreTool_DirectoryEntryReadInsidePluginRoot_Allows', () => {
  const env = setupRepoAroundPlugin();
  const loop = path.join(guard.PLUGIN_ROOT, 'shared', 'review-loop', 'loop.md');
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: loop } }), null);
});

test('decidePreTool_DirectoryEntryEditInsidePluginRoot_Denies', () => {
  const env = setupRepoAroundPlugin();
  const loop = path.join(guard.PLUGIN_ROOT, 'shared', 'review-loop', 'loop.md');
  assert.ok(preTool(env, { tool_name: 'Edit', tool_input: { file_path: loop } }));
});

test('decidePreTool_FileEntryInsidePluginRoot_StillDeniesRead', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const spec = path.join(guard.PLUGIN_ROOT, 'tests', 'fixtures', 'flawed-spec.md');
  guard.writeMarker(SESSION, { command: '/dv-forge:spec-review', protected: [{ path: spec, kind: 'file' }] }, tmpRoot);
  assert.ok(preTool({ tmpRoot, cwd: guard.PLUGIN_ROOT }, { tool_name: 'Read', tool_input: { file_path: spec } }));
});

test('onPrompt_HumanPromptAfterRun_ReleasesButHarnessNoticeKeeps', () => {
  const env = setup();
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: '<task-notification>\n<task-id>x</task-id>' }, env.tmpRoot);
  assert.ok(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), 'Benachrichtigung gibt nicht frei');
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'Danke, und jetzt bitte X' }, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('onPrompt_PlanReviewWithSpecLineInPlanHeader_ProtectsThatSpec', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  const cwd = require('./lib/git-repo').makeRepo();
  fs.mkdirSync(path.join(cwd, 'docs', 'forge', 'x'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'docs', 'specs'), { recursive: true });
  fs.writeFileSync(path.join(cwd, 'docs', 'specs', 'andere.md'), '# Spec\n');
  fs.writeFileSync(path.join(cwd, 'docs', 'forge', 'x', 'plan.md'), '# Plan\n\n**Spec:** docs/specs/andere.md\n');
  guard.onPrompt({ session_id: SESSION, cwd, prompt: '/dv-forge:plan-review docs/forge/x/plan.md' }, tmpRoot);
  const reason = guard.decidePreTool({ session_id: SESSION, cwd, tool_name: 'Read', tool_input: { file_path: path.join(cwd, 'docs', 'specs', 'andere.md') } }, tmpRoot);
  assert.match(reason, /dv-forge:plan-review läuft/);
});

test('decidePreTool_DenyReason_NamesBlockedActionAndAllowedWay', () => {
  const env = setup();
  const reason = preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/SPEC.md' } });
  assert.match(reason, /Geblockt: Bash cat docs\/SPEC\.md\./);
  assert.match(reason, /Erlaubt sind: ein einzelner Aufruf node/);
});

test('decidePreTool_ShellReadsPluginFile_Allowed', () => {
  const env = setup();
  const file = path.join(guard.PLUGIN_ROOT, 'shared', 'review-loop', 'loop.md');
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command: `cat "${file}"` } }), null);
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `cat "${file}" docs/spec.md` } }));
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `cat "${file}"; cat docs/spec.md` } }));
});

test('onPrompt_ReviewFollowup_ProtectsLikeTheSavedReview', () => {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/plan.md', '# P\n\n### Task 1: Eins\n', 'plan');
  commitFile(repo, 'docs/forge/demo/spec.md', '# S\n', 'spec');
  const save = (role, savedAt) => {
    const dir = path.join(repo, '.forge', 'followup', role, 'demo');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ rolle: role, savedAt }));
  };
  const marker = (prompt) => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
    guard.onPrompt({ session_id: SESSION, cwd: repo, prompt }, tmpRoot);
    const file = guard.markerPath(SESSION, tmpRoot);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  };
  assert.equal(marker('/dv-forge:review-followup docs/forge/demo/plan.md b'), null);
  save('plan-review', '2026-09-28T10:00:00.000Z');
  const plan = marker('/dv-forge:review-followup docs/forge/demo/plan.md b');
  assert.equal(plan.command, '/dv-forge:review-followup');
  assert.deepEqual(plan.protected.map((entry) => entry.kind), ['file', 'file']);
  save('review', '2026-09-28T11:00:00.000Z');
  assert.ok(marker('/dv-forge:review-followup docs/forge/demo/plan.md 1:2').protected.every((entry) => entry.kind === 'dir'));
  save('spec-review', '2026-09-28T12:00:00.000Z');
  const spec = marker('/dv-forge:review-followup docs/forge/demo/spec.md b');
  assert.equal(spec.protected.length, 1);
  assert.ok(samePath(spec.protected[0].path, path.join(repo, 'docs/forge/demo/spec.md')));
});

const SHOWN = ['## Bericht', '', '### Runde 1', 'a', '### Offene Fragen', 'b'].join('\n');

function shownFile(dir, text = SHOWN) {
  const file = path.join(dir, 'bericht.md');
  fs.writeFileSync(file, text);
  return file;
}

function markerOf(env) {
  return JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
}

function bareEnv() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  return { tmpRoot, cwd: tmpRoot };
}

const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

function transcriptFile(env, entries) {
  const file = path.join(env.cwd, 't.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

function turnEnd(env, file, last = '') {
  return guard.onTurnEnd({ session_id: SESSION, transcript_path: file, last_assistant_message: last }, env.tmpRoot);
}

test('show_FileWithAnchors_StoresMustShowBesideProtection', () => {
  const env = setup();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const marker = markerOf(env);
  assert.deepEqual(marker.mustShow.anchors, ['## Bericht', '### Runde 1', '### Offene Fragen']);
  assert.equal(marker.mustShow.attempts, 0);
  assert.equal(marker.mustShow.text, SHOWN);
  assert.ok(marker.protected);
});

test('show_CrlfFile_StoresTextWithLf', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd, SHOWN.replace(/\n/g, '\r\n')), env.tmpRoot);
  assert.equal(markerOf(env).mustShow.text, SHOWN);
});

test('show_NoMarker_CreatesMarkerWithMustShowOnly', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.deepEqual(Object.keys(markerOf(env)), ['mustShow']);
});

test('show_FileWithoutAnchors_ThrowsAndLeavesMarker', () => {
  const env = setup();
  const before = fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8');
  assert.throws(() => guard.show(SESSION, shownFile(env.cwd, 'nur Fließtext'), env.tmpRoot), /keine Anker/);
  assert.equal(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'), before);
});

test('show_MissingFileOrPath_Throws', () => {
  const env = setup();
  assert.throws(() => guard.show(SESSION, path.join(env.cwd, 'gibt-es-nicht.md'), env.tmpRoot));
  assert.throws(() => guard.show(SESSION, undefined, env.tmpRoot), /--file/);
});

test('pauseWithShow_FileWithAnchors_PausesAndStoresMustShow', () => {
  const env = setup();
  guard.pauseWithShow(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(markerOf(env).paused, true);
  assert.ok(markerOf(env).mustShow);
});

test('pauseWithShow_FileWithoutAnchors_StillPauses', () => {
  const env = setup();
  assert.throws(() => guard.pauseWithShow(SESSION, shownFile(env.cwd, 'text'), env.tmpRoot));
  assert.equal(markerOf(env).paused, true);
  assert.equal(markerOf(env).mustShow, undefined);
});

test('release_WithMustShow_KeepsOnlyMustShowAndAllowsAgain', () => {
  const env = setup();
  guard.pause(SESSION, env.tmpRoot);
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  guard.release(SESSION, env.tmpRoot);
  assert.deepEqual(Object.keys(markerOf(env)), ['mustShow']);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('onPrompt_HumanPromptWithLeftoverMustShow_ClearsMarkerCompletely', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'weiter' }, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('decidePreTool_ShowCallOfOrchestrator_IsAllowedWhileSpecIsProtected', () => {
  const env = setup();
  const command = `node "${path.join(path.dirname(SCRIPT), 'guard-orchestrator.js')}" show ${SESSION} --file "${path.join(env.cwd, '.forge', 'spec-review', 'x', 'abschluss', 'bericht.md')}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('onTurnEnd_NoMarkerOrNoMustShow_ReturnsNullAndKeepsMarker', () => {
  const env = setup();
  const file = transcriptFile(env, [human('los'), said('x')]);
  assert.equal(turnEnd(env, file), null);
  assert.ok(markerOf(env).protected);
  assert.equal(turnEnd(bareEnv(), file), null);
});

test('onTurnEnd_AllAnchorsShown_FreesAndRemovesEmptyMarker', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN)]), 'fertig'), null);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('onTurnEnd_AllAnchorsShownButProtectionStays_KeepsProtection', () => {
  const env = setup();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN)])), null);
  assert.equal(markerOf(env).mustShow, undefined);
  assert.ok(markerOf(env).protected);
});

test('onTurnEnd_AnchorMissing_BlocksTwiceThenFrees', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const file = transcriptFile(env, [human('los'), said('Kurz: alles gut.')]);
  const first = turnEnd(env, file);
  const second = turnEnd(env, file);
  assert.match(first, /Es fehlt: ## Bericht \| ### Runde 1 \| ### Offene Fragen\./);
  assert.ok(first.endsWith(SHOWN));
  assert.equal(markerOf(env).mustShow.attempts, 2);
  assert.ok(second);
  assert.equal(turnEnd(env, file), null);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('onTurnEnd_TextBeforeLaterToolCalls_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const call = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } };
  const result = { type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } };
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN), call, result]), 'Erledigt.'), null);
});

test('onTurnEnd_TextOnlyInLastMessage_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said('x')]), SHOWN), null);
});

test('onTurnEnd_ShownTextWithCrlf_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN.replace(/\n/g, '\r\n'))])), null);
});

test('cli_TurnEndWithMissingAnchor_PrintsBlockJson', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const input = JSON.stringify({ session_id: SESSION, transcript_path: transcriptFile(env, [human('los'), said('x')]), last_assistant_message: 'x' });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.ok(output.reason.endsWith(SHOWN));
});

test('cli_TurnEndWithMissingTranscript_FailsOpen', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const input = JSON.stringify({ session_id: SESSION, transcript_path: path.join(env.cwd, 'fehlt.jsonl'), last_assistant_message: 'x' });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge guard:/);
});

test('cli_ShowAndPauseShow_StoreMustShow', () => {
  const env = setup();
  const file = shownFile(env.cwd);
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const shown = spawnSync(process.execPath, [SCRIPT, 'show', SESSION, '--file', file], { encoding: 'utf8', env: tmpEnv });
  assert.equal(shown.status, 0);
  assert.ok(markerOf(env).mustShow);
  const paused = spawnSync(process.execPath, [SCRIPT, 'pause', SESSION, '--show', file], { encoding: 'utf8', env: tmpEnv });
  assert.equal(paused.status, 0);
  assert.equal(markerOf(env).paused, true);
});

test('onPrompt_PausedWithLeftoverMustShow_DropsMustShowKeepsProtection', () => {
  // Arrange
  const env = setup();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  guard.pause(SESSION, env.tmpRoot);

  // Act
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'F1: b, F2: später' }, env.tmpRoot);

  // Assert
  const marker = markerOf(env);
  assert.equal(marker.mustShow, undefined);
  assert.ok(marker.protected);
  assert.equal(marker.paused, false);
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'danke' }, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});
