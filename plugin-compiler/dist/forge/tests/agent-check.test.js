'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { agentProblem } = require('../scripts/lib/agent-check');
const { decide } = require('../scripts/agent-check');
const guard = require('../scripts/guard-orchestrator.js');
const { makeRepo, commitFile, git } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'agent-check.js');
const IMPLEMENTER = 'dv-forge:implementation-implementer';
const TASK_REVIEWER = 'dv-forge:implementation-task-reviewer';
const RE_REVIEWER = 'dv-forge:implementation-re-reviewer';
const FINAL_REVIEWER = 'dv-forge:implementation-final-reviewer';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-agent-'));
}

// Erzwungener Commit einer ignorierten Datei, wie ihn `git add -f` im Arbeitsbereich erzeugt.
function forceCommit(repo, file) {
  fs.writeFileSync(path.join(repo, file), 'r');
  git(repo, 'add', '-f', file);
  git(repo, 'commit', '--quiet', '-m', 'oops');
}

function agentTranscript(prompt) {
  const file = path.join(tmp(), 'agent.jsonl');
  fs.writeFileSync(file, `${JSON.stringify({ type: 'user', message: { role: 'user', content: prompt } })}\n`);
  return file;
}

// Repo mit Arbeitsbereich .forge/implementation/x, Berichtsdatei und Auftrag wie im task-loop.
function task({ report = 'Umgesetzt.\n' } = {}) {
  const repo = makeRepo();
  const workspace = path.join(repo, '.forge', 'implementation', 'x');
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(repo, '.forge', '.gitignore'), '*\n');
  if (report !== null) fs.writeFileSync(path.join(workspace, 'task-1-report.md'), report);
  const prompt = `Brief: ${workspace}/task-1-brief.md\nBericht: ${workspace}/task-1-report.md\nRepo: ${repo}\nKontext: eins`;
  return { repo, workspace, input: { agent_type: IMPLEMENTER, agent_id: 'a1', cwd: repo, agent_transcript_path: agentTranscript(prompt), last_assistant_message: 'Status: done\nCommits: abc123 feat: x\n14/14 grün\nBericht: x' } };
}

test('implementerProblem_CleanCheckoutWithReport_Allows', () => {
  assert.equal(agentProblem(task().input), null);
});

test('implementerProblem_NoStatusLine_Blocks', () => {
  const { input } = task();
  assert.match(agentProblem({ ...input, last_assistant_message: 'Fertig.' }), /Status: done/);
});

test('implementerProblem_AllFourStatusValues_AreRecognised', () => {
  const { input } = task();
  for (const status of ['done', 'done-with-concerns', 'blocked', 'needs-context']) {
    assert.equal(agentProblem({ ...input, last_assistant_message: `Status: ${status}\nx` }), null, status);
  }
});

test('implementerProblem_UncommittedFile_Blocks', () => {
  const { repo, input } = task();
  fs.writeFileSync(path.join(repo, 'neu.js'), 'x');
  assert.match(agentProblem(input), /noch offen: neu\.js/);
});

test('implementerProblem_BlockedWithUncommittedWork_Allows', () => {
  const { repo, input } = task();
  fs.writeFileSync(path.join(repo, 'neu.js'), 'x');
  assert.equal(agentProblem({ ...input, last_assistant_message: 'Status: blocked\nGrund' }), null);
});

test('implementerProblem_UncommittedFileFromBaseline_Allows', () => {
  const { repo, input } = task();
  fs.writeFileSync(path.join(repo, 'vorher.js'), 'x');
  const gitDir = path.resolve(repo, git(repo, 'rev-parse', '--absolute-git-dir'));
  const files = require('../scripts/work').openFiles(repo).open;
  assert.deepEqual(files, ['vorher.js']);
  const hash = require('node:crypto').createHash('sha1').update('x').digest('hex');
  fs.writeFileSync(path.join(gitDir, 'forge-baseline.json'), JSON.stringify({ branch: 'main', files: { 'vorher.js': `??:${hash}` } }));
  assert.equal(agentProblem(input), null);
  fs.writeFileSync(path.join(repo, 'vorher.js'), 'geaendert');
  assert.match(agentProblem(input), /vorher\.js/);
});

