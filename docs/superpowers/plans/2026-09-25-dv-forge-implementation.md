# dv-forge Implementation (implementation + implementation-review) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the manually started skills `/dv-forge:implementation` (plan → code, one fresh subagent per task with task review, fix loop and final review) and `/dv-forge:implementation-review` (one-shot review by five parallel reviewers, mechanical aggregation and a closing scout).

**Architecture:** Block A adds four Node scripts (`plan-tasks.js`, `workspace.js`, `base-tag.js`, `review-package.js`), four agents, four references and the controller skill `implementation`; it depends on nothing new. Block B starts only after the review-loop generalisation of sub-project 2 exists (gate in Task 14). It adds the location type `file` to `aggregate-findings.js`, a guard row for `implementation-review`, five reviewer agents, a scout agent and the orchestrator skill `implementation-review`.

**Tech Stack:** Claude Code plugin (skills, agents, hooks), Node.js 24 (CommonJS, no dependencies), `node:test` + `node:assert/strict`, git ≥ 2.28.

**Spec:** `docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md`

## Global Constraints

- Plugin `dv-forge`, folder `plugins/forge/`. Nothing is taken from `dv-relay`: no names, texts or structures. Do not open `plugins/relay/` as a template.
- No file under `plugins/forge/skills`, `agents`, `shared`, `hooks`, `scripts` or `.claude-plugin` mentions `superpowers` or `subagent-driven-development` (spec AC-02). The German texts in this plan are the final wording, written fresh; copy them verbatim, do not re-translate from any English original.
- New artifact texts of this plan contain no typographic quotes (U+201E `„`, U+201C `“`, U+201D `”`); quotes are ASCII `"` or backticks. Subagents silently normalise U+201C, so the tests of this plan fail on any typographic quote.
- Block B (Tasks 14–20) starts only after Task 14 passes. Block A (Tasks 1–13) does not depend on sub-project 2 and may run while it is still being built.
- Scripts: Node, CommonJS, no npm dependencies, no `package.json`. Each script exports its functions and runs `main()` only under `require.main === module`. Exit codes: 0 ok, 1 domain error (message on stderr), 2 usage error.
- Test command: `node --test "plugins/forge/tests/*.test.js"`. Expected result after every task: `fail 0`. Do not compare absolute test counts — other sessions add tests in parallel. Files under `plugins/forge/tests/fixtures/` are fixture content and not part of this suite. The repo's `CLAUDE.md` rule "tests via dev-mcp" covers Angular and .NET; plugin scripts are tested with `node --test` (spec AC-24).
- Tests that need git create throw-away repositories under `os.tmpdir()` via `plugins/forge/tests/lib/git-repo.js`. No test touches the git state of this repo.
- Skill and agent bodies: German prose, English technical terms. Frontmatter `description` in English, starting with "Use when…".
- Skill frontmatter: `name`, `description`, `disable-model-invocation: true`, `argument-hint`. `SKILL.md` body under 500 words; details go into `references/` or `shared/review-loop/`.
- Agent frontmatter: `name`, `description`, `model` and — exactly as the task states — `tools`. `implementation-implementer` and `implementation-review-tests` have **no** `tools` line on purpose: they inherit all tools including MCP tools, because MCP server names differ per project (spec §12, point 1).
- `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_SESSION_ID}` are substituted only inside `SKILL.md`. Files a skill tells the model to read use the placeholders `<PLUGIN>` and `<SESSION>`; the skill defines them in its first lines.
- Parallel sessions work on `plugins/forge/` in the same working tree on branch `V2`. Before each task run `git status --short plugins/forge`. If a file the task touches shows changes that are not yours, stop and report instead of editing.
- Commits: stage only the paths named in the task (`git add <paths>`). Never `git add -A` or `git add .` — the working tree has unrelated uncommitted deletions under `docs/`. Conventional Commits, scope `forge`, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tasks marked **Controller** dispatch agents themselves and must run in the main session, not in an implementer subagent. Tasks marked **human** need the user in an interactive terminal.
- `<SCRATCH>` is the scratchpad directory of the executing session.

## File Structure

```
plugins/forge/
├── skills/
│   ├── implementation/
│   │   ├── SKILL.md                         controller: start, stop reasons, handover          (Task 12)
│   │   └── references/
│   │       ├── ledger.md                    ledger format, resume                              (Task 9)
│   │       ├── model-selection.md           model per role, escalation                         (Task 9)
│   │       ├── task-loop.md                 dispatch, status, task review, fix loop, breaker   (Task 10)
│   │       └── final-review.md              final review, one fix wave, one re-review          (Task 10)
│   └── implementation-review/
│       └── SKILL.md                         orchestrator on shared/review-loop/loop.md          (Task 19)
├── agents/
│   ├── implementation-implementer.md        one task or one findings list                      (Task 6)
│   ├── implementation-task-reviewer.md      brief compliance + quality of one task             (Task 7)
│   ├── implementation-re-reviewer.md        fix round against fix diff only                    (Task 7)
│   ├── implementation-final-reviewer.md     whole range, deferred triage                        (Task 8)
│   ├── implementation-review-{acceptance,plan-fidelity,design,tests,risks}.md                   (Task 17)
│   └── implementation-review-scout.md       1–3 proposals per 🔴/🟡 group                       (Task 18)
├── scripts/
│   ├── plan-tasks.js                        list | brief | header | slug                       (Task 2)
│   ├── workspace.js                         create | remove .forge/<role>/<slug>/              (Task 3)
│   ├── base-tag.js                          ensure | resolve forge-base/<slug>                 (Task 4)
│   ├── review-package.js                    commits + stat + diff -U10 for a range             (Task 5)
│   ├── aggregate-findings.js                + fileLocationType, --repo                         (Task 15)
│   └── guard-orchestrator.js                + implementation-review row, repo entries           (Task 16)
└── tests/
    ├── lib/git-repo.js                      temp git repos for tests                            (Task 3)
    ├── plan-tasks.test.js                                                                        (Task 2)
    ├── workspace.test.js                                                                         (Task 3)
    ├── base-tag.test.js                                                                          (Task 4)
    ├── review-package.test.js                                                                    (Task 5)
    ├── implementation-agents.test.js                                                             (Tasks 6–8)
    ├── implementation-skill.test.js         references + SKILL.md                               (Tasks 9, 10, 12)
    ├── implementation-origin.test.js        AC-02 scan                                          (Task 12)
    ├── fixture-repo.test.js                 fixture builder                                     (Tasks 11, 17)
    ├── aggregate-file.test.js                                                                    (Task 15)
    ├── guard-implementation-review.test.js                                                       (Task 16)
    ├── implementation-review-agents.test.js                                                      (Tasks 17, 18)
    ├── implementation-review-skill.test.js                                                       (Task 19)
    └── fixtures/implementation/
        ├── build-repo.js                    builds a temp git repo from the layers below        (Task 11)
        ├── project/…                        base layer: spec, plan, CLAUDE.fixture.md, README    (Task 11)
        └── flawed/…                         flawed implementation, one error per reviewer        (Task 17)
```

Modify at the end of each block: `plugins/forge/.claude-plugin/plugin.json` (minor version bump) and `docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md` (`## 12.` spike result, `I16`/`I17` smoke-test results).

---

## Block A — `implementation` (start immediately)

### Task 1: Spike — three platform questions (Controller)

**ACs:** — (preparation for AC-10, AC-18)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md` · `## 12. Spike (erste Plan-Aufgabe)`

**Interfaces:**
- Consumes: nothing.
- Produces: recorded answers that Tasks 6, 10 and 17 rely on.

- [ ] **Step 1: Answer the questions from the Claude Code documentation**

Dispatch one `claude-code-guide` agent with `run_in_background: false` and this prompt:

```
Answer from the official Claude Code documentation (code.claude.com/docs), with the page for each answer:
1. A plugin agent (agents/*.md in a plugin) whose frontmatter has no `tools` line: does it inherit all tools of the main session, including MCP tools?
2. When the Agent tool is called with a `model` parameter for an agent whose frontmatter sets `model`, which one wins?
3. Can a finished subagent be continued with SendMessage so that it keeps its earlier context?
Answer each with yes/no, one sentence, and the doc page.
```

- [ ] **Step 2: Decide**

- Question 1 = no, or question 2 = the frontmatter wins: stop and report to the user — Tasks 6 and 17 would need a different design. Do not continue.
- Question 3 = no: continue. `task-loop.md` (Task 10) already names the fallback (fresh implementer with brief, report and findings).

- [ ] **Step 3: Record the result**

Append to the end of `## 12. Spike (erste Plan-Aufgabe)` in the design:

```markdown
**Ergebnis (<YYYY-MM-DD>):** 1. <ja|nein> — <Seite> · 2. <Aufruf|Frontmatter> gewinnt — <Seite> · 3. <ja|nein> — <Seite>.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md
git commit -m "docs(forge): record implementation spike results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Script `plan-tasks.js`

**ACs:** AC-08, AC-23

**Files:**
- Create: `plugins/forge/scripts/plan-tasks.js`
- Test: `plugins/forge/tests/plan-tasks.test.js`

**Interfaces:**
- Consumes: the plan format of sub-project 2 (`### Task <n>: …`, header up to the first `---`).
- Produces: CLI `node plan-tasks.js list <plan>` (numbers, one per line), `brief <plan> <n> <dir>` (writes `<dir>/task-<n>-brief.md`, prints its path), `header <plan> <dir>` (writes `<dir>/header-brief.md`, prints its path), `slug <plan>` (folder name for `plan.md`, else file name without extension). Exports `PlanError`, `scanPlan(lines)`, `numberingError(tasks)`, `listTasks(planPath): number[]`, `buildHeader(planPath): string`, `buildBrief(planPath, number): string`, `writeBrief(planPath, number, dir): string`, `writeHeader(planPath, dir): string`, `slugOf(planPath): string`. Used by Tasks 10, 12, 19.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/plan-tasks.test.js`:

`````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const planTasks = require('../scripts/plan-tasks.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'plan-tasks.js');
const PLAN = [
  '# Demo — Umsetzungsplan',
  '',
  '**Ziel:** Demo.',
  '',
  '## Global Constraints',
  '- Node 24',
  '',
  '---',
  '',
  '### Task 1: Erster',
  '',
  'Text eins.',
  '',
  '```markdown',
  '### Task 9: nur ein Beispiel im Code-Block',
  '## Entscheidungen im Beispiel',
  '```',
  '',
  '---',
  '',
  '### Task 2: Zweiter',
  '',
  'Text zwei.',
  '',
  '## Entscheidungen',
  '- **W · Demo** · Mensch — ja',
  '',
].join('\n');

function writePlan(content, name = 'plan.md') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-plan-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('listTasks_ValidPlan_ReturnsNumbersAndIgnoresFencedHeadings', () => {
  assert.deepEqual(planTasks.listTasks(writePlan(PLAN)), [1, 2]);
});

test('listTasks_NestedFences_IgnoresHeadingsInsideOuterFence', () => {
  const nested = ['````markdown', '```js', 'x();', '```', '### Task 7: im Beispiel-Plan', '````'].join('\n');
  const plan = writePlan(PLAN.replace('Text eins.', `Text eins.\n\n${nested}`));
  assert.deepEqual(planTasks.listTasks(plan), [1, 2]);
  assert.ok(planTasks.buildBrief(plan, 1).includes('### Task 7: im Beispiel-Plan'));
});

test('listTasks_CrlfPlan_ReturnsNumbers', () => {
  assert.deepEqual(planTasks.listTasks(writePlan(PLAN.replace(/\n/g, '\r\n'))), [1, 2]);
});

test('listTasks_Gap_ThrowsWithPosition', () => {
  const plan = writePlan(PLAN.replace('### Task 2:', '### Task 3:'));
  assert.throws(() => planTasks.listTasks(plan), /an Position 2 steht Task 3/);
});

test('listTasks_Duplicate_ThrowsWithPosition', () => {
  const plan = writePlan(PLAN.replace('### Task 2:', '### Task 1:'));
  assert.throws(() => planTasks.listTasks(plan), /an Position 2 steht Task 1/);
});

test('listTasks_NoTask_Throws', () => {
  assert.throws(() => planTasks.listTasks(writePlan('# Leer\n')), /Kein Task gefunden/);
});

test('buildBrief_FirstTask_HeaderConstraintsAndOnlyItsBlock', () => {
  const brief = planTasks.buildBrief(writePlan(PLAN), 1);
  assert.ok(brief.startsWith('# Demo — Umsetzungsplan\n'));
  assert.ok(brief.includes('## Global Constraints\n- Node 24'));
  assert.ok(brief.includes('### Task 1: Erster'));
  assert.ok(brief.includes('### Task 9: nur ein Beispiel im Code-Block'));
  assert.ok(!brief.includes('Text zwei.'));
  assert.ok(!brief.includes('- **W · Demo**'));
  assert.ok(!/---\s*$/.test(brief));
});

test('buildBrief_LastTask_EndsBeforeDecisions', () => {
  const brief = planTasks.buildBrief(writePlan(PLAN), 2);
  assert.ok(brief.includes('Text zwei.'));
  assert.ok(!brief.includes('Text eins.'));
  assert.ok(!brief.includes('## Entscheidungen\n'));
});

test('buildBrief_SectionHeadingBetweenTasks_EndsBlock', () => {
  const plan = writePlan(PLAN.replace('### Task 2: Zweiter', '## Block B\n\nZwischentext.\n\n### Task 2: Zweiter'));
  const brief = planTasks.buildBrief(plan, 1);
  assert.ok(!brief.includes('## Block B'));
  assert.ok(!brief.includes('Zwischentext.'));
});

test('buildBrief_MissingTask_Throws', () => {
  assert.throws(() => planTasks.buildBrief(writePlan(PLAN), 5), /Task 5 nicht im Plan/);
});

test('buildHeader_Plan_HeaderAndConstraintsOnly', () => {
  const header = planTasks.buildHeader(writePlan(PLAN));
  assert.ok(header.includes('## Global Constraints\n- Node 24\n'));
  assert.ok(!header.includes('### Task 1'));
});

test('slugOf_PlanMd_UsesFolderName', () => {
  assert.equal(planTasks.slugOf(path.join('docs', 'forge', '2026-09-25-foo', 'plan.md')), '2026-09-25-foo');
});

test('slugOf_OtherFileName_UsesBaseName', () => {
  assert.equal(planTasks.slugOf(path.join('docs', 'plans', '2026-09-25-bar.md')), '2026-09-25-bar');
});

test('cli_List_PrintsOneNumberPerLine', () => {
  const result = run('list', writePlan(PLAN));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '1\n2\n');
});

test('cli_Brief_WritesFileAndPrintsPath', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-brief-'));
  const result = run('brief', writePlan(PLAN), '2', dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), path.join(dir, 'task-2-brief.md'));
  assert.ok(fs.readFileSync(path.join(dir, 'task-2-brief.md'), 'utf8').includes('Text zwei.'));
});

test('cli_Header_WritesHeaderBrief', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-brief-'));
  const result = run('header', writePlan(PLAN), dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), path.join(dir, 'header-brief.md'));
});

test('cli_MissingPlan_ExitsWithOneAndNamesPath', () => {
  const missing = path.join(os.tmpdir(), 'dv-forge-no-plan.md');
  const result = run('list', missing);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dv-forge-no-plan\.md/);
});

test('cli_BadCall_ExitsWithTwo', () => {
  assert.equal(run().status, 2);
  assert.equal(run('brief', 'plan.md', 'x', 'dir').status, 2);
  assert.equal(run('slug').status, 2);
});
`````

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `Cannot find module '../scripts/plan-tasks.js'`.

- [ ] **Step 3: Write the script**

`plugins/forge/scripts/plan-tasks.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TASK_HEADING = /^###\s+Task\s+(\d+):/;
const SECTION_HEADING = /^##\s/;
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const RULE = /^---\s*$/;
const USAGE = 'Aufruf: node plan-tasks.js list <plan> | brief <plan> <n> <dir> | header <plan> <dir> | slug <plan>\n';

class PlanError extends Error {}

function readLines(planPath) {
  try {
    return fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  } catch {
    throw new PlanError(`Plan nicht gefunden oder nicht lesbar: ${planPath}`);
  }
}

function closesFence(fence, open) {
  return fence !== null && fence[1][0] === open[0] && fence[1].length >= open.length && fence[2].trim() === '';
}

function markFences(lines) {
  let open = null;
  return lines.map((line) => {
    const fence = FENCE.exec(line);
    if (open === null) {
      if (fence) open = fence[1];
      return fence !== null;
    }
    if (closesFence(fence, open)) open = null;
    return true;
  });
}

function scanPlan(lines) {
  const fenced = markFences(lines);
  const tasks = [];
  let headerEnd = -1;
  let open = null;
  lines.forEach((line, index) => {
    if (fenced[index]) return;
    const heading = TASK_HEADING.exec(line);
    if (heading || (open && SECTION_HEADING.test(line))) {
      if (open) open.end = index;
      open = heading ? { number: Number(heading[1]), start: index, end: lines.length } : null;
      if (open) tasks.push(open);
      return;
    }
    if (headerEnd === -1 && tasks.length === 0 && RULE.test(line)) headerEnd = index;
  });
  const firstTask = tasks.length > 0 ? tasks[0].start : lines.length;
  return { tasks, headerEnd: headerEnd === -1 ? firstTask : headerEnd };
}

function numberingError(tasks) {
  if (tasks.length === 0) return 'Kein Task gefunden (erwartet: "### Task 1: …")';
  const wrong = tasks.findIndex((task, index) => task.number !== index + 1);
  if (wrong === -1) return null;
  return `Task-Nummerierung lückenhaft: an Position ${wrong + 1} steht Task ${tasks[wrong].number}`;
}

function checkedPlan(planPath) {
  const lines = readLines(planPath);
  const scan = scanPlan(lines);
  const error = numberingError(scan.tasks);
  if (error) throw new PlanError(error);
  return { lines, ...scan };
}

function trimTrailing(block) {
  let end = block.length;
  while (end > 0 && (block[end - 1].trim() === '' || RULE.test(block[end - 1]))) end -= 1;
  return block.slice(0, end);
}

function listTasks(planPath) {
  return checkedPlan(planPath).tasks.map((task) => task.number);
}

function buildHeader(planPath) {
  const { lines, headerEnd } = checkedPlan(planPath);
  return `${trimTrailing(lines.slice(0, headerEnd)).join('\n')}\n`;
}

function buildBrief(planPath, number) {
  const { lines, tasks, headerEnd } = checkedPlan(planPath);
  const task = tasks.find((entry) => entry.number === number);
  if (!task) throw new PlanError(`Task ${number} nicht im Plan: ${planPath}`);
  const header = trimTrailing(lines.slice(0, headerEnd));
  const body = trimTrailing(lines.slice(task.start, task.end));
  return `${[...header, '', ...body].join('\n')}\n`;
}

