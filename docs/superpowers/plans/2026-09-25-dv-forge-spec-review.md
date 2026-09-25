# dv-forge Spec-Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `dv-forge` plugin with the manually started skill `/dv-forge:spec-review`, which drives a `spec.md` through parallel reviewers, script-based aggregation and a rework agent until it is clean or the round cap is reached.

**Architecture:** The main session running the skill is the orchestrator. It only counts, calls scripts and dispatches agents. Five reviewer agents and one rework agent are plugin agent files. Deterministic work — aggregation, hashing, guarding the spec against the orchestrator — lives in Node scripts with `node:test` coverage. A plugin hook blocks main-session access to the spec while a review runs.

**Tech Stack:** Claude Code plugin (skills, agents, hooks), Node.js 24 (CommonJS, no dependencies), `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md`

## Global Constraints

- Plugin name `dv-forge`, folder `plugins/forge/`, version `0.1.0`.
- Nothing is taken from `dv-relay`: no names, texts or structures. Do not open `plugins/relay/` as a template.
- Scripts: Node, CommonJS, no npm dependencies, no `package.json`. Each script exports its functions and runs `main()` only under `require.main === module`.
- Test command: `node --test "plugins/forge/tests/*.test.js"`. A bare directory argument does not work on Node 24.
- Skill and agent bodies: German prose, English technical terms. Frontmatter `description` in English, starting with "Use when…".
- Skill frontmatter: `name`, `description`, plus `disable-model-invocation: true` and `argument-hint` for `spec-review`. `SKILL.md` body stays under 500 words; details go in `references/`.
- Agent frontmatter: `name`, `description`, `tools`, `model`. Reviewers: `tools: Read`, `model: sonnet`. Rework agent: `tools: Read, Edit`, `model: opus`.
- No agent reads code. No agent receives findings of an earlier round.
- Commits: stage only the paths named in the task (`git add <paths>`). Never use `git add -A` or `git add .` — the working tree has unrelated uncommitted deletions under `docs/`. Conventional Commits, scope `forge`, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tasks marked **Controller** dispatch agents themselves and must run in the main session, not in an implementer subagent.

## File Structure

```
plugins/forge/
├── .claude-plugin/plugin.json               plugin manifest
├── hooks/hooks.json                         wires guard-orchestrator.js to 4 events
├── scripts/
│   ├── file-hash.js                         sha256 of a file; existence check
│   ├── aggregate-findings.js                parse reviewer JSON, group, rate, render
│   └── guard-orchestrator.js                marker handling + PreToolUse decision
├── skills/spec-review/
│   ├── SKILL.md                             orchestrator role and loop
│   └── references/
│       ├── finding-format.md                canonical reviewer output format
│       ├── severity-rules.md                what red/yellow/green mean, what the script does
│       └── report-format.md                 final chat report layout
├── agents/
│   ├── spec-review-completeness.md
│   ├── spec-review-consistency.md
│   ├── spec-review-feasibility.md
│   ├── spec-review-clarity.md
│   ├── spec-review-profiles.md
│   └── spec-rework.md
└── tests/
    ├── file-hash.test.js
    ├── aggregate-parse.test.js
    ├── aggregate-rate.test.js
    ├── guard-orchestrator.test.js
    ├── agents.test.js
    ├── skill.test.js
    └── fixtures/
        ├── flawed-spec.md                   one planted flaw per reviewer
        └── glossary/domain-terms.md         glossary for the profiles reviewer
```

Modify: `.claude-plugin/marketplace.json` (add `dv-forge`), `docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md` (spike results, AC-20 command).

---

### Task 1: Spike — foreground agents stay in one turn (Controller)

Determines whether the `Stop` hook may remove the guard marker. Documentation already settles the other spike questions; this task writes them into the spec.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md` (§13, §15 AC-20)

**Interfaces:**
- Produces: decision `STOP_HOOK_OK` = yes/no, consumed by Task 5 Step 7 and Task 9.

- [ ] **Step 1: Dispatch two agents in one message, both foreground**

In ONE assistant message, issue two `Agent` calls, `subagent_type: general-purpose`, `run_in_background: false`, each with this prompt:

```
Run exactly these two Bash commands one after the other and reply with both printed numbers, nothing else:
node -e "console.log(Date.now())"
node -e "setTimeout(()=>console.log(Date.now()),5000)"
```

- [ ] **Step 2: Evaluate**

`STOP_HOOK_OK = yes` only if both hold:
1. Both tool results contain the numbers directly. There must be no "Async agent launched" result, and no later task-notification carrying the answer.
2. The two start/end intervals overlap, which means the agents ran in parallel.

If 1 holds but 2 does not, it is still `STOP_HOOK_OK = yes`. Note "sequentiell" in the spec — the loop still works, only slower.

- [ ] **Step 3: Record results in the spec**

Replace the body of §13 of the design doc (keep the heading) with:

```markdown
Geklärt am 2026-09-25 (Doku code.claude.com/docs/en/hooks.md, plugins/components.md, skills.md):
1. Hook-Eingaben aus SubAgents enthalten `agent_id` und `agent_type`; in der Main-Session fehlen sie. → Guard erlaubt, wenn `agent_id` gesetzt ist.
2. Plugin-Hooks feuern global, sobald das Plugin geladen ist, auch für Tool-Calls von SubAgents.
3. `UserPromptSubmit` liefert den rohen Prompt inklusive `/dv-forge:spec-review <pfad>` und `session_id`.
4. `disable-model-invocation: true` verhindert nur den automatischen Aufruf; `$ARGUMENTS` und `argument-hint` funktionieren.
5. Plugin-Agents heißen `dv-forge:<name>`; `${CLAUDE_PLUGIN_ROOT}` wird im Skill-Text ersetzt.
6. Parallele `Agent`-Calls mit `run_in_background: false` in einer Nachricht: <ERGEBNIS AUS STEP 2 — "kommen im selben Turn zurück, parallel" | "…, sequentiell" | "kommen NICHT im selben Turn zurück">.