test('implementerProblem_ReportFileMissingOrEmpty_Blocks', () => {
  assert.match(agentProblem(task({ report: null }).input), /Berichtsdatei .* fehlt oder ist leer/);
  assert.match(agentProblem(task({ report: '' }).input), /Berichtsdatei .* fehlt oder ist leer/);
});

test('implementerProblem_NoReportLineInPrompt_SkipsReportCheck', () => {
  const { repo, input } = task({ report: null });
  const prompt = `Repo: ${repo}`;
  assert.equal(agentProblem({ ...input, agent_transcript_path: agentTranscript(prompt) }), null);
});

test('implementerProblem_CommitTouchingForgeSinceBaseTag_Blocks', () => {
  const { repo, input } = task();
  git(repo, 'tag', 'forge-base/x', 'HEAD');
  commitFile(repo, 'src/a.js', 'a', 'feat: a');
  assert.equal(agentProblem(input), null);
  forceCommit(repo, '.forge/implementation/x/report.md');
  assert.match(agentProblem(input), /berührt \.forge\/: \.forge\/implementation\/x\/report\.md/);
});

test('implementerProblem_CommitTouchingForgeButNoBaseTag_SkipsThatPart', () => {
  const { repo, input } = task();
  forceCommit(repo, '.forge/implementation/x/report.md');
  assert.equal(agentProblem(input), null);
});

test('implementerProblem_UnreadableTranscriptOrNoRepo_FailsOpen', () => {
  const { input } = task();
  assert.equal(agentProblem({ ...input, agent_transcript_path: '/nix/da.jsonl' }), null);
  assert.equal(agentProblem({ ...input, cwd: tmp(), agent_transcript_path: agentTranscript('Brief: x') }), null);
});

const REVIEW = (verdict, lines = '- 🟢 `a.js:1` — nett') => `### Spec-Treue\n- ✅ erfüllt\n\n### Findings\n${lines}\n\n### Urteil\n**Task:** ${verdict}\n`;

test('reviewerProblem_CleanApproval_Allows', () => {
  for (const type of [TASK_REVIEWER, RE_REVIEWER, FINAL_REVIEWER]) {
    assert.equal(agentProblem({ agent_type: type, last_assistant_message: REVIEW('freigegeben — passt') }), null, type);
  }
});

test('reviewerProblem_MissingVerdictLine_Blocks', () => {
  for (const type of [TASK_REVIEWER, RE_REVIEWER, FINAL_REVIEWER]) {
    assert.match(agentProblem({ agent_type: type, last_assistant_message: '### Findings\n- 🟢 x' }), /Urteilszeile/, type);
  }
});

test('reviewerProblem_ApprovalWithRedFinding_BlocksWithFixedSentence', () => {
  const reason = agentProblem({ agent_type: TASK_REVIEWER, last_assistant_message: REVIEW('freigegeben — ok', '- 🔴 `a.js:1` — kaputt — warum — wie') });
  assert.match(reason, /Mit 🔴 ist das Urteil nachbessern/);
});

test('reviewerProblem_ReworkWithRedFinding_Allows', () => {
  assert.equal(agentProblem({ agent_type: TASK_REVIEWER, last_assistant_message: REVIEW('nachbessern — kaputt', '- 🔴 `a.js:1` — kaputt — warum — wie') }), null);
});

test('reviewerProblem_RedOnlyOutsideScope_Allows', () => {
  const text = `${REVIEW('freigegeben — ok')}\n### Außerhalb des Scopes\n- 🔴 \`b.js:1\` — alt\n`.replace('### Urteil', '### Urteil');
  assert.equal(agentProblem({ agent_type: TASK_REVIEWER, last_assistant_message: text }), null);
});

test('agentProblem_OtherAgentOrNoMessage_Allows', () => {
  assert.equal(agentProblem({ agent_type: 'general-purpose', last_assistant_message: 'x' }), null);
  assert.equal(agentProblem({ agent_type: TASK_REVIEWER }), null);
  assert.equal(agentProblem({ agent_type: IMPLEMENTER }), null);
});