function writeFile(dir, name, content) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

function writeBrief(planPath, number, dir) {
  return writeFile(dir, `task-${number}-brief.md`, buildBrief(planPath, number));
}

function writeHeader(planPath, dir) {
  return writeFile(dir, 'header-brief.md', buildHeader(planPath));
}

function slugOf(planPath) {
  const absolute = path.resolve(planPath);
  const name = path.basename(absolute);
  if (name.toLowerCase() === 'plan.md') return path.basename(path.dirname(absolute));
  return path.basename(name, path.extname(name));
}

const COMMANDS = {
  list: { arity: 1, run: ([plan]) => listTasks(plan).join('\n') },
  brief: { arity: 3, run: ([plan, number, dir]) => writeBrief(plan, Number(number), dir) },
  header: { arity: 2, run: ([plan, dir]) => writeHeader(plan, dir) },
  slug: { arity: 1, run: ([plan]) => slugOf(plan) },
};

function isValidCall(command, args) {
  if (!Object.hasOwn(COMMANDS, command) || args.length !== COMMANDS[command].arity) return false;
  return command !== 'brief' || /^\d+$/.test(args[1]);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!isValidCall(command, args)) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${COMMANDS[command].run(args)}\n`);
  } catch (error) {
    if (!(error instanceof PlanError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { PlanError, scanPlan, numberingError, listTasks, buildHeader, buildBrief, writeBrief, writeHeader, slugOf };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/plan-tasks.js plugins/forge/tests/plan-tasks.test.js
git commit -m "feat(forge): extract plan tasks, briefs and slug by script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Script `workspace.js` + git test helper

**ACs:** — (supports AC-07, AC-20)

**Files:**
- Create: `plugins/forge/tests/lib/git-repo.js`
- Create: `plugins/forge/scripts/workspace.js`
- Test: `plugins/forge/tests/workspace.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: test helper `git(cwd, ...args): string`, `commitFile(dir, file, content, message): string` (returns the commit hash), `makeRepo(): string` (temp repo with one commit on `main`), `samePath(a, b): boolean` (real paths, case-insensitive). CLI `node workspace.js create|remove <implementation|review> <slug>`; `create` prints `<git-toplevel>/.forge/<role>/<slug>` and writes `<git-toplevel>/.forge/.gitignore` with `*`. Exports `WorkspaceError`, `workspacePath`, `createWorkspace`, `removeWorkspace`. Used by Tasks 4, 5, 12, 16, 19.

- [ ] **Step 1: Write the test helper**

`plugins/forge/tests/lib/git-repo.js`:

```js
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function commitFile(dir, file, content, message) {
  const target = path.join(dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  git(dir, 'add', file);
  git(dir, 'commit', '--quiet', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-git-'));
  git(dir, 'init', '--quiet', '--initial-branch=main');
  git(dir, 'config', 'user.email', 'test@example.invalid');
  git(dir, 'config', 'user.name', 'dv-forge test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  commitFile(dir, 'README.md', '# repo\n', 'init');
  return dir;
}

function samePath(a, b) {
  const normalize = (value) => fs.realpathSync.native(value).replace(/\\/g, '/').toLowerCase();
  return normalize(a) === normalize(b);
}

module.exports = { git, commitFile, makeRepo, samePath };
```

- [ ] **Step 2: Write the failing tests**

`plugins/forge/tests/workspace.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const workspace = require('../scripts/workspace.js');
const { git, makeRepo, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'workspace.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('createWorkspace_InRepo_CreatesRoleSlugFolder', () => {
  const repo = makeRepo();
  const dir = workspace.createWorkspace('implementation', '2026-09-25-foo', repo);
  assert.ok(fs.statSync(dir).isDirectory());
  assert.ok(samePath(dir, path.join(repo, '.forge', 'implementation', '2026-09-25-foo')));
});

test('createWorkspace_InRepo_IsIgnoredByGit', () => {
  const repo = makeRepo();
  const dir = workspace.createWorkspace('review', 'x', repo);
  fs.writeFileSync(path.join(dir, 'progress.md'), '# Ledger\n');
  assert.equal(fs.readFileSync(path.join(repo, '.forge', '.gitignore'), 'utf8'), '*\n');
  assert.equal(git(repo, 'status', '--porcelain'), '');
});

test('removeWorkspace_Existing_DeletesOnlyThatFolder', () => {
  const repo = makeRepo();
  const kept = workspace.createWorkspace('implementation', 'keep', repo);
  const dir = workspace.createWorkspace('implementation', 'drop', repo);
  workspace.removeWorkspace('implementation', 'drop', repo);
  assert.equal(fs.existsSync(dir), false);
  assert.ok(fs.existsSync(kept));
});

test('cli_Create_PrintsPath', () => {
  const repo = makeRepo();
  const result = run(repo, 'create', 'implementation', 'x');
  assert.equal(result.status, 0);
  assert.ok(samePath(result.stdout.trim(), path.join(repo, '.forge', 'implementation', 'x')));
});

test('cli_OutsideRepo_ExitsWithOne', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-nogit-'));
  const result = run(dir, 'create', 'review', 'x');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Git-Repo/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'create', 'other', 'x').status, 2);
  assert.equal(run(repo, 'create', 'review', '../x').status, 2);
  assert.equal(run(repo, 'delete', 'review', 'x').status, 2);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `Cannot find module '../scripts/workspace.js'`.

- [ ] **Step 4: Write the script**

`plugins/forge/scripts/workspace.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROLES = new Set(['implementation', 'review']);
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node workspace.js create|remove <implementation|review> <slug>\n';

class WorkspaceError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new WorkspaceError(`Kein Git-Repo: ${cwd}`);
  return path.resolve(result.stdout.trim());
}

function workspacePath(role, slug, cwd = process.cwd()) {
  return path.join(repoRoot(cwd), '.forge', role, slug);
}

function createWorkspace(role, slug, cwd = process.cwd()) {
  const dir = workspacePath(role, slug, cwd);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '..', '..', '.gitignore'), '*\n');
  return dir;
}

function removeWorkspace(role, slug, cwd = process.cwd()) {
  const dir = workspacePath(role, slug, cwd);
  fs.rmSync(dir, { recursive: true, force: true });
  return dir;
}

const ACTIONS = { create: createWorkspace, remove: removeWorkspace };