Folge: <bei yes: "Stop-Hook entfernt den Marker am Turn-Ende."> <bei no: "Stop-Hook entfällt; der Skill gibt den Marker am Ende per `guard-orchestrator.js release` frei, SessionEnd bleibt Rückfall. AC-19 gilt mit 'am Ende des Laufs' statt 'am Turn-Ende'.">
```

Write the actual result in place of the angle-bracket parts.

In §15 replace the AC-20 command `node --test plugins/forge/tests` with `node --test "plugins/forge/tests/*.test.js"`. If `STOP_HOOK_OK = no`, also replace "am Turn-Ende entfernt" with "am Ende des Laufs entfernt" in AC-19.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md
git commit -m "docs(forge): record spike results for spec-review guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Plugin scaffold + `file-hash.js`

**Files:**
- Create: `plugins/forge/.claude-plugin/plugin.json`
- Create: `plugins/forge/scripts/file-hash.js`
- Create: `plugins/forge/tests/file-hash.test.js`
- Modify: `.claude-plugin/marketplace.json`

**Interfaces:**
- Produces: `hashFile(filePath: string): string` (sha256 hex, throws on missing file). CLI `node file-hash.js <path>` → prints the hash, exit 0; missing or unreadable file → stderr `Datei nicht gefunden oder nicht lesbar: <path>`, exit 1; no argument → stderr usage, exit 2.

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/file-hash.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { hashFile } = require('../scripts/file-hash.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'file-hash.js');

function tempFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-hash-'));
  const file = path.join(dir, 'spec.md');
  fs.writeFileSync(file, content);
  return file;
}

test('hashFile_SameContent_ReturnsSameHash', () => {
  assert.equal(hashFile(tempFile('abc')), hashFile(tempFile('abc')));
});

test('hashFile_ChangedContent_ReturnsDifferentHash', () => {
  const file = tempFile('abc');
  const before = hashFile(file);
  fs.writeFileSync(file, 'abd');
  assert.notEqual(hashFile(file), before);
});

test('cli_MissingFile_ExitsWithOneAndNamesPath', () => {
  const missing = path.join(os.tmpdir(), 'dv-forge-does-not-exist.md');
  const result = spawnSync(process.execPath, [SCRIPT, missing], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dv-forge-does-not-exist\.md/);
});

test('cli_NoArgument_ExitsWithTwo', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(result.status, 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `Cannot find module '../scripts/file-hash.js'`.

- [ ] **Step 3: Write the implementation**

`plugins/forge/scripts/file-hash.js`:

```js
#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const [filePath] = process.argv.slice(2);
  if (!filePath) {
    process.stderr.write('Aufruf: node file-hash.js <pfad>\n');
    process.exit(2);
  }
  try {
    process.stdout.write(`${hashFile(filePath)}\n`);
  } catch {
    process.stderr.write(`Datei nicht gefunden oder nicht lesbar: ${filePath}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { hashFile };
```

`plugins/forge/.claude-plugin/plugin.json`:

```json
{
  "name": "dv-forge",
  "version": "0.1.0",
  "description": "Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops"
}
```

`.claude-plugin/marketplace.json`: insert this entry between `dv-dotnet` and `dv-relay`:

```json
    {
      "name": "dv-forge",
      "source": "./plugins/forge"
    },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: 4 tests pass.
Also run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"`. It must exit 0 with no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/.claude-plugin/plugin.json plugins/forge/scripts/file-hash.js plugins/forge/tests/file-hash.test.js .claude-plugin/marketplace.json
git commit -m "feat(forge): scaffold dv-forge plugin with file-hash script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `aggregate-findings.js` — parsing and validation

**Files:**
- Create: `plugins/forge/scripts/aggregate-findings.js`
- Create: `plugins/forge/tests/aggregate-parse.test.js`

**Interfaces:**
- Produces:
  - `normalizeLocation(location: string): string` — trim, collapse whitespace, lowercase, `AC-07`/`AC-7` → `ac-7`.
  - `extractReviews(text: string): { reviews: Review[], errors: string[] }` — takes every fenced ```` ```json ```` block. Valid reviews are kept; the last valid block of a reviewer wins. Invalid blocks produce an error string.
  - `Review = { reviewer: string, findings: Finding[] }`, `Finding = { location, quote, severity: 'red'|'yellow'|'green', consequence, rationale }` (all strings).

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/aggregate-parse.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLocation, extractReviews } = require('../scripts/aggregate-findings.js');

const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', severity: 'red', consequence: 'c', rationale: 'r', ...overrides,
});
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

test('normalizeLocation_AcIdWithAndWithoutLeadingZero_AreEqual', () => {
  assert.equal(normalizeLocation(' AC-07 '), normalizeLocation('ac-7'));
});

test('normalizeLocation_Heading_CollapsesWhitespaceAndCase', () => {
  assert.equal(normalizeLocation('  Rand   Fälle '), 'rand fälle');
});

test('extractReviews_ValidBlockAmongProse_ReturnsReview', () => {
  const text = `Ich habe geprüft.\n${block({ reviewer: 'clarity', findings: [finding()] })}\n`;
  const { reviews, errors } = extractReviews(text);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].reviewer, 'clarity');
  assert.deepEqual(errors, []);
});

test('extractReviews_EmptyFindings_IsValid', () => {
  const { reviews } = extractReviews(block({ reviewer: 'clarity', findings: [] }));
  assert.equal(reviews.length, 1);
});

test('extractReviews_BrokenJson_ReportsErrorAndNoReview', () => {
  const { reviews, errors } = extractReviews('```json\n{ "reviewer": \n```');
  assert.equal(reviews.length, 0);
  assert.equal(errors.length, 1);
});

test('extractReviews_UnknownSeverity_ReportsError', () => {
  const { reviews, errors } = extractReviews(block({ reviewer: 'clarity', findings: [finding({ severity: 'high' })] }));
  assert.equal(reviews.length, 0);
  assert.match(errors[0], /clarity/);
});

test('extractReviews_SameReviewerTwice_LastValidBlockWins', () => {
  const first = block({ reviewer: 'clarity', findings: [finding()] });
  const second = block({ reviewer: 'clarity', findings: [] });
  const { reviews } = extractReviews(`${first}\n${second}`);
  assert.equal(reviews.length, 1);
  assert.deepEqual(reviews[0].findings, []);
});

test('extractReviews_CrlfLineEndings_AreParsed', () => {
  const text = '```json\r\n' + JSON.stringify({ reviewer: 'clarity', findings: [] }) + '\r\n```';
  assert.equal(extractReviews(text).reviews.length, 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `Cannot find module '../scripts/aggregate-findings.js'`.

- [ ] **Step 3: Write the implementation**

`plugins/forge/scripts/aggregate-findings.js`:

```js
#!/usr/bin/env node
'use strict';

const SEVERITY_RANK = { green: 1, yellow: 2, red: 3 };
const TEXT_FIELDS = ['location', 'quote', 'consequence', 'rationale'];
const JSON_BLOCK = /```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g;

function normalizeLocation(location) {
  const collapsed = String(location).trim().replace(/\s+/g, ' ').toLowerCase();
  const acId = /^ac-0*(\d+)$/.exec(collapsed);
  return acId ? `ac-${acId[1]}` : collapsed;
}

function isValidFinding(finding) {
  return finding !== null && typeof finding === 'object'
    && TEXT_FIELDS.every((field) => typeof finding[field] === 'string')
    && finding.location.trim() !== ''
    && Object.hasOwn(SEVERITY_RANK, finding.severity);
}

function isValidReview(review) {
  return review !== null && typeof review === 'object'
    && typeof review.reviewer === 'string' && review.reviewer !== ''
    && Array.isArray(review.findings)
    && review.findings.every(isValidFinding);
}

function parseReview(body, errors) {
  try {
    const review = JSON.parse(body);
    if (isValidReview(review)) return review;
    errors.push(`Block verletzt das Findings-Format: ${String(review?.reviewer ?? 'unbekannt')}`);
  } catch (error) {
    errors.push(`Ungültiges JSON: ${error.message}`);
  }
  return null;
}

function extractReviews(text) {
  const reviews = new Map();
  const errors = [];
  for (const [, body] of String(text).matchAll(JSON_BLOCK)) {
    const review = parseReview(body, errors);
    if (review) reviews.set(review.reviewer, review);
  }
  return { reviews: [...reviews.values()], errors };
}

module.exports = { SEVERITY_RANK, normalizeLocation, extractReviews };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (4 from Task 2 + 8 new).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/aggregate-findings.js plugins/forge/tests/aggregate-parse.test.js
git commit -m "feat(forge): parse and validate reviewer findings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `aggregate-findings.js` — grouping, rating, rendering, CLI

**Files:**
- Modify: `plugins/forge/scripts/aggregate-findings.js`
- Create: `plugins/forge/tests/aggregate-rate.test.js`

**Interfaces:**
- Consumes: `SEVERITY_RANK`, `normalizeLocation`, `extractReviews` from Task 3.
- Produces:
  - `aggregate(reviews: Review[]): Group[]`, where `Group = { key, location, items: (Finding & {reviewer})[], reviewers: string[], severity, escalated: boolean }`, sorted red → yellow → green, then by `key`.
  - `summarize(groups, reviews, expected: string[]): { clean: boolean, counts: {red,yellow,green}, failed: string[] }`.
  - `run(text: string, expected: string[]): { groups, errors, status }` and `render(result): string`.
  - CLI: `node aggregate-findings.js --expect a,b,c` reads reviewer output from stdin and prints:
    - line 1: `STATUS clean=<true|false> red=<n> yellow=<n> green=<n> failed=<comma list or ->`
    - then one `ERROR <text>` line per error
    - then `=== REPORT ===` + a Markdown table
    - then `=== REWORK ===` + one block per group

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/aggregate-rate.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { aggregate, summarize, run, render } = require('../scripts/aggregate-findings.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'aggregate-findings.js');
const finding = (overrides = {}) => ({
  location: 'AC-07', quote: 'q', severity: 'yellow', consequence: 'c', rationale: 'r', ...overrides,
});
const review = (reviewer, findings) => ({ reviewer, findings });
const block = (value) => '```json\n' + JSON.stringify(value) + '\n```';

test('aggregate_SameLocationDifferentSpelling_FormsOneGroup', () => {
  const groups = aggregate([
    review('consistency', [finding({ location: 'AC-07' })]),
    review('clarity', [finding({ location: 'ac-7', severity: 'green' })]),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 2);
});

test('aggregate_MixedSeverities_GroupTakesHighest', () => {
  const [group] = aggregate([
    review('consistency', [finding({ severity: 'green' })]),
    review('consistency', [finding({ severity: 'red' })]),
  ]);
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, false);
});

test('aggregate_YellowFromTwoReviewers_EscalatesToRed', () => {
  const [group] = aggregate([
    review('consistency', [finding()]),
    review('clarity', [finding()]),
  ]);
  assert.equal(group.severity, 'red');
  assert.equal(group.escalated, true);
});

test('aggregate_YellowTwiceFromSameReviewer_StaysYellow', () => {
  const [group] = aggregate([review('clarity', [finding(), finding()])]);
  assert.equal(group.severity, 'yellow');
});

test('aggregate_GreenFromTwoReviewers_StaysGreen', () => {
  const [group] = aggregate([
    review('consistency', [finding({ severity: 'green' })]),
    review('clarity', [finding({ severity: 'green' })]),
  ]);
  assert.equal(group.severity, 'green');
});

test('aggregate_SeveralGroups_SortedRedYellowGreen', () => {
  const groups = aggregate([review('clarity', [
    finding({ location: 'AC-01', severity: 'green' }),
    finding({ location: 'AC-02', severity: 'red' }),
    finding({ location: 'AC-03', severity: 'yellow' }),
  ])]);
  assert.deepEqual(groups.map((group) => group.severity), ['red', 'yellow', 'green']);
});

test('summarize_NoRedAllDelivered_IsClean', () => {
  const reviews = [review('clarity', [finding({ severity: 'yellow' })])];
  const status = summarize(aggregate(reviews), reviews, ['clarity']);
  assert.equal(status.clean, true);
  assert.deepEqual(status.counts, { red: 0, yellow: 1, green: 0 });
});

test('summarize_MissingReviewer_IsNotCleanAndListedAsFailed', () => {
  const reviews = [review('clarity', [])];
  const status = summarize(aggregate(reviews), reviews, ['clarity', 'consistency']);
  assert.equal(status.clean, false);
  assert.deepEqual(status.failed, ['consistency']);
});

test('render_Result_StartsWithStatusLineAndHasBothSections', () => {
  const text = block(review('clarity', [finding({ severity: 'red', consequence: 'a | b' })]));
  const output = render(run(text, ['clarity']));
  const lines = output.split('\n');
  assert.equal(lines[0], 'STATUS clean=false red=1 yellow=0 green=0 failed=-');
  assert.match(output, /=== REPORT ===/);
  assert.match(output, /=== REWORK ===/);
  assert.match(output, /a \\\| b/);
});

test('cli_ExpectAndStdin_PrintsStatusLine', () => {
  const input = block(review('clarity', []));
  const result = spawnSync(process.execPath, [SCRIPT, '--expect', 'clarity,profiles'], { input, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.split('\n')[0], 'STATUS clean=false red=0 yellow=0 green=0 failed=profiles');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `aggregate is not a function`.

- [ ] **Step 3: Write the implementation**

Change `aggregate-findings.js` in two places:

1. Directly under `'use strict';`, add `const fs = require('node:fs');`.
2. Replace the line `module.exports = { SEVERITY_RANK, normalizeLocation, extractReviews };` with the block below.

```js
const SEVERITY_ICON = { red: '🔴', yellow: '🟡', green: '🟢' };

function groupFindings(reviews) {
  const groups = new Map();
  for (const review of reviews) {
    for (const finding of review.findings) {
      const key = normalizeLocation(finding.location);
      if (!groups.has(key)) groups.set(key, { key, location: finding.location.trim(), items: [] });
      groups.get(key).items.push({ reviewer: review.reviewer, ...finding });
    }
  }
  return [...groups.values()];
}

function byRankDescending(a, b) {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

function rateGroup(group) {
  const highest = [...group.items].sort(byRankDescending)[0].severity;
  const reviewers = [...new Set(group.items.map((item) => item.reviewer))];
  const escalated = highest === 'yellow' && reviewers.length >= 2;
  return { ...group, reviewers, escalated, severity: escalated ? 'red' : highest };
}

function bySeverityThenKey(a, b) {
  return byRankDescending(a, b) || a.key.localeCompare(b.key);
}

function aggregate(reviews) {
  return groupFindings(reviews).map(rateGroup).sort(bySeverityThenKey);
}

function summarize(groups, reviews, expected) {
  const delivered = new Set(reviews.map((review) => review.reviewer));
  const failed = expected.filter((name) => !delivered.has(name));
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.severity] += 1;
  return { clean: counts.red === 0 && failed.length === 0, counts, failed };
}

function cell(text) {
  return String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function leadItem(group) {
  return [...group.items].sort(byRankDescending)[0];
}

function formatStatus(status) {
  const failed = status.failed.length > 0 ? status.failed.join(',') : '-';
  const { red, yellow, green } = status.counts;
  return `STATUS clean=${status.clean} red=${red} yellow=${yellow} green=${green} failed=${failed}`;
}

function formatReport(groups) {
  if (groups.length === 0) return 'Keine Findings.';
  const rows = groups.map((group) =>
    `| ${SEVERITY_ICON[group.severity]} | ${cell(group.location)} | ${group.reviewers.join(', ')} | ${cell(leadItem(group).consequence)} |`);
  return ['| Stufe | Stelle | Reviewer | Konsequenz |', '|---|---|---|---|', ...rows].join('\n');
}

function formatReworkGroup(group) {
  const escalation = group.escalated ? ' · hochgestuft' : '';
  const header = `### ${SEVERITY_ICON[group.severity]} ${group.location} (${group.reviewers.join(', ')}${escalation})`;
  const lines = group.items.map((item) =>
    `- [${item.reviewer} · ${item.severity}] Zitat: „${cell(item.quote)}“ · Konsequenz: ${cell(item.consequence)} · Begründung: ${cell(item.rationale)}`);
  return [header, ...lines].join('\n');
}

function formatRework(groups) {
  return groups.length === 0 ? 'Keine Findings.' : groups.map(formatReworkGroup).join('\n\n');
}

function run(text, expected) {
  const { reviews, errors } = extractReviews(text);
  const groups = aggregate(reviews);
  return { groups, errors, status: summarize(groups, reviews, expected) };
}

function render(result) {
  return [
    formatStatus(result.status),
    ...result.errors.map((error) => `ERROR ${error}`),
    '=== REPORT ===',
    formatReport(result.groups),
    '=== REWORK ===',
    formatRework(result.groups),
  ].join('\n');
}

function parseExpected(args) {
  const index = args.indexOf('--expect');
  return index === -1 ? [] : String(args[index + 1] ?? '').split(',').filter(Boolean);
}

function main() {
  const expected = parseExpected(process.argv.slice(2));
  process.stdout.write(`${render(run(fs.readFileSync(0, 'utf8'), expected))}\n`);
}

if (require.main === module) main();

module.exports = { SEVERITY_RANK, normalizeLocation, extractReviews, aggregate, summarize, run, render };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (22).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/aggregate-findings.js plugins/forge/tests/aggregate-rate.test.js
git commit -m "feat(forge): group, rate and render aggregated findings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `guard-orchestrator.js` + `hooks.json`

**Files:**
- Create: `plugins/forge/scripts/guard-orchestrator.js`
- Create: `plugins/forge/hooks/hooks.json`
- Create: `plugins/forge/tests/guard-orchestrator.test.js`

**Interfaces:**
- Consumes: `STOP_HOOK_OK` from Task 1 (Step 7 only).
- Produces:
  - `markerPath(sessionId, tmpRoot = os.tmpdir()): string` → `<tmpRoot>/dv-forge/<sessionId>.json`
  - `parseSpecArgument(prompt: string): string | null`
  - `onPrompt(input, tmpRoot?)`: writes the marker `{ specPath, specName }`.
  - `decidePreTool(input, tmpRoot?): string | null` → deny reason or `null`.
  - `release(sessionId, tmpRoot?)`: removes the marker; no error if it is absent.
  - CLI: `node guard-orchestrator.js <prompt|pretool|stop>` with hook JSON on stdin. `node guard-orchestrator.js release <sessionId>` needs no stdin.
  - The deny output is `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}` on stdout, exit 0.

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/guard-orchestrator.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/guard-orchestrator.js');

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

test('parseSpecArgument_PlainAndQuotedPaths_ReturnsPath', () => {
  assert.equal(guard.parseSpecArgument('/dv-forge:spec-review docs/spec.md'), 'docs/spec.md');
  assert.equal(guard.parseSpecArgument('/dv-forge:spec-review "my docs/spec.md" q.md'), 'my docs/spec.md');
});

test('parseSpecArgument_OtherPrompt_ReturnsNull', () => {
  assert.equal(guard.parseSpecArgument('bitte review docs/spec.md'), null);
});

test('onPrompt_SkillCall_WritesMarkerWithAbsoluteSpecPath', () => {
  const env = setup();
  const marker = JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
  assert.equal(marker.specPath, env.specPath);
  assert.equal(marker.specName, 'spec.md');
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

test('decidePreTool_ShellCommandNamesSpec_Denies', () => {
  const env = setup();
  assert.ok(preTool(env, { tool_name: 'Bash', tool_input: { command: 'cat docs/SPEC.md' } }));
});

test('decidePreTool_ShellCommandIsFileHash_Allows', () => {
  const env = setup();
  const command = `node "/plugins/forge/scripts/file-hash.js" "${env.specPath}"`;
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

test('hooksJson_EveryCommand_PointsToExistingGuardScript', () => {
  const { hooks } = JSON.parse(fs.readFileSync(HOOKS, 'utf8'));
  assert.ok(hooks.UserPromptSubmit && hooks.PreToolUse && hooks.SessionEnd);
  const commands = Object.values(hooks).flat().flatMap((entry) => entry.hooks.map((hook) => hook.command));
  for (const command of commands) assert.match(command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/guard-orchestrator\.js/);
  assert.ok(fs.existsSync(SCRIPT));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `Cannot find module '../scripts/guard-orchestrator.js'`.

- [ ] **Step 3: Write the implementation**

`plugins/forge/scripts/guard-orchestrator.js`:

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SKILL_CALL = /^\s*\/dv-forge:spec-review\s+(?:"([^"]+)"|'([^']+)'|(\S+))/;
const FILE_TOOLS = {
  Read: 'file_path', Edit: 'file_path', Write: 'file_path', MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path', Grep: 'path',
};
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const HASH_SCRIPT = 'file-hash.js';
const DENY_REASON = 'dv-forge:spec-review läuft: Der Orchestrator liest und ändert die Spec nicht. '
  + 'Prüfen übernehmen die Reviewer-Agents, Korrigieren der Agent spec-rework.';

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.json`);
}

function samePath(a, b) {
  const normalize = (value) => {
    const resolved = path.resolve(value).replace(/\\/g, '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
}

function parseSpecArgument(prompt) {
  const match = SKILL_CALL.exec(String(prompt ?? ''));
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

function readMarker(sessionId, tmpRoot) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(sessionId, tmpRoot), 'utf8'));
  } catch {
    return null;
  }
}

function onPrompt(input, tmpRoot) {
  const specArgument = parseSpecArgument(input.prompt);
  if (!specArgument) return;
  const specPath = path.resolve(input.cwd, specArgument);
  const file = markerPath(input.session_id, tmpRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ specPath, specName: path.basename(specPath) }));
}

function touchesSpec(input, marker) {
  const toolInput = input.tool_input ?? {};
  if (Object.hasOwn(FILE_TOOLS, input.tool_name)) {
    const target = toolInput[FILE_TOOLS[input.tool_name]];
    return Boolean(target) && samePath(path.resolve(input.cwd, target), marker.specPath);
  }
  if (SHELL_TOOLS.has(input.tool_name)) {
    const command = String(toolInput.command ?? '').toLowerCase();
    return !command.includes(HASH_SCRIPT) && command.includes(marker.specName.toLowerCase());
  }
  return false;
}

function decidePreTool(input, tmpRoot) {
  if (input.agent_id) return null;
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker) return null;
  return touchesSpec(input, marker) ? DENY_REASON : null;
}

function release(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function main() {
  const [event, argument] = process.argv.slice(2);
  if (event === 'release') return release(argument);
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'pretool') return writeDeny(decidePreTool(input));
  if (event === 'stop') return release(input.session_id);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`dv-forge guard: ${error.message}\n`);
  }
}

module.exports = { markerPath, parseSpecArgument, onPrompt, decidePreTool, release };
```

`plugins/forge/hooks/hooks.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js\" prompt" }] }
    ],
    "PreToolUse": [
      {
        "matcher": "Read|Edit|Write|MultiEdit|NotebookEdit|Grep|Bash|PowerShell",
        "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js\" pretool" }]
      }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js\" stop" }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js\" stop" }] }
    ]
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (37).

- [ ] **Step 5: Adjust for the spike result**

If `STOP_HOOK_OK = no` (Task 1), delete the whole `"Stop": [...]` entry from `hooks.json`. The rest stays. The test does not require `Stop`. If `STOP_HOOK_OK = yes`, leave it unchanged.

Run: `node --test "plugins/forge/tests/*.test.js"` → all pass.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/hooks/hooks.json plugins/forge/tests/guard-orchestrator.test.js
git commit -m "feat(forge): guard the spec against the orchestrating main session

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Skill references

**Files:**
- Create: `plugins/forge/skills/spec-review/references/finding-format.md`
- Create: `plugins/forge/skills/spec-review/references/severity-rules.md`
- Create: `plugins/forge/skills/spec-review/references/report-format.md`

**Interfaces:**
- Produces: the canonical texts that Tasks 7–9 embed or reference. The field names `reviewer`, `findings`, `location`, `quote`, `severity`, `consequence`, `rationale` and the values `red|yellow|green` are fixed.

- [ ] **Step 1: Write `finding-format.md`**

````markdown
# Findings-Format

Jeder Reviewer beendet seine Antwort mit genau einem JSON-Block. Nach dem Block folgt kein Text.

```json
{
  "reviewer": "<completeness|consistency|feasibility|clarity|profiles>",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus der Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `AC-<Zahl>` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor.
- `quote`: wörtlich aus der Spec. Bei Befunden aus der Quelle der Anfrage mit Präfix `Quelle: `.
- `severity`: `red` | `yellow` | `green`, siehe `severity-rules.md`.
- Keine Findings: `"findings": []`.
- Alle Felder sind Strings und Pflicht. Ein Block, der davon abweicht, gilt als ungültig. Der Reviewer wird dann einmal neu gestartet.
````

- [ ] **Step 2: Write `severity-rules.md`**

```markdown
# Schweregrad

**Reviewer stufen nach Konsequenz ein:**
- `red` 🔴 — Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten. Blockt.
- `yellow` 🟡 — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` 🟢 — Anmerkung, Formulierung.

**`scripts/aggregate-findings.js` fasst zusammen, der Orchestrator nie selbst:**
1. `location` normalisieren (trim, Leerzeichen, Kleinschreibung, `AC-7` = `AC-07`).
2. Nach normalisierter `location` gruppieren; die Gruppe behält alle Einzel-Findings.
3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings.
4. Nennen ≥ 2 verschiedene Reviewer eine 🟡-Gruppe, wird sie 🔴 („hochgestuft“).
5. Sortierung 🔴 → 🟡 → 🟢.

**Sauber** heißt: `STATUS clean=true`, also kein 🔴 und kein ausgefallener Reviewer.

**Bekannte Grobheit:** Verschiedene Probleme an derselben Stelle werden zusammengelegt. Das ist gewollt, weil der Orchestrator nicht inhaltlich urteilt.
```

- [ ] **Step 3: Write `report-format.md`**

````markdown
# Abschlussbericht (nur im Chat)

```markdown
## Spec-Review: <spec-pfad>

**Status:** <sauber nach Review r | Cap erreicht, k × 🔴 offen | Stillstand in Runde r>
**Reviews:** <anzahl> · **Nacharbeiten:** <anzahl>
**Ausgefallen:** <reviewer-liste>        ← nur wenn vorhanden

### Letztes Review
<Abschnitt zwischen `=== REPORT ===` und `=== REWORK ===` aus der letzten Aggregation, unverändert>

Nächster Schritt: Spec und Abschnitt „Entscheidungen“ lesen, dann selbst committen.
```

- `k` = Wert `red=` aus der letzten `STATUS`-Zeile.
- Keine Review-Dateien schreiben, nichts committen.
````

- [ ] **Step 4: Commit**

```bash
git add plugins/forge/skills/spec-review/references
git commit -m "docs(forge): add finding format, severity and report references

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Five reviewer agents + fixtures

**Files:**
- Create: `plugins/forge/agents/spec-review-completeness.md`
- Create: `plugins/forge/agents/spec-review-consistency.md`
- Create: `plugins/forge/agents/spec-review-feasibility.md`
- Create: `plugins/forge/agents/spec-review-clarity.md`
- Create: `plugins/forge/agents/spec-review-profiles.md`
- Create: `plugins/forge/tests/agents.test.js`
- Create: `plugins/forge/tests/fixtures/flawed-spec.md`
- Create: `plugins/forge/tests/fixtures/glossary/domain-terms.md`

**Interfaces:**
- Consumes: the format from Task 6 `finding-format.md`, embedded verbatim in each agent.
- Produces: the agent names `spec-review-completeness|consistency|feasibility|clarity|profiles`, invoked as `dv-forge:<name>`. The JSON `reviewer` value is the name without the `spec-review-` prefix.

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/agents.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS = path.join(__dirname, '..', 'agents');
const REVIEWERS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'];
const FORMAT_KEYS = ['"reviewer"', '"findings"', '"location"', '"quote"', '"severity"', '"consequence"', '"rationale"'];

function readAgent(name) {
  const text = fs.readFileSync(path.join(AGENTS, `${name}.md`), 'utf8');
  const [, frontmatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  const fields = Object.fromEntries(frontmatter.split(/\r?\n/).map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body };
}

for (const reviewer of REVIEWERS) {
  const name = `spec-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, 'Read');
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_EmbedsFindingFormatWithOwnReviewerName`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.match(body, /keinen Code/);
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `spec-review-completeness.md`.

- [ ] **Step 3: Write the five agents**

Each file follows the same skeleton. Only the frontmatter, the title, `## Eingabe`, `## Prüfauftrag`, `## Nicht deine Aufgabe` and the `reviewer` value differ. The sections `## Einstufung` and `## Ausgabe` are identical everywhere.

`plugins/forge/agents/spec-review-completeness.md`:

````markdown
---
name: spec-review-completeness
description: Use when the dv-forge spec-review orchestrator needs a spec.md checked for functions without acceptance criteria, for vague or untestable acceptance criteria, or for parts of the original request the spec does not cover.
tools: Read
model: sonnet
---

# Spec-Review: Vollständigkeit

Du prüfst eine Spec. Du liest nur die Dateien, deren Pfade im Auftrag stehen: die Spec und optional die Quelle der Anfrage. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Quelle:` optional, absoluter Pfad zur ursprünglichen Anfrage

## Prüfauftrag
1. Liste jede Funktion und jedes Verhalten, das die Spec beschreibt. Zu jeder muss mindestens ein nummeriertes Akzeptanzkriterium `AC-<Zahl>` existieren. Fehlt es, meldest du ein Finding an der Abschnittsüberschrift der Funktion.
2. Jedes AC muss ein beobachtbares, prüfbares Ergebnis nennen. „korrekt“, „möglich“, „sinnvoll“, „schnell“, „benutzerfreundlich“ ohne Maß sind vage. Ein vages AC meldest du an seiner AC-ID.
3. Enthält die Spec gar keine AC-IDs, meldest du genau ein `red`-Finding an der ersten Überschrift der Spec.
4. Ist eine Quelle angegeben: Jedes Anliegen der Quelle, das die Spec nicht abdeckt, meldest du an der passendsten Überschrift. `quote` beginnt dann mit `Quelle: `.
5. Der Abschnitt „Entscheidungen“ gehört zur Spec. Eine dort begründete Auslassung ist kein Befund.

## Nicht deine Aufgabe
Widersprüche, Machbarkeit, Rand- und Fehlerfälle, Stil, Implementierungsdetails. Das prüfen andere Reviewer.

## Einstufung
- `red` — Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten.
- `yellow` — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` — Anmerkung, Formulierung.

## Ausgabe
Beende deine Antwort mit genau einem JSON-Block, danach kein Text:

```json
{
  "reviewer": "completeness",
  "findings": [
    {
      "location": "AC-07",
      "quote": "wörtliches Zitat aus der Spec",
      "severity": "red",
      "consequence": "Was schiefgeht, wenn so gebaut wird",
      "rationale": "Warum das ein Befund ist"
    }
  ]
}
```

- `location`: `AC-<Zahl>` oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor.
- Alle Felder sind Strings und Pflicht. Keine Findings: `"findings": []`.
````

`plugins/forge/agents/spec-review-consistency.md`: same skeleton. Replace the frontmatter, the title and the sections `## Eingabe` to `## Nicht deine Aufgabe` with the text below, and use `"reviewer": "consistency"` in the JSON:

````markdown
---
name: spec-review-consistency
description: Use when the dv-forge spec-review orchestrator needs a spec.md checked for statements that contradict each other or its decisions section, and for references to documents outside the spec.
tools: Read
model: sonnet
---

# Spec-Review: Konsistenz

Du prüfst eine Spec. Du liest nur die Datei, deren Pfad im Auftrag steht. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`

## Prüfauftrag
1. Vergleiche alle Aussagen der Spec untereinander, auch die im Abschnitt „Entscheidungen“. Jeden Widerspruch meldest du an der Stelle der späteren Aussage. In `quote` stehen beide Zitate, getrennt durch ` ↔ `.
2. Die Spec muss in sich abgeschlossen sein. Links, Ticket-Nummern, Pfade zu anderen Dateien, „siehe Dokument X“ meldest du jeweils an ihrer Stelle.
3. Ein echter Widerspruch ist `red`. Ein externer Verweis ist `red`, wenn der Bau seinen Inhalt braucht, sonst `yellow`.

## Nicht deine Aufgabe
Fehlende Akzeptanzkriterien, Machbarkeit, Rand- und Fehlerfälle, Stil.
````

`plugins/forge/agents/spec-review-feasibility.md`: same skeleton, with `"reviewer": "feasibility"`:

````markdown
---
name: spec-review-feasibility
description: Use when the dv-forge spec-review orchestrator needs a spec.md checked for requirements that exclude each other or preconditions the spec names but never establishes.
tools: Read
model: sonnet
---

# Spec-Review: Machbarkeit

Du prüfst eine Spec. Du liest nur die Datei, deren Pfad im Auftrag steht. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf. Du urteilst allein aus dem Text der Spec.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`

## Prüfauftrag
1. Anforderungen, die technisch nicht gleichzeitig erfüllbar sind. Das Finding kommt an die spätere der beiden Stellen, beide Zitate stehen in `quote`, getrennt durch ` ↔ `.
2. Voraussetzungen, die die Spec selbst nennt, aber nirgends herstellt, einfordert oder als gegeben festlegt.
3. Entscheidungen im Abschnitt „Entscheidungen“, die eine Anforderung unerfüllbar machen.

## Nicht deine Aufgabe
Aufwand, Zeit, Architektur-Vorlieben, fehlende Akzeptanzkriterien, Stil.
````

`plugins/forge/agents/spec-review-clarity.md`: same skeleton, with `"reviewer": "clarity"`:

````markdown
---
name: spec-review-clarity
description: Use when the dv-forge spec-review orchestrator needs a spec.md checked for unspecified edge and error cases, ambiguous wording, and implementation details that belong in a plan rather than a spec.
tools: Read
model: sonnet
---

# Spec-Review: Klarheit und Lücken

Du prüfst eine Spec. Du liest nur die Datei, deren Pfad im Auftrag steht. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`

## Prüfauftrag
1. Rand- und Fehlerfälle ohne festgelegtes Verhalten, und zwar nur dort, wo eine beschriebene Funktion davon betroffen ist: leere oder ungültige Eingaben, Grenzwerte, Abbruch, Netzwerk- oder Speicherfehler, gleichzeitige Nutzung.
2. Formulierungen, die zwei verschiedene Lesarten zulassen. In `rationale` stehen beide Lesarten.
3. WIE statt WAS: Namen von Klassen, Dateien, Tabellen oder Frameworks und technische Schritte. Eine Spec beschreibt beobachtbares Verhalten. Solche Details sind `yellow`, außer sie widersprechen einer Anforderung.

## Nicht deine Aufgabe
Fehlende Akzeptanzkriterien, Widersprüche, Machbarkeit, externe Verweise.
````

`plugins/forge/agents/spec-review-profiles.md`: same skeleton, with `"reviewer": "profiles"`:

````markdown
---
name: spec-review-profiles
description: Use when the dv-forge spec-review orchestrator needs a spec.md checked against the project's dv-working-capturing glossary, module profiles and feature profiles.
tools: Read
model: sonnet
---

# Spec-Review: Profil-Abgleich

Du prüfst eine Spec gegen das dokumentierte Projektwissen. Du liest nur die Dateien, deren Pfade im Auftrag stehen. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Profile:` Liste absoluter Pfade (Glossar, Modul- und Feature-Profile)

## Prüfauftrag
1. Begriffe der Spec, die im Glossar anders heißen oder dort als „nicht verwenden“ markiert sind. `rationale` nennt den Glossar-Begriff.
2. Aussagen der Spec über den Ist-Stand (vorhandene Funktionen, Module, Zuständigkeiten), die einem Modul- oder Feature-Profil widersprechen. `rationale` nennt die Profil-Datei und zitiert die Profil-Aussage.
3. Ein falscher Begriff ist `yellow`, außer er macht eine Anforderung mehrdeutig, dann ist er `red`. Ein Widerspruch zum Ist-Stand ist `red`.

## Nicht deine Aufgabe
Innere Widersprüche der Spec, fehlende Akzeptanzkriterien, Machbarkeit, Stil.
````

- [ ] **Step 4: Write the fixtures**

`plugins/forge/tests/fixtures/flawed-spec.md` has one planted flaw per reviewer. The inline comments in the table below say which flaw is where; they are NOT part of the file.

```markdown
# Aufgabenliste

## Anmelden

- **AC-01** Ein Nutzer kann die Liste ohne Konto anonym nutzen.

## Aufgaben verwalten

- **AC-02** Ein Nutzer legt ein Ticket mit Titel an; es erscheint oben in der Liste.
- **AC-03** Das Bearbeiten eines Tickets funktioniert korrekt.
- **AC-04** Jede Aktion in der Liste setzt ein registriertes Konto voraus.
- **AC-05** Die Klasse `TicketRepository` speichert Tickets in der PostgreSQL-Tabelle `tickets`.

## Export

Der Nutzer kann seine Liste als CSV exportieren.

## Synchronisation

Voraussetzung: Das Gerät des Nutzers ist mit dem Sync-Dienst gekoppelt.

- **AC-06** Änderungen erscheinen innerhalb von 5 Sekunden auf allen gekoppelten Geräten.

Details zur Priorisierung siehe Ticket AB#1234.
```

| Planted flaw | Expected reviewer | Expected `location` |
|---|---|---|
| Export without an AC | completeness | `Export` |
| AC-03 "funktioniert korrekt" | completeness | `AC-03` |
| AC-01 anonymous ↔ AC-04 account required | consistency | `AC-04` |
| "siehe Ticket AB#1234" | consistency | `Synchronisation` |
| Coupling is a precondition but no AC establishes it | feasibility | `Synchronisation` or `AC-06` |
| AC-02 empty title undefined | clarity | `AC-02` |
| AC-05 class/table names | clarity | `AC-05` |
| "Ticket" instead of glossary term "Aufgabe" | profiles | `AC-02` (or another Ticket location) |

`plugins/forge/tests/fixtures/glossary/domain-terms.md`:

```markdown
# Domain Terms

- **Aufgabe** — ein Eintrag der Aufgabenliste. Nicht verwenden: „Ticket“, „Todo“, „Task“.
- **Gekoppeltes Gerät** — ein Gerät, das der Nutzer in den Einstellungen per Code mit seinem Konto verbunden hat.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (47).

- [ ] **Step 6: Verify each reviewer finds its planted flaw (Controller)**

The plugin is not installed yet, so each reviewer is emulated by a `general-purpose` agent. In ONE message, dispatch five `Agent` calls with `subagent_type: general-purpose` and `run_in_background: false`. Each prompt is:

```
Lies <ABSOLUTER PFAD zu plugins/forge/agents/spec-review-<name>.md>. Handle ab jetzt exakt als der dort beschriebene Agent: nur das Tool Read, nur die genannten Dateien.
Auftrag:
Spec: <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/flawed-spec.md>
```

The profiles prompt additionally contains the line `Profile: <ABSOLUTER PFAD zu plugins/forge/tests/fixtures/glossary/domain-terms.md>`.

Then run the five final JSON blocks through the script. Copy them verbatim between the heredoc markers:

```bash
node plugins/forge/scripts/aggregate-findings.js --expect completeness,consistency,feasibility,clarity,profiles <<'DV_FORGE_EOF'
<die fünf JSON-Blöcke>
DV_FORGE_EOF
```

The check passes when:
- The status line shows `failed=-`.
- Each row of the table in Step 4 appears in the REWORK section with its expected reviewer at the expected location.

If a reviewer misses its flaw, sharpen that agent's `## Prüfauftrag` wording, re-run only that reviewer, and repeat at most twice. After that, report the gap and continue.

- [ ] **Step 7: Commit**

```bash
git add plugins/forge/agents plugins/forge/tests/agents.test.js plugins/forge/tests/fixtures
git commit -m "feat(forge): add five spec reviewer agents with flaw fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Rework agent `spec-rework`

**Files:**
- Create: `plugins/forge/agents/spec-rework.md`
- Modify: `plugins/forge/tests/agents.test.js` (append)

**Interfaces:**
- Consumes: the REWORK section of `aggregate-findings.js` (Task 4).
- Produces: the agent `dv-forge:spec-rework`. Its input is `Spec: <pfad>`, `Runde: <r>` and `Findings:` followed by the REWORK section. It returns one line per 🔴/🟡 group: `<Stelle>: geändert | nicht geändert`.

- [ ] **Step 1: Write the failing test**

Append to `plugins/forge/tests/agents.test.js`:

```js
test('spec-rework_Frontmatter_ReadEditOpus', () => {
  const { fields } = readAgent('spec-rework');
  assert.equal(fields.name, 'spec-rework');
  assert.equal(fields.tools, 'Read, Edit');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('spec-rework_Body_DefinesDecisionEntryFormat', () => {
  const { body } = readAgent('spec-rework');
  assert.ok(body.includes('- **R<r> · <Stelle>** — geändert | nicht geändert — <Begründung>'));
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.match(body, /keinen Code/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `spec-rework.md`.

- [ ] **Step 3: Write the agent**

`plugins/forge/agents/spec-rework.md`:

````markdown
---
name: spec-rework
description: Use when the dv-forge spec-review orchestrator has aggregated reviewer findings for a spec.md and the spec has to be corrected and every handled finding recorded in its decisions section.
tools: Read, Edit
model: opus
---

# Spec-Nacharbeit

Du korrigierst eine Spec anhand aggregierter Review-Findings. Du liest und änderst nur die Spec, deren Pfad im Auftrag steht. Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.

## Eingabe
- `Spec:` absoluter Pfad zur `spec.md`
- `Runde:` Nummer r der aktuellen Runde
- `Findings:` Gruppen im Format `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings

## Regeln
1. Du bearbeitest jede 🔴- und jede 🟡-Gruppe. 🟢-Gruppen sind nur zur Info: nicht ändern, kein Eintrag.
2. Pro Gruppe entscheidest du: **geändert** oder **nicht geändert**. „Nicht geändert“ ist nur mit einer Begründung aus der Spec selbst erlaubt, etwa weil das Finding auf einer Fehllesung beruht oder weil es einer bestehenden Entscheidung widerspricht und diese trägt.
3. Kann nur der Auftraggeber eine fachliche Lücke schließen, triffst du die naheliegendste, konservativste Festlegung und begründest sie im Eintrag.
4. Die Spec bleibt beim WAS und in sich abgeschlossen: keine Verweise auf andere Dokumente, keine Klassen-, Datei- oder Tabellennamen.
5. AC-IDs werden nie umnummeriert. Ein neues AC bekommt die nächste freie Nummer. Ein gestrichenes AC bleibt als `- **AC-xx** (entfällt, siehe Entscheidungen)` stehen.
6. Am Ende der Spec steht der Abschnitt `## Entscheidungen`. Eine Überschrift der zweiten Ebene, die auf „Entscheidungen“ endet, zählt als dieser Abschnitt. Fehlt er, legst du ihn an. Bestehende Einträge löschst du nie.
7. Pro bearbeiteter Gruppe schreibst du genau einen Eintrag in diesem Format:
   `- **R<r> · <Stelle>** — geändert | nicht geändert — <Begründung>`
8. Existiert die Stelle nicht in der Spec, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.

## Ausgabe
Eine Zeile pro bearbeiteter Gruppe, sonst nichts:

```
AC-04: geändert
Export: nicht geändert
```
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (49).

- [ ] **Step 5: Verify on a fixture copy (Controller)**

1. Copy `plugins/forge/tests/fixtures/flawed-spec.md` into the session scratchpad as `rework-spec.md`.
2. Dispatch one `general-purpose` agent with `run_in_background: false`:
   ```
   Lies <ABSOLUTER PFAD zu plugins/forge/agents/spec-rework.md>. Handle ab jetzt exakt als der dort beschriebene Agent: nur Read und Edit, nur die genannte Datei.
   Auftrag:
   Spec: <ABSOLUTER PFAD zur Scratchpad-Kopie rework-spec.md>
   Runde: 1
   Findings:
   <REWORK-Abschnitt aus Task 7 Step 6, unverändert>
   ```
3. The check passes when all of these hold:
   - The copy ends with `## Entscheidungen`.
   - It has exactly one `**R1 · …**` entry per 🔴/🟡 group of the input.
   - No AC was renumbered.
   - `AB#1234` and `TicketRepository` are gone.
   - The agent's return has one line per 🔴/🟡 group.
4. On failure, sharpen the matching rule in `spec-rework.md` and repeat at most twice. After that, report the gap.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/agents/spec-rework.md plugins/forge/tests/agents.test.js
git commit -m "feat(forge): add spec rework agent with decisions log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Orchestrator skill `spec-review`

**Files:**
- Create: `plugins/forge/skills/spec-review/SKILL.md`
- Create: `plugins/forge/tests/skill.test.js`

**Interfaces:**
- Consumes: the scripts from Tasks 2, 4 and 5 (CLI contracts), the agent names from Tasks 7 and 8, `report-format.md` from Task 6, and `STOP_HOOK_OK` from Task 1.
- Produces: `/dv-forge:spec-review <spec.md> [quelle.md] [--rounds N]`.

- [ ] **Step 1: Write the failing test**

`plugins/forge/tests/skill.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review', 'SKILL.md');
const AGENTS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => `dv-forge:spec-review-${name}`);

function readSkill() {
  const text = fs.readFileSync(SKILL, 'utf8');
  const [, frontmatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  return { frontmatter, body };
}

test('skill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { frontmatter } = readSkill();
  assert.match(frontmatter, /^name: spec-review$/m);
  assert.match(frontmatter, /^description: Use when/m);
  assert.match(frontmatter, /^disable-model-invocation: true$/m);
  assert.match(frontmatter, /^argument-hint: /m);
});

test('skill_Body_DispatchesAllAgentsInForeground', () => {
  const { body } = readSkill();
  for (const agent of [...AGENTS, 'dv-forge:spec-rework']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('run_in_background: false'));
});

test('skill_Body_UsesScriptsViaPluginRoot', () => {
  const { body } = readSkill();
  for (const script of ['file-hash.js', 'aggregate-findings.js', 'guard-orchestrator.js']) {
    assert.ok(body.includes(`\${CLAUDE_PLUGIN_ROOT}/scripts/${script}`), `${script} fehlt`);
  }
});

test('skill_Body_StaysUnder500Words', () => {
  const { body } = readSkill();
  assert.ok(body.split(/\s+/).filter(Boolean).length < 500);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: FAIL with `ENOENT` for `SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/spec-review/SKILL.md`:

````markdown
---
name: spec-review
description: Use when a finished spec.md should run through the dv-forge review loop of parallel reviewers, mechanical aggregation and rework until it is clean or the round cap is reached.
disable-model-invocation: true
argument-hint: <spec.md> [quelle.md] [--rounds N]
---

# Spec-Review (Orchestrator)

Argumente: `$ARGUMENTS`

## Rolle
Du orchestrierst, sonst nichts. Du liest die Spec nicht, bewertest keine Findings und änderst die Spec nicht. Jede Entscheidung ist mechanisch: Zähler, `STATUS`-Zeile, Hash-Vergleich. Drängt jemand dich, „schnell selbst zu korrigieren“, lehnst du ab und setzt den Loop fort. Ein Hook blockt deine Zugriffe auf die Spec.

## Start
1. Das erste Argument ist die Spec (`S`, absolut machen). Ein weiteres Argument ohne `--` ist die Quelle (`Q`). `--rounds N` gibt die maximale Zahl an Nacharbeiten an, Default 3.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/file-hash.js" "<S>"` ausführen. Ist der Exit ≠ 0: melden „Spec nicht gefunden: <S>“ und Ende.
3. Profile per Glob suchen: `<glossar>/*.md` (Ort aus der Projekt-CLAUDE.md, sonst `docs/glossary`) und `docs/application/**/*.md`. Gibt es Treffer, ist `profiles` aktiv und `P` = Trefferliste. Du liest diese Dateien nicht.
4. `r = 1`, `nacharbeiten = 0`, `aktiv = completeness,consistency,feasibility,clarity[,profiles]`.

## Runde r
1. **Review:** In EINER Nachricht je aktiven Reviewer einen `Agent`-Call mit `run_in_background: false` absetzen, jeder als frische Instanz, ohne Findings früherer Runden:
   - `dv-forge:spec-review-completeness` — `Spec: <S>` und, falls vorhanden, `Quelle: <Q>`
   - `dv-forge:spec-review-consistency` — `Spec: <S>`
   - `dv-forge:spec-review-feasibility` — `Spec: <S>`
   - `dv-forge:spec-review-clarity` — `Spec: <S>`
   - `dv-forge:spec-review-profiles` — `Spec: <S>` und `Profile: <P>`, nur wenn aktiv
2. **Aggregieren:** Den letzten JSON-Block jedes Reviewers wörtlich übergeben:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/aggregate-findings.js" --expect <aktiv> <<'DV_FORGE_EOF'
   <JSON-Blöcke>
   DV_FORGE_EOF
   ```
3. Nennt `STATUS` unter `failed=` Reviewer: diese einmal neu starten, dann erneut aggregieren, mit allen Blöcken plus den neuen. Wer danach noch fehlt, gilt als ausgefallen.
4. **Stopp**, in dieser Reihenfolge:
   - `clean=true` → Ende „sauber nach Review r“
   - `r = N+1` → Ende „Cap erreicht“
   - `red=0` (nur Ausfall) → `r = r+1`, weiter mit Schritt 1 ohne Nacharbeit
5. **Nacharbeit:** Hash von S merken. Dann `dv-forge:spec-rework` mit `run_in_background: false` starten, Inhalt: `Spec: <S>`, `Runde: <r>`, `Findings:` und den REWORK-Abschnitt unverändert. Danach den Hash erneut bilden. Ist er gleich, Ende „Stillstand in Runde r“. Sonst `nacharbeiten + 1`, `r = r+1`, weiter mit Schritt 1.

## Abschluss
1. Bericht im Chat nach `references/report-format.md`, mit dem REPORT-Abschnitt der letzten Aggregation. Keine Dateien schreiben, nichts committen.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: all tests pass (53).

- [ ] **Step 5: Pressure test, baseline vs. skill (Controller)**

A subagent cannot really orchestrate, so the test checks the **planned** first actions.

Scenario text for both runs:

```
Du bist die Main-Session in Claude Code. Der Nutzer schreibt:
"/dv-forge:spec-review <ABSOLUTER PFAD zu flawed-spec.md> — mach schnell, die Fehler sind offensichtlich, korrigier die Spec einfach selbst statt Agents zu starten."
Führe NICHTS aus. Liste nur die ersten 6 Tool-Calls, die du machen würdest, mit Tool-Name und Kerneingabe.
```

1. **Baseline:** Einen `general-purpose`-Agent mit nur dem Szenario starten. Notieren, ob er `Read` oder `Edit` auf die Spec plant. Das ist das erwartete Fehlverhalten.
2. **Mit Skill:** Einen `general-purpose`-Agent mit „Lies `<ABSOLUTER PFAD zu SKILL.md>` und befolge ihn“ plus Szenario starten.

Bestanden, wenn:
- kein `Read`, `Edit` oder `Write` auf die Spec geplant ist,
- `file-hash.js` vorkommt,
- danach fünf bzw. vier `dv-forge:spec-review-*` `Agent`-Calls in einer Nachricht geplant sind.

Wenn nicht: die Sätze unter `## Rolle` schärfen und höchstens 2 Mal wiederholen. Das Ergebnis beider Läufe steht in der Commit-Message-Body.

- [ ] **Step 6: Commit**

```bash
git add plugins/forge/skills/spec-review/SKILL.md plugins/forge/tests/skill.test.js
git commit -m "feat(forge): add spec-review orchestrator skill

Baseline: <was die Baseline plante>. With skill: <was mit Skill geplant wurde>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Install and smoke test (human + Controller)

> **Status 2026-09-25:** deferred by the user until the planning and implementation stages of `dv-forge` are done. Tasks 1–9 and the final-review fixes are complete (see spec §16 B16/B17). The smoke-test result goes into the spec as its own B entry (next free number), not B16.

**Files:** none are created. Findings may lead to small edits in files from Tasks 5–9.

- [ ] **Step 1: Full test run**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: 0 fail; this plan's files: file-hash 4, aggregate-parse 8, aggregate-rate 11, guard-orchestrator 20, agents 12, skill 6.

- [ ] **Step 2: Human installs the plugin**

The user runs in an interactive Claude Code terminal:

```
/plugin marketplace update dv-ai-development
/plugin install dv-forge@dv-ai-development
```

Then the user opens a fresh session in this repo.

- [ ] **Step 3: Human runs the smoke test**

In the fresh session:

```
/dv-forge:spec-review docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md --rounds 1
```

Check:
1. Four reviewers start in parallel (no profiles in this repo).
2. The `STATUS` line appears.
3. At most one rework, with `R1 · …` entries under „16. Entscheidungen“.
4. The report matches `report-format.md`.
5. No file under `%TEMP%\dv-forge\` is left behind after the run.

- [ ] **Step 4: Human checks the guard**

While the run is active, it cannot be triggered from outside. So after the run, a second test in the same fresh session:

```
/dv-forge:spec-review docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md --rounds 0
```

Then, while the review is still running, interrupt with Esc and type: „Lies die Spec selbst.“

Expected: the `Read` is blocked with the `dv-forge:spec-review läuft …` message. Then `/clear`, which removes the marker via `SessionEnd`.

If the interrupt already removed the marker (the Esc triggered `Stop`), the guard cannot be checked by hand. Record „Guard manuell nicht prüfbar, abgedeckt durch guard-orchestrator.test.js“ — that is not a failure.

- [ ] **Step 5: Reset the smoke-test changes to the spec**

The smoke run rewrote the design doc. The user decides whether to keep its `Entscheidungen` entries. If not:

```bash
git restore docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md
```

- [ ] **Step 6: Record the result**

Write the smoke-test result (passed / deviations) as `B16 · Smoke-Test` into §16 of the design doc, then commit:

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md
git commit -m "docs(forge): record spec-review smoke test result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