test('decide_ProblemRepeats_BlocksTwiceThenLetsTheAgentEnd', () => {
  const root = tmp();
  const input = { agent_type: TASK_REVIEWER, agent_id: 'r1', last_assistant_message: 'keine Urteilszeile' };
  assert.equal(decide(input, root).decision, 'block');
  assert.equal(decide({ ...input, stop_hook_active: true }, root).decision, 'block');
  assert.equal(decide({ ...input, stop_hook_active: true }, root), null);
});

test('decide_StopHookActiveWithoutEarlierBlock_DoesNotBlock', () => {
  const input = { agent_type: TASK_REVIEWER, agent_id: 'r2', stop_hook_active: true, last_assistant_message: 'x' };
  assert.equal(decide(input, tmp()), null);
});

test('decide_NoAgentIdAndStopHookActive_DoesNotBlock', () => {
  const input = { agent_type: TASK_REVIEWER, last_assistant_message: 'x' };
  assert.equal(decide(input, tmp()).decision, 'block');
  assert.equal(decide({ ...input, stop_hook_active: true }, tmp()), null);
});

test('decide_CleanResult_ResetsTheBudget', () => {
  const root = tmp();
  const bad = { agent_type: TASK_REVIEWER, agent_id: 'r3', last_assistant_message: 'x' };
  decide(bad, root);
  assert.equal(decide({ ...bad, last_assistant_message: REVIEW('freigegeben — ok') }, root), null);
  assert.equal(decide(bad, root).decision, 'block');
});

test('cli_BadReviewer_PrintsBlockJson', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify({ agent_type: RE_REVIEWER, agent_id: 'cli-1', last_assistant_message: 'nix' }), encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).decision, 'block');
  fs.rmSync(path.join(os.tmpdir(), 'dv-forge', 'blocks-cli-1.json'), { force: true });
});

test('cli_BrokenInput_FailsOpen', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { input: '{kaputt', encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge agent-check/);
});

// PreToolUse des Umsetzers

function implementerBash(command, overrides = {}) {
  return guard.decidePreTool({ session_id: 's', agent_id: 'a1', agent_type: IMPLEMENTER, cwd: tmp(), tool_name: 'Bash', tool_input: { command }, ...overrides }, tmp());
}

for (const command of ['git add -A', 'git add .', 'git add --all', 'git push', 'git push origin HEAD', 'git merge main', 'git rebase main', 'git reset --hard HEAD~1', 'git commit --no-verify -m x', 'git -C /r push']) {
  test(`decidePreTool_ImplementerDenies_${command.replace(/\W+/g, '_')}`, () => {
    assert.match(implementerBash(command), /Der Umsetzer darf/);
  });
}

for (const command of ['git add src/a.js tests/a.test.js', 'git commit -m "feat: x"', 'git status --porcelain', 'git reset HEAD a.js', 'git stash list', 'git log --oneline', 'git commit -m "docs: git push erklärt"']) {
  test(`decidePreTool_ImplementerAllows_${command.replace(/\W+/g, '_').slice(0, 50)}`, () => {
    assert.equal(implementerBash(command), null);
  });
}

test('decidePreTool_OtherSubagentOrMainSession_NotRestrictedByImplementerRule', () => {
  assert.equal(implementerBash('git push', { agent_type: 'general-purpose' }), null);
  assert.equal(guard.decidePreTool({ session_id: 's', cwd: tmp(), tool_name: 'Bash', tool_input: { command: 'git push' } }, tmp()), null);
});

test('decidePreTool_ImplementerPowerShellAndNonShell_Handled', () => {
  assert.ok(implementerBash('git push', { tool_name: 'PowerShell' }));
  assert.equal(implementerBash('git push', { tool_name: 'Read', tool_input: { file_path: 'x' } }), null);
});

test('hooksJson_SubagentStop_RunsResultCheckThenAgentCheck', () => {
  const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
  assert.deepEqual(hooks.SubagentStop[0].hooks.map((hook) => hook.command), [
    'node "${CLAUDE_PLUGIN_ROOT}/scripts/result-check.js"',
    'node "${CLAUDE_PLUGIN_ROOT}/scripts/agent-check.js"',
  ]);
});