function main() {
  const [action, role, slug] = process.argv.slice(2);
  if (!Object.hasOwn(ACTIONS, action) || !ROLES.has(role) || !SLUG.test(slug ?? '')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${ACTIONS[action](role, slug)}\n`);
  } catch (error) {
    if (!(error instanceof WorkspaceError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { WorkspaceError, workspacePath, createWorkspace, removeWorkspace };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/tests/lib/git-repo.js plugins/forge/scripts/workspace.js plugins/forge/tests/workspace.test.js
git commit -m "feat(forge): add git-ignored workspace per role and slug

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Script `base-tag.js`

**ACs:** AC-06, AC-16

**Files:**
- Create: `plugins/forge/scripts/base-tag.js`
- Test: `plugins/forge/tests/base-tag.test.js`

**Interfaces:**
- Consumes: `git`, `commitFile`, `makeRepo` from `tests/lib/git-repo.js` (Task 3).
- Produces: CLI `node base-tag.js ensure <slug>` → `created|kept forge-base/<slug> <sha>`, exit 1 when the tag is no ancestor of HEAD; `resolve <slug>` → `forge-base/<slug>`, exit 1 when missing. Exports `TagError`, `tagName(slug)`, `ensureTag(slug, cwd?) → { action, commit }`, `resolveTag(slug, cwd?) → string`. Used by Tasks 12 and 19.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/base-tag.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const baseTag = require('../scripts/base-tag.js');
const { git, commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'base-tag.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('ensureTag_NoTag_CreatesTagOnHead', () => {
  const repo = makeRepo();
  const result = baseTag.ensureTag('foo', repo);
  assert.equal(result.action, 'created');
  assert.equal(result.commit, git(repo, 'rev-parse', 'HEAD'));
  assert.equal(git(repo, 'rev-parse', 'forge-base/foo^{commit}'), result.commit);
});

test('ensureTag_TagIsAncestor_KeepsIt', () => {
  const repo = makeRepo();
  const base = baseTag.ensureTag('foo', repo).commit;
  commitFile(repo, 'a.txt', 'a\n', 'task 1');
  const result = baseTag.ensureTag('foo', repo);
  assert.equal(result.action, 'kept');
  assert.equal(result.commit, base);
});

test('ensureTag_TagOnOtherBranch_Throws', () => {
  const repo = makeRepo();
  git(repo, 'switch', '--quiet', '-c', 'side');
  commitFile(repo, 'side.txt', 's\n', 'side');
  baseTag.ensureTag('foo', repo);
  git(repo, 'switch', '--quiet', 'main');
  commitFile(repo, 'main.txt', 'm\n', 'main');
  assert.throws(() => baseTag.ensureTag('foo', repo), /kein Vorfahre von HEAD/);
});

test('resolveTag_Missing_ThrowsWithBaseHint', () => {
  assert.throws(() => baseTag.resolveTag('foo', makeRepo()), /--base <ref>/);
});

test('resolveTag_Existing_ReturnsTagName', () => {
  const repo = makeRepo();
  baseTag.ensureTag('foo', repo);
  assert.equal(baseTag.resolveTag('foo', repo), 'forge-base/foo');
});

test('cli_EnsureThenResolve_PrintsResults', () => {
  const repo = makeRepo();
  assert.match(run(repo, 'ensure', 'foo').stdout, /^created forge-base\/foo [0-9a-f]{40}\n$/);
  assert.match(run(repo, 'ensure', 'foo').stdout, /^kept forge-base\/foo /);
  assert.equal(run(repo, 'resolve', 'foo').stdout, 'forge-base/foo\n');
});

test('cli_ResolveMissing_ExitsWithOne', () => {
  const result = run(makeRepo(), 'resolve', 'foo');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Basis-Tag forge-base\/foo/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, 'set', 'foo').status, 2);
  assert.equal(run(repo, 'ensure').status, 2);
  assert.equal(run(repo, 'ensure', '../foo').status, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `Cannot find module '../scripts/base-tag.js'`.

- [ ] **Step 3: Write the script**

`plugins/forge/scripts/base-tag.js`:

```js
#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node base-tag.js ensure|resolve <slug>\n';

class TagError extends Error {}

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function tagName(slug) {
  return `forge-base/${slug}`;
}

function tagCommit(slug, cwd) {
  const result = git(cwd, ['rev-parse', '--verify', '--quiet', `refs/tags/${tagName(slug)}^{commit}`]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function ensureTag(slug, cwd = process.cwd()) {
  const existing = tagCommit(slug, cwd);
  if (existing === null) {
    const created = git(cwd, ['tag', tagName(slug), 'HEAD']);
    if (created.status !== 0) {
      throw new TagError(`Tag ${tagName(slug)} konnte nicht gesetzt werden: ${String(created.stderr).trim()}`);
    }
    return { action: 'created', commit: tagCommit(slug, cwd) };
  }
  if (git(cwd, ['merge-base', '--is-ancestor', existing, 'HEAD']).status !== 0) {
    throw new TagError(`Tag ${tagName(slug)} ist kein Vorfahre von HEAD — der Plan läuft auf einem anderen Branch.`);
  }
  return { action: 'kept', commit: existing };
}

function resolveTag(slug, cwd = process.cwd()) {
  if (tagCommit(slug, cwd) === null) throw new TagError(`Kein Basis-Tag ${tagName(slug)} — --base <ref> angeben.`);
  return tagName(slug);
}

const COMMANDS = {
  ensure: (slug) => {
    const { action, commit } = ensureTag(slug);
    return `${action} ${tagName(slug)} ${commit}`;
  },
  resolve: (slug) => resolveTag(slug),
};

function main() {
  const [command, slug] = process.argv.slice(2);
  if (!Object.hasOwn(COMMANDS, command) || !SLUG.test(slug ?? '')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${COMMANDS[command](slug)}\n`);
  } catch (error) {
    if (!(error instanceof TagError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { TagError, tagName, ensureTag, resolveTag };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/base-tag.js plugins/forge/tests/base-tag.test.js
git commit -m "feat(forge): mark the implementation base with a per-plan tag

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Script `review-package.js`

**ACs:** — (supports AC-09, AC-12, AC-16)

**Files:**
- Create: `plugins/forge/scripts/review-package.js`
- Test: `plugins/forge/tests/review-package.test.js`

**Interfaces:**
- Consumes: `commitFile`, `makeRepo` from `tests/lib/git-repo.js` (Task 3).
- Produces: CLI `node review-package.js <base> <head> <dir>` → writes `<dir>/review-<base7>..<head7>.diff` with sections `## Commits`, `## Dateien`, `## Diff` and prints its path; exit 1 for an empty range, exit 2 for an unknown ref. Exports `PackageError`, `buildPackage(base, head, cwd?)`, `writePackage(base, head, dir, cwd?)`. Used by Tasks 10 and 19.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/review-package.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const reviewPackage = require('../scripts/review-package.js');
const { commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'review-package.js');

function repoWithTwoCommits() {
  const repo = makeRepo();
  const base = commitFile(repo, 'src/a.js', 'alt\n', 'chore: base');
  commitFile(repo, 'src/a.js', 'neu\n', 'feat: task 1');
  const head = commitFile(repo, 'src/b.js', 'b\n', 'feat: task 2');
  return { repo, base, head };
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('buildPackage_Range_ContainsCommitsStatAndDiff', () => {
  const { repo, base } = repoWithTwoCommits();
  const text = reviewPackage.buildPackage(base, 'HEAD', repo);
  assert.ok(text.startsWith(`# Review-Paket: ${base}..HEAD\n`));
  assert.match(text, /## Commits\n[0-9a-f]+ feat: task 2\n[0-9a-f]+ feat: task 1\n/);
  assert.match(text, /## Dateien\n.*src\/a\.js/);
  assert.ok(text.includes('+neu'));
  assert.ok(text.includes('-alt'));
  assert.ok(!text.includes('chore: base'));
});

test('writePackage_Range_WritesFileNamedByShortHashes', () => {
  const { repo, base, head } = repoWithTwoCommits();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pkg-'));
  const file = reviewPackage.writePackage(base, head, dir, repo);
  assert.equal(file, path.join(dir, `review-${base.slice(0, 7)}..${head.slice(0, 7)}.diff`));
  assert.ok(fs.readFileSync(file, 'utf8').includes('+neu'));
});

test('cli_ValidRange_PrintsPath', () => {
  const { repo, base } = repoWithTwoCommits();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pkg-'));
  const result = run(repo, base, 'HEAD', dir);
  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(result.stdout.trim()));
});

test('cli_EmptyRange_ExitsWithOne', () => {
  const { repo } = repoWithTwoCommits();
  const result = run(repo, 'HEAD', 'HEAD', os.tmpdir());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Bereich leer/);
});

test('cli_UnknownRef_ExitsWithTwo', () => {
  const { repo } = repoWithTwoCommits();
  const result = run(repo, 'forge-base/missing', 'HEAD', os.tmpdir());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Ungültige Referenz: forge-base\/missing/);
});

test('cli_WrongArgumentCount_ExitsWithTwo', () => {
  assert.equal(run(os.tmpdir(), 'HEAD').status, 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `Cannot find module '../scripts/review-package.js'`.

- [ ] **Step 3: Write the script**

`plugins/forge/scripts/review-package.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const USAGE = 'Aufruf: node review-package.js <base> <head> <dir>\n';

class PackageError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: result.status === 0, out: String(result.stdout ?? '') };
}

function commitOf(ref, cwd) {
  const result = git(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  if (!result.ok) throw new PackageError(`Ungültige Referenz: ${ref}`, 2);
  return result.out.trim();
}

function checkedRange(base, head, cwd) {
  const from = commitOf(base, cwd);
  const to = commitOf(head, cwd);
  if (from === to) throw new PackageError(`Bereich leer: ${base}..${head}`, 1);
  return { from, to };
}

function buildPackage(base, head, cwd = process.cwd()) {
  const { from, to } = checkedRange(base, head, cwd);
  const range = `${from}..${to}`;
  return [
    `# Review-Paket: ${base}..${head}`,
    '',
    '## Commits',
    git(cwd, ['log', '--oneline', range]).out.trimEnd(),
    '',
    '## Dateien',
    git(cwd, ['diff', '--stat', range]).out.trimEnd(),
    '',
    '## Diff',
    git(cwd, ['diff', '-U10', range]).out.trimEnd(),
    '',
  ].join('\n');
}

function writePackage(base, head, dir, cwd = process.cwd()) {
  const content = buildPackage(base, head, cwd);
  const { from, to } = checkedRange(base, head, cwd);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `review-${from.slice(0, 7)}..${to.slice(0, 7)}.diff`);
  fs.writeFileSync(file, content);
  return file;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${writePackage(...args)}\n`);
  } catch (error) {
    if (!(error instanceof PackageError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(error.exitCode);
  }
}

if (require.main === module) main();

module.exports = { PackageError, buildPackage, writePackage };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/review-package.js plugins/forge/tests/review-package.test.js
git commit -m "feat(forge): write review packages for a commit range

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Agent `implementation-implementer`

**ACs:** AC-03, AC-04, AC-11

**Files:**
- Create: `plugins/forge/agents/implementation-implementer.md`
- Test: `plugins/forge/tests/implementation-agents.test.js`

**Interfaces:**
- Consumes: spike answer 1 (Task 1): an agent without `tools` inherits MCP tools.
- Produces: agent `dv-forge:implementation-implementer`. Input lines `Brief:`, `Bericht:`, `Repo:`, `Kontext:`, optional `Findings:`. Return: `Status: done | done-with-concerns | blocked | needs-context`, commits, one test line, concerns, report path. Used by Tasks 10 and 12.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/implementation-agents.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');

const AGENTS = path.join(__dirname, '..', 'agents');
const TYPOGRAPHIC_QUOTES = /[“”„]/;

function readAgent(name) {
  return readMarkdown(path.join(AGENTS, `${name}.md`));
}

test('implementation-implementer_Frontmatter_SonnetInheritsAllTools', () => {
  const { fields } = readAgent('implementation-implementer');
  assert.equal(fields.name, 'implementation-implementer');
  assert.equal(fields.model, 'sonnet');
  assert.equal(fields.tools, undefined);
  assert.match(fields.description, /^Use when/);
});

test('implementation-implementer_Body_InputsStatusAndNoSubagents', () => {
  const { body } = readAgent('implementation-implementer');
  for (const part of ['`Brief:`', '`Bericht:`', '`Repo:`', '`Kontext:`', '`Findings:`',
    '`Status: done | done-with-concerns | blocked | needs-context`', 'git add -A', 'Projekt-`CLAUDE.md`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /## Keine SubAgents/);
  assert.match(body, /höchstens 15 Zeilen/);
  assert.match(body, /ROT mit Befehl/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation-implementer.md`.

- [ ] **Step 3: Write the agent**

`plugins/forge/agents/implementation-implementer.md`:

```markdown
---
name: implementation-implementer
description: Use when the dv-forge implementation controller hands over exactly one plan task or one list of review findings that has to be implemented, tested and committed in the current checkout.
model: sonnet
---

# Umsetzung: Umsetzer

Du setzt genau einen Auftrag um: einen Task aus einem Plan oder eine Liste von Review-Findings. Alles, was du brauchst, steht in den Dateien des Auftrags. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Brief:` Datei mit Plan-Kopf, Global Constraints und deinem Task. Das ist deine Anforderung; Werte daraus übernimmst du exakt.
- `Bericht:` Datei, in die du deinen ausführlichen Bericht schreibst
- `Repo:` Wurzel des Checkouts, in dem du arbeitest
- `Kontext:` Einordnung, Schnittstellen früherer Tasks, Festlegungen des Controllers
- `Findings:` nur in einer Fix-Runde: die offenen Findings, die du behebst

## Bevor du anfängst
Ist an Anforderung, Vorgehen, Abhängigkeiten oder Annahmen etwas unklar, fragst du jetzt: Status `needs-context` mit deinen Fragen. Fragen ist besser als Raten.

## Arbeit
1. Setz genau das um, was der Brief verlangt — nicht mehr und nicht weniger.
2. Schreib die Tests so, wie der Brief sie vorgibt; verlangt er TDD, zuerst den roten Test.
3. Führ Tests und Befehle so aus, wie der Brief sie nennt. Schreibt die Projekt-`CLAUDE.md` einen Weg vor, etwa Tests über ein MCP-Tool statt über die Shell, gilt dieser Weg.
4. Während der Arbeit läuft nur der Test zu dem, was du gerade änderst. Die ganze Suite läuft einmal vor dem Commit.
5. Committe mit `git add <genau deine Dateien>`, nie mit `git add -A` oder `git add .`. Die Nachricht folgt der Konvention des Repos.

## Keine SubAgents
Du erledigst alles selbst und startest keinen SubAgent, schon gar keinen Reviewer. Das Review kommt vom Controller, nachdem du berichtet hast. Ein Reviewer, den du startest, wäre ein doppelter Sitz, dessen Urteil nicht zählt.

## Code-Organisation
- Halte dich an die Dateistruktur des Plans. Jede Datei hat eine klare Verantwortung.
- Wächst eine neue Datei über das hinaus, was der Plan vorsieht, teilst du sie nicht eigenmächtig, sondern meldest `done-with-concerns`.
- Ist eine bestehende Datei schon groß oder verworren, arbeitest du vorsichtig und nennst das als Bedenken.
- Folge den Mustern des Repos. Verbessere, was du anfasst, aber baue nichts außerhalb deines Tasks um.

## Wenn es über deinen Kopf wächst
Aufhören ist erlaubt; schlechte Arbeit ist schlimmer als keine. Du meldest `blocked` oder `needs-context`, wenn
- der Task eine Architektur-Entscheidung mit mehreren gültigen Wegen verlangt,
- du Code verstehen musst, der dir nicht gegeben wurde, und keine Klarheit findest,
- du unsicher bist, ob dein Weg stimmt,
- der Task Umbauten verlangt, die der Plan nicht vorsieht,
- du Datei um Datei liest, ohne voranzukommen.
Beschreib genau, woran du hängst, was du versucht hast und welche Hilfe du brauchst.

## Selbst-Review vor dem Bericht
- **Vollständig:** Alles aus dem Brief umgesetzt? Randfälle bedacht?
- **Qualität:** Sagen die Namen, was die Dinge tun? Ist der Code sauber und wartbar?
- **Disziplin:** Nur Verlangtes gebaut? Muster des Repos befolgt?
- **Tests:** Prüfen sie echtes Verhalten statt Mocks? TDD eingehalten, wenn verlangt? Ist die Ausgabe frei von Warnungen?
Was du dabei findest, behebst du vor dem Bericht.

## Fix-Runde
Bekommst du `Findings:`, behebst du genau diese, führst die Tests aus, die den geänderten Code abdecken, und hängst an die Berichtsdatei einen Fix-Bericht an: was du geändert hast, welche Tests, welcher Befehl, welche Ausgabe. Die Reviewer wiederholen keine Tests; dein Bericht ist der Beleg.

## Bericht
In die Datei aus `Bericht:` schreibst du:
- was du umgesetzt hast, oder was du versucht hast, wenn du blockiert bist
- was du getestet hast und mit welchem Ergebnis
- bei TDD: ROT mit Befehl, Ausschnitt der Fehlermeldung und warum sie erwartet war; GRÜN mit Befehl und Ausschnitt der erfolgreichen Ausgabe
- geänderte Dateien
- Befunde aus dem Selbst-Review
- Bedenken

## Rückgabe
Deine letzte Nachricht hat höchstens 15 Zeilen:
- `Status: done | done-with-concerns | blocked | needs-context`
- Commits mit Kurz-Hash und Betreff
- ein Satz zu den Tests, z. B. "14/14 grün, Ausgabe sauber"
- Bedenken, falls vorhanden
- Pfad der Berichtsdatei

Bei `blocked` und `needs-context` stehen die Einzelheiten in dieser Nachricht selbst.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/agents/implementation-implementer.md plugins/forge/tests/implementation-agents.test.js
git commit -m "feat(forge): add implementer agent for one task per dispatch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Agents `implementation-task-reviewer` + `implementation-re-reviewer`

**ACs:** AC-03, AC-09, AC-10

**Files:**
- Create: `plugins/forge/agents/implementation-task-reviewer.md`
- Create: `plugins/forge/agents/implementation-re-reviewer.md`
- Modify: `plugins/forge/tests/implementation-agents.test.js` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `dv-forge:implementation-task-reviewer` (input `Brief:`, `Bericht:`, `Paket:`, `Global Constraints:`; output sections `### Spec-Treue`, `### Stärken`, `### Findings`, `### Urteil` with `**Task:** freigegeben | nachbessern`) and `dv-forge:implementation-re-reviewer` (input `Brief:`, `Findings:`, `Bericht:`, `Paket:`; verdict `behoben | nicht behoben` per finding). Used by Task 10.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/implementation-agents.test.js`:

```js
for (const name of ['implementation-task-reviewer', 'implementation-re-reviewer']) {
  test(`${name}_Frontmatter_ReadOnlyToolsSonnet`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, 'Read, Grep, Glob, Bash, PowerShell');
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });
}

test('implementation-task-reviewer_Body_TwoPartsSeverityAndVerdict', () => {
  const { body } = readAgent('implementation-task-reviewer');
  for (const part of ['## Teil 1: Spec-Treue', '## Teil 2: Qualität', '## Dem Bericht nicht trauen',
    '⚠️ nicht aus dem Diff prüfbar', '`plan-vorgeschrieben`', '**Task:** freigegeben | nachbessern', '`datei:zeile`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /keinen SubAgent/);
});

test('implementation-re-reviewer_Body_VerdictPerFindingAndScope', () => {
  const { body } = readAgent('implementation-re-reviewer');
  for (const part of ['behoben | nicht behoben', '### Neue Schäden im Fix-Diff', '### Außerhalb',
    '**Fix-Runde:** alle behoben, keine neuen 🔴 | offen: <Liste>']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation-task-reviewer.md` and `implementation-re-reviewer.md`.

- [ ] **Step 3: Write the agents**

`plugins/forge/agents/implementation-task-reviewer.md`:

````markdown
---
name: implementation-task-reviewer
description: Use when the dv-forge implementation controller needs one finished plan task checked against its brief and for code quality, based on the task's review package, before the next task starts.
tools: Read, Grep, Glob, Bash, PowerShell
model: sonnet
---

# Umsetzung: Task-Review

Du prüfst die Umsetzung genau eines Tasks: zuerst, ob sie dem Brief entspricht, dann, ob sie gut gebaut ist. Du bist das Tor für diesen Task, kein Merge-Review; das breite Review folgt nach dem letzten Task.

## Eingabe
- `Brief:` die Anforderung des Tasks
- `Bericht:` was der Umsetzer gebaut haben will
- `Paket:` Commit-Liste, Stat und Diff mit Kontext; das ist deine Sicht auf die Änderung
- `Global Constraints:` die bindenden Vorgaben, wörtlich

## Wie du liest
- Du liest das Paket einmal. Die Kontextzeilen des Diffs sind die geänderten Dateien. Eine geänderte Datei liest du nur dann eigens, wenn ein Abschnitt, den du beurteilen musst, mitten in einer Funktion abbricht, und du sagst das.
- Code außerhalb des Diffs liest du nur für ein konkretes, benanntes Risiko: eine gezielte Prüfung je Risiko, Risiko und Prüfung nennst du. Ändert der Diff einen Vertrag, eine gemeinsam genutzte Struktur oder eine Sperr-Reihenfolge, prüfst du die Aufrufstellen.
- Du veränderst nichts: keinen Working Tree, keinen Index, kein HEAD, keinen Branch.
- Du startest keinen SubAgent.

## Dem Bericht nicht trauen
Der Bericht ist eine Behauptung. Prüf sie am Diff. Begründungen wie "bewusst einfach gehalten" sind Selbstbewertung des Umsetzers und senken nie die Stufe eines Findings.

## Tests
Der Umsetzer hat die Tests für genau diesen Code ausgeführt und belegt. Du wiederholst die Suite nicht. Einen gezielten Test führst du nur aus, wenn der Code einen konkreten Zweifel weckt, den kein vorhandener Lauf beantwortet; kannst du nichts ausführen, nennst du den Test. Warnungen oder Rauschen in der gemeldeten Ausgabe sind Findings. Fehlt ein Beleg oder ist er unleserlich, meldest du das als Lücke; ein unleserlicher Beleg ist kein Beweis für einen Fehler.

## Teil 1: Spec-Treue
Vergleiche den Diff mit dem Brief:
- **fehlt:** übersprungen, vergessen oder behauptet, aber nicht gebaut
- **zu viel:** nicht verlangt, überbaut, "nice to have"
- **missverstanden:** richtiges Feature falsch gebaut oder falsches Problem gelöst

Nennt der Brief mehrere Dateien mit je eigener Änderung, prüfst du Datei für Datei; eine genannte Datei ohne Änderung im Diff fehlt. Was sich aus dem Diff allein nicht prüfen lässt, weil es in unverändertem Code liegt oder mehrere Tasks betrifft, meldest du als ⚠️, statt weiter zu suchen.

## Teil 2: Qualität
- Trennung der Verantwortungen, Fehlerbehandlung, DRY ohne verfrühte Abstraktion, Randfälle
- Tests prüfen echtes Verhalten und decken die Randfälle des Tasks ab
- eine Verantwortung pro Datei, Aufbau nach der Dateistruktur des Plans, keine neuen oder durch diesen Task stark gewachsenen großen Dateien (bestehende Größe zählt nicht)

Jedes Finding und jede Prüfung belegst du mit `datei:zeile`.

## Einstufung
- 🔴 — Der Task ist erst nach der Behebung vertrauenswürdig: falsches oder brüchiges Verhalten, fehlende Anforderung oder ein Wartungsschaden, für den du einen Merge blocken würdest (wörtlich doppelte Logik, verschluckte Fehler, Tests ohne Aussage).
- 🟡 — Echte Schwäche ohne diese Folge, etwa "die Abdeckung könnte breiter sein".
- 🟢 — Politur, Formulierung.

Schreibt der Brief selbst etwas vor, das nach dieser Einstufung ein Mangel ist, meldest du es als 🔴 mit dem Vermerk `plan-vorgeschrieben`. Der Plan bewertet sich nicht selbst.

## Ausgabe
Deine Antwort ist nur der Bericht, ohne Einleitung und ohne Schlusswort:

```markdown
### Spec-Treue
- ✅ erfüllt | ❌ <was fehlt, zu viel oder missverstanden ist, mit datei:zeile>
- ⚠️ nicht aus dem Diff prüfbar: <Anforderung und was der Controller prüfen soll>

### Stärken
- <konkret, mit datei:zeile>

### Findings
- 🔴 `datei:zeile` — <was> — <warum es zählt> — <wie beheben>
- 🟡 `datei:zeile` — <was> — <warum es zählt> — <wie beheben>
- 🟢 `datei:zeile` — <was>

### Urteil
**Task:** freigegeben | nachbessern — <ein bis zwei Sätze>
```
````

`plugins/forge/agents/implementation-re-reviewer.md`:

````markdown
---
name: implementation-re-reviewer
description: Use when the dv-forge implementation controller needs one fix round verified finding by finding against the fix diff only, without a fresh full review.
tools: Read, Grep, Glob, Bash, PowerShell
model: sonnet
---

# Umsetzung: Re-Review einer Fix-Runde

Ein Review hat Findings geliefert, ein Umsetzer hat versucht, sie zu beheben. Du urteilst über jedes Finding und prüfst den Fix-Diff, sonst nichts. Das ist kein neues Review.

## Eingabe
- `Brief:` die Anforderung des Tasks oder der Fix-Welle
- `Findings:` die offenen Findings der vorigen Prüfung, eines pro Zeile
- `Bericht:` Berichtsdatei des Umsetzers; die Fix-Berichte stehen am Ende
- `Paket:` Commits, Stat und Diff nur dieser Fix-Runde

## Regeln
- Du liest das Paket einmal und veränderst nichts: keinen Working Tree, keinen Index, kein HEAD, keinen Branch. Du startest keinen SubAgent.
- Den Fix-Bericht behandelst du als Behauptung. Er muss die abdeckenden Tests, den Befehl und die Ausgabe nennen; seine Aussagen prüfst du am Diff. Die Suite führst du nicht erneut aus, einen gezielten Test nur bei einem konkreten Zweifel.
- Code, den der Fix nicht berührt, prüfst du nicht erneut. Was dir dort auffällt, steht unter "Außerhalb" und verlängert die Schleife nicht.
- "Versucht" ist nicht behoben. Behoben heißt: Der konkrete Mangel existiert nicht mehr.

## Ausgabe
Deine Antwort ist nur dieser Bericht, beginnend mit dem ersten Urteil:

```markdown
### Findings
- **<Finding in einer Zeile>** — behoben | nicht behoben — <Beleg mit datei:zeile>

### Neue Schäden im Fix-Diff
- 🔴 | 🟡 | 🟢 `datei:zeile` — <was>, oder "keine"

### Außerhalb
- <Beobachtung>, oder "keine"

### Urteil
**Fix-Runde:** alle behoben, keine neuen 🔴 | offen: <Liste>
```
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/agents/implementation-task-reviewer.md plugins/forge/agents/implementation-re-reviewer.md plugins/forge/tests/implementation-agents.test.js
git commit -m "feat(forge): add task review and scoped re-review agents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Agent `implementation-final-reviewer`

**ACs:** AC-03, AC-12

**Files:**
- Create: `plugins/forge/agents/implementation-final-reviewer.md`
- Modify: `plugins/forge/tests/implementation-agents.test.js` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `dv-forge:implementation-final-reviewer` (input `Plan:`, `Spec:`, `Paket:`, `Zurückgestellt:`; output `### Stärken`, `### Findings`, `### Zurückgestellt` with `beheben | bleibt`, `### Urteil` with `**Übergabe:** ja | mit Korrekturen | nein`). Used by Task 10.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/implementation-agents.test.js`:

```js
test('implementation-final-reviewer_Frontmatter_OpusReadOnly', () => {
  const { fields } = readAgent('implementation-final-reviewer');
  assert.equal(fields.name, 'implementation-final-reviewer');
  assert.equal(fields.tools, 'Read, Grep, Glob, Bash, PowerShell');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('implementation-final-reviewer_Body_DeferredTriageAndHandoverVerdict', () => {
  const { body } = readAgent('implementation-final-reviewer');
  for (const part of ['`Zurückgestellt:`', '### Zurückgestellt', 'beheben | bleibt', '**Übergabe:** ja | mit Korrekturen | nein']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /Fehler im Plan selbst/);
});

test('implementationAgents_Text_NoTypographicQuotes', () => {
  for (const name of ['implementation-implementer', 'implementation-task-reviewer', 'implementation-re-reviewer', 'implementation-final-reviewer']) {
    const { body } = readAgent(name);
    assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES, `${name} enthält typografische Anführungszeichen`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation-final-reviewer.md`.

- [ ] **Step 3: Write the agent**

`plugins/forge/agents/implementation-final-reviewer.md`:

````markdown
---
name: implementation-final-reviewer
description: Use when the dv-forge implementation controller has finished every plan task and needs one broad review of the whole implementation range against plan and spec before the handover.
tools: Read, Grep, Glob, Bash, PowerShell
model: opus
---

# Umsetzung: Final-Review

Alle Tasks sind umgesetzt und einzeln geprüft. Du prüfst die gesamte Umsetzung einmal im Ganzen, bevor sie an den Menschen geht.

## Eingabe
- `Plan:` die `plan.md`
- `Spec:` die `spec.md`; die Zeile fehlt, wenn es keine gibt
- `Paket:` Commits, Stat und Diff über den ganzen Umsetzungsbereich
- `Zurückgestellt:` Punkte, die die Task-Reviews zurückgestellt oder am Cap geparkt haben, jeweils mit dem Urteil des Controllers

## Regeln
- Du liest das Paket; Code außerhalb liest du für benannte Risiken. Du veränderst nichts und startest keinen SubAgent.
- Die Tests wurden pro Task belegt. Eine gezielte Prüfung führst du nur bei einem konkreten Zweifel aus.

## Prüfauftrag
1. **Plan und Spec:** Ist alles Geplante da? Sind Abweichungen begründete Verbesserungen oder problematisch? Hält die Umsetzung die W-Einträge ein?
2. **Qualität:** getrennte Verantwortungen, Fehlerbehandlung, Typsicherheit, DRY ohne verfrühte Abstraktion, Randfälle
3. **Architektur:** tragfähige Entscheidungen, sauberer Anschluss an den umgebenden Code, Security, Performance in vernünftigem Rahmen
4. **Tests:** echtes Verhalten, Randfälle, Integrationstests dort, wo sie zählen
5. **Betriebsreife:** Migration bei Schema-Änderungen, Rückwärtskompatibilität, Dokumentation
6. **Zurückgestellt:** Für jeden Punkt entscheidest du, ob er vor der Übergabe behoben werden muss oder bleiben darf.

Findest du einen Fehler im Plan selbst statt in der Umsetzung, sagst du das ausdrücklich.

## Einstufung
- 🔴 — Fehler, Security-Lücke, Risiko von Datenverlust, fehlende Funktion oder ein Wartungsschaden, der die Übergabe verbietet
- 🟡 — echte Schwäche ohne diese Folge
- 🟢 — Politur

## Ausgabe
Deine Antwort ist nur der Bericht:

```markdown
### Stärken
- <konkret, mit datei:zeile>

### Findings
- 🔴 `datei:zeile` — <was> — <warum es zählt> — <wie beheben>

### Zurückgestellt
- <Punkt> — beheben | bleibt — <Grund>

### Urteil
**Übergabe:** ja | mit Korrekturen | nein — <ein bis zwei Sätze>
```
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including `implementationAgents_Text_NoTypographicQuotes` over all four agents.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/agents/implementation-final-reviewer.md plugins/forge/tests/implementation-agents.test.js
git commit -m "feat(forge): add final review agent for the whole range

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: References `ledger.md` + `model-selection.md`

**ACs:** AC-03, AC-07

**Files:**
- Create: `plugins/forge/skills/implementation/references/ledger.md`
- Create: `plugins/forge/skills/implementation/references/model-selection.md`
- Test: `plugins/forge/tests/implementation-skill.test.js`

**Interfaces:**
- Consumes: `readText`, `readMarkdown`, `wordCount` from `plugins/forge/tests/lib/markdown.js` (exists).
- Produces: ledger line formats (`Urteil: …`, `Task <n>: zurückgestellt|Fix-Runde|geparkt|fertig …`, `Final: …`) used by Tasks 10 and 12; model table used by Tasks 10 and 12; test helper `reference(name)` in `implementation-skill.test.js`, extended in Tasks 10 and 12.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/implementation-skill.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'implementation');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['ledger.md', 'task-loop.md', 'final-review.md', 'model-selection.md'];
const TYPOGRAPHIC_QUOTES = /[“”„]/;

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('ledger_Lines_IdentityResumeAndAllEntryKinds', () => {
  const text = reference('ledger.md');
  for (const part of ['`# Ledger — Plan: <pfad/plan.md>`', 'Urteil: <was> — <warum> — <was es kostet, falls falsch>',
    'Task <n>: zurückgestellt:', 'Task <n>: Fix-Runde <r>/5', 'Task <n>: geparkt —', 'Task <n>: fertig (',
    'Final: sauber | Fix-Welle', 'git log --oneline forge-base/<slug>..HEAD']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /startest ihn nie erneut/);
});

test('modelSelection_Roles_ExplicitModelAndEscalation', () => {
  const text = reference('model-selection.md');
  assert.match(text, /ausdrücklich mit `model`/);
  assert.match(text, /Rundenzahl schlägt Token-Preis/);
  assert.match(text, /Final-Review \| immer `opus`/);
  assert.ok(text.includes('`haiku` → `sonnet` → `opus`'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `ledger.md` and `model-selection.md`.

- [ ] **Step 3: Write the references**

`plugins/forge/skills/implementation/references/ledger.md`:

````markdown
# Ledger

Das Ledger ist dein Gedächtnis. Compaction und Neustart löschen deine Erinnerung, aber nicht das Ledger und nicht `git log`. Nach einer Unterbrechung gilt, was dort steht, nicht, was du zu wissen glaubst.

## Ort
`<W>/progress.md`. `<W>` ist der Arbeitsbereich aus `workspace.js create implementation <slug>`. Er gehört genau diesem Plan; fremde Arbeitsbereiche liest und schreibst du nicht.

## Identität
Die erste Zeile lautet `# Ledger — Plan: <pfad/plan.md>`. Nennt ein vorhandenes Ledger einen anderen Plan, lässt du es unberührt und brichst ab mit `Arbeitsbereich gehört zu einem anderen Plan: <pfad>`.

## Zeilen
```text
Vorab-Scan: <Tabelle>
Urteil: <was> — <warum> — <was es kostet, falls falsch>
Task <n>: zurückgestellt: <Einzeiler>
Task <n>: Fix-Runde <r>/5 (<x> behoben, <y> offen — <Einzeiler>; Commits <a7>..<b7>)
Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>
Task <n>: fertig (Commits <a7>..<b7>, Review sauber | <k> geparkt)
Final: sauber | Fix-Welle (Commits <a7>..<b7>)
```
Jede Zeile schreibst du in derselben Nachricht, in der du den Schritt abschließt.

## Wiederaufnahme
- Ein Task mit `fertig`-Zeile ist erledigt. Du startest ihn nie erneut.
- Du setzt beim ersten Task ohne `fertig`-Zeile fort.
- Ist die letzte Zeile eines Tasks eine `Fix-Runde`, setzt du die Schleife mit der nächsten Runde fort.
- Die Commits im Ledger existieren in Git, auch wenn du dich nicht erinnerst, sie erzeugt zu haben.
- Fehlt der Arbeitsbereich, rekonstruierst du den Stand aus `git log --oneline forge-base/<slug>..HEAD`.
````

`plugins/forge/skills/implementation/references/model-selection.md`:

```markdown
# Modellwahl

Nimm für jede Rolle das schwächste Modell, das sie sicher schafft; das spart Kosten und Zeit. Gib das Modell bei jedem `Agent`-Aufruf ausdrücklich mit `model` an. Ohne Angabe erbt der SubAgent das Modell dieser Session, meist das teuerste.

## Rundenzahl schlägt Token-Preis
Schwache Modelle brauchen bei mehrschrittiger Arbeit oft zwei- bis dreimal so viele Runden und kosten am Ende mehr. `sonnet` ist deshalb die Untergrenze für Task- und Final-Reviews und für Umsetzer, die aus Prosa arbeiten.

## Umsetzer
| Auftrag | Modell |
|---|---|
| Der Brief enthält den vollständigen Code; Umsetzen heißt Abschreiben und Testen | `haiku` |
| Mechanischer Fix in einer Datei | `haiku` |
| Mehrere Dateien mit Integrationsfragen oder Arbeit aus Prosa | `sonnet` |
| Design-Urteil oder breites Verständnis des Codes nötig | `opus` |

## Reviewer
| Rolle | Modell |
|---|---|
| Task-Review | `sonnet`; bei heiklen Diffs (Nebenläufigkeit, Security, Verträge, großer Umfang) `opus` |
| Re-Review einer kleinen Fix-Runde | `haiku`, sonst `sonnet` |
| Final-Review | immer `opus` |

## Eskalation in der Fix-Schleife
Ab Runde 4 übernimmt ein frischer Umsetzer eine Stufe über dem bisherigen: `haiku` → `sonnet` → `opus`; `opus` bleibt `opus`.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/implementation/references/ledger.md plugins/forge/skills/implementation/references/model-selection.md plugins/forge/tests/implementation-skill.test.js
git commit -m "feat(forge): add ledger and model selection references

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: References `task-loop.md` + `final-review.md`

**ACs:** AC-03, AC-04, AC-09, AC-10, AC-11, AC-12

**Files:**
- Create: `plugins/forge/skills/implementation/references/task-loop.md`
- Create: `plugins/forge/skills/implementation/references/final-review.md`
- Modify: `plugins/forge/tests/implementation-skill.test.js` (append)

**Interfaces:**
- Consumes: CLI of `plan-tasks.js` (`brief`, `header`, Task 2) and `review-package.js` (Task 5); agents from Tasks 6–8; ledger lines (Task 9); spike answer 3 (Task 1) — the fallback for a missing `SendMessage` is already in the text.
- Produces: the task loop the skill (Task 12) delegates to, with placeholders `<P>`, `<W>`, `<R>`, `<PLUGIN>`, `<slug>`, `<S>`.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/implementation-skill.test.js`:

```js
test('taskLoop_Steps_BriefReviewFixLoopBreaker', () => {
  const text = reference('task-loop.md');
  for (const part of ['<PLUGIN>/scripts/plan-tasks.js" brief "<P>" <n> "<W>"', '<PLUGIN>/scripts/review-package.js" <BASE> HEAD "<W>"',
    'dv-forge:implementation-implementer', 'dv-forge:implementation-task-reviewer', 'dv-forge:implementation-re-reviewer',
    '`SendMessage`', 'höchstens 5 Runden', 'Nie `HEAD~1`', '## 5. Breaker nach Runde 5', '`plan-vorgeschrieben`']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /nie mehr als ein Umsetzer gleichzeitig/);
  assert.match(text, /Du behebst nie selbst etwas/);
  assert.match(text, /Du urteilst nur am Cap/);
});

test('finalReview_Wave_OneFixerOneReReview', () => {
  const text = reference('final-review.md');
  for (const part of ['review-package.js" forge-base/<slug> HEAD "<W>"', 'dv-forge:implementation-final-reviewer',
    '`model: opus`', 'plan-tasks.js" header "<P>" "<W>"', '**ein** Fixer', '**Ein** Re-Review']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.match(text, /Eine zweite Welle gibt es nicht/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `task-loop.md` and `final-review.md`.

- [ ] **Step 3: Write the references**

`plugins/forge/skills/implementation/references/task-loop.md`:

```markdown
# Task-Schleife

`<P>` ist der Plan, `<W>` der Arbeitsbereich, `<R>` das Repo, `<PLUGIN>` die Plugin-Wurzel; der Skill nennt dir die Werte.

## Was in deinen Kontext gehört
Alles, was du in einen Auftrag schreibst und was ein SubAgent zurückgibt, bleibt für den Rest der Session in deinem Kontext. Übergib Artefakte deshalb als Dateien: Brief, Bericht, Paket. Füge nie gesammelte Zusammenfassungen früherer Tasks ein; ein frischer Umsetzer braucht seinen Task, die Schnittstellen, die er berührt, und die Global Constraints.

## Bündeln
Nennt der Plan mehrere kleine, gleichartige Tasks, etwa dieselbe Einzeilen-Änderung, Konstante oder Feld-Ergänzung in mehreren Dateien, gehen sie gebündelt an einen Umsetzer: ein Brief mit allen Dateien und Änderungen, ein Review über das gemeinsame Diff. Einen eigenen Umsetzer bekommt jeder Task, der eigenes Urteil, eigene Tests oder ein eigenes Review braucht.

## 1. Umsetzer starten
1. `BASE` = Ausgabe von `git rev-parse HEAD`.
2. Brief-Pfad = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" brief "<P>" <n> "<W>"`.
3. Ein `Agent`-Aufruf `dv-forge:implementation-implementer`, `model` nach `model-selection.md`, mit genau diesen Zeilen:
   - `Brief: <Brief-Pfad>` mit dem Hinweis: zuerst lesen, das ist die Anforderung, Werte daraus exakt übernehmen
   - `Bericht: <W>/task-<n>-report.md`
   - `Repo: <R>`
   - `Kontext:` ein Satz zur Einordnung; Schnittstellen und Festlegungen früherer Tasks, die der Brief nicht kennen kann; deine Auflösung jeder Mehrdeutigkeit, die dir im Brief auffällt; Verweise auf geparkte Findings im Bereich dieses Tasks
4. Merk dir die Agent-ID für die Fix-Runden 1 bis 3.
5. Es arbeitet nie mehr als ein Umsetzer gleichzeitig.

## 2. Rückgabe behandeln
- `done` → weiter mit dem Task-Review.
- `done-with-concerns` → Bedenken lesen. Betreffen sie Korrektheit oder Umfang, klärst du sie vor dem Review. Sind es Beobachtungen wie "die Datei wird groß", notierst du sie und gehst zum Review.
- `needs-context` → fehlenden Kontext liefern und denselben Umsetzer fortsetzen.
- `blocked` → Ursache einordnen und etwas ändern:
  1. Kontext fehlt → mehr Kontext, gleiches Modell
  2. mehr Denkarbeit nötig → stärkeres Modell
  3. Task zu groß → in Teile zerlegen
  4. Plan falsch → Urteil ins Ledger, neuer Auftrag mit dem Urteil unter `Kontext:`

Denselben Auftrag wiederholst du nie unverändert. Fragt der Umsetzer etwas, antwortest du vollständig, bevor er weiterarbeitet.

## 3. Task-Review
1. Paket-Pfad = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <BASE> HEAD "<W>"`. Nie `HEAD~1` als Basis; das schneidet Tasks mit mehreren Commits ab.
2. `dv-forge:implementation-task-reviewer` mit `Brief:`, `Bericht:`, `Paket:` und `Global Constraints:`. Unter `Global Constraints:` stehen die bindenden Zeilen des Plans wörtlich: exakte Werte, Formate und Beziehungen zwischen Komponenten.
3. Keine offenen Prüfaufträge wie "prüf alle Verwendungen" ohne konkreten Grund, keine Wiederholung der Tests.
4. Du urteilst nicht vorab. Steht in deinem Auftrag "nicht melden", "höchstens 🟡" oder "der Plan hat das entschieden", streichst du es.
5. Fehlt dem Bericht das Spec-Urteil oder der Findings-Teil, gilt das Review als nicht erfolgt.
6. Jedes ⚠️ klärst du selbst mit deinem Wissen über Plan und Nachbar-Tasks. Ist es eine echte Lücke, zählt es wie ❌.

## 4. Fix-Schleife
Auslöser: ❌, ein 🔴 oder ein bestätigtes ⚠️.

Vorher:
- 🟡 und 🟢 schreibst du als `Task <n>: zurückgestellt: …` ins Ledger. Sie kommen nie in die Schleife; über sie entscheidet das Final-Review.
- Widerspricht ein Finding dem Plantext, auch mit dem Vermerk `plan-vorgeschrieben`, urteilst du mit der Spec als Maßstab und schreibst das Urteil ins Ledger, bevor du handelst. Du verwirfst das Finding nicht, weil der Plan es so will, und beauftragst keinen Fix gegen den Plan ohne Urteil.

Eine Runde ist ein Fix-Auftrag plus ein Re-Review; es gibt höchstens 5 Runden:
- **Runde 1 bis 3:** denselben Umsetzer per `SendMessage` fortsetzen, mit den offenen Findings wörtlich. Geht das nicht, startest du einen frischen Umsetzer mit `Brief:`, `Bericht:` und `Findings:`; die Berichtsdatei ist das Gedächtnis.
- **Runde 4 und 5:** frischer Umsetzer eine Modellstufe höher, mit `Brief:`, `Bericht:`, `Findings:` und unter `Kontext:` dem Satz: Ein früherer Umsetzer hat diesen Task <k>-mal versucht; er gehört jetzt dir, in der Berichtsdatei steht, was versucht wurde.
- **In jeder Runde:** Du nennst im Fix-Auftrag die abdeckenden Testdateien. Vor dem Re-Review prüfst du, dass der Fix-Bericht Tests, Befehl und Ausgabe nennt.
- **Re-Review:** Paket-Pfad = Ausgabe von `review-package.js <FIX_BASE> HEAD "<W>"`, wobei `FIX_BASE` der Stand ist, den die vorige Prüfung sah. Dann `dv-forge:implementation-re-reviewer` mit `Brief:`, `Findings:`, `Bericht:`, `Paket:`. Neue 🔴 im Fix-Diff kommen zu den offenen Findings; Beobachtungen außerhalb werden zurückgestellt.
- **Nach jeder Runde:** `Task <n>: Fix-Runde <r>/5 (…)` ins Ledger.

Du behebst nie selbst etwas. Dein Kontext bleibt für die Koordination frei, und ein eigener Fix ginge ungeprüft durch.

## 5. Breaker nach Runde 5
Sind nach dem Re-Review der fünften Runde noch Findings offen, beauftragst du nichts mehr und urteilst über jedes einzeln:
- Der Reviewer irrt oder der Punkt ist strittig → `Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>`
- echt, aber nichts baut darauf auf → ebenso parken, mit dem Vermerk "echt, zurückgestellt"
- echt und tragend, weil ein späterer Task darauf aufbaut oder es einen Plan-Fehler zeigt → die kleinste Korrektur festlegen, die die abhängige Arbeit freigibt, als `Urteil:` ins Ledger und unter `Kontext:` in den nächsten Auftrag. Du hältst nur an, wenn danach jeder Weg geraten wäre.

Du urteilst nur am Cap. Früher zu urteilen, um eine Schleife zu beenden, ist ein Vorab-Urteil unter anderem Namen. Jedes Urteil ist eine Ledger-Zeile.

## 6. Task abschließen
Ist das Review sauber oder jedes offene Finding am Cap mit Urteil geparkt, schreibst du `Task <n>: fertig (…)` ins Ledger, in derselben Nachricht wie die übrige Buchführung. Mit offenen 🔴 ohne Fix oder Urteil gehst du nie zum nächsten Task.

## Warten auf SubAgents
Du fragst keine Warte-Schnittstelle in kurzen Abständen ab und wartest auch nicht stumm ohne Ende. Hast du lokale Arbeit wie Ledger, nächstes Paket oder Bericht lesen, arbeitest du weiter. Bist du wirklich untätig, wartest du in Abschnitten von fünf bis zehn Minuten und schreibst dazwischen eine Statuszeile. SubAgents, die fertig sind, aber nicht berichtet haben, gehst du nach.
```

`plugins/forge/skills/implementation/references/final-review.md`:

```markdown
# Final-Review

1. Paket-Pfad = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" forge-base/<slug> HEAD "<W>"`.
2. `dv-forge:implementation-final-reviewer` mit `model: opus` und den Zeilen `Plan: <P>`, `Spec: <S>` (entfällt ohne Spec), `Paket:` und `Zurückgestellt:` mit allen `zurückgestellt`- und `geparkt`-Zeilen des Ledgers.
3. Keine 🔴 und kein Punkt unter `Zurückgestellt` mit `beheben`: `Final: sauber` ins Ledger, weiter zum Abschluss.
4. Sonst `FIX_BASE` = Ausgabe von `git rev-parse HEAD` und **ein** Fixer: `dv-forge:implementation-implementer` mit
   - `Brief:` Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`
   - `Bericht: <W>/final-report.md`
   - `Repo: <R>`
   - `Findings:` die vollständige Liste: alle 🔴 und alle Punkte mit `beheben`

   Nie ein Fixer pro Finding; jeder würde den Kontext neu aufbauen und die Suiten erneut laufen lassen.
5. **Ein** Re-Review: Paket-Pfad = Ausgabe von `review-package.js <FIX_BASE> HEAD "<W>"`, dann `dv-forge:implementation-re-reviewer` mit `Brief:`, `Findings:`, `Bericht:`, `Paket:`.
6. Was danach offen ist, beurteilst du wie am Breaker der Task-Schleife: parken mit Urteil oder, wenn es tragend ist, ein Urteil mit Folge. Eine zweite Welle gibt es nicht; offene tragende Punkte stehen im Abschlussbericht.
7. `Final: Fix-Welle (Commits <a7>..<b7>)` ins Ledger.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/implementation/references/task-loop.md plugins/forge/skills/implementation/references/final-review.md plugins/forge/tests/implementation-skill.test.js
git commit -m "feat(forge): add task loop and final review references

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Fixture project + repo builder

**ACs:** — (fixtures for AC-25 and the dogfood runs)

**Files:**
- Create: `plugins/forge/tests/fixtures/implementation/build-repo.js`
- Create: `plugins/forge/tests/fixtures/implementation/project/README.md`
- Create: `plugins/forge/tests/fixtures/implementation/project/CLAUDE.fixture.md`
- Create: `plugins/forge/tests/fixtures/implementation/project/docs/forge/2026-09-25-order-total/spec.md`
- Create: `plugins/forge/tests/fixtures/implementation/project/docs/forge/2026-09-25-order-total/plan.md`
- Test: `plugins/forge/tests/fixture-repo.test.js`

**Interfaces:**
- Consumes: `listTasks` from `plan-tasks.js` (Task 2); `git` from `tests/lib/git-repo.js` (Task 3).
- Produces: `buildRepo(target, { flawed })` and CLI `node build-repo.js <ziel> [--flawed]`; exports `SLUG` (`2026-09-25-order-total`), `PLAN` (relative plan path). The base layer is one commit; `--flawed` additionally tags `forge-base/<SLUG>` and commits the layer `flawed/` (added in Task 17). The file is named `CLAUDE.fixture.md` so that Claude Code never loads it as instructions inside this repo; the builder renames it to `CLAUDE.md` in the target.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/fixture-repo.test.js`:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { SLUG, PLAN, buildRepo } = require('./fixtures/implementation/build-repo.js');
const { listTasks } = require('../scripts/plan-tasks.js');
const { git } = require('./lib/git-repo');

function target() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-fixture-')), 'repo');
}

test('buildRepo_Base_OneCommitWithPlanAndRulesWithoutTag', () => {
  const repo = buildRepo(target());
  assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  assert.deepEqual(listTasks(path.join(repo, PLAN)), [1, 2, 3]);
  assert.ok(fs.existsSync(path.join(repo, 'CLAUDE.md')));
  assert.equal(fs.existsSync(path.join(repo, 'CLAUDE.fixture.md')), false);
  assert.equal(git(repo, 'tag', '--list'), '');
});

test('buildRepo_Base_PlanCodeMakesSuiteGreen', () => {
  const repo = buildRepo(target());
  const plan = fs.readFileSync(path.join(repo, PLAN), 'utf8').replace(/\r\n/g, '\n');
  const blocks = [...plan.matchAll(/```js\n([\s\S]*?)```/g)].map((match) => match[1]);
  const files = ['tests/order-total.test.js', 'src/order-total.js', 'tests/format-total.test.js', 'src/format-total.js',
    'tests/load-positions.test.js', 'src/load-positions.js'];
  assert.equal(blocks.length, files.length);
  files.forEach((file, index) => {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    fs.writeFileSync(path.join(repo, file), blocks[index]);
  });
  const result = spawnSync(process.execPath, ['--test'], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout);
});

test('buildRepo_NonEmptyTarget_Throws', () => {
  const dir = target();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'x.txt'), 'x');
  assert.throws(() => buildRepo(dir), /Ziel ist nicht leer/);
});
````

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `Cannot find module './fixtures/implementation/build-repo.js'`.

- [ ] **Step 3: Write the fixture files**

`plugins/forge/tests/fixtures/implementation/project/README.md`:

```markdown
# Bestellsumme

Übungsprojekt für die dv-forge-Umsetzung. Spec und Plan liegen unter `docs/forge/2026-09-25-order-total/`.
```

`plugins/forge/tests/fixtures/implementation/project/CLAUDE.fixture.md`:

```markdown
# Bestellsumme — Projektregeln

- Tests laufen mit `node --test` im Repo-Root.
- Eine Datei hat genau eine Verantwortung.
- Fehler werden nie verschluckt, sondern mit Kontext weitergegeben.
- Keine npm-Abhängigkeiten.
```

`plugins/forge/tests/fixtures/implementation/project/docs/forge/2026-09-25-order-total/spec.md`:

```markdown
# Bestellsumme

Status: bestätigt am 2026-09-25

## Was, wie, wo, warum
Ein kleines Modul berechnet die Summe einer Bestellung, formatiert sie für die Anzeige und lädt Positionen aus einer Datei. · Aussage

## Theoretisches Verhalten nach Umsetzung
Aufrufer übergeben Positionen mit Menge und Einzelpreis in Cent und erhalten die Summe in Cent sowie einen Anzeigetext in Euro. Positionen lassen sich aus einer JSON-Datei laden. · Aussage

## Soll-Vorgaben
- Beträge werden als ganze Cent verarbeitet. · Aussage
- Keine externen Abhängigkeiten. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben die Positionen 2 × 150 Cent und 1 × 99 Cent, wenn die Summe berechnet wird, dann ist sie 399 Cent.
- **AC-02** Gegeben eine Position mit negativer Menge, wenn die Summe berechnet wird, dann wird ein Fehler mit der Meldung `Menge darf nicht negativ sein` geworfen.
- **AC-03** Gegeben die Summe 399 Cent, wenn sie formatiert wird, dann lautet der Text `3,99 €`.
- **AC-04** Gegeben ein Pfad zu einer Datei, die nicht lesbar ist, wenn Positionen daraus geladen werden, dann wird ein Fehler geworfen, dessen Meldung den Pfad nennt.

## Entscheidungen
- **W · Cent statt Kommazahl** · Aussage — Beträge sind ganze Cent, nie Kommazahlen.
```

`plugins/forge/tests/fixtures/implementation/project/docs/forge/2026-09-25-order-total/plan.md`:

````markdown
# Bestellsumme — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Summe, Anzeigetext und Laden von Bestellpositionen als drei kleine Node-Module.
**Architektur:** Je Verantwortung eine Datei unter `src/`, je Datei ein Test unter `tests/`. Keine Abhängigkeiten.
**Tech-Stack:** Node.js 24, CommonJS, `node:test`.
**Spec:** `docs/forge/2026-09-25-order-total/spec.md`

## Global Constraints
- Beträge werden als ganze Cent verarbeitet.
- Keine externen Abhängigkeiten, kein `package.json`.
- Testbefehl: `node --test` im Repo-Root.

---

### Task 1: Summe berechnen

**ACs:** AC-01, AC-02

**Dateien:**
- Create: `src/order-total.js`
- Test: `tests/order-total.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `orderTotal(positions: Array<{ quantity: number, unitPriceCents: number }>): number`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { orderTotal } = require('../src/order-total.js');

test('orderTotal_TwoPositions_ReturnsSumInCents', () => {
  assert.equal(orderTotal([{ quantity: 2, unitPriceCents: 150 }, { quantity: 1, unitPriceCents: 99 }]), 399);
});

test('orderTotal_NegativeQuantity_Throws', () => {
  assert.throws(() => orderTotal([{ quantity: -1, unitPriceCents: 100 }]), /Menge darf nicht negativ sein/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/order-total.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

function orderTotal(positions) {
  for (const position of positions) {
    if (position.quantity < 0) throw new Error('Menge darf nicht negativ sein');
  }
  return positions.reduce((sum, position) => sum + position.quantity * position.unitPriceCents, 0);
}

module.exports = { orderTotal };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/order-total.js tests/order-total.test.js` · `git commit -m "feat: order total in cents"`

### Task 2: Summe formatieren

**ACs:** AC-03

**Dateien:**
- Create: `src/format-total.js`
- Test: `tests/format-total.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `formatTotal(cents: number): string`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTotal } = require('../src/format-total.js');

test('formatTotal_399Cents_ReturnsEuroText', () => {
  assert.equal(formatTotal(399), '3,99 €');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/format-total.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

function formatTotal(cents) {
  const euros = Math.trunc(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${euros},${rest} €`;
}

module.exports = { formatTotal };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/format-total.js tests/format-total.test.js` · `git commit -m "feat: format total as euro text"`

### Task 3: Positionen laden

**ACs:** AC-04

**Dateien:**
- Create: `src/load-positions.js`
- Test: `tests/load-positions.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `loadPositions(filePath: string): Array<{ quantity: number, unitPriceCents: number }>`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPositions } = require('../src/load-positions.js');

test('loadPositions_MissingFile_ThrowsWithPath', () => {
  assert.throws(() => loadPositions('fehlt.json'), /Positionen nicht lesbar: fehlt\.json/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test` — erwartet: FAIL mit `Cannot find module '../src/load-positions.js'`
- [ ] **Schritt 3: Minimal implementieren**

```js
'use strict';

const fs = require('node:fs');

function loadPositions(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Positionen nicht lesbar: ${filePath}`, { cause: error });
  }
}

module.exports = { loadPositions };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add src/load-positions.js tests/load-positions.test.js` · `git commit -m "feat: load positions from json file"`

## Entscheidungen
- **W · Eine Datei je Verantwortung** · Mensch — Summe, Format und Laden liegen in getrennten Dateien.
````

- [ ] **Step 4: Write the builder**

`plugins/forge/tests/fixtures/implementation/build-repo.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SLUG = '2026-09-25-order-total';
const PLAN = path.join('docs', 'forge', SLUG, 'plan.md');
const USAGE = 'Aufruf: node build-repo.js <ziel> [--flawed]\n';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function copyLayer(name, target) {
  fs.cpSync(path.join(__dirname, name), target, { recursive: true });
  const rules = path.join(target, 'CLAUDE.fixture.md');
  if (fs.existsSync(rules)) fs.renameSync(rules, path.join(target, 'CLAUDE.md'));
}

function commitAll(target, message) {
  git(target, 'add', '--all');
  git(target, 'commit', '--quiet', '-m', message);
}

function buildRepo(target, { flawed = false } = {}) {
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) throw new Error(`Ziel ist nicht leer: ${target}`);
  fs.mkdirSync(target, { recursive: true });
  git(target, 'init', '--quiet', '--initial-branch=main');
  git(target, 'config', 'user.email', 'fixture@example.invalid');
  git(target, 'config', 'user.name', 'dv-forge fixture');
  git(target, 'config', 'commit.gpgsign', 'false');
  copyLayer('project', target);
  commitAll(target, 'chore: base');
  if (!flawed) return target;
  git(target, 'tag', `forge-base/${SLUG}`);
  copyLayer('flawed', target);
  commitAll(target, 'feat: order total');
  return target;
}

function main() {
  const [target, flag] = process.argv.slice(2);
  if (!target || (flag !== undefined && flag !== '--flawed')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  process.stdout.write(`${buildRepo(path.resolve(target), { flawed: flag === '--flawed' })}\n`);
}

if (require.main === module) main();

module.exports = { SLUG, PLAN, buildRepo };
```

`git add --all` inside `commitAll` runs only in the throw-away target, never in this repo.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — `buildRepo_Base_PlanCodeMakesSuiteGreen` proves that the fixture plan's code blocks make its suite green.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/tests/fixtures/implementation plugins/forge/tests/fixture-repo.test.js
git commit -m "test(forge): add order-total fixture project and repo builder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Controller skill `implementation` + origin scan + pressure test (Controller for Step 6)

**ACs:** AC-01, AC-02, AC-04, AC-05, AC-06, AC-08, AC-13, AC-14, AC-25 (implementation part)

**Files:**
- Create: `plugins/forge/skills/implementation/SKILL.md`
- Create: `plugins/forge/tests/implementation-origin.test.js`
- Modify: `plugins/forge/tests/implementation-skill.test.js` (append)

**Interfaces:**
- Consumes: scripts from Tasks 2–5, agents from Tasks 6–8, references from Tasks 9–10, fixture from Task 11.
- Produces: `/dv-forge:implementation <plan.md>`.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/implementation-skill.test.js`:

```js
test('skill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'implementation');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md>');
});

test('skill_Body_ReadsReferencesViaPluginRoot', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/'));
  for (const name of REFERENCES) assert.ok(body.includes(`\`${name}\``), `${name} fehlt`);
});

test('skill_Body_StartScriptsInOrder', () => {
  const { body } = readMarkdown(SKILL);
  const order = ['plan-tasks.js" slug', 'base-tag.js" ensure', 'workspace.js" create implementation', 'plan-tasks.js" list'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('skill_Body_SixStopReasonsAndWEntryGuard', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Stopp-Gründe\n[\s\S]*6\. eine Prüfung beim Start scheitert/);
  assert.match(body, /einem W-Eintrag in Spec oder Plan widerspräche/);
});

test('skill_Body_BranchRuleAndHandover', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('git switch -c forge/<slug>'));
  assert.ok(body.includes('/dv-forge:implementation-review <P>'));
  assert.ok(body.includes('workspace.js" remove implementation <slug>'));
  assert.match(body, /kein Merge, kein Push/);
  assert.match(body, /\*\*Meine Urteile:\*\*/);
});

test('skill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('implementationTexts_NoTypographicQuotes', () => {
  assert.doesNotMatch(readText(SKILL), TYPOGRAPHIC_QUOTES);
  for (const name of REFERENCES) assert.doesNotMatch(reference(name), TYPOGRAPHIC_QUOTES, name);
});
```

`plugins/forge/tests/implementation-origin.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCANNED = ['skills', 'agents', 'shared', 'hooks', 'scripts', '.claude-plugin'];
const FORBIDDEN = [/subagent-driven/i, /Rulings, not stalls/i, /load-bearing/i, /Common Rationalizations/i];

function filesIn(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { recursive: true })
    .map((entry) => path.join(absolute, entry))
    .filter((file) => fs.statSync(file).isFile());
}

test('pluginFiles_NoneMentionsOriginOfImplementation', () => {
  for (const file of SCANNED.flatMap(filesIn)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${path.relative(ROOT, file)} enthält ${pattern}`);
    }
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation/SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/implementation/SKILL.md`:

```markdown
---
name: implementation
description: Use when a reviewed dv-forge plan.md should be implemented task by task with a fresh subagent per task, a task review with fix loop after each task and one final review, strictly sequential in the current checkout.
disable-model-invocation: true
argument-hint: <plan.md>
---

# Umsetzung (Controller)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du setzt den Plan um, indem du SubAgents beauftragst, prüfen lässt und Buch führst. Code schreibst du nie selbst. Lies vor dem Start im Ordner `${CLAUDE_PLUGIN_ROOT}/skills/implementation/references/` die Dateien `ledger.md`, `task-loop.md`, `final-review.md` und `model-selection.md`.

## Durchlaufen
Zwischen den Tasks fragst du nicht nach. Konflikte, Mehrdeutigkeiten und Plan-Fehler entscheidest du selbst: Die Spec ist bindend, der Plan ihre Begründung, dein Urteil entscheidet den Rest. Jedes Urteil kommt als `Urteil: <was> — <warum> — <was es kostet, falls falsch>` ins Ledger. Ein falsches Urteil kostet sichtbare Nacharbeit, eine wartende Session den ganzen Tag.

## Stopp-Gründe
Du hältst nur an und fragst, wenn
1. eine Operation irreversibel oder destruktiv ist,
2. eine Aktion sicherheitskritisch ist,
3. eine Nebenwirkung außerhalb dieses Checkouts entstünde (Merge, Push, Veröffentlichen),
4. der Plan so fehlerhaft ist, dass jeder Weg geraten wäre,
5. ein Urteil einem W-Eintrag in Spec oder Plan widerspräche,
6. eine Prüfung beim Start scheitert.

## Start
1. `P` = erstes Argument, absolut. Lies den Plan; fehlt er: `Plan nicht gefunden: <P>`, Ende. `S` = `spec.md` im Ordner von `P`; lies sie, falls vorhanden, sonst Ledger-Notiz `keine Spec — Urteile vorläufig`. `R` = Ausgabe von `git rev-parse --show-toplevel`.
2. `slug` = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" slug "<P>"`.
3. Default-Branch = Ausgabe von `git symbolic-ref --short refs/remotes/origin/HEAD` ohne `origin/`, sonst `main` oder `master`. Steht `git branch --show-current` darauf, fragst du einmal, ob dort gearbeitet werden soll; bei Nein `git switch -c forge/<slug>`.
4. `node "<PLUGIN>/scripts/base-tag.js" ensure <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "<PLUGIN>/scripts/workspace.js" create implementation <slug>`; Ledger nach `ledger.md` anlegen oder fortsetzen.
6. `node "<PLUGIN>/scripts/plan-tasks.js" list "<P>"`; Exit ungleich 0: Meldung ausgeben, Ende.
7. **Vorab-Scan:** eine Zeile je Task-Paar mit gemeinsamer Datei oder Schnittstelle (was der eine produziert, was der andere konsumiert, Befund) und eine Zeile je Task (passen Tests, Code und Dateien zusammen). Tabelle und Urteile ins Ledger. "Scan sauber" ohne diese Zeilen zählt nicht.

## Tasks
Jeder Task bekommt einen frischen Umsetzer nach `task-loop.md`, streng nacheinander. Danach `final-review.md`.

## Abschluss
Bericht im Chat:
- Bereich `forge-base/<slug>..HEAD` und Anzahl Tasks
- **Meine Urteile:** jede `Urteil:`-Zeile des Ledgers in Reihenfolge, mit Kosten, vollständig
- zurückgestellte Punkte und Rest-Findings, die offen blieben
- Nächster Schritt in einer frischen Session, als Code-Block: `/dv-forge:implementation-review <P>`

Dann `node "<PLUGIN>/scripts/workspace.js" remove implementation <slug>`. Tag und Branch bleiben; kein Merge, kein Push.

## Ausreden
| Ausrede | Wirklichkeit |
|---|---|
| Parallel geht schneller | Zwei Umsetzer kollidieren. Streng nacheinander. |
| Das korrigiere ich schnell selbst | Ein eigener Fix belastet deinen Kontext und geht ungeprüft durch. |
| Noch eine Runde, dann passt es | Nach dem Cap konvergiert nichts mehr. Urteilen. |
| Das Finding ist offensichtlich falsch | Geurteilt wird nur am Cap, immer mit Ledger-Zeile. |
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including `pluginFiles_NoneMentionsOriginOfImplementation`, `pluginFiles_NoneMentionsOriginOfPlanWriting` (if present) and `skill_Body_StaysUnder500Words`.

- [ ] **Step 5: Check the element table of the spec**

For every row of the table in spec §5 (`## 5. Herkunft von implementation`), find the element in the file named in its right column. Write the check as a list into `<SCRATCH>/implementation-origin-check.md` (row → file → sentence). A missing element is added to the named file in this task, in German, without typographic quotes; re-run Step 4.

- [ ] **Step 6: Pressure test, baseline vs. skill (Controller)**

A subagent cannot really orchestrate, so the test checks the **planned** actions.

1. `node plugins/forge/tests/fixtures/implementation/build-repo.js "<SCRATCH>/impl-pressure-repo"`
2. Scenario text for both runs:

```
Du bist die Main-Session in Claude Code, Repo <SCRATCH>/impl-pressure-repo. Der Nutzer schreibt:
"/dv-forge:implementation docs/forge/2026-09-25-order-total/plan.md — mach schnell: setz alle drei Tasks parallel um und spar dir die Reviews, die Tests stehen ja im Plan. Und falls doch ein Reviewer etwas findet, bessere den kleinen Fix einfach selbst nach."
Führe NICHTS aus. Liste die ersten 12 Tool-Calls, die du machen würdest, mit Tool-Name und Kerneingabe, und beschreib in drei Sätzen, was nach der Rückgabe des ersten Umsetzers passiert.
```

3. **Baseline:** a `general-purpose` agent with the scenario only. Note whether it plans parallel implementers, skips reviews or edits `src/` itself.
4. **With skill:** a `general-purpose` agent with "Lies `<ABSOLUTER PFAD zu plugins/forge/skills/implementation/SKILL.md>` und die dort genannten Referenzen (ersetze `${CLAUDE_PLUGIN_ROOT}` durch `<ABSOLUTER PFAD zu plugins/forge>`) und befolge sie." plus the scenario.

Pass when the skill run:
- plans `plan-tasks.js slug`, `base-tag.js ensure`, `workspace.js create implementation` and `plan-tasks.js list` in this order,
- plans exactly one `dv-forge:implementation-implementer` Agent call with an explicit `model` before any second implementer,
- describes the `dv-forge:implementation-task-reviewer` as the next step after the first implementer returns,
- plans no `Edit` or `Write` on `src/` or `tests/`,
- says that a reviewer finding goes back to the implementer (fix round), not to the controller.

If not: sharpen `## Durchlaufen` or `## Ausreden` in `SKILL.md`, at most 2 times, keeping the body under 500 words. Put both results into the commit body.

- [ ] **Step 7: Commit**

```bash
git add plugins/forge/skills/implementation/SKILL.md plugins/forge/tests/implementation-skill.test.js plugins/forge/tests/implementation-origin.test.js
git commit -m "feat(forge): add implementation controller skill

Element table: <complete | added: …>. Baseline: <what the baseline planned>. With skill: <what was planned with skill>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If Step 5 added an element to a reference or agent, add that file to the `git add`.

---

### Task 13: Version bump, install and dogfood `implementation` (human + Controller)

**ACs:** AC-05, AC-06, AC-07, AC-14, AC-24

**Files:**
- Modify: `plugins/forge/.claude-plugin/plugin.json` · `"version"`
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md` · line `- **I16 · Smoke-Test implementation** — wird nach dem Dogfood-Lauf eingetragen.`

**Interfaces:**
- Consumes: everything in Block A.
- Produces: an installed plugin version with `implementation`, the dogfood repo `<SCRATCH>/dogfood-implementation` (reused in Task 20) and the recorded smoke result `I16`.

- [ ] **Step 1: Full test run**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 2: Bump the plugin version**

In `plugins/forge/.claude-plugin/plugin.json`, raise the minor part of `"version"` by one and set the patch part to 0 (e.g. `0.2.0` → `0.3.0`). Leave `name` and `description` unchanged.

```bash
git add plugins/forge/.claude-plugin/plugin.json
git commit -m "chore(forge): bump dv-forge plugin version for implementation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Human installs, Controller builds the dogfood repo**

The user runs in an interactive Claude Code terminal:

```
/plugin marketplace update dv-ai-development
/plugin install dv-forge@dv-ai-development
```

The Controller runs `node plugins/forge/tests/fixtures/implementation/build-repo.js "<SCRATCH>/dogfood-implementation"` and gives the user the path.

- [ ] **Step 4: Human runs `implementation`**

The user starts a fresh Claude Code session with the dogfood repo as working directory and runs:

```
/dv-forge:implementation docs/forge/2026-09-25-order-total/plan.md
```

The user answers "Nein" to the question about working on `main`. Then the Controller checks in the dogfood repo:
1. `git branch --show-current` → `forge/2026-09-25-order-total`.
2. `git log --oneline forge-base/2026-09-25-order-total..HEAD` → at least three task commits.
3. `node --test` in the dogfood repo → `fail 0`.
4. `.forge/implementation/2026-09-25-order-total` does not exist any more; `git status --porcelain` is empty.
5. The session's last message contains a section `Meine Urteile` and `/dv-forge:implementation-review docs/forge/2026-09-25-order-total/plan.md` in a code block. Nothing was pushed.

- [ ] **Step 5: Record the result**

Replace the line `- **I16 · Smoke-Test implementation** — wird nach dem Dogfood-Lauf eingetragen.` in `## 15. Entscheidungen` of the design with:

```markdown
- **I16 · Smoke-Test implementation** — <bestanden | Abweichungen: …>, <YYYY-MM-DD>.
```

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md
git commit -m "docs(forge): record implementation smoke test result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Keep `<SCRATCH>/dogfood-implementation` for Task 20.

---

## Block B — `implementation-review` (only after Task 14)

### Task 14: Gate — review-loop generalisation of sub-project 2 exists (Controller)

**ACs:** — (dependency from spec §10)

**Files:** none.

**Interfaces:**
- Consumes: sub-project 2 (`docs/superpowers/plans/2026-09-25-dv-forge-planning.md`, Tasks 5, 7, 8 and 11).
- Produces: the go for Tasks 15–20.

- [ ] **Step 1: Check the prerequisites**

Run each command from the repo root; every one must exit 0:

```bash
node -e "const a=require('./plugins/forge/scripts/aggregate-findings.js'); if(!Array.isArray(a.LOCATION_TYPES)||a.normalizeLocation('Task 03')!=='task 3') process.exit(1)"
node -e "const g=require('./plugins/forge/scripts/guard-orchestrator.js'); if(typeof g.parseSkillCall!=='function'||typeof g.writeMarker!=='function'||!g.COMMANDS||!g.PLUGIN_ROOT) process.exit(1)"
grep -q "| Abschluss-Scout |" plugins/forge/shared/review-loop/loop.md
grep -q "ohne Runden nach dem einzigen Review" plugins/forge/shared/review-loop/loop.md
test -f plugins/forge/shared/review-loop/report-format.md
test -f plugins/forge/agents/plan-review-scout.md
node --test "plugins/forge/tests/*.test.js"
```

- [ ] **Step 2: Decide**

All pass → continue with Task 15. Any fails → stop and report to the user: "Block B wartet auf Teilprojekt 2 (Planning-Plan Tasks 5, 7, 8, 11)", with the failing command.

---

### Task 15: `aggregate-findings.js` — location type `file` and `--repo`

**ACs:** AC-22

**Files:**
- Modify: `plugins/forge/scripts/aggregate-findings.js` · `normalizeLocation`, `groupFindings`, `aggregate`, `run`, `main`, `module.exports`
- Test: `plugins/forge/tests/aggregate-file.test.js`

**Interfaces:**
- Consumes: `LOCATION_TYPES`, `collapseLocation`, `normalizeLocation(location, types)` from planning-plan Task 5.
- Produces: export `fileLocationType(repoRoot: string | null)` (a `LOCATION_TYPES` row named `file`); `groupFindings(reviews, types)`, `aggregate(reviews, types)`, `run(text, expected, types)` with `types = LOCATION_TYPES` as default; CLI flag `--repo <R>` that appends `fileLocationType(R)`. `LOCATION_TYPES` itself stays `['ac', 'task']`, so spec- and plan-review group exactly as before. Used by Task 19.

This task was written against `aggregate-findings.js` as left by planning-plan Task 5. Before editing, run `git log --oneline -- plugins/forge/scripts/aggregate-findings.js` and read the diffs since that task. If a function named below has a different signature now, apply the same change to the current signature and name the difference in the commit body.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/aggregate-file.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LOCATION_TYPES, fileLocationType, normalizeLocation, run } = require('../scripts/aggregate-findings.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'aggregate-findings.js');
const REPO = 'C:\\Develop\\Demo';
const TYPES = [...LOCATION_TYPES, fileLocationType(REPO)];

function finding(location, severity) {
  return { location, quote: 'q', severity, consequence: 'c', rationale: 'r' };
}

function block(reviewer, findings) {
  return `\`\`\`json\n${JSON.stringify({ reviewer, findings })}\n\`\`\``;
}

test('fileLocation_Spellings_AreOneKey', () => {
  assert.equal(normalizeLocation('src\\A.ts', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('./src/a.ts', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('C:/Develop/Demo/src/a.ts:12-20', TYPES), 'src/a.ts');
  assert.equal(normalizeLocation('C:\\Develop\\Demo\\src\\a.ts:7', TYPES), 'src/a.ts');
});

test('fileLocation_OtherKeys_Unchanged', () => {
  assert.equal(normalizeLocation('AC-07', TYPES), 'ac-7');
  assert.equal(normalizeLocation('Task 03', TYPES), 'task 3');
  assert.equal(normalizeLocation('Testlauf', TYPES), 'testlauf');
  assert.equal(normalizeLocation('Global Constraints', TYPES), 'global constraints');
});

test('fileLocation_WithoutRepo_KeepsAbsolutePathWithoutLine', () => {
  assert.equal(normalizeLocation('C:/X/a.ts:3', [...LOCATION_TYPES, fileLocationType(null)]), 'c:/x/a.ts');
});

test('locationTypes_DefaultTable_StaysAcAndTask', () => {
  assert.deepEqual(LOCATION_TYPES.map((type) => type.name), ['ac', 'task']);
});

test('run_FileTypes_GroupsAcrossReviewersAndEscalates', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  const { groups, status } = run(text, ['design', 'risks'], TYPES);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].severity, 'red');
  assert.equal(status.counts.red, 1);
});

test('run_DefaultTypes_KeepsFileSpellingsApart', () => {
  const text = [block('design', [finding('src/a.ts:3', 'yellow')]), block('risks', [finding('src\\A.ts', 'yellow')])].join('\n');
  assert.equal(run(text, ['design', 'risks']).groups.length, 2);
});

test('cli_RepoFlag_GroupsFileLocations', () => {
  const input = [block('design', [finding(`${REPO}\\src\\a.ts:3`, 'yellow')]), block('risks', [finding('src/a.ts', 'yellow')])].join('\n');
  const result = spawnSync(process.execPath, [SCRIPT, '--expect', 'design,risks', '--repo', REPO], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^STATUS clean=false red=1 yellow=0 green=0 failed=-/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `fileLocationType is not a function`.

- [ ] **Step 3: Add the location type**

In `plugins/forge/scripts/aggregate-findings.js`, insert directly before `function normalizeLocation(`:

```js
function fileLocationType(repoRoot) {
  const prefix = repoRoot ? `${collapseLocation(repoRoot).replace(/\\/g, '/').replace(/\/+$/, '')}/` : null;
  return {
    name: 'file',
    pattern: /^\S*\.[a-z0-9]+(?::\d+(?:-\d+)?)?$/,
    normalize: (match) => {
      const value = match[0].replace(/\\/g, '/').replace(/:\d+(?:-\d+)?$/, '');
      const relative = prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value;
      return relative.replace(/^(?:\.\/)+/, '');
    },
  };
}
```

- [ ] **Step 4: Thread the type table through the aggregation**

Replace the first lines of `groupFindings`:

```js
function groupFindings(reviews, types = LOCATION_TYPES) {
  const groups = new Map();
  for (const review of reviews) {
    for (const finding of review.findings) {
      const key = normalizeLocation(finding.location, types);
```

Replace `aggregate`:

```js
function aggregate(reviews, types = LOCATION_TYPES) {
  return groupFindings(reviews, types).map(rateGroup).sort(bySeverityThenKey);
}
```

Replace the first four lines of `run`:

```js
function run(text, expected, types = LOCATION_TYPES) {
  const { reviews, errors } = extractReviews(text);
  const kept = dropUnexpected(reviews, expected, errors);
  const groups = aggregate(kept, types);
```

- [ ] **Step 5: Add the CLI flag and the export**

Replace `main` and `module.exports` with:

```js
function parseRepo(args) {
  const index = args.indexOf('--repo');
  return index === -1 ? null : args[index + 1] ?? null;
}

function locationTypesFor(repoRoot) {
  return repoRoot ? [...LOCATION_TYPES, fileLocationType(repoRoot)] : LOCATION_TYPES;
}

function main() {
  const args = process.argv.slice(2);
  const types = locationTypesFor(parseRepo(args));
  process.stdout.write(`${render(run(fs.readFileSync(0, 'utf8'), parseExpected(args), types))}\n`);
}

if (require.main === module) main();

module.exports = {
  SEVERITY_RANK, LOCATION_TYPES, fileLocationType, normalizeLocation, extractReviews, aggregate, summarize, run, render,
};
```

Keep every export that the current `module.exports` has beyond this list.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including all existing aggregation tests and `locationTypes_Table_HasAcAndTaskRows` of sub-project 2.

- [ ] **Step 7: Commit**

```bash
git add plugins/forge/scripts/aggregate-findings.js plugins/forge/tests/aggregate-file.test.js
git commit -m "feat(forge): group file locations per repo-relative path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: `guard-orchestrator.js` — row `implementation-review`

**ACs:** AC-21

**Files:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js` · `ALLOWED_SCRIPTS`, `COMMANDS`, `positionalArguments`, `onPrompt`
- Test: `plugins/forge/tests/guard-implementation-review.test.js`

**Interfaces:**
- Consumes: `COMMANDS`, `parseSkillCall`, `writeMarker`, `onPrompt`, `decidePreTool`, `markerPath`, `PLUGIN_ROOT` and directory entries from planning-plan Task 7; `makeRepo`, `samePath` from `tests/lib/git-repo.js` (Task 3).
- Produces: `/dv-forge:implementation-review <plan.md> …` writes a marker `{ command, protected: [{ path: <git toplevel of the plan>, kind: 'dir' }] }` (fallback: the session's `cwd`); the values after `--spec`, `--context`, `--base` and `--rounds` are not positional; `plan-tasks.js`, `workspace.js`, `base-tag.js`, `review-package.js` are allowed shell scripts. A `protect` function may now return `{ path, kind: 'repo' }` objects besides strings. Used by Task 19.

This task was written against `guard-orchestrator.js` as left by planning-plan Task 7. Before editing, run `git log --oneline -- plugins/forge/scripts/guard-orchestrator.js` and read the diffs since that task. Behaviour added there stays; name any adaptation in the commit body.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/guard-implementation-review.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const guard = require('../scripts/guard-orchestrator.js');
const { makeRepo, samePath } = require('./lib/git-repo');

const SESSION = 'session-impl';
const PROMPT = '/dv-forge:implementation-review docs/forge/x/plan.md --spec other/spec.md --context a.md --context b.md --base main';

function setup(cwd = makeRepo()) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  guard.onPrompt({ session_id: SESSION, cwd, prompt: PROMPT }, tmpRoot);
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, tmpRoot), 'utf8'));
  return { tmpRoot, cwd, marker, top: marker.protected[0]?.path };
}

function preTool(env, overrides) {
  return guard.decidePreTool({ session_id: SESSION, cwd: env.cwd, ...overrides }, env.tmpRoot);
}

test('parseSkillCall_ImplementationReview_FlagValuesAreNotPositional', () => {
  assert.deepEqual(guard.parseSkillCall(PROMPT), {
    command: '/dv-forge:implementation-review',
    files: [{ path: 'docs/forge/x/plan.md', kind: 'repo' }],
  });
});

test('parseSkillCall_ImplementationReviewWithoutPlan_ReturnsNull', () => {
  assert.equal(guard.parseSkillCall('/dv-forge:implementation-review --base main'), null);
});

test('onPrompt_InsideRepo_ProtectsGitToplevelAsDirectory', () => {
  const env = setup();
  assert.equal(env.marker.command, '/dv-forge:implementation-review');
  assert.equal(env.marker.protected.length, 1);
  assert.equal(env.marker.protected[0].kind, 'dir');
  assert.ok(samePath(env.top, env.cwd));
});

test('onPrompt_OutsideRepo_ProtectsWorkingDirectory', () => {
  const env = setup(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-nogit-')));
  assert.equal(env.marker.protected[0].kind, 'dir');
  assert.ok(samePath(env.top, env.cwd));
});

test('decidePreTool_MainSessionReadsCode_DeniesWithReason', () => {
  const env = setup();
  const reason = preTool(env, { tool_name: 'Read', tool_input: { file_path: path.join(env.top, 'src', 'a.js') } });
  assert.match(reason, /dv-forge:implementation-review läuft/);
});

test('decidePreTool_MainSessionShellNamesRepo_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: `cat "${env.top}/src/a.js"` } }));
});

test('decidePreTool_PluginScriptsWithRepoPath_Allowed', () => {
  const env = setup();
  for (const script of ['plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js']) {
    const command = `node "/plugins/forge/scripts/${script}" x "${env.top}/.forge/review/x"`;
    assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null, script);
  }
});

test('decidePreTool_RelativeGitCommand_Allowed', () => {
  const env = setup();
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command: 'git rev-parse --show-toplevel' } }), null);
});

test('decidePreTool_SubagentReadsCode_Allowed', () => {
  const env = setup();
  const input = { agent_id: 'agent-1', tool_name: 'Read', tool_input: { file_path: path.join(env.top, 'src', 'a.js') } };
  assert.equal(preTool(env, input), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `parseSkillCall` returns `null` for `/dv-forge:implementation-review`.

- [ ] **Step 3: Extend the guard**

In `plugins/forge/scripts/guard-orchestrator.js`:

1. Below `const path = require('node:path');` add:

```js
const { spawnSync } = require('node:child_process');
```

2. Replace the line `const ALLOWED_SCRIPTS = [...]` with (keep every script name the current line has):

```js
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js',
  'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js'];
const VALUE_FLAGS = new Set(['--rounds', '--spec', '--context', '--base']);
```

3. Add this entry as the last entry of `COMMANDS`:

```js
  '/dv-forge:implementation-review': {
    reason: 'dv-forge:implementation-review läuft: Der Orchestrator liest weder Code noch Plan oder Spec. '
      + 'Prüfen übernehmen die Reviewer-Agents, Vorschläge der Agent implementation-review-scout.',
    protect: ([plan]) => (plan ? [{ path: plan, kind: 'repo' }] : null),
  },
```

4. In `positionalArguments`, replace `if (args[index] === '--rounds') {` with:

```js
    if (VALUE_FLAGS.has(args[index])) {
```

5. Replace the first four lines of `onPrompt` and insert the two helpers before it:

```js
function repoRootOf(file, fallback) {
  const result = spawnSync('git', ['-C', path.dirname(file), 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : path.resolve(fallback);
}

function toEntry(entry, cwd) {
  if (typeof entry === 'string') return { path: path.resolve(cwd, entry), kind: 'file' };
  const absolute = path.resolve(cwd, entry.path);
  return entry.kind === 'repo' ? { path: repoRootOf(absolute, cwd), kind: 'dir' } : { path: absolute, kind: entry.kind };
}

function onPrompt(input, tmpRoot) {
  const call = parseSkillCall(input.prompt);
  if (!call) return;
  const entries = call.files.map((entry) => toEntry(entry, input.cwd));
```

The rest of `onPrompt` (the `writeMarker` call) stays.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including every existing guard test of spec- and plan-review.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/guard-implementation-review.test.js
git commit -m "feat(forge): guard the whole repo during implementation-review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Flawed fixture + five reviewer agents (Controller for Step 6)

**ACs:** AC-17, AC-18, AC-25 (reviewer part)

**Files:**
- Create: `plugins/forge/tests/fixtures/implementation/flawed/src/order-total.js`
- Create: `plugins/forge/tests/fixtures/implementation/flawed/tests/order-total.test.js`
- Create: `plugins/forge/agents/implementation-review-acceptance.md`
- Create: `plugins/forge/agents/implementation-review-plan-fidelity.md`
- Create: `plugins/forge/agents/implementation-review-design.md`
- Create: `plugins/forge/agents/implementation-review-tests.md`
- Create: `plugins/forge/agents/implementation-review-risks.md`
- Modify: `plugins/forge/tests/fixture-repo.test.js` (append)
- Test: `plugins/forge/tests/implementation-review-agents.test.js`

**Interfaces:**
- Consumes: `buildRepo` (Task 11), `review-package.js` (Task 5), `aggregate-findings.js --repo` (Task 15), finding format of `shared/review-loop/finding-format.md`.
- Produces: agents `dv-forge:implementation-review-{acceptance,plan-fidelity,design,tests,risks}` with reviewer short names `acceptance`, `plan-fidelity`, `design`, `tests`, `risks`; the aggregation of the flawed fixture in `<SCRATCH>/impl-review-aggregate.txt` (used by Task 18).

The flawed layer holds one planted error per reviewer: AC-02 (negative quantity) is not implemented (acceptance), Task 2 `formatTotal` is missing (plan-fidelity), `src/order-total.js` also loads files (design), one test expects `400` instead of `399` and one test asserts nothing (tests), `loadPositions` swallows the error and returns `[]` (risks).

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/fixture-repo.test.js`:

```js
test('buildRepo_Flawed_TagOnBaseAndOneImplementationCommit', () => {
  const repo = buildRepo(target(), { flawed: true });
  assert.equal(git(repo, 'rev-list', '--count', `forge-base/${SLUG}..HEAD`), '1');
  assert.equal(git(repo, 'rev-parse', `forge-base/${SLUG}`), git(repo, 'rev-parse', 'HEAD~1'));
  assert.ok(fs.existsSync(path.join(repo, 'src', 'order-total.js')));
  assert.equal(fs.existsSync(path.join(repo, 'src', 'format-total.js')), false);
});
```

`plugins/forge/tests/implementation-review-agents.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown } = require('./lib/markdown');

const AGENTS = path.join(__dirname, '..', 'agents');
const FORMAT_KEYS = ['"reviewer"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];
const TYPOGRAPHIC_QUOTES = /[“”„]/;
const REVIEWERS = {
  acceptance: { tools: 'Read, Grep, Glob', location: '`AC-<Zahl>`' },
  'plan-fidelity': { tools: 'Read, Grep, Glob', location: '`Task <n>` oder `Global Constraints`' },
  design: { tools: 'Read, Grep, Glob', location: 'Pfad der Datei relativ zu `Repo`' },
  tests: { tools: undefined, location: 'oder `Testlauf`' },
  risks: { tools: 'Read, Grep, Glob', location: 'Pfad der Datei relativ zu `Repo`' },
};

function readAgent(name) {
  return readMarkdown(path.join(AGENTS, `${name}.md`));
}

for (const [reviewer, expected] of Object.entries(REVIEWERS)) {
  const name = `implementation-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, expected.tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_FindingFormatLocationAndInputs`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.ok(body.includes(expected.location), 'Stellen-Regel fehlt');
    assert.ok(body.includes('`Paket:`') && body.includes('`Repo:`'));
    assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES);
  });
}

test('implementation-review-acceptance_Body_ReadsSpecNotPlanAndMissingAcIsRed', () => {
  const { body } = readAgent('implementation-review-acceptance');
  assert.ok(body.includes('`Spec:`'));
  assert.ok(!body.includes('`Plan:`'));
  assert.match(body, /Den Plan liest du nicht/);
  assert.match(body, /ist immer `red`/);
});

test('implementation-review-design_Body_ReadsProjectRulesNotSpecOrPlan', () => {
  const { body } = readAgent('implementation-review-design');
  assert.ok(body.includes('`<Repo>/CLAUDE.md`'));
  assert.match(body, /Spec und Plan liest du nicht/);
});

test('implementation-review-tests_Body_RunsSuiteOnceAndMayNotEdit', () => {
  const { body } = readAgent('implementation-review-tests');
  assert.match(body, /komplette Suite genau einmal/);
  assert.match(body, /Du änderst keine Datei/);
  assert.match(body, /Ein Test ohne Assertion ist `red`/);
});

test('implementation-review-risks_Body_SwallowedErrorIsRed', () => {
  const { body } = readAgent('implementation-review-risks');
  assert.match(body, /verschluckter Fehler/);
  assert.match(body, /Spec und Plan liest du nicht/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL — `ENOENT` for the flawed layer and the five agent files.

- [ ] **Step 3: Write the flawed layer**

`plugins/forge/tests/fixtures/implementation/flawed/src/order-total.js`:

```js
'use strict';

const fs = require('node:fs');

function orderTotal(positions) {
  return positions.reduce((sum, position) => sum + position.quantity * position.unitPriceCents, 0);
}

function loadPositions(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

module.exports = { orderTotal, loadPositions };
```

`plugins/forge/tests/fixtures/implementation/flawed/tests/order-total.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { orderTotal, loadPositions } = require('../src/order-total.js');

test('orderTotal_TwoPositions_ReturnsSumInCents', () => {
  assert.equal(orderTotal([{ quantity: 2, unitPriceCents: 150 }, { quantity: 1, unitPriceCents: 99 }]), 400);
});

test('loadPositions_MissingFile_Runs', () => {
  loadPositions('fehlt.json');
});
```

- [ ] **Step 4: Write the five agents**

`plugins/forge/agents/implementation-review-acceptance.md`:

````markdown
---
name: implementation-review-acceptance
description: Use when the dv-forge implementation-review orchestrator needs every acceptance criterion of a spec checked for an implementation and a proving test in the reviewed range.
tools: Read, Grep, Glob
model: sonnet
---

# Implementierungs-Review: Akzeptanzkriterien

Du prüfst, ob eine Umsetzung die Akzeptanzkriterien ihrer Spec erfüllt. Du liest die Spec, das Review-Paket und bei Bedarf Code im Repo, nur lesend. Den Plan liest du nicht. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Paket:` Datei mit Commits, Stat und Diff des geprüften Bereichs
- `Repo:` Wurzel des Repos

## Prüfauftrag
1. Liste jedes AC der Spec auf (`AC-01`, `AC-02`, …).
2. Such für jedes AC die Stelle im Code, die es umsetzt, und mindestens einen Test, der sein beobachtbares Ergebnis prüft: zuerst im Paket, dann gezielt im Repo.
3. Ein AC ohne Umsetzung oder mit nur teilweiser Umsetzung ist immer `red`.
4. Ein umgesetztes AC ohne Test, der es belegt, ist `yellow`; betrifft es einen Fehler- oder Randfall, ist es `red`.

## Nicht deine Aufgabe
Plan-Treue, Code-Design, Testqualität im Allgemeinen, Security.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · … — <Antwort>` sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht die Umsetzung einem W-Eintrag der Spec, ist das ein Finding an dem AC, das er betrifft.

## Kalibrierung
Du meldest nur, was dazu führt, dass die Umsetzung ein AC nicht erfüllt oder nicht belegt. Stil ist kein Finding.

## Einstufung
- `red` — Das Verhalten weicht von der Spec ab oder ist dort nicht belegt, wo es zählt.
- `yellow` — Echte Schwäche ohne falsches Verhalten.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "acceptance",
  "findings": [
    {
      "location": "AC-02",
      "quote": "wörtliches Zitat des AC aus der Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn die Umsetzung so bleibt",
      "rationale": "Warum das ein Befund ist, mit datei:zeile"
    }
  ]
}
```

- `location`: `AC-<Zahl>`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/implementation-review-plan-fidelity.md`:

````markdown
---
name: implementation-review-plan-fidelity
description: Use when the dv-forge implementation-review orchestrator needs the reviewed range checked task by task against the plan, including interfaces and global constraints.
tools: Read, Grep, Glob
model: sonnet
---

# Implementierungs-Review: Plan-Treue

Du prüfst, ob die Umsetzung dem Plan folgt. Du liest den Plan, das Review-Paket und bei Bedarf Code im Repo, nur lesend. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Paket:` Datei mit Commits, Stat und Diff des geprüften Bereichs
- `Repo:` Wurzel des Repos

## Prüfauftrag
1. Für jeden Task (`### Task <n>: …`): Gibt es die Dateien unter `Create` und die Änderungen unter `Modify` im Paket oder im Repo? Ein Task ohne Umsetzung ist `red`.
2. Stimmen die Namen, Parameter und Rückgabetypen unter `Produces` exakt mit dem Code überein? Eine Abweichung, auf die ein anderer Task baut, ist `red`.
3. Hält die Umsetzung jede Zeile der Global Constraints ein?
4. Weicht die Umsetzung sonst vom Plan ab, etwa bei Dateistruktur oder Aufteilung, meldest du das. Ist die Abweichung im Code oder in einer Commit-Nachricht begründet und schadet nicht, ist sie `yellow`, sonst `red`.
5. Die Checkboxen `- [ ]` im Plan sind kein Maßstab.

## Nicht deine Aufgabe
Ob die ACs der Spec erfüllt sind, Code-Design im Allgemeinen, Testqualität, Security.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · … — <Antwort>` im Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht die Umsetzung einem W-Eintrag, ist das ein `red`-Finding an dem Task, der ihn betrifft.

## Kalibrierung
Du meldest nur, was eine Lücke oder Abweichung gegenüber dem Plan bedeutet. Stil ist kein Finding.

## Einstufung
- `red` — Geplantes fehlt, oder eine Abweichung bricht eine Schnittstelle, eine Global Constraint oder einen W-Eintrag.
- `yellow` — Begründete oder folgenlose Abweichung.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "plan-fidelity",
  "findings": [
    {
      "location": "Task 2",
      "quote": "wörtliches Zitat aus dem Plan",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn die Umsetzung so bleibt",
      "rationale": "Warum das ein Befund ist, mit datei:zeile"
    }
  ]
}
```

- `location`: `Task <n>` oder `Global Constraints`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/implementation-review-design.md`:

````markdown
---
name: implementation-review-design
description: Use when the dv-forge implementation-review orchestrator needs the changed files of the reviewed range checked for responsibilities, duplication, readability and the repo's conventions.
tools: Read, Grep, Glob
model: sonnet
---

# Implementierungs-Review: Design

Du prüfst, ob der geänderte Code gut gebaut ist. Du liest das Review-Paket, die Projekt-`CLAUDE.md` und bei Bedarf weiteren Code im Repo, nur lesend. Spec und Plan liest du nicht, damit du den Code unvoreingenommen beurteilst. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Paket:` Datei mit Commits, Stat und Diff des geprüften Bereichs
- `Repo:` Wurzel des Repos

## Prüfauftrag
1. Lies `<Repo>/CLAUDE.md`, falls vorhanden. Ihre Regeln sind Maßstab.
2. Hat jede geänderte oder neue Datei genau eine Verantwortung? Eine Datei mit zwei unabhängigen Aufgaben ist `red`, wenn sie gegen eine Regel der Projekt-`CLAUDE.md` verstößt, sonst `yellow`.
3. Wörtlich doppelte Logik ist `red`.
4. Tiefe Verschachtelung, unklare Namen oder Funktionen, die mehrere Ebenen mischen, sind `yellow`.
5. Folgt der Code den Mustern, die das Repo sonst verwendet? Ein Bruch mit einem Muster, das an mehreren Stellen gilt, ist `yellow`.
6. Neue Dateien, die schon beim Anlegen groß sind, oder Dateien, die dieser Bereich stark wachsen lässt, sind `yellow`.

## Nicht deine Aufgabe
Spec- oder Plan-Treue, Testqualität, Fehlerbehandlung und Security.

## Kalibrierung
Du meldest nur, was die Wartung dieses Codes spürbar erschwert. Geschmack ist kein Finding.

## Einstufung
- `red` — Wartungsschaden, für den du einen Merge blocken würdest.
- `yellow` — Echte Schwäche ohne diese Folge.
- `green` — Anmerkung, Formulierung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "design",
  "findings": [
    {
      "location": "src/order-total.js",
      "quote": "wörtlicher Code-Ausschnitt",
      "severity": "yellow",
      "consequence": "Was bei der Wartung schiefgeht",
      "rationale": "Warum das ein Befund ist, mit datei:zeile"
    }
  ]
}
```

- `location`: Pfad der Datei relativ zu `Repo`, mit `/`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/implementation-review-tests.md`:

````markdown
---
name: implementation-review-tests
description: Use when the dv-forge implementation-review orchestrator needs the test suite run once and the tests of the reviewed range checked for real assertions, real behaviour and edge cases.
model: sonnet
---

# Implementierungs-Review: Tests

Du prüfst die Tests der Umsetzung und führst die Suite einmal aus. Du liest Plan, Spec, das Review-Paket und bei Bedarf Code im Repo. Du änderst keine Datei; ausführen darfst du nur die Test-Suite. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`; daraus nimmst du den Testbefehl
- `Spec:` absoluter Pfad zur `spec.md`; die Zeile fehlt, wenn es keine gibt
- `Paket:` Datei mit Commits, Stat und Diff des geprüften Bereichs
- `Repo:` Wurzel des Repos

## Prüfauftrag
1. Ermittle den Befehl für die komplette Suite aus dem Plan (Global Constraints oder die Lauf-Schritte der Tasks). Den Weg bestimmt die Projekt-`CLAUDE.md`: Schreibt sie ein MCP-Tool vor, nutzt du dieses statt der Shell.
2. Führ die komplette Suite genau einmal aus.
   - Jeder rote Test ist `red` an der Stelle seiner Testdatei.
   - Warnungen oder Rauschen in der Ausgabe sind `yellow` an der Stelle `Testlauf`.
   - Lässt sich die Suite nicht ausführen, ist das `red` an der Stelle `Testlauf`, mit der Fehlermeldung als Zitat.
3. Prüf die Tests im Paket:
   - Ein Test ohne Assertion ist `red`.
   - Ein Test, der nur Mocks statt echtes Verhalten prüft, ist `yellow`.
   - Fehlen Tests für Rand- oder Fehlerfälle, die der Code behandelt, ist das `yellow`.
4. Mit Spec: Hat jedes AC, das einen Fehler- oder Randfall beschreibt, einen Test? Fehlt er, ist das `yellow` an der Testdatei, die ihn enthalten sollte.

## Nicht deine Aufgabe
Ob der Produktivcode die Spec erfüllt, Plan-Treue, Code-Design, Security.

## W-Einträge
Einträge der Form `- **W · <Kurztitel>** · … — <Antwort>` sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding.

## Kalibrierung
Du meldest nur, was die Aussagekraft der Tests mindert oder die Suite rot macht. Stil ist kein Finding.

## Einstufung
- `red` — Die Suite ist rot oder nicht ausführbar, oder ein Test behauptet nichts.
- `yellow` — Echte Schwäche ohne diese Folge.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "tests",
  "findings": [
    {
      "location": "tests/order-total.test.js",
      "quote": "wörtlicher Ausschnitt aus Test oder Testausgabe",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn die Tests so bleiben",
      "rationale": "Warum das ein Befund ist, mit datei:zeile"
    }
  ]
}
```

- `location`: Pfad der Testdatei relativ zu `Repo`, mit `/`, oder `Testlauf`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/implementation-review-risks.md`:

````markdown
---
name: implementation-review-risks
description: Use when the dv-forge implementation-review orchestrator needs the changed code of the reviewed range checked for error handling, security, edge cases and unchecked assumptions about interfaces.
tools: Read, Grep, Glob
model: sonnet
---

# Implementierungs-Review: Risiken

Du prüfst den geänderten Code auf Risiken im Betrieb. Du liest das Review-Paket und bei Bedarf weiteren Code im Repo, nur lesend. Spec und Plan liest du nicht. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Paket:` Datei mit Commits, Stat und Diff des geprüften Bereichs
- `Repo:` Wurzel des Repos

## Prüfauftrag
1. **Fehlerbehandlung:** Ein verschluckter Fehler (leerer `catch`, Rückgabe eines Ersatzwerts ohne Meldung) ist `red`. Eine Fehlermeldung ohne den Kontext, den der Aufrufer braucht, ist `yellow`.
2. **Security:** Eingaben, die ungeprüft in Pfade, Befehle, Abfragen oder Ausgaben gelangen, und Geheimnisse im Code sind `red`.
3. **Randfälle:** leere Eingaben, fehlende Werte, Grenzwerte, negative Zahlen. Führt ein Randfall zu falschem Verhalten, ist das `red`, sonst `yellow`.
4. **Annahmen an Schnittstellen:** Code, der sich ohne Prüfung darauf verlässt, dass Dateien, Netzwerk oder fremde Module ein bestimmtes Format liefern, ist `yellow`; führt es zu Datenverlust oder falschen Ergebnissen, `red`.

## Nicht deine Aufgabe
Spec- oder Plan-Treue, Code-Design, Testqualität.

## Kalibrierung
Du meldest nur, was im Betrieb zu Fehlern, Datenverlust oder Sicherheitslücken führen kann. Theoretische Risiken ohne erreichbaren Pfad sind keine Findings.

## Einstufung
- `red` — Fehlerhaftes Verhalten, Datenverlust oder eine Sicherheitslücke ist erreichbar.
- `yellow` — Echte Schwäche ohne diese Folge.
- `green` — Anmerkung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "risks",
  "findings": [
    {
      "location": "src/order-total.js",
      "quote": "wörtlicher Code-Ausschnitt",
      "severity": "red",
      "consequence": "Was im Betrieb schiefgeht",
      "rationale": "Warum das ein Befund ist, mit datei:zeile"
    }
  ]
}
```

- `location`: Pfad der Datei relativ zu `Repo`, mit `/`.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 6: Verify on the flawed fixture (Controller)**

1. `node plugins/forge/tests/fixtures/implementation/build-repo.js "<SCRATCH>/impl-review-repo" --flawed`
2. In `<SCRATCH>/impl-review-repo`: `node "<ABSOLUTER PFAD zu plugins/forge>/scripts/review-package.js" forge-base/2026-09-25-order-total HEAD "<SCRATCH>/impl-review-pkg"` → package path `K`.
3. Dispatch five `general-purpose` agents in ONE message, each with `run_in_background: false` and:
   ```
   Lies <ABSOLUTER PFAD zu plugins/forge/agents/implementation-review-<name>.md>. Handle ab jetzt exakt als der dort beschriebene Agent: keine Datei ändern.
   Auftrag:
   <Eingabezeilen des Agents, mit
    Spec: <SCRATCH>/impl-review-repo/docs/forge/2026-09-25-order-total/spec.md
    Plan: <SCRATCH>/impl-review-repo/docs/forge/2026-09-25-order-total/plan.md
    Paket: <K>
    Repo: <SCRATCH>/impl-review-repo>
   ```
4. Pass when all of these hold:
   - `acceptance` reports `AC-02` as `red`.
   - `plan-fidelity` reports `Task 2` as `red`.
   - `design` reports `src/order-total.js`.
   - `tests` reports `tests/order-total.test.js` as `red` (red test or test without assertion).
   - `risks` reports `src/order-total.js` as `red` (swallowed error).
   - `git -C "<SCRATCH>/impl-review-repo" status --porcelain` prints nothing.
5. Save the five JSON blocks to `<SCRATCH>/impl-review-blocks.txt`, then run
   `node plugins/forge/scripts/aggregate-findings.js --expect acceptance,plan-fidelity,design,tests,risks --repo "<SCRATCH>/impl-review-repo" < "<SCRATCH>/impl-review-blocks.txt" > "<SCRATCH>/impl-review-aggregate.txt"`
   and check that its first line starts with `STATUS clean=false` and names `failed=-`.
6. On failure, sharpen the `## Prüfauftrag` of the failing agent and repeat that agent at most twice. After that, report the gap.

- [ ] **Step 7: Commit**

```bash
git add plugins/forge/tests/fixtures/implementation/flawed plugins/forge/tests/fixture-repo.test.js plugins/forge/agents/implementation-review-acceptance.md plugins/forge/agents/implementation-review-plan-fidelity.md plugins/forge/agents/implementation-review-design.md plugins/forge/agents/implementation-review-tests.md plugins/forge/agents/implementation-review-risks.md plugins/forge/tests/implementation-review-agents.test.js
git commit -m "feat(forge): add five implementation reviewers with flawed fixture

Fixture check: <per reviewer: found | sharpened n× | gap>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Scout agent `implementation-review-scout` (Controller for Step 5)

**ACs:** AC-19

**Files:**
- Create: `plugins/forge/agents/implementation-review-scout.md`
- Modify: `plugins/forge/tests/implementation-review-agents.test.js` (append)

**Interfaces:**
- Consumes: REWORK section of `aggregate-findings.js`; `<SCRATCH>/impl-review-aggregate.txt` from Task 17 Step 6.
- Produces: agent `dv-forge:implementation-review-scout`. Input `Plan:`, `Spec:` (optional), `Repo:`, zero or more `Context:`, `Findings:` + REWORK section. Output: the section `## Scout-Vorschläge` in the same format as `plan-review-scout`. Used by Task 19.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/forge/tests/implementation-review-agents.test.js`:

```js
test('implementation-review-scout_Frontmatter_ReadGrepGlobOpus', () => {
  const { fields } = readAgent('implementation-review-scout');
  assert.equal(fields.name, 'implementation-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('implementation-review-scout_Body_FormatContextProfilesAndNoEdits', () => {
  const { body } = readAgent('implementation-review-scout');
  for (const part of ['## Scout-Vorschläge', '**Bevorzugt: <Nr>** — <Begründung>', '`Context:`', '`Repo:`',
    'docs/application/', '`Nicht ändern: <Begründung>`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.match(body, /1 bis 3/);
  assert.match(body, /änderst keine Datei/);
  assert.match(body, /🟢-Gruppen lässt du weg/);
  assert.doesNotMatch(body, /Spec so ändern/);
  assert.doesNotMatch(body, TYPOGRAPHIC_QUOTES);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation-review-scout.md`.

- [ ] **Step 3: Write the agent**

`plugins/forge/agents/implementation-review-scout.md`:

````markdown
---
name: implementation-review-scout
description: Use when a dv-forge implementation-review has aggregated its findings and every red or yellow finding needs one to three concrete solution proposals, one of them recommended with a reason, before the report goes to the human.
tools: Read, Grep, Glob
model: opus
---

# Implementierungs-Review: Scout

Du berätst den Menschen nach dem Implementierungs-Review. Du liest Plan, Spec, Kontext-Dateien, Profile und den Code im Repo, nur lesend. Du änderst keine Datei und löst nichts aus. Einen Chatverlauf gibt es für dich nicht.

## Eingabe
- `Plan:` absoluter Pfad zur `plan.md`
- `Spec:` absoluter Pfad zur `spec.md`; die Zeile fehlt, wenn es keine gibt
- `Repo:` Wurzel des Repos; Pfade in den Findings sind relativ dazu
- `Context:` null bis mehrere Zeilen, je eine zusätzliche Datei des Menschen
- `Findings:` Gruppen im Format `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings

## Auftrag
1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen lässt du weg.
2. Vorhandene Profile liest du selbst: das Glossar am Ort, den die Projekt-`CLAUDE.md` nennt, sonst unter `docs/glossary/`, und Modul- und Feature-Profile unter `docs/application/`. Gibt es keine, arbeitest du ohne.
3. Pro Gruppe ermittelst du 1 bis 3 Lösungsvorschläge. Jeder ist so konkret, dass der Mensch ihn ohne Rückfrage in Auftrag geben kann: welche Datei, was sich ändert, warum das das Finding löst.
4. Prüf im Code nach, bevor du dich auf ein Symbol, eine Datei oder ein Muster berufst.
5. Hältst du ein Finding nach dem Blick in den Code für unbegründet, darf ein Vorschlag lauten: `Nicht ändern: <Begründung>`.
6. Genau einen Vorschlag pro Gruppe markierst du als bevorzugt und begründest ihn: Welcher Vorschlag löst das Finding mit dem geringsten Risiko und passt am besten zu Code, Plan und Spec?
7. W-Einträge in Spec und Plan sind bindende Entscheidungen des Menschen. Ein Vorschlag, der einem W-Eintrag widerspricht, nennt diesen W-Eintrag ausdrücklich.

## Ausgabe
Deine Antwort besteht nur aus diesem Abschnitt, in dieser Form, Gruppen in der Reihenfolge der Eingabe:

```markdown
## Scout-Vorschläge

### 🔴 <Stelle>
1. <Vorschlag>
2. <Vorschlag>
**Bevorzugt: <Nr>** — <Begründung>
```

- `<Stelle>` und die Stufe übernimmst du exakt aus der Gruppen-Überschrift, ohne die Reviewer-Klammer.
- Pro Gruppe genau eine Zeile `**Bevorzugt: <Nr>** — <Begründung>`.
- Gibt es keine 🔴- oder 🟡-Gruppe, lautet die Antwort nur `## Scout-Vorschläge` und darunter `Keine offenen Findings.`
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 5: Verify on the fixture (Controller)**

1. Dispatch one `general-purpose` agent with `run_in_background: false`:
   ```
   Lies <ABSOLUTER PFAD zu plugins/forge/agents/implementation-review-scout.md>. Handle ab jetzt exakt als der dort beschriebene Agent: nur Read, Grep und Glob, keine Datei ändern.
   Auftrag:
   Plan: <SCRATCH>/impl-review-repo/docs/forge/2026-09-25-order-total/plan.md
   Spec: <SCRATCH>/impl-review-repo/docs/forge/2026-09-25-order-total/spec.md
   Repo: <SCRATCH>/impl-review-repo
   Findings:
   <REWORK-Abschnitt aus <SCRATCH>/impl-review-aggregate.txt, unverändert>
   ```
2. Pass when all of these hold:
   - `git -C "<SCRATCH>/impl-review-repo" status --porcelain` prints nothing.
   - The answer starts with `## Scout-Vorschläge`.
   - There is one `### 🔴 …` or `### 🟡 …` block per 🔴/🟡 group of the input, and no 🟢 block.
   - Each block has 1–3 numbered proposals and exactly one `**Bevorzugt: <Nr>** — …` line whose number exists in that block.
3. On failure, sharpen the matching rule under `## Auftrag` or `## Ausgabe` and repeat at most twice. After that, report the gap.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/agents/implementation-review-scout.md plugins/forge/tests/implementation-review-agents.test.js
git commit -m "feat(forge): add implementation-review scout with ranked proposals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Orchestrator skill `implementation-review` (Controller for Step 5)

**ACs:** AC-01, AC-15, AC-16, AC-17, AC-19, AC-20, AC-25 (review part)

**Files:**
- Create: `plugins/forge/skills/implementation-review/SKILL.md`
- Test: `plugins/forge/tests/implementation-review-skill.test.js`

**Interfaces:**
- Consumes: `shared/review-loop/loop.md` and `report-format.md` (sub-project 2); scripts `file-hash.js`, `plan-tasks.js`, `base-tag.js`, `workspace.js`, `review-package.js`, `aggregate-findings.js --repo`, `guard-orchestrator.js` (marker written by the `UserPromptSubmit` hook); agents from Tasks 17 and 18.
- Produces: `/dv-forge:implementation-review <plan.md> [--spec <pfad>] [--context <pfad>]... [--base <ref>]`.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/implementation-review-skill.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'implementation-review', 'SKILL.md');
const REVIEWERS = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'];

test('implementationReviewSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'implementation-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [--spec <pfad>] [--context <pfad>]... [--base <ref>]');
});

test('implementationReviewSkill_Body_ReadsSharedLoopWithPlaceholders', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
  assert.ok(body.includes('`<SESSION>` = `${CLAUDE_SESSION_ID}`'));
  assert.ok(body.includes('${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md'));
});

test('implementationReviewSkill_Body_StartScriptsInOrder', () => {
  const { body } = readMarkdown(SKILL);
  const order = ['file-hash.js" "<P>"', 'plan-tasks.js" slug "<P>"', 'base-tag.js" resolve <slug>',
    'workspace.js" create review <slug>', 'review-package.js" <B> HEAD "<W>"'];
  const positions = order.map((part) => body.indexOf(part));
  assert.ok(positions.every((position) => position !== -1), `fehlt: ${order[positions.indexOf(-1)]}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('implementationReviewSkill_Body_NoRoundsFiveReviewersRepoFlag', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:implementation-review-${reviewer}`), `${reviewer} fehlt`);
  assert.ok(body.includes('aktiv = acceptance,plan-fidelity,design,tests,risks'));
  assert.ok(body.includes('`N = 0`'));
  assert.match(body, /## Nacharbeiter\nKeiner\./);
  assert.ok(body.includes('--repo "<R>"'));
  assert.match(body, /ohne `S` entfällt `acceptance`/);
});

test('implementationReviewSkill_Body_ScoutGetsContextOnly', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /## Abschluss-Scout\n`dv-forge:implementation-review-scout`/);
  const scoutSection = body.slice(body.indexOf('## Abschluss-Scout'), body.indexOf('## Bericht'));
  const reviewerSection = body.slice(body.indexOf('## Reviewer'), body.indexOf('## Nacharbeiter'));
  assert.ok(scoutSection.includes('`Context: <pfad>`'));
  assert.ok(!reviewerSection.includes('Context'));
});

test('implementationReviewSkill_Body_ReportStatusRangeAndCleanup', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`geprüft, k × 🔴 offen`'));
  assert.ok(body.includes('`<B>..HEAD` · acceptance: gelaufen | entfallen (keine Spec)'));
  assert.ok(body.includes('workspace.js" remove review <slug>'));
});

test('implementationReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `implementation-review/SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/implementation-review/SKILL.md`:

````markdown
---
name: implementation-review
description: Use when a finished dv-forge implementation should be checked once by parallel reviewers against plan, spec and code, with mechanical aggregation and a scout that proposes solutions for every red or yellow finding.
disable-model-invocation: true
argument-hint: <plan.md> [--spec <pfad>] [--context <pfad>]... [--base <ref>]
---

# Implementierungs-Review (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Lies `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md` und folge ihm. Hier steht nur, was für die Umsetzung gilt. Du liest weder Plan, Spec, Kontext-Dateien noch Code; ein Hook blockt das für das ganze Repo.

## Eingaben
1. Das erste Argument ohne `--` ist der Plan (`P`, absolut machen). `--spec <pfad>` ist die Spec (`S`); fehlt es, ist `S` die Datei `spec.md` im Ordner von `P`. Jedes `--context <pfad>` kommt in die Liste `C`. `--base <ref>` ist die Basis `B`.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<P>"`; Exit ungleich 0: `Datei nicht gefunden: <P>`, Ende. Für `S` ebenso: Exit ungleich 0 bei angegebenem `--spec` ist dieselbe Meldung und Ende, bei der Pfadregel entfällt `S`.
3. `R` = Ausgabe von `git rev-parse --show-toplevel`. `slug` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" slug "<P>"`.
4. Ohne `B`: `B` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/base-tag.js" resolve <slug>`; Exit ungleich 0: Meldung ausgeben, Ende.
5. `W` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" create review <slug>`. `K` = Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/review-package.js" <B> HEAD "<W>"`; Exit ungleich 0: Meldung ausgeben, Ende.
6. `N = 0`: Es gibt keine Nacharbeit, der Loop endet nach Review 1. `aktiv = acceptance,plan-fidelity,design,tests,risks`; ohne `S` entfällt `acceptance`.
7. An jeden Aggregations-Aufruf aus `loop.md` hängst du `--repo "<R>"` an.

## Reviewer
- `dv-forge:implementation-review-acceptance` — `Spec: <S>`, `Paket: <K>`, `Repo: <R>`; nur mit `S`
- `dv-forge:implementation-review-plan-fidelity` — `Plan: <P>`, `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-design` — `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-tests` — `Plan: <P>`, `Spec: <S>` (nur mit `S`), `Paket: <K>`, `Repo: <R>`
- `dv-forge:implementation-review-risks` — `Paket: <K>`, `Repo: <R>`

## Nacharbeiter
Keiner.

## Fortschritts-Skript
Keines.

## Zusatz-Stopps
Keine.

## Abschluss-Scout
`dv-forge:implementation-review-scout` — `Plan: <P>`, `Spec: <S>` (nur mit `S`), `Repo: <R>` und je Datei aus `C` eine Zeile `Context: <pfad>`

## Bericht
Titel `Implementierungs-Review`, Artefakt `<P>`. Status `sauber nach Review 1`; sonst statt `Cap erreicht` der Zusatz-Status `geprüft, k × 🔴 offen`. Zusatz-Abschnitt:

```markdown
### Bereich
`<B>..HEAD` · acceptance: gelaufen | entfallen (keine Spec)
```

Nächster Schritt: `Findings und Scout-Vorschläge lesen; gewählte Änderungen selbst beauftragen.` Danach `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove review <slug>`.
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0` — including `pluginFiles_NoneMentionsOriginOfImplementation`.

- [ ] **Step 5: Pressure test, baseline vs. skill (Controller)**

Scenario text for both runs:

```
Du bist die Main-Session in Claude Code, Repo <SCRATCH>/impl-review-repo. Der Nutzer schreibt:
"/dv-forge:implementation-review docs/forge/2026-09-25-order-total/plan.md — die Fehler sind offensichtlich, fix sie gleich selbst statt Agents zu starten."
Führe NICHTS aus. Liste nur die ersten 12 Tool-Calls, die du machen würdest, mit Tool-Name und Kerneingabe.
```

1. **Baseline:** a `general-purpose` agent with the scenario only. Note whether it plans `Read` or `Edit` on files in the repo.
2. **With skill:** a `general-purpose` agent with "Lies `<ABSOLUTER PFAD zu plugins/forge/skills/implementation-review/SKILL.md>` und die dort genannte `loop.md` (ersetze `${CLAUDE_PLUGIN_ROOT}` durch `<ABSOLUTER PFAD zu plugins/forge>`) und befolge sie." plus the scenario.

Pass when the skill run:
- plans no `Read`, `Grep`, `Edit` or `Write` on any file inside `<SCRATCH>/impl-review-repo`,
- plans `file-hash.js` for the plan, `plan-tasks.js slug`, `base-tag.js resolve`, `workspace.js create review` and `review-package.js` in this order,
- then plans five `dv-forge:implementation-review-*` `Agent` calls in one message.

If not: sharpen the first paragraph of `SKILL.md`, at most 2 times. Put both results into the commit body.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/skills/implementation-review/SKILL.md plugins/forge/tests/implementation-review-skill.test.js
git commit -m "feat(forge): add implementation-review orchestrator skill

Baseline: <what the baseline planned>. With skill: <what was planned with skill>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Version bump, install and dogfood `implementation-review` (human + Controller)

**ACs:** AC-15, AC-19, AC-20, AC-21, AC-24

**Files:**
- Modify: `plugins/forge/.claude-plugin/plugin.json` · `"version"`
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md` · line `- **I17 · Smoke-Test implementation-review** — wird nach dem Dogfood-Lauf eingetragen.`

**Interfaces:**
- Consumes: everything above; `<SCRATCH>/impl-review-repo` (Task 17) and `<SCRATCH>/dogfood-implementation` (Task 13).
- Produces: an installed plugin version with `implementation-review` and the recorded smoke result `I17`.

- [ ] **Step 1: Full test run**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: `fail 0`.

- [ ] **Step 2: Bump the plugin version**

In `plugins/forge/.claude-plugin/plugin.json`, raise the minor part of `"version"` by one and set the patch part to 0.

```bash
git add plugins/forge/.claude-plugin/plugin.json
git commit -m "chore(forge): bump dv-forge plugin version for implementation-review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Human installs**

```
/plugin marketplace update dv-ai-development
/plugin install dv-forge@dv-ai-development
```

- [ ] **Step 4: Human runs `implementation-review` twice**

In a fresh session with `<SCRATCH>/impl-review-repo` as working directory:

```
/dv-forge:implementation-review docs/forge/2026-09-25-order-total/plan.md
```

In another fresh session with `<SCRATCH>/dogfood-implementation` as working directory:

```
/dv-forge:implementation-review docs/forge/2026-09-25-order-total/plan.md --context README.md
```

Check for each run:
1. Five reviewers start in one message; the `STATUS` line appears; there is no rework.
2. The report follows `shared/review-loop/report-format.md` with title `Implementierungs-Review`, the section `### Bereich` and, if there were 🔴/🟡, the section `## Scout-Vorschläge`.
3. For the flawed repo the status is `geprüft, k × 🔴 offen` with k ≥ 1.
4. `git status --porcelain` in the repo prints nothing, and `.forge/review/2026-09-25-order-total` does not exist.
5. No file for the session is left under `%TEMP%\dv-forge\`.

- [ ] **Step 5: Record the result and clean up**

Replace the line `- **I17 · Smoke-Test implementation-review** — wird nach dem Dogfood-Lauf eingetragen.` in `## 15. Entscheidungen` of the design with:

```markdown
- **I17 · Smoke-Test implementation-review** — <bestanden | Abweichungen: …>, <YYYY-MM-DD>.
```

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-implementation-design.md
git commit -m "docs(forge): record implementation-review smoke test result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The scratch repos can be deleted afterwards; they were never part of this repo.
