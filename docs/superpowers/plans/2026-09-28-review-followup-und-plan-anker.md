# Review-Followup und Plan-Anker — Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gewählte Scout-Vorschläge laufen per `/dv-forge:review-followup` durch Nacharbeiter bzw. Umsetzer und eine schmale Nach-Review-Runde, und Plan-Reviewer lesen eine deterministisch erzeugte Anker-Datei statt Dateien und Anker selbst zu suchen.

**Architecture:** Teil B: neues Modul `scripts/plan-anchors.js` (Kommando `plan-tasks.js anchors`), von `prepare.js plan-review` aufgerufen; Reviewer bekommen `Anker: <A>`. Teil A: Scouts schreiben `scout.md`, `scripts/followup.js` sichert Aggregat + Scout nach `.forge/followup/<rolle>/<slug>/` und löst Gruppen auf, `prepare.js review-followup` baut daraus Auswahl-Datei und `--only`-Aufruf des Original-Preparers, der neue Skill `review-followup` orchestriert Umsetzen + eine Nach-Review-Runde.

**Tech Stack:** Node.js 24 (CommonJS, `node:test`, `node:assert/strict`), Markdown-Skills und -Agents des Plugins dv-forge.

**Spec:** `docs/superpowers/specs/2026-09-28-review-followup-und-plan-anker-design.md`

## Global Constraints

- Tests: `node --test plugins/forge/tests/*.test.js` aus `C:\Develop\Dv.Ai.Development`. Vorher genau 4 rote Tests, nicht Teil dieses Pakets: `cli_Header_WritesHeaderBrief`, `writePackage_Range_WritesFileNamedByShortHashes`, `remove_InWorktree_KeepsBranchWithAllCommits`, `onPrompt_PlanReviewWithSpecLineInPlanHeader_ProtectsThatSpec`.
- TDD; Testnamen `<Einheit>_<Situation>_<Erwartung>`.
- Skill-Bodies < 500 Wörter (Test); `plan-writing`, `spec-whiteboarding`, `init` nicht füllen.
- Zeilenenden erhalten: bestehende Dateien sind im Arbeitsbaum CRLF (`core.autocrlf=true`); Änderungen mit dem Edit-Tool, keine Heredocs mit Backslash-Escapes.
- Keine typografischen Anführungszeichen (U+201C, U+201D, U+201E) in `agents/implementation-*.md`.
- Orchestrator-Texte: Skripte als einzelner `node`-Aufruf ohne Verkettung, Plugin-Dateien mit `Read`.
- Commits: Conventional Commits `feat(forge): …` bzw. `docs(wishes): …`, Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; **nur nach Ja des Menschen**, kein Push. Version 0.15.0 → 0.16.0 als eigener `chore(forge)`-Commit am Ende.
- Abweichungen von der Spec (in dieser Reihenfolge begründet): `prepare.js review-followup` liefert zusätzlich `WAHL=<g> · <Stufe> <Stelle> · Vorschlag <n>` je Gruppe, weil der Orchestrator `auswahl.md` bei der Implementierung nicht lesen darf (Guard schützt das Repo) und den Abschnitt „Umgesetzt“ sonst nicht füllen könnte. `spec-rework` behält im F-Eintrag sein bestehendes Wort `frage an den menschen` statt `neue Entscheidung` (Spec A6), damit R- und F-Einträge dasselbe Vokabular haben.

## Review Focus

1. **Scout-Vorschlag mit Codeblock oder nummerierten Zeilen im Code** — `followup.js` darf Zeilen wie `1. …` in einem Codeblock nicht als neuen Vorschlag lesen (Test in Task 5).
2. **Stelle mit Klammern** (`` `src/a.ts` (Zeile 3) ``) — die Reviewer-Klammer ist immer die letzte Klammer der Aggregat-Überschrift (Test in Task 5).
3. **Auswahl `b` ohne `Bevorzugt`-Zeile** — klare Meldung statt Vorschlag `null` (Test in Task 8).
4. **CRLF-Quelldateien** — Anker-Zeilennummern und Ausschnitte wie bei LF (Test in Task 1).
5. **Windows-Kurzpfade (8.3) für tmp/Repo** — `plan-anchors.js` rechnet Plan- und Repo-Pfad per `realpath` um, sonst wird der Plan-Pfad im Kopf `../..` (Test `cli_Anchors_WritesFileAndPrintsPath` prüft den relativen Kopf).

---

### Task 1: Anker-Prüfung `plan-tasks.js anchors`

**ACs:** AC-01, AC-02

**Files:**
- Create: `plugins/forge/scripts/plan-anchors.js`
- Modify: `plugins/forge/scripts/plan-tasks.js` · `describeTask`
- Test: `plugins/forge/tests/plan-anchors.test.js`

**Interfaces:**
- Produces: `plan-tasks.js` exportiert zusätzlich `checkedPlan(planPath) → { lines, tasks, headerEnd }`, `markFences(lines) → boolean[]`, `parseFileLine(line) → { kind, path, range: { from, to } | null, anchor: string | null } | null`, `taskTitle(lines, task) → string`. `plan-anchors.js` exportiert `buildAnchors(planPath, repo) → string` und `writeAnchors(planPath, repo, dir) → string` (POSIX-Pfad von `<dir>/anchors.md`); beide werfen `PlanError` bei ungültigem Plan oder fehlendem Repo.

- [ ] **Step 1: Failing tests schreiben** — `plugins/forge/tests/plan-anchors.test.js`

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const anchors = require('../scripts/plan-anchors.js');
const planTasks = require('../scripts/plan-tasks.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'plan-tasks.js');
const SOURCE = 'class Klasse {\n  methode() {\n    return 1;\n  }\n}\n';

function planWith(...tasks) {
  return ['# Demo — Umsetzungsplan', '', '**Ziel:** Demo.', '', '---', '',
    ...tasks.flatMap((fileLines, index) => [`### Task ${index + 1}: T${index + 1}`, '', '**Dateien:**', ...fileLines, '']),
    '## Entscheidungen', '- Keine Fragen an den Menschen.', ''].join('\n');
}

function fixture(files, plan) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-anchors-'));
  for (const [name, content] of Object.entries({ ...files, 'docs/plan.md': plan })) {
    fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    fs.writeFileSync(path.join(repo, name), content);
  }
  return { repo, plan: path.join(repo, 'docs', 'plan.md'), out: path.join(repo, '.forge', 'plan-review', 'demo') };
}

function anchorsOf(files, ...tasks) {
  const env = fixture(files, planWith(...tasks));
  return fs.readFileSync(anchors.writeAnchors(env.plan, env.repo, env.out), 'utf8');
}

test('anchors_ModifyLiteralAnchor_MarksLine', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js` · `methode()`']);
  assert.ok(text.includes('- ✅ Modify `src/a.js` · `methode()` — Zeile 2'), text);
});

test('anchors_ModifyAnchorOnlyAsLastMember_MarksMember', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js:1-3` · `Klasse.methode`']);
  assert.ok(text.includes('- ✅ Modify `src/a.js` · `Klasse.methode` — Zeile 2 (Glied methode)'), text);
});

test('anchors_ModifyAnchorMissing_MarksRed', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js` · `Klasse.fehlt`']);
  assert.ok(text.includes('- ❌ Modify `src/a.js` · `Klasse.fehlt` — Anker nicht gefunden'), text);
});

test('anchors_AnchorMissingButEarlierTaskTouchesFile_MarksWarning', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js` · `methode`'], ['- Modify: `src/a.js` · `neueFunktion`']);
  assert.ok(text.includes('- ⚠ Modify `src/a.js` · `neueFunktion` — Anker nicht im Bestand, Datei aus Task 1'), text);
});

test('anchors_ModifyFileMissing_RedUnlessCreatedEarlier', () => {
  const text = anchorsOf({}, ['- Create: `src/neu.js`'], ['- Modify: `src/neu.js` · `neu`', '- Modify: `src/weg.js` · `x`']);
  assert.ok(text.includes('- ✅ Create `src/neu.js` — existiert noch nicht'), text);
  assert.ok(text.includes('- ✅ Modify `src/neu.js` · `neu` — angelegt in Task 1 (Anker nicht geprüft)'), text);
  assert.ok(text.includes('- ❌ Modify `src/weg.js` · `x` — Datei fehlt'), text);
});

test('anchors_ModifyWithoutAnchor_MarksRed', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js`']);
  assert.ok(text.includes('- ❌ Modify `src/a.js` — Anker fehlt'), text);
});

test('anchors_CreateExistingFile_MarksRed', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Create: `src/a.js`']);
  assert.ok(text.includes('- ❌ Create `src/a.js` — existiert schon'), text);
});

test('anchors_TestLines_AnchoredLikeModifyUnanchoredMustBeNew', () => {
  const text = anchorsOf({ 'tests/a.test.js': "test('eins', () => {});\n" },
    ['- Test: `tests/a.test.js` · `eins`', '- Test: `tests/a.test.js`', '- Test: `tests/b.test.js`']);
  assert.ok(text.includes('- ✅ Test `tests/a.test.js` · `eins` — Zeile 1'), text);
  assert.ok(text.includes('- ❌ Test `tests/a.test.js` — bestehende Testdatei ohne Anker'), text);
  assert.ok(text.includes('- ✅ Test `tests/b.test.js` — existiert noch nicht'), text);
});

test('anchors_PathOutsideRepo_MarksRedWithoutReading', () => {
  const text = anchorsOf({}, ['- Modify: `../geheim.txt` · `x`']);
  assert.ok(text.includes('- ❌ Modify `../geheim.txt` · `x` — außerhalb des Repos (nicht gelesen)'), text);
});

test('anchors_RangeGiven_ExcerptWithLineNumbersCappedAtFileEnd', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js:4-9` · `methode`']);
  assert.ok(text.includes('### `src/a.js:4-9` (Task 1)\n4 |   }\n5 | }'), text);
  assert.ok(!text.includes('6 | '), text);
});

test('anchors_NoRange_ExcerptSectionSaysNone', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js` · `methode`']);
  assert.ok(text.includes('## Ausschnitte\nKeine.'), text);
});

test('anchors_RangeBeyondFile_NotesOutside', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js:20-30` · `methode`']);
  assert.ok(text.includes('Bereich 20-30 außerhalb der Datei (5 Zeilen)'), text);
});

test('anchors_CrlfFile_LinesCountedLikeLf', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE.replace(/\n/g, '\r\n') }, ['- Modify: `src/a.js:4-5` · `methode`']);
  assert.ok(text.includes('— Zeile 2'), text);
  assert.ok(text.includes('4 |   }\n5 | }'), text);
});

test('anchors_TaskOverview_ListsLineRangesOfEachTask', () => {
  const text = anchorsOf({ 'src/a.js': SOURCE }, ['- Modify: `src/a.js` · `methode`'], ['- Create: `src/b.js`']);
  assert.ok(text.includes('- Task 1: T1 — Zeilen 7-11'), text);
  assert.ok(text.includes('- Task 2: T2 — Zeilen 12-16'), text);
});

test('anchors_FileLineInsideFence_Ignored', () => {
  const text = anchorsOf({}, ['```markdown', '- Modify: `src/weg.js` · `x`', '```']);
  assert.ok(!text.includes('src/weg.js'), text);
  assert.ok(text.includes('### Task 1\nKeine Dateizeilen.'), text);
});

test('anchors_MoreThanFiveHits_ShowsFiveAndCount', () => {
  const text = anchorsOf({ 'src/x.txt': 'x\n'.repeat(7) }, ['- Modify: `src/x.txt` · `x`']);
  assert.ok(text.includes('Zeilen 1, 2, 3, 4, 5 (+2)'), text);
});

test('anchors_MissingRepo_ThrowsPlanError', () => {
  const env = fixture({}, planWith(['- Create: `a.js`']));
  assert.throws(() => anchors.writeAnchors(env.plan, path.join(env.repo, 'fehlt'), env.out), /Repo nicht gefunden/);
});

test('cli_Anchors_WritesFileAndPrintsPath', () => {
  const env = fixture({ 'src/a.js': SOURCE }, planWith(['- Modify: `src/a.js` · `methode`']));
  const result = spawnSync(process.execPath, [SCRIPT, 'anchors', env.plan, env.repo, env.out], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const file = result.stdout.trim();
  assert.doesNotMatch(file, /\\/);
  assert.match(fs.readFileSync(file, 'utf8'), /^# Anker-Prüfung: docs\/plan\.md\n/);
});

test('cli_AnchorsBrokenNumbering_ExitsOne', () => {
  const env = fixture({}, planWith(['- Create: `a.js`']).replace('### Task 1:', '### Task 2:'));
  const result = spawnSync(process.execPath, [SCRIPT, 'anchors', env.plan, env.repo, env.out], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Task-Nummerierung/);
});

test('describeTasks_FileLineWithRangeAndAnchor_KeepsKindAndPath', () => {
  const env = fixture({}, planWith(['- Modify: `src/a.js:1-2` · `methode`', '- Test: `tests/a.test.js` (neu)']));
  assert.deepEqual(planTasks.describeTasks(env.plan)[0].files,
    [{ kind: 'Modify', path: 'src/a.js' }, { kind: 'Test', path: 'tests/a.test.js' }]);
});
```

- [ ] **Step 2: Rot laufen lassen**

Run: `node --test plugins/forge/tests/plan-anchors.test.js`
Expected: FAIL, `Cannot find module '../scripts/plan-anchors.js'`

- [ ] **Step 3: `plan-tasks.js` erweitern** (Edit-Tool, CRLF bleibt)

`FILE_LINE` ersetzen und `parseFileLine`, `taskTitle` direkt darunter einfügen:

```js
const FILE_LINE = /^\s*-\s*(Create|Modify|Test):\s*`([^`:]+)(?::(\d+)-(\d+))?(?::[^`]*)?`(.*)$/;
const ANCHOR_REST = /^\s*·\s*(.+?)\s*$/;
const INTERFACE_LINE = /^\s*-\s*(Produces|Consumes):\s*(.+)$/;

function parseFileLine(line) {
  const match = FILE_LINE.exec(line);
  if (!match) return null;
  const anchor = ANCHOR_REST.exec(match[5]);
  return {
    kind: match[1],
    path: match[2].trim(),
    range: match[3] ? { from: Number(match[3]), to: Number(match[4]) } : null,
    anchor: anchor ? anchor[1].replace(/^`([^`]*)`.*$/, '$1') : null,
  };
}

function taskTitle(lines, task) {
  return lines[task.start].replace(TASK_HEADING, '').trim();
}
```

(`INTERFACE_LINE` bleibt unverändert und steht nur einmal in der Datei.) In `describeTask` die Zeilen

```js
  const title = lines[task.start].replace(TASK_HEADING, '').trim();
```
und
```js
    const file = FILE_LINE.exec(line);
    if (file) files.push({ kind: file[1], path: file[2].trim() });
```
ersetzen durch

```js
  const title = taskTitle(lines, task);
```
und
```js
    const file = parseFileLine(line);
    if (file) files.push({ kind: file.kind, path: file.path });
```

`USAGE` ersetzen:

```js
const USAGE = 'Aufruf: node plan-tasks.js list <plan> | brief <plan> <n> <dir> | header <plan> <dir> | slug <plan> | anchors <plan> <repo> <out>\n';
```

In `COMMANDS` nach `slug` einfügen (Lazy-`require`, weil `plan-anchors.js` dieses Modul lädt):

```js
  anchors: { arity: 3, run: ([plan, repo, out]) => require('./plan-anchors').writeAnchors(plan, repo, out) },
```

`module.exports` ersetzen:

```js
module.exports = {
  PlanError, scanPlan, numberingError, listTasks, describeTasks, recommendModel, formatOverview, buildHeader, buildBrief, writeBrief, writeHeader, slugOf,
  checkedPlan, markFences, parseFileLine, taskTitle,
};
```

- [ ] **Step 4: `plugins/forge/scripts/plan-anchors.js` anlegen**

```js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./lib/posix');
const { PlanError, checkedPlan, markFences, parseFileLine, taskTitle } = require('./plan-tasks');

const MAX_HITS = 5;
const MEMBER_SEPARATOR = /\.|::|#/;

function isInside(root, relative) {
  if (path.isAbsolute(relative)) return false;
  const rel = path.relative(root, path.resolve(root, relative));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function readRepoLines(root, relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lastMember(anchor) {
  if (!MEMBER_SEPARATOR.test(anchor)) return null;
  const member = anchor.split(MEMBER_SEPARATOR).filter(Boolean).pop()?.replace(/\(\)$/, '');
  return member && member !== anchor ? member : null;
}

function hitLines(lines, matches) {
  return lines.flatMap((line, index) => (matches(line) ? [index + 1] : []));
}

function findAnchor(lines, anchor) {
  const literal = hitLines(lines, (line) => line.includes(anchor));
  if (literal.length > 0) return { hits: literal, member: null };
  const member = lastMember(anchor);
  if (!member) return { hits: [], member: null };
  const word = new RegExp(`(?<![\\w$])${escapeRegExp(member)}(?![\\w$])`);
  return { hits: hitLines(lines, (line) => word.test(line)), member };
}

function formatHits(hits) {
  const shown = hits.slice(0, MAX_HITS).join(', ');
  const more = hits.length > MAX_HITS ? ` (+${hits.length - MAX_HITS})` : '';
  return `${hits.length === 1 ? 'Zeile' : 'Zeilen'} ${shown}${more}`;
}

function checkUnanchored(entry, lines) {
  if (entry.kind === 'Create') return lines ? { mark: '❌', text: 'existiert schon' } : { mark: '✅', text: 'existiert noch nicht' };
  if (entry.kind === 'Test') {
    return lines ? { mark: '❌', text: 'bestehende Testdatei ohne Anker' } : { mark: '✅', text: 'existiert noch nicht' };
  }
  return { mark: '❌', text: 'Anker fehlt' };
}

function checkLine(root, entry, earlier) {
  if (!isInside(root, entry.path)) return { mark: '❌', text: 'außerhalb des Repos (nicht gelesen)' };
  const lines = readRepoLines(root, entry.path);
  if (entry.kind === 'Create' || !entry.anchor) return checkUnanchored(entry, lines);
  if (!lines) {
    if (earlier?.created) return { mark: '✅', text: `angelegt in Task ${earlier.created} (Anker nicht geprüft)` };
    return { mark: '❌', text: 'Datei fehlt' };
  }
  const found = findAnchor(lines, entry.anchor);
  if (found.hits.length > 0) return { mark: '✅', text: `${formatHits(found.hits)}${found.member ? ` (Glied ${found.member})` : ''}` };
  if (earlier) return { mark: '⚠', text: `Anker nicht im Bestand, Datei aus Task ${earlier.last}` };
  return { mark: '❌', text: 'Anker nicht gefunden' };
}

function formatCheck(entry, result) {
  const anchor = entry.anchor ? ` · \`${entry.anchor}\`` : '';
  return `- ${result.mark} ${entry.kind} \`${entry.path}\`${anchor} — ${result.text}`;
}

function excerpt(root, entry, number) {
  const lines = isInside(root, entry.path) ? readRepoLines(root, entry.path) : null;
  if (!lines) return null;
  const heading = `### \`${entry.path}:${entry.range.from}-${entry.range.to}\` (Task ${number})`;
  const from = Math.max(1, entry.range.from);
  if (from > lines.length) {
    return [heading, `Bereich ${entry.range.from}-${entry.range.to} außerhalb der Datei (${lines.length} Zeilen)`].join('\n');
  }
  const to = Math.min(entry.range.to, lines.length);
  const width = String(to).length;
  const body = lines.slice(from - 1, to).map((line, index) => `${String(from + index).padStart(width)} | ${line}`);
  return [heading, ...body].join('\n');
}

function remember(seen, entry, number) {
  const state = seen.get(entry.path) ?? { created: null, last: null };
  if (entry.kind === 'Create' && state.created === null) state.created = number;
  state.last = number;
  seen.set(entry.path, state);
}

function taskEntries(lines, fenced, task) {
  const entries = [];
  for (let index = task.start; index < task.end; index += 1) {
    if (fenced[index]) continue;
    const entry = parseFileLine(lines[index]);
    if (entry) entries.push(entry);
  }
  return entries;
}

function repoRoot(repo) {
  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) throw new PlanError(`Repo nicht gefunden: ${toPosix(repo)}`);
  return fs.realpathSync.native(path.resolve(repo));
}

function buildAnchors(planPath, repo) {
  const root = repoRoot(repo);
  const { lines, tasks } = checkedPlan(planPath);
  const fenced = markFences(lines);
  const seen = new Map();
  const overview = [];
  const checks = [];
  const excerpts = [];
  for (const task of tasks) {
    overview.push(`- Task ${task.number}: ${taskTitle(lines, task)} — Zeilen ${task.start + 1}-${task.end}`);
    const entries = taskEntries(lines, fenced, task);
    const rows = entries.map((entry) => formatCheck(entry, checkLine(root, entry, seen.get(entry.path))));
    checks.push(`### Task ${task.number}`, ...(rows.length > 0 ? rows : ['Keine Dateizeilen.']), '');
    for (const entry of entries.filter((item) => item.range)) {
      const block = excerpt(root, entry, task.number);
      if (block) excerpts.push(block, '');
    }
    for (const entry of entries) remember(seen, entry, task.number);
  }
  const planName = toPosix(path.relative(root, fs.realpathSync.native(path.resolve(planPath))));
  const count = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  return [
    `# Anker-Prüfung: ${planName}`,
    `Repo: ${toPosix(root)} · Plan-Zeilen: ${count}`,
    '',
    '## Tasks',
    ...overview,
    '',
    '## Dateien',
    ...checks,
    '## Ausschnitte',
    ...(excerpts.length > 0 ? excerpts : ['Keine.', '']),
  ].join('\n');
}

function writeAnchors(planPath, repo, dir) {
  const content = buildAnchors(planPath, repo);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'anchors.md');
  fs.writeFileSync(file, content);
  return toPosix(file);
}

module.exports = { buildAnchors, writeAnchors };
```

- [ ] **Step 5: Grün laufen lassen**

Run: `node --test plugins/forge/tests/plan-anchors.test.js plugins/forge/tests/plan-tasks.test.js`
Expected: PASS für alle Tests aus `plan-anchors.test.js`; in `plan-tasks.test.js` nur der vorher rote `cli_Header_WritesHeaderBrief` rot.

- [ ] **Step 6: Commit** (nach Ja des Menschen)

```bash
git add plugins/forge/scripts/plan-anchors.js plugins/forge/scripts/plan-tasks.js plugins/forge/tests/plan-anchors.test.js
git commit -m "feat(forge): plan-tasks anchors checks files and anchors of a plan once"
```

---

### Task 2: `prepare.js plan-review` liefert `A=`

**ACs:** AC-03

**Files:**
- Modify: `plugins/forge/scripts/prepare.js` · `preparePlanReview`
- Test: `plugins/forge/tests/prepare.test.js` · `planReview_CreatesWorkspace`

**Interfaces:**
- Consumes: `writeAnchors(planPath, repo, dir) → string` aus Task 1.
- Produces: Ausgabezeile `A=<W>/anchors.md` oder `WARN=Anker-Prüfung fehlgeschlagen: <meldung>`.

- [ ] **Step 1: Failing tests** — am Ende von `plugins/forge/tests/prepare.test.js` anhängen

```js
test('planReview_AnchorFile_WrittenIntoWorkspaceAndListedAsA', () => {
  const repo = planRepo();
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.ok(fs.existsSync(out.A));
  assert.ok(samePath(path.dirname(out.A), out.W));
  assert.match(fs.readFileSync(out.A, 'utf8'), /^# Anker-Prüfung: docs\/forge\/demo\/plan\.md\n/);
});

test('planReview_AnchorCheckFails_WarnsWithoutAAndExitsZero', () => {
  const repo = planRepo(PLAN.replace('### Task 1: Eins', '### Task 2: Zwei'));
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.A, undefined);
  assert.match([].concat(out.WARN).join('\n'), /Anker-Prüfung fehlgeschlagen: Task-Nummerierung/);
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/prepare.test.js`
Expected: FAIL `planReview_AnchorFile_WrittenIntoWorkspaceAndListedAsA`, `planReview_AnchorCheckFails_WarnsWithoutAAndExitsZero`

- [ ] **Step 3: Implementieren**

Import unter `const { archivePath } = require('./ledger');` einfügen:

```js
const { writeAnchors } = require('./plan-anchors');
```

In `preparePlanReview` die Zeile `  values.aktiv = aktiv;` ersetzen durch:

```js
  values.aktiv = aktiv;
  // Anker einmal deterministisch prüfen; ein Fehler darf das Review nicht verhindern.
  try {
    values.A = writeAnchors(plan, root, values.W);
  } catch (error) {
    values.WARN = [`Anker-Prüfung fehlgeschlagen: ${error.message}`];
  }
```

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/prepare.test.js`
Expected: PASS (alle)

- [ ] **Step 5: Commit** (nach Ja)

```bash
git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js
git commit -m "feat(forge): plan-review prepares the anchor file for all reviewers"
```

---

### Task 3: Plan-Review-Skill und Plan-Reviewer nutzen die Anker-Datei

**ACs:** AC-04

**Files:**
- Modify: `plugins/forge/skills/plan-review/SKILL.md` · `## Reviewer`
- Modify: `plugins/forge/agents/plan-review-coverage.md` · `## Eingabe`
- Modify: `plugins/forge/agents/plan-review-feasibility.md` · `## Prüfauftrag`
- Modify: `plugins/forge/agents/plan-review-architecture.md` · `## Eingabe`
- Modify: `plugins/forge/agents/plan-review-risks.md` · `## Eingabe`
- Modify: `plugins/forge/agents/plan-review-buildability.md` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js` · `plan-review-buildability_Body_GatesSchemaAndForeignCode`
- Test: `plugins/forge/tests/plan-review-skill.test.js` · `planReviewSkill_Body_InputsFromPrepareScript`

**Interfaces:**
- Consumes: Ausgabezeilen `A=`, `WARN=` aus Task 2; Markierungen ✅/⚠/❌ aus Task 1.

- [ ] **Step 1: Failing tests** — an `plugins/forge/tests/agents.test.js` anhängen

```js
test('planReviewers_Body_TakeAnchorFileAndReadPlanOnce', () => {
  for (const name of ['coverage', 'feasibility', 'architecture', 'risks', 'buildability']) {
    const { body } = readAgent(`plan-review-${name}`);
    assert.ok(body.includes('- `Anker:` optional, Datei der Anker-Prüfung mit Task-Übersicht und je Dateizeile ✅, ⚠ oder ❌'), name);
    assert.ok(body.includes('Gibt es `Anker:`, liest du den Plan einmal ganz und danach nur noch Abschnitte per Zeilenbereich laut Task-Übersicht in der Anker-Datei.'), name);
  }
});

test('plan-review-buildability_Body_ReportsOnlyRedAnchorLines', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.ok(body.includes('ist jede ❌-Zeile aus der Anker-Datei ein Finding an ihrem Task'));
  assert.ok(body.includes('⚠- und ✅-Zeilen meldest du nicht'));
  assert.ok(body.includes('Ohne `Anker:`: Die Datei einer `Modify`-Zeile existiert im Repo'));
});

test('plan-review-feasibility_Body_NoExistenceCheckButWarningLines', () => {
  const { body } = readAgent('plan-review-feasibility');
  assert.ok(body.includes('Existenz von Dateien und Ankern prüfst du nicht; sie steht in der Anker-Datei.'));
  assert.ok(body.includes('**⚠-Zeilen:**'));
});
```

und an `plugins/forge/tests/plan-review-skill.test.js`:

```js
test('planReviewSkill_Body_AnchorFileGoesToEveryReviewer', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('die Anker-Datei `A`'));
  assert.ok(body.includes('jede `WARN`-Zeile kommt in die Hinweise des Orchestrators'));
  assert.ok(body.includes('Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.'));
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/plan-review-skill.test.js`
Expected: FAIL die vier neuen Tests

- [ ] **Step 3: Agents ändern** (Edit-Tool)

In **allen fünf** `agents/plan-review-{coverage,feasibility,architecture,risks,buildability}.md` die Zeile

```markdown
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei
```
ersetzen durch

```markdown
- `Anker:` optional, Datei der Anker-Prüfung mit Task-Übersicht und je Dateizeile ✅, ⚠ oder ❌
- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei

Gibt es `Anker:`, liest du den Plan einmal ganz und danach nur noch Abschnitte per Zeilenbereich laut Task-Übersicht in der Anker-Datei.
```

In `plan-review-buildability.md` Auftrag 3

```markdown
3. **`Modify`:** Die Datei existiert im Repo, und der Anker nach `·` existiert in dieser Datei. Fehlt Datei oder Anker: Finding.
```
ersetzen durch

```markdown
3. **Dateien und Anker:** Gibt es `Anker:`, ist jede ❌-Zeile aus der Anker-Datei ein Finding an ihrem Task; ⚠- und ✅-Zeilen meldest du nicht, und Dateien und Anker suchst du nicht selbst. Ohne `Anker:`: Die Datei einer `Modify`-Zeile existiert im Repo, und der Anker nach `·` existiert in dieser Datei. Fehlt Datei oder Anker: Finding.
```

In `plan-review-feasibility.md` nach Auftrag 4 (`4. **Widersprüche zwischen Tasks:** …`) als neue Zeile anfügen:

```markdown
5. **⚠-Zeilen:** Gibt es `Anker:`, prüfst du jede ⚠-Zeile gegen den Code, den der genannte frühere Task im Plan schreibt. Führt auch er den Anker nicht ein: Finding an `Task <n>` der ⚠-Zeile.
```

und die erste Zeile unter `## Nicht deine Aufgabe`

```markdown
Zeit- und Aufwandsschätzung, Stil, Architektur-Vorlieben, Fehlerbehandlung, AC-Abdeckung.
```
ersetzen durch (Rest der Zeile ab „Doku-Zitate“ bleibt)

```markdown
Existenz von Dateien und Ankern prüfst du nicht; sie steht in der Anker-Datei. Zeit- und Aufwandsschätzung, Stil, Architektur-Vorlieben, Fehlerbehandlung, AC-Abdeckung.
```

- [ ] **Step 4: Skill ändern** — `skills/plan-review/SKILL.md`

In Eingaben 1 den Satzteil `und die erlaubten Befehle \`Build\`, \`Test\`, \`Lint\`.` ersetzen durch

```markdown
die erlaubten Befehle `Build`, `Test`, `Lint`, die Anker-Datei `A` und je Warnung eine Zeile `WARN`; jede `WARN`-Zeile kommt in die Hinweise des Orchestrators.
```

Direkt unter `## Reviewer` als erste Zeile einfügen:

```markdown
Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.

```

- [ ] **Step 5: Grün**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/plan-review-skill.test.js`
Expected: PASS (inkl. `planReviewSkill_Body_StaysUnder500Words`)

- [ ] **Step 6: Commit** (nach Ja)

```bash
git add plugins/forge/skills/plan-review/SKILL.md plugins/forge/agents/plan-review-coverage.md plugins/forge/agents/plan-review-feasibility.md plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js plugins/forge/tests/plan-review-skill.test.js
git commit -m "feat(forge): plan reviewers read the anchor file instead of searching themselves"
```

---

### Task 4: Scouts schreiben `scout.md`, Guard und Result-Check ziehen mit

**ACs:** AC-05, AC-06

**Files:**
- Modify: `plugins/forge/agents/spec-review-scout.md` · `## Ausgabe`
- Modify: `plugins/forge/agents/plan-review-scout.md` · `## Ausgabe`
- Modify: `plugins/forge/agents/implementation-review-scout.md` · `## Ausgabe`
- Modify: `plugins/forge/scripts/guard-orchestrator.js` · `REVIEW_AGENT`
- Modify: `plugins/forge/scripts/result-check.js` · `problemWith`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-scout_Frontmatter_ReadGrepGlobSonnet`
- Test: `plugins/forge/tests/implementation-review-agents.test.js` · `implementation-review-scout_Frontmatter_ReadGrepGlobSonnet`
- Test: `plugins/forge/tests/review-files.test.js` · `resultCheck_InvalidJson_Blocks`

**Interfaces:**
- Produces: Scouts schreiben den Abschnitt `## Scout-Vorschläge` an `Ergebnis: <D>/scout.md` und antworten `Ergebnis geschrieben: <pfad>`.

- [ ] **Step 1: Failing tests**

In `agents.test.js` die Tests `spec-review-scout_Frontmatter_ReadGrepGlobSonnet` und `plan-review-scout_Frontmatter_ReadGrepGlobSonnet` umbenennen in `…_ReadGrepGlobWriteSonnet` und darin `assert.equal(fields.tools, 'Read, Grep, Glob');` durch `assert.equal(fields.tools, 'Read, Grep, Glob, Write');` ersetzen; dasselbe in `implementation-review-agents.test.js` für `implementation-review-scout_Frontmatter_ReadGrepGlobSonnet`. An `agents.test.js` anhängen:

```js
test('scouts_Body_WriteResultFileAndAnswerWithPathOnly', () => {
  for (const name of ['spec-review-scout', 'plan-review-scout', 'implementation-review-scout']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei (`scout.md`)'), name);
    assert.ok(body.includes('Deine letzte Aktion: Schreib mit `Write`'), name);
    assert.ok(body.includes('Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.'), name);
    assert.ok(!body.includes('Deine Antwort besteht nur aus diesem Abschnitt'), name);
  }
});
```

An `review-files.test.js` anhängen:

```js
test('resultCheck_ScoutMarkdownWithSection_AllowsStop', () => {
  const target = path.join(tmp(), 'scout.md');
  fs.writeFileSync(target, '## Scout-Vorschläge\n\n### 🔴 Task 1\n1. x\n**Bevorzugt: 1** — y\n');
  assert.equal(resultCheck.decide({ agent_transcript_path: transcript(`Ergebnis: ${target}`) }), null);
});

test('resultCheck_ScoutMarkdownWithoutSection_Blocks', () => {
  const target = path.join(tmp(), 'scout.md');
  fs.writeFileSync(target, 'Hier sind meine Vorschläge.\n');
  assert.match(resultCheck.decide({ agent_transcript_path: transcript(`Ergebnis: ${target}`) }).reason,
    /enthält keinen Abschnitt ## Scout-Vorschläge/);
});

test('guard_ScoutWritesOutsideWorkspace_DeniedInsideAllowed', () => {
  const cwd = tmp();
  const base = { session_id: 's', cwd, agent_id: 'a1', tool_name: 'Write', agent_type: 'dv-forge:plan-review-scout' };
  assert.match(guard.decidePreTool({ ...base, tool_input: { file_path: path.join(cwd, 'docs', 'plan.md') } }),
    /nur in den Arbeitsbereich \.forge\//);
  const inside = path.join(cwd, '.forge', 'plan-review', 'x', 'runde-1', 'scout.md');
  assert.equal(guard.decidePreTool({ ...base, tool_input: { file_path: inside } }), null);
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/implementation-review-agents.test.js plugins/forge/tests/review-files.test.js`
Expected: FAIL die drei Frontmatter-Tests, `scouts_Body_WriteResultFileAndAnswerWithPathOnly`, `resultCheck_ScoutMarkdownWithoutSection_Blocks`, `guard_ScoutWritesOutsideWorkspace_DeniedInsideAllowed`

- [ ] **Step 3: Scouts ändern** (Edit-Tool)

In allen drei Scouts die Frontmatter-Zeile `tools: Read, Grep, Glob` durch `tools: Read, Grep, Glob, Write` ersetzen.

`plan-review-scout.md`:
- `Du änderst keine Datei, schreibst keine Einträge und löst keine weitere Runde aus.` → `Du änderst keine Datei außer deiner Ergebnisdatei, schreibst keine Einträge und löst keine weitere Runde aus.`
- nach der Eingabezeile `- \`Findings:\` …` neue Zeile `- \`Ergebnis:\` absoluter Pfad deiner Ergebnisdatei (\`scout.md\`)`
- `Deine Antwort besteht nur aus diesem Abschnitt, in dieser Form, Gruppen in der Reihenfolge der Eingabe:` → `Deine letzte Aktion: Schreib mit \`Write\` nur diesen Abschnitt an den Pfad aus \`Ergebnis:\`, in dieser Form, Gruppen in der Reihenfolge der Eingabe. Danach antwortest du nur mit \`Ergebnis geschrieben: <pfad>\`.`
- `lautet die Antwort nur` → `steht in der Datei nur`

`implementation-review-scout.md` (keine typografischen Anführungszeichen verwenden):
- `Du änderst keine Datei und löst nichts aus.` → `Du änderst keine Datei außer deiner Ergebnisdatei und löst nichts aus.`
- nach der Eingabezeile `- \`Zurückgestellt:\` …` neue Zeile `- \`Ergebnis:\` absoluter Pfad deiner Ergebnisdatei (\`scout.md\`)`
- Ausgabe-Satz und `lautet die Antwort nur` wie bei `plan-review-scout.md`

`spec-review-scout.md`:
- `Du änderst keine Datei, schreibst keine Datei und löst keine weitere Runde aus.` → `Du änderst keine Datei, schreibst nur deine Ergebnisdatei und löst keine weitere Runde aus.`
- nach der Eingabezeile `- \`Findings:\` …` neue Zeile `- \`Ergebnis:\` absoluter Pfad deiner Ergebnisdatei (\`scout.md\`)`
- `Deine Antwort beginnt mit genau dieser Überschrift und enthält danach nur die Gruppen:` → `Deine letzte Aktion: Schreib mit \`Write\` an den Pfad aus \`Ergebnis:\` genau diese Überschrift und danach nur die Gruppen. Danach antwortest du nur mit \`Ergebnis geschrieben: <pfad>\`.`

- [ ] **Step 4: Guard und Result-Check**

`guard-orchestrator.js`, Zeile `REVIEW_AGENT` ersetzen:

```js
const REVIEW_AGENT = /^dv-forge:(?:(?:spec|plan|implementation)-review-[a-z-]+|(?:spec|plan)-rework)$/;
```

`result-check.js`: unter `const RESULT_LINE = …` einfügen

```js
const SCOUT_HEADING = /^## Scout-Vorschläge\s*$/m;
```

und in `problemWith` direkt nach `if (!fs.existsSync(file)) return 'fehlt';` einfügen:

```js
  if (file.toLowerCase().endsWith('.md')) {
    return SCOUT_HEADING.test(fs.readFileSync(file, 'utf8')) ? null : 'enthält keinen Abschnitt ## Scout-Vorschläge';
  }
```

- [ ] **Step 5: Grün**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/implementation-review-agents.test.js plugins/forge/tests/review-files.test.js`
Expected: PASS (alle)

- [ ] **Step 6: Commit** (nach Ja)

```bash
git add plugins/forge/agents/spec-review-scout.md plugins/forge/agents/plan-review-scout.md plugins/forge/agents/implementation-review-scout.md plugins/forge/scripts/guard-orchestrator.js plugins/forge/scripts/result-check.js plugins/forge/tests/agents.test.js plugins/forge/tests/implementation-review-agents.test.js plugins/forge/tests/review-files.test.js
git commit -m "feat(forge): scouts write scout.md, checked by result-check and the workspace guard"
```

---

### Task 5: `scripts/followup.js` sichert und löst Gruppen auf

**ACs:** AC-07

**Files:**
- Create: `plugins/forge/scripts/followup.js`
- Modify: `plugins/forge/scripts/guard-orchestrator.js` · `ALLOWED_SCRIPTS`
- Test: `plugins/forge/tests/followup.test.js`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `decidePreTool_DirectoryEntryShellNamesDirectory_Denies`

**Interfaces:**
- Consumes: `scanPlan(lines)`, `slugOf(planPath)` aus `plan-tasks.js`.
- Produces: `followup.js` exportiert `FollowupError`, `ROLES`, `ART_OF_ROLE` (`{ 'spec-review': 'spec-review', 'plan-review': 'plan-review', review: 'implementation-review' }`), `followupDir(repo, role, slug) → string`, `save(role, slug, dir) → string`, `drop(role, slug, cwd?) → void`, `latest(repo, slug, roles) → { role, dir, savedAt } | null`, `loadGroups(saveDir) → Array<{ number, severity, location, proposals: string[], preferred: number | null, reviewers: string[], findings: string[] }>`, `rolesFor(artifactPath) → string[]`, `slugFor(artifactPath, roles) → string`, `resolveFollowup(artifactPath, repo) → { role, dir, savedAt } | null`. CLI: `save <rolle> <slug> <dir>`, `drop <rolle> <slug>`.

- [ ] **Step 1: Failing tests** — `plugins/forge/tests/followup.test.js`

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, commitFile } = require('./lib/git-repo');
const followup = require('../scripts/followup.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'followup.js');
const AGGREGATE = [
  'STATUS clean=false red=1 yellow=1 green=0 failed=',
  '=== REPORT ===',
  'Tabelle',
  '=== REWORK ===',
  '### 🔴 Task 2 (buildability, feasibility · hochgestuft)',
  '- [buildability · yellow] Zitat: „a“ · Konsequenz: k1 · Begründung: b1',
  '- [feasibility · yellow] Zitat: „b“ · Konsequenz: k2 · Begründung: b2',
  '',
  '### 🟡 AC-03 (coverage)',
  '- [coverage · yellow] Zitat: „c“ · Konsequenz: k3 · Begründung: b3',
  '',
].join('\n');
const SCOUT = [
  '## Scout-Vorschläge',
  '',
  '### 🔴 Task 2',
  '1. Anker auf `run` ändern',
  '2. Datei vorher anlegen',
  '```js',
  '1. kein Vorschlag, nur Code',
  '```',
  '**Bevorzugt: 2** — weniger Risiko',
  '',
  '### 🟡 AC-03',
  '1. Schritt ergänzen',
  '**Bevorzugt: 1** — einziger Weg',
  '',
].join('\n');

function roundDir(files) {
  const repo = makeRepo();
  const dir = path.join(repo, '.forge', 'plan-review', 'demo', 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return { repo, dir, saved: path.join(repo, '.forge', 'followup', 'plan-review', 'demo') };
}

function writeSave(repo, role, slug, savedAt, files = { 'aggregate.md': AGGREGATE, 'scout.md': SCOUT }) {
  const dir = path.join(repo, '.forge', 'followup', role, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ rolle: role, savedAt }));
  return dir;
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('save_ScoutAndAggregate_CopiesWithMetaAndPrintsNumberedGroups', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  const output = followup.save('plan-review', 'demo', env.dir);
  assert.equal(fs.readFileSync(path.join(env.saved, 'scout.md'), 'utf8'), SCOUT);
  assert.equal(fs.readFileSync(path.join(env.saved, 'aggregate.md'), 'utf8'), AGGREGATE);
  const meta = JSON.parse(fs.readFileSync(path.join(env.saved, 'meta.json'), 'utf8'));
  assert.equal(meta.rolle, 'plan-review');
  assert.ok(!Number.isNaN(Date.parse(meta.savedAt)));
  assert.ok(output.startsWith('## Scout-Vorschläge'));
  assert.ok(output.includes('### 1 · 🔴 Task 2'));
  assert.ok(output.includes('### 2 · 🟡 AC-03'));
});

test('save_NoScoutFile_RemovesOldSaveAndReportsKeinScout', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  followup.save('plan-review', 'demo', env.dir);
  fs.rmSync(path.join(env.dir, 'scout.md'));
  assert.equal(followup.save('plan-review', 'demo', env.dir), 'KEIN SCOUT');
  assert.equal(fs.existsSync(env.saved), false);
});

test('save_ScoutWithoutSection_TreatedAsNoScout', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': 'Text ohne Abschnitt\n' });
  assert.equal(followup.save('plan-review', 'demo', env.dir), 'KEIN SCOUT');
});

test('save_ScoutWithoutAggregate_Throws', () => {
  const env = roundDir({ 'scout.md': SCOUT });
  assert.throws(() => followup.save('plan-review', 'demo', env.dir), /aggregate\.md fehlt/);
});

test('cli_SaveAndDrop_PrintNumberedScoutAndRemove', () => {
  const env = roundDir({ 'aggregate.md': AGGREGATE, 'scout.md': SCOUT });
  const saved = run(env.repo, 'save', 'plan-review', 'demo', env.dir);
  assert.equal(saved.status, 0, saved.stderr);
  assert.ok(saved.stdout.includes('### 1 · 🔴 Task 2'));
  assert.equal(run(env.repo, 'drop', 'plan-review', 'demo').status, 0);
  assert.equal(fs.existsSync(env.saved), false);
  assert.equal(run(env.repo, 'drop', 'plan-review', 'demo').status, 0);
});

test('cli_BadRole_ExitsTwo', () => {
  const env = roundDir({});
  assert.equal(run(env.repo, 'save', 'implementation', 'demo', env.dir).status, 2);
  assert.equal(run(env.repo, 'drop', 'plan-review').status, 2);
});

test('loadGroups_SavedFiles_JoinsProposalsPreferredReviewersAndFindings', () => {
  const repo = makeRepo();
  const groups = followup.loadGroups(writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z'));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].number, 1);
  assert.equal(groups[0].severity, '🔴');
  assert.equal(groups[0].location, 'Task 2');
  assert.deepEqual(groups[0].reviewers, ['buildability', 'feasibility']);
  assert.equal(groups[0].preferred, 2);
  assert.equal(groups[0].proposals.length, 2);
  assert.equal(groups[0].proposals[1], 'Datei vorher anlegen\n```js\n1. kein Vorschlag, nur Code\n```');
  assert.equal(groups[0].findings.length, 2);
  assert.deepEqual(groups[1].reviewers, ['coverage']);
});

test('loadGroups_LocationWithParentheses_ReviewersFromLastParenthesis', () => {
  const repo = makeRepo();
  const aggregate = '=== REWORK ===\n### 🟡 `src/a.ts` (Zeile 3) (risks)\n- [risks · yellow] Zitat: „x“ · Konsequenz: k · Begründung: b\n';
  const scout = '## Scout-Vorschläge\n\n### 🟡 `src/a.ts` (Zeile 3)\n1. prüfen\n**Bevorzugt: 1** — klar\n';
  const groups = followup.loadGroups(writeSave(repo, 'review', 'demo', 'x', { 'aggregate.md': aggregate, 'scout.md': scout }));
  assert.equal(groups[0].location, '`src/a.ts` (Zeile 3)');
  assert.deepEqual(groups[0].reviewers, ['risks']);
});

test('loadGroups_ScoutGroupWithoutAggregateGroup_Throws', () => {
  const repo = makeRepo();
  const dir = writeSave(repo, 'plan-review', 'demo', 'x', { 'aggregate.md': AGGREGATE, 'scout.md': '## Scout-Vorschläge\n\n### 🔴 Task 9\n1. x\n' });
  assert.throws(() => followup.loadGroups(dir), /Keine Aggregat-Gruppe zu 🔴 Task 9/);
});

test('latest_TwoRoles_NewestSavedAtWins', () => {
  const repo = makeRepo();
  writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  writeSave(repo, 'review', 'demo', '2026-09-28T11:00:00.000Z');
  assert.equal(followup.latest(repo, 'demo', ['plan-review', 'review']).role, 'review');
  assert.equal(followup.latest(repo, 'demo', ['spec-review']), null);
});

test('resolveFollowup_PlanOrSpecByContent_PicksMatchingRole', () => {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/plan.md', '# P\n\n### Task 1: Eins\n', 'plan');
  commitFile(repo, 'docs/forge/demo/spec.md', '# S\n', 'spec');
  writeSave(repo, 'spec-review', 'demo', '2026-09-28T12:00:00.000Z');
  writeSave(repo, 'plan-review', 'demo', '2026-09-28T10:00:00.000Z');
  assert.equal(followup.resolveFollowup(path.join(repo, 'docs/forge/demo/spec.md'), repo).role, 'spec-review');
  assert.equal(followup.resolveFollowup(path.join(repo, 'docs/forge/demo/plan.md'), repo).role, 'plan-review');
});
````

An `guard-orchestrator.test.js` anhängen:

```js
test('decidePreTool_DirectoryEntryFollowupScriptNamesWorkspace_Allows', () => {
  const env = setupDirectory();
  const command = `node "/plugins/forge/scripts/followup.js" save review demo "${path.join(env.repo, '.forge', 'review', 'demo', 'runde-1')}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/followup.test.js plugins/forge/tests/guard-orchestrator.test.js`
Expected: FAIL `Cannot find module '../scripts/followup.js'`; `decidePreTool_DirectoryEntryFollowupScriptNamesWorkspace_Allows` FAIL

- [ ] **Step 3: `plugins/forge/scripts/followup.js` anlegen**

````js
#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const { scanPlan, slugOf } = require('./plan-tasks');

const ROLES = ['spec-review', 'plan-review', 'review'];
const ART_OF_ROLE = { 'spec-review': 'spec-review', 'plan-review': 'plan-review', review: 'implementation-review' };
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node followup.js save <spec-review|plan-review|review> <slug> <dir> | drop <spec-review|plan-review|review> <slug>\n';
const SCOUT_HEADING = /^## Scout-Vorschläge\s*$/;
const GROUP_HEADING = /^### (🔴|🟡|🟢) (.+?)\s*$/u;
const REWORK_HEADING = /^### (🔴|🟡|🟢) (.+) \(([^()]*)\)\s*$/u;
const PROPOSAL = /^\d+\.\s+(.*)$/;
const PREFERRED = /^\*\*Bevorzugt: (\d+)\*\*/;
const FENCE = /^\s*(```|~~~)/;
const REWORK_MARK = '=== REWORK ===';

class FollowupError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) throw new FollowupError(`Kein Git-Repo: ${toPosix(cwd)}`);
  return path.resolve(result.stdout.trim());
}

function followupDir(repo, role, slug) {
  return path.join(repo, '.forge', 'followup', role, slug);
}

function readLines(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
}

function scoutSection(lines) {
  const start = lines.findIndex((line) => SCOUT_HEADING.test(line));
  return start === -1 ? [] : lines.slice(start);
}

function numberedScout(lines) {
  let number = 0;
  return scoutSection(lines).map((line) => {
    const heading = GROUP_HEADING.exec(line);
    if (!heading) return line;
    number += 1;
    return `### ${number} · ${heading[1]} ${heading[2]}`;
  }).join('\n').trimEnd();
}

function save(role, slug, dir) {
  const target = followupDir(repoRoot(dir), role, slug);
  const scoutFile = path.join(dir, 'scout.md');
  const scout = fs.existsSync(scoutFile) ? readLines(scoutFile) : [];
  if (scoutSection(scout).length === 0) {
    fs.rmSync(target, { recursive: true, force: true });
    return 'KEIN SCOUT';
  }
  const aggregateFile = path.join(dir, 'aggregate.md');
  if (!fs.existsSync(aggregateFile)) throw new FollowupError(`aggregate.md fehlt: ${toPosix(aggregateFile)}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(aggregateFile, path.join(target, 'aggregate.md'));
  fs.copyFileSync(scoutFile, path.join(target, 'scout.md'));
  fs.writeFileSync(path.join(target, 'meta.json'), `${JSON.stringify({ rolle: role, savedAt: new Date().toISOString() })}\n`);
  return numberedScout(scout);
}

function drop(role, slug, cwd = process.cwd()) {
  fs.rmSync(followupDir(repoRoot(cwd), role, slug), { recursive: true, force: true });
}

function latest(repo, slug, roles) {
  const found = roles
    .map((role) => ({ role, dir: followupDir(repo, role, slug) }))
    .filter(({ dir }) => fs.existsSync(path.join(dir, 'meta.json')))
    .map((entry) => ({ ...entry, savedAt: String(JSON.parse(fs.readFileSync(path.join(entry.dir, 'meta.json'), 'utf8')).savedAt ?? '') }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return found[0] ?? null;
}

function appendToProposal(group, line) {
  const last = group.proposals.length - 1;
  group.proposals[last] = `${group.proposals[last]}\n${line}`;
}

function parseScout(lines) {
  const groups = [];
  let current = null;
  let inFence = false;
  for (const line of scoutSection(lines)) {
    const heading = inFence ? null : GROUP_HEADING.exec(line);
    if (heading) {
      current = { severity: heading[1], location: heading[2], proposals: [], preferred: null };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    const opensOrClosesFence = FENCE.test(line);
    const proposal = inFence || opensOrClosesFence ? null : PROPOSAL.exec(line);
    const preferred = inFence ? null : PREFERRED.exec(line);
    if (proposal) current.proposals.push(proposal[1]);
    else if (preferred) current.preferred = Number(preferred[1]);
    else if (current.proposals.length > 0 && current.preferred === null) appendToProposal(current, line);
    if (opensOrClosesFence) inFence = !inFence;
  }
  for (const group of groups) group.proposals = group.proposals.map((text) => text.trimEnd());
  return groups;
}

function parseRework(lines) {
  const start = lines.indexOf(REWORK_MARK);
  const groups = [];
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const heading = REWORK_HEADING.exec(line);
    if (heading) {
      const reviewers = heading[3].replace(/\s*·\s*hochgestuft$/, '').split(',').map((name) => name.trim()).filter(Boolean);
      groups.push({ severity: heading[1], location: heading[2], reviewers, findings: [] });
    } else if (groups.length > 0 && line.startsWith('- [')) {
      groups[groups.length - 1].findings.push(line);
    }
  }
  return groups;
}

function loadGroups(saveDir) {
  const rework = parseRework(readLines(path.join(saveDir, 'aggregate.md')));
  return parseScout(readLines(path.join(saveDir, 'scout.md'))).map((group, index) => {
    const match = rework.find((item) => item.severity === group.severity && item.location === group.location);
    if (!match) throw new FollowupError(`Keine Aggregat-Gruppe zu ${group.severity} ${group.location}`);
    return { number: index + 1, ...group, reviewers: match.reviewers, findings: match.findings };
  });
}

// Ein Plan hat Task-Überschriften, eine Spec nicht; Spec und Plan im selben Ordner teilen den Slug.
function rolesFor(artifactPath) {
  return scanPlan(readLines(artifactPath)).tasks.length > 0 ? ['plan-review', 'review'] : ['spec-review'];
}

function slugFor(artifactPath, roles) {
  if (roles[0] !== 'spec-review') return slugOf(artifactPath);
  const absolute = path.resolve(artifactPath);
  const name = path.basename(absolute);
  return name.toLowerCase() === 'spec.md' ? path.basename(path.dirname(absolute)) : path.basename(name, path.extname(name));
}

function resolveFollowup(artifactPath, repo) {
  const roles = rolesFor(artifactPath);
  return latest(repo, slugFor(artifactPath, roles), roles);
}

function isValidCall(action, args) {
  const [role, slug] = args;
  if (!ROLES.includes(role) || !SLUG.test(slug ?? '')) return false;
  return (action === 'save' && args.length === 3) || (action === 'drop' && args.length === 2);
}

function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!isValidCall(action, args)) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    if (action === 'save') process.stdout.write(`${save(...args)}\n`);
    else drop(...args);
  } catch (error) {
    if (!(error instanceof FollowupError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  FollowupError, ROLES, ART_OF_ROLE, followupDir, save, drop, latest, loadGroups, rolesFor, slugFor, resolveFollowup,
};
````

`guard-orchestrator.js`: in `ALLOWED_SCRIPTS` nach `'ledger.js'` den Eintrag `'followup.js'` ergänzen:

```js
const ALLOWED_SCRIPTS = ['file-hash.js', 'aggregate-findings.js', 'rework-outcome.js',
  'plan-tasks.js', 'workspace.js', 'base-tag.js', 'review-package.js', 'prepare.js', 'forge-config.js', 'work.js', 'ledger.js', 'followup.js'];
```

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/followup.test.js plugins/forge/tests/guard-orchestrator.test.js`
Expected: PASS, außer dem vorher roten `onPrompt_PlanReviewWithSpecLineInPlanHeader_ProtectsThatSpec`

- [ ] **Step 5: Commit** (nach Ja)

```bash
git add plugins/forge/scripts/followup.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/followup.test.js plugins/forge/tests/guard-orchestrator.test.js
git commit -m "feat(forge): followup.js saves aggregate and scout proposals per review"
```

---

### Task 6: Review-Loop sichert vor dem Aufräumen

**ACs:** AC-08

**Files:**
- Modify: `plugins/forge/shared/review-loop/loop.md` · `## Abschluss`
- Modify: `plugins/forge/shared/review-loop/report-format.md` · `<Scout-Abschnitt`
- Test: `plugins/forge/tests/review-loop.test.js` · `loop_Closing_ScoutRunsOnlyOnRedOrYellowAndIsCheckedMechanically`

**Interfaces:**
- Consumes: CLI `followup.js save <rolle> <slug> <dir>` aus Task 5 (Ausgabe Scout-Abschnitt oder `KEIN SCOUT`); `Ergebnis:`-Eingabe der Scouts aus Task 4.

- [ ] **Step 1: Failing test** — in `review-loop.test.js` den Test `loop_Closing_ScoutRunsOnlyOnRedOrYellowAndIsCheckedMechanically` ersetzen durch

```js
test('loop_Closing_ScoutWritesFileAndSaveRunsBeforeCleanup', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.match(text, /`red` > 0 oder `yellow` > 0/);
  for (const part of ['Findings: <D>/aggregate.md', 'Ergebnis: <D>/scout.md', '<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"',
    'KEIN SCOUT', 'Scout ausgefallen', 'die Ausgabe von `save`']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  const closing = text.slice(text.indexOf('## Abschluss'));
  assert.ok(closing.indexOf('followup.js" save') < closing.indexOf('Die zwei Befehle aus „Jedes Ende“'));
});
```

und in `reportFormat_Generic_TitleAndSkillSpecificParts` ergänzen:

```js
  assert.ok(text.includes('Ausgabe von `followup.js save`'));
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/review-loop.test.js`
Expected: FAIL `loop_Closing_ScoutWritesFileAndSaveRunsBeforeCleanup`, `reportFormat_Generic_TitleAndSkillSpecificParts`

- [ ] **Step 3: `loop.md` ändern** (Edit-Tool) — den Abschnitt `## Abschluss` (Schritte 1–3) ersetzen durch

```markdown
## Abschluss
1. **Abschluss-Scout:** Nennt der Skill einen Scout und zeigt die letzte `STATUS`-Zeile `red` > 0 oder `yellow` > 0, startest du ihn einmal mit `run_in_background: false`: Eingaben aus dem Skill, dazu `Findings: <D>/aggregate.md` der letzten Runde und `Ergebnis: <D>/scout.md`. Du bewertest die Vorschläge nicht.
2. **Sichern:** `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"`, immer, auch ohne Scout; ohne Scout räumt es die alte Sicherung weg. Lief der Scout und gibt `save` `KEIN SCOUT` aus, startest du den Scout einmal neu und rufst `save` erneut auf. Wieder `KEIN SCOUT`: `Scout ausgefallen`.
3. Bericht im Chat nach `<PLUGIN>/shared/review-loop/report-format.md`; der Scout-Abschnitt ist die Ausgabe von `save`. Nichts committen.
4. Die zwei Befehle aus „Jedes Ende“.
```

`report-format.md`: die Zeile

```markdown
<Scout-Abschnitt ab `## Scout-Vorschläge`, unverändert, oder „Scout ausgefallen“>        ← nur wenn der Skill einen Scout nennt und er lief
```
ersetzen durch

```markdown
<Ausgabe von `followup.js save` ab `## Scout-Vorschläge`, unverändert, oder „Scout ausgefallen“>        ← nur wenn der Skill einen Scout nennt und er lief
```

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/review-loop.test.js`
Expected: PASS

- [ ] **Step 5: Commit** (nach Ja)

```bash
git add plugins/forge/shared/review-loop/loop.md plugins/forge/shared/review-loop/report-format.md plugins/forge/tests/review-loop.test.js
git commit -m "feat(forge): review loop saves aggregate and scout file before cleanup"
```

---

### Task 7: „Nächster Schritt“ nennt `/dv-forge:review-followup`

**ACs:** AC-09

**Files:**
- Modify: `plugins/forge/skills/spec-review/SKILL.md` · `Nächster Schritt:`
- Modify: `plugins/forge/skills/plan-review/SKILL.md` · `Nächster Schritt:`
- Modify: `plugins/forge/skills/implementation-review/SKILL.md` · `Nächster Schritt:`
- Test: `plugins/forge/tests/skill.test.js` · `skill_Body_ProfilesGetIndexNotList`
- Test: `plugins/forge/tests/plan-review-skill.test.js` · `planReviewSkill_Body_CleanReportHandsOverToImplementation`
- Test: `plugins/forge/tests/implementation-review-skill.test.js` · `implementationReviewSkill_Body_ReportStatusRangeAndCleanup`

**Interfaces:**
- Consumes: Auswahl-Syntax aus Task 8 (`b`, `<n>`, `<g>:<n|b>,…`).

- [ ] **Step 1: Failing tests** — anhängen

`skill.test.js`:
```js
test('skill_Body_NextStepOffersReviewFollowup', () => {
  const { body } = readSkill();
  assert.ok(body.includes('/dv-forge:review-followup <S> <auswahl>'));
  assert.ok(body.includes('Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.'));
  assert.ok(body.includes('`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`'));
});
```

`plan-review-skill.test.js`:
```js
test('planReviewSkill_Body_NextStepOffersReviewFollowup', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('/dv-forge:review-followup <P> <auswahl>'));
  assert.ok(body.includes('Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.'));
  assert.ok(body.includes('`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`'));
});
```

`implementation-review-skill.test.js`:
```js
test('implementationReviewSkill_Body_NextStepOffersReviewFollowup', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('/dv-forge:review-followup <P> <auswahl>'));
  assert.ok(body.includes('`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`'));
  assert.ok(!body.includes('gewählte Änderungen selbst beauftragen'));
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/implementation-review-skill.test.js`
Expected: FAIL die drei neuen Tests

- [ ] **Step 3: Texte ändern** (Edit-Tool)

`spec-review/SKILL.md`: `Nächster Schritt:` und die drei Punkte ersetzen durch

```markdown
Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

Nächster Schritt:
- mit Fragen: `Die Fragen in den R-Einträgen der Spec beantworten und als W-Einträge festhalten, dann /dv-forge:spec-review <S> erneut.`
- `sauber`: Bei `yellow` > 0 steht zuerst `Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.` und der Auswahl-Hinweis. Dann `Spec ist bereit. Spec committen, dann in einer frischen Session:` und darunter in einem Code-Block `/dv-forge:plan-writing <S>`.
- sonst: `Spec nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <S> <auswahl> oder Spec selbst anpassen und /dv-forge:spec-review <S> erneut.` und der Auswahl-Hinweis.
```

`plan-review/SKILL.md`: vor `Nächster Schritt:` die Zeile `Auswahl-Hinweis: \`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.\`` plus Leerzeile einfügen; im Punkt `sauber` nach `- \`sauber\`: ` einfügen `Bei \`yellow\` > 0 steht zuerst \`Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.\` und der Auswahl-Hinweis. ` (Rest unverändert); den Punkt `sonst` ersetzen durch

```markdown
- sonst: `Plan nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.` und der Auswahl-Hinweis.
```

`implementation-review/SKILL.md`: vor `Nächster Schritt:` dieselbe Auswahl-Hinweis-Zeile plus Leerzeile; die Punkte zwei und drei ersetzen durch

```markdown
- `sauber`, `yellow` > 0: `Keine roten Findings. Gelbe Findings und Scout-Vorschläge lesen, gewählte mit /dv-forge:review-followup <P> <auswahl> umsetzen, dann abschließen mit:`, der Code-Block `/dv-forge:finish-work` und der Auswahl-Hinweis.
- `geprüft, k × 🔴 offen`: `k rote Findings offen. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis.
```

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/implementation-review-skill.test.js`
Expected: PASS (inkl. Wortgrenzen)

- [ ] **Step 5: Commit** (nach Ja)

```bash
git add plugins/forge/skills/spec-review/SKILL.md plugins/forge/skills/plan-review/SKILL.md plugins/forge/skills/implementation-review/SKILL.md plugins/forge/tests/skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/implementation-review-skill.test.js
git commit -m "feat(forge): review reports point to review-followup for chosen proposals"
```

---

### Task 8: `prepare.js review-followup`

**ACs:** AC-10, AC-11

**Files:**
- Modify: `plugins/forge/scripts/prepare.js` · `PREPARERS`
- Test: `plugins/forge/tests/prepare.test.js` · `planRepo`

**Interfaces:**
- Consumes: `ART_OF_ROLE`, `latest`, `loadGroups`, `rolesFor`, `slugFor` aus Task 5; `writeAnchors` indirekt über `preparePlanReview`.
- Produces: Ausgabe des Original-Preparers mit `aktiv` = betroffene Reviewer, plus `art=`, `F=<W>/auswahl.md`, `gruppen=<g,…>`, je Gruppe `WAHL=<g> · <Stufe> <Stelle> · Vorschlag <n>`, bei `art=implementation-review` zusätzlich `FIX_BASE=<sha>`. Exit 2 bei Syntaxfehler/Argumentzahl, Exit 1 bei fehlender Sicherung, unbekannter Gruppe oder Nummer.

- [ ] **Step 1: Failing tests** — an `prepare.test.js` anhängen

```js
const FOLLOWUP_AGGREGATE = [
  '=== REWORK ===',
  '### 🔴 Task 2 (buildability, feasibility · hochgestuft)',
  '- [buildability · yellow] Zitat: „a“ · Konsequenz: k1 · Begründung: b1',
  '',
  '### 🟡 AC-03 (coverage)',
  '- [coverage · yellow] Zitat: „c“ · Konsequenz: k3 · Begründung: b3',
  '',
].join('\n');
const FOLLOWUP_SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 Task 2', '1. Anker ändern', '2. Datei vorher anlegen', '**Bevorzugt: 2** — weniger Risiko', '',
  '### 🟡 AC-03', '1. Schritt ergänzen', '**Bevorzugt: 1** — einziger Weg', '',
].join('\n');

function saveFollowup(repo, role, savedAt, aggregate = FOLLOWUP_AGGREGATE, scout = FOLLOWUP_SCOUT) {
  const dir = path.join(repo, '.forge', 'followup', role, 'demo');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'aggregate.md'), aggregate);
  fs.writeFileSync(path.join(dir, 'scout.md'), scout);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ rolle: role, savedAt }));
}

test('reviewFollowup_NothingSaved_ExitsOneWithHint', () => {
  const result = run(planRepo(), 'review-followup', 'docs/forge/demo/plan.md', 'b');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Keine Scout-Vorschläge gesichert für demo/);
});

test('reviewFollowup_PlanPreferred_OnlyAffectedReviewersAndSelectionFile', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'b');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.art, 'plan-review');
  assert.equal(out.aktiv, 'coverage,feasibility,buildability');
  assert.equal(out.gruppen, '1,2');
  assert.deepEqual([].concat(out.WAHL), ['1 · 🔴 Task 2 · Vorschlag 2', '2 · 🟡 AC-03 · Vorschlag 1']);
  assert.ok(samePath(path.dirname(out.F), out.W));
  const selection = fs.readFileSync(out.F, 'utf8');
  assert.ok(selection.includes('### 1 · 🔴 Task 2 (buildability, feasibility)'));
  assert.ok(selection.includes('- [buildability · yellow] Zitat: „a“'));
  assert.ok(selection.includes('Gewählt: Vorschlag 2\nDatei vorher anlegen'));
});

test('reviewFollowup_PerGroupSelection_WritesOnlyChosenGroup', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/plan.md', '2:1'));
  assert.equal(out.aktiv, 'coverage');
  assert.equal(out.gruppen, '2');
  assert.ok(!fs.readFileSync(out.F, 'utf8').includes('Task 2'));
});

test('reviewFollowup_BadSyntaxOrArgumentCount_ExitsTwo', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  assert.equal(run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'x').status, 2);
  assert.equal(run(repo, 'review-followup', 'docs/forge/demo/plan.md', '1:').status, 2);
  assert.equal(run(repo, 'review-followup', 'docs/forge/demo/plan.md').status, 2);
});

test('reviewFollowup_UnknownGroupProposalOrDuplicate_ExitsOne', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  const call = (selection) => run(repo, 'review-followup', 'docs/forge/demo/plan.md', selection);
  assert.match(call('3:1').stderr, /Gruppe 3 gibt es nicht \(1-2\)/);
  assert.match(call('2:2').stderr, /Gruppe 2: Vorschlag 2 gibt es nicht \(1-1\)/);
  assert.match(call('1:1,1:2').stderr, /Gruppe 1 doppelt gewählt/);
  assert.equal(call('3').status, 1);
});

test('reviewFollowup_PreferredMissing_ExitsOneNamingGroup', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z', FOLLOWUP_AGGREGATE, FOLLOWUP_SCOUT.replace('**Bevorzugt: 1** — einziger Weg', ''));
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'b');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Gruppe 2 hat keinen bevorzugten Vorschlag/);
});

test('reviewFollowup_ImplementationSavedLater_WinsWithFixBase', () => {
  const repo = planRepo();
  git(repo, 'tag', 'forge-base/demo', 'HEAD~1');
  saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
  saveFollowup(repo, 'review', '2026-09-28T11:00:00.000Z',
    '=== REWORK ===\n### 🔴 src/a.ts (risks)\n- [risks · red] Zitat: „x“ · Konsequenz: k · Begründung: b\n',
    '## Scout-Vorschläge\n\n### 🔴 src/a.ts\n1. Prüfung ergänzen\n**Bevorzugt: 1** — klar\n');
  const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', '1');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.art, 'implementation-review');
  assert.equal(out.aktiv, 'risks');
  assert.equal(out.FIX_BASE, git(repo, 'rev-parse', 'HEAD'));
});

test('reviewFollowup_SpecArtifact_UsesSpecReviewSave', () => {
  const repo = planRepo();
  saveFollowup(repo, 'plan-review', '2026-09-28T12:00:00.000Z');
  saveFollowup(repo, 'spec-review', '2026-09-28T10:00:00.000Z',
    '=== REWORK ===\n### 🟡 AC-01 (clarity)\n- [clarity · yellow] Zitat: „x“ · Konsequenz: k · Begründung: b\n',
    '## Scout-Vorschläge\n\n### 🟡 AC-01\n1. Wortlaut schärfen\n**Bevorzugt: 1** — klar\n');
  const out = values(run(repo, 'review-followup', 'docs/forge/demo/spec.md', 'b'));
  assert.equal(out.art, 'spec-review');
  assert.equal(out.aktiv, 'clarity');
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/prepare.test.js`
Expected: FAIL alle `reviewFollowup_*` (Exit 2 `Unbekannter Skill: review-followup`)

- [ ] **Step 3: Implementieren** (Edit-Tool in `prepare.js`)

Import unter `const { writeAnchors } = require('./plan-anchors');`:

```js
const { ART_OF_ROLE, FollowupError, latest, loadGroups, rolesFor, slugFor } = require('./followup');
```

`USAGE`: nach der Zeile für `implementation-review` einfügen:

```js
  '       node prepare.js review-followup <spec|plan> <auswahl>   (auswahl: b | <n> | <g>:<n|b>,...)',
```

`FLAGS` um `'review-followup': [],` und `MAX_POSITIONAL` um `'review-followup': 2` ergänzen.

Vor `const PREPARERS = {` einfügen:

```js
const SELECTION = /^(?:b|\d+|\d+:(?:\d+|b)(?:,\d+:(?:\d+|b))*)$/;

function selectionPairs(text, groups) {
  if (!text.includes(':')) return groups.map((group) => [String(group.number), text]);
  return text.split(',').map((part) => part.split(':'));
}

function chooseProposal(group, wanted) {
  if (wanted === 'b') {
    if (!group.preferred) throw new PrepareError(`Gruppe ${group.number} hat keinen bevorzugten Vorschlag.`);
    return group.preferred;
  }
  const choice = Number(wanted);
  if (choice < 1 || choice > group.proposals.length) {
    throw new PrepareError(`Gruppe ${group.number}: Vorschlag ${wanted} gibt es nicht (1-${group.proposals.length}).`);
  }
  return choice;
}

function parseSelection(text, groups) {
  if (!SELECTION.test(text)) throw new UsageError(`Auswahl ungültig: ${text} (erlaubt: b, <n>, <g>:<n|b>,...)`);
  if (groups.length === 0) throw new PrepareError('Die Sicherung enthält keine Scout-Gruppen.');
  const seen = new Set();
  return selectionPairs(text, groups).map(([number, wanted]) => {
    const group = groups[Number(number) - 1];
    if (!group) throw new PrepareError(`Gruppe ${number} gibt es nicht (1-${groups.length}).`);
    if (seen.has(group.number)) throw new PrepareError(`Gruppe ${group.number} doppelt gewählt.`);
    seen.add(group.number);
    return { group, choice: chooseProposal(group, wanted) };
  });
}

function selectionText(chosen) {
  const blocks = chosen.map(({ group, choice }) => [
    `### ${group.number} · ${group.severity} ${group.location} (${group.reviewers.join(', ')})`,
    ...group.findings,
    `Gewählt: Vorschlag ${choice}`,
    group.proposals[choice - 1],
  ].join('\n'));
  return `# Gewählte Scout-Vorschläge\n\n${blocks.join('\n\n')}\n`;
}

function headCommit(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new PrepareError(`HEAD nicht lesbar: ${toPosix(root)}`);
  return result.stdout.trim();
}

function prepareReviewFollowup({ positional }) {
  if (positional.length !== 2) throw new UsageError('review-followup braucht <artefakt> <auswahl>');
  const artifact = existingFile(path.resolve(positional[0]), 'Artefakt');
  const root = gitRoot(path.dirname(artifact));
  const roles = rolesFor(artifact);
  const slug = slugFor(artifact, roles);
  const saved = latest(root, slug, roles);
  if (!saved) throw new PrepareError(`Keine Scout-Vorschläge gesichert für ${slug}. Zuerst das Review laufen lassen.`);
  const chosen = parseSelection(positional[1], loadGroups(saved.dir));
  const affected = [...new Set(chosen.flatMap(({ group }) => group.reviewers))];
  const art = ART_OF_ROLE[saved.role];
  const values = PREPARERS[art]({ positional: [artifact], flags: { '--only': [affected.join(',')] } });
  const selection = path.join(values.W, 'auswahl.md');
  fs.writeFileSync(selection, selectionText(chosen));
  values.art = art;
  values.F = selection;
  values.gruppen = chosen.map(({ group }) => group.number).join(',');
  values.WAHL = chosen.map(({ group, choice }) => `${group.number} · ${group.severity} ${group.location} · Vorschlag ${choice}`);
  if (art === 'implementation-review') values.FIX_BASE = headCommit(values.R);
  return values;
}
```

`PREPARERS` um `'review-followup': prepareReviewFollowup,` ergänzen (nach `'implementation-review'`). In `main()` die Fehlerliste `[PrepareError, TagError, PackageError, ConfigError]` um `FollowupError` ergänzen.

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/prepare.test.js`
Expected: PASS (alle)

- [ ] **Step 5: Commit** (nach Ja)

```bash
git add plugins/forge/scripts/prepare.js plugins/forge/tests/prepare.test.js
git commit -m "feat(forge): prepare review-followup builds the selection and the affected reviewers"
```

---

### Task 9: Nacharbeiter im Folge-Modus, F-Einträge in den Formaten

**ACs:** AC-12

**Files:**
- Modify: `plugins/forge/agents/plan-rework.md` · `## Ausgabe`
- Modify: `plugins/forge/agents/spec-rework.md` · `## Ausgabe`
- Modify: `plugins/forge/skills/plan-writing/references/plan-format.md` · `R<r> · <Stelle>`
- Modify: `plugins/forge/skills/spec-whiteboarding/references/spec-format.md` · `**Letzter Pflicht-Abschnitt:**`
- Test: `plugins/forge/tests/agents.test.js` · `reworkAndScouts_Body_ReadFindingsFromAggregateFile`
- Test: `plugins/forge/tests/plan-writing.test.js` · `planFormat_Template_DecisionEntries`
- Test: `plugins/forge/tests/spec-whiteboarding.test.js` · `specFormat_Template_UsesStatusAcIdsAndWEntries`

**Interfaces:**
- Consumes: Aufbau von `auswahl.md` aus Task 8 (`### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>`, Vorschlagstext).

- [ ] **Step 1: Failing tests**

`agents.test.js`:
```js
test('reworkAgents_Body_FollowupModeAppliesChosenProposalsWithFEntries', () => {
  for (const [name, escalation] of [['plan-rework', 'spec-rückfrage'], ['spec-rework', 'frage an den menschen']]) {
    const { body } = readAgent(name);
    assert.ok(body.includes('## Folge-Modus'), name);
    assert.ok(body.includes('- `Vorschläge:` nur im Folge-Modus'), name);
    assert.ok(body.includes(`\`- **F · <Stelle>** — geändert | nicht geändert | ${escalation} — Vorschlag <n>: <Begründung>\``), name);
    assert.ok(body.includes('`location` ist die `<Stelle>` ohne Gruppennummer und Stufe'), name);
  }
});
```

`plan-writing.test.js`:
```js
test('planFormat_DecisionEntries_FollowupEntryOnlyFromFollowupRework', () => {
  const text = reference('plan-format.md');
  assert.ok(text.includes('- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>'));
  assert.ok(text.includes('F-Einträge schreibt nur der Nacharbeiter im Folge-Modus'));
});
```

`spec-whiteboarding.test.js`:
```js
test('specFormat_Rules_FollowupEntries', () => {
  assert.ok(reference('spec-format.md').includes('schreibt dort F-Einträge `- **F · <Stelle>** — … — Vorschlag <n>: <Begründung>`'));
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/plan-writing.test.js plugins/forge/tests/spec-whiteboarding.test.js`
Expected: FAIL die drei neuen Tests

- [ ] **Step 3: Agents** (Edit-Tool)

`plan-rework.md`: nach der Eingabezeile `- \`Findings:\` …` einfügen

```markdown
- `Vorschläge:` nur im Folge-Modus, statt `Runde:` und `Findings:`: Datei mit den gewählten Gruppen, je Gruppe Überschrift `### <g> · <Stufe> <Stelle> (<Reviewer>)`, Einzel-Findings, `Gewählt: Vorschlag <n>` und dessen Text
```

und direkt vor `## Ausgabe` einfügen:

```markdown
## Folge-Modus
Bekommst du `Vorschläge:` statt `Findings:`, gelten die Regeln oben mit diesen Abweichungen:
1. Du bearbeitest nur die Gruppen dieser Datei, jede mit ihrer Stufe.
2. Du setzt den gewählten Vorschlag um. Scheitert er an Spec, Plan oder Code, änderst du die Stelle nicht und begründest das.
3. Statt des R-Eintrags schreibst du pro Gruppe genau einen Eintrag `- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>`.
4. Im Ergebnis gilt: `location` ist die `<Stelle>` ohne Gruppennummer und Stufe.

```

`spec-rework.md`: dieselbe Eingabezeile nach `- \`Findings:\` …`; vor `## Ausgabe` derselbe Abschnitt mit `Scheitert er an der Spec` statt `Scheitert er an Spec, Plan oder Code` und mit dem Eintrag `- **F · <Stelle>** — geändert | nicht geändert | frage an den menschen — Vorschlag <n>: <Begründung>`; Regel 3 (neues Verhalten → Frage) gilt weiter, daher als Punkt 5: `Regel 3 gilt auch hier: Legt der Vorschlag neues Verhalten fest, schreibst du \`frage an den menschen\`.`

- [ ] **Step 4: Formate**

`plan-format.md`: im Vorlagen-Block nach der Zeile `- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>` die Zeile

```markdown
- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>
```

einfügen; Regel 12 am Ende um den Satz `F-Einträge schreibt nur der Nacharbeiter im Folge-Modus (\`/dv-forge:review-followup\`).` ergänzen.

`spec-format.md`, Regel 7 am Ende ergänzen: ` Der Nacharbeiter im Folge-Modus (\`/dv-forge:review-followup\`) schreibt dort F-Einträge \`- **F · <Stelle>** — … — Vorschlag <n>: <Begründung>\`.`

- [ ] **Step 5: Grün**

Run: `node --test plugins/forge/tests/agents.test.js plugins/forge/tests/plan-writing.test.js plugins/forge/tests/spec-whiteboarding.test.js`
Expected: PASS

- [ ] **Step 6: Commit** (nach Ja)

```bash
git add plugins/forge/agents/plan-rework.md plugins/forge/agents/spec-rework.md plugins/forge/skills/plan-writing/references/plan-format.md plugins/forge/skills/spec-whiteboarding/references/spec-format.md plugins/forge/tests/agents.test.js plugins/forge/tests/plan-writing.test.js plugins/forge/tests/spec-whiteboarding.test.js
git commit -m "feat(forge): rework agents apply chosen proposals in followup mode with F entries"
```

---

### Task 10: Skill `dv-forge:review-followup`

**ACs:** AC-13

**Files:**
- Create: `plugins/forge/skills/review-followup/SKILL.md`
- Create: `plugins/forge/skills/review-followup/references/flow.md`
- Test: `plugins/forge/tests/review-followup-skill.test.js`

**Interfaces:**
- Consumes: Ausgabe von `prepare.js review-followup` (Task 8), `followup.js save|drop` (Task 5), Folge-Modus `Vorschläge:` (Task 9), `loop.md` Schritte 1–4 und Abschluss 1–2 (Task 6).

- [ ] **Step 1: Failing test** — `plugins/forge/tests/review-followup-skill.test.js`

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const DIR = path.join(__dirname, '..', 'skills', 'review-followup');
const SKILL = path.join(DIR, 'SKILL.md');
const FLOW = path.join(DIR, 'references', 'flow.md');

test('reviewFollowupSkill_Frontmatter_ManualOnlyWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'review-followup');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <auswahl>');
});

test('reviewFollowupSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS', 'references/flow.md',
    '${CLAUDE_PLUGIN_ROOT}/skills/<art>/SKILL.md', 'dv-forge:implementation-implementer', 'dv-forge:implementation-re-reviewer',
    'genau eine Runde', 'scripts/workspace.js" remove <rolle> <slug>', 'scripts/guard-orchestrator.js" release', 'run_in_background: false']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
  assert.ok(fs.existsSync(FLOW));
  const text = readText(FLOW);
  for (const part of ['Vorschläge: <F>', 'Ergebnis: <W>/nacharbeit/rework.json', '--dir "<W>/nacharbeit"', '--expect <aktiv> --round 1',
    'followup.js" save <rolle> <slug> "<D>"', 'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"',
    'followup.js" drop review <slug>', 'Kein Scout', '### Umgesetzt', 'WAHL', 'keine Änderung', 'blockiert']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/review-followup-skill.test.js`
Expected: FAIL `ENOENT` für `SKILL.md`

- [ ] **Step 3: `SKILL.md` anlegen**

```markdown
---
name: review-followup
description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then checked once more by only the affected reviewers.
disable-model-invocation: true
argument-hint: <spec.md|plan.md> <auswahl>
---

# Review-Followup (Orchestrator)

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

Du orchestrierst wie in `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/loop.md`, Abschnitt Rolle: Du liest weder Artefakt, Spec noch Code, bewertest nichts und änderst nichts selbst; ein Hook blockt das. Plugin-Dateien liest du mit `Read`, jedes Skript startest du als einzelnen `node`-Aufruf ohne Verkettung. Die Einzelheiten jedes Schritts stehen in `${CLAUDE_PLUGIN_ROOT}/skills/review-followup/references/flow.md`; lies die Datei vor Schritt 1.

Auswahl: `b` = bevorzugter Vorschlag je Gruppe, `<n>` = Vorschlag n überall, `<g>:<n|b>,…` = je Gruppe; die Gruppen-Nummern stehen im Scout-Abschnitt des letzten Berichts.

## Ablauf
1. **Eingaben:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst Zeilen `<Name>=<Wert>` wie beim Original-Review, dazu `art`, `F`, `gruppen`, je Gruppe `WAHL` und bei `art=implementation-review` `FIX_BASE`. Jede `WARN`-Zeile kommt in die Hinweise.
2. **Original lesen:** `Read` auf `${CLAUDE_PLUGIN_ROOT}/skills/<art>/SKILL.md`. Von dort nimmst du die Eingabezeilen der Abschnitte Reviewer, Nacharbeiter, Zusatz-Stopps und Abschluss-Scout sowie die Texte für `Nächster Schritt`.
3. **Umsetzen:** bei `spec-review` und `plan-review` der Nacharbeiter des Original-Skills im Folge-Modus, bei `implementation-review` `dv-forge:implementation-implementer`, wie in `flow.md`.
4. **Nach-Review, genau eine Runde:** nur die Reviewer aus `aktiv`, bei `implementation-review` stattdessen `dv-forge:implementation-re-reviewer` auf das Fix-Diff, wie in `flow.md`.
5. **Bericht** nach `${CLAUDE_PLUGIN_ROOT}/shared/review-loop/report-format.md` mit Titel `Review-Followup (<art>)`, Artefakt das erste Argument, Status, Abschnitten und nächstem Schritt laut `flow.md`. Du committest nichts.
6. **Ende**, auch nach einem Fehler: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`.

Alle Agents laufen mit `run_in_background: false`; die Reviewer der Nach-Review-Runde startest du in einer Nachricht.
```

- [ ] **Step 4: `references/flow.md` anlegen**

```markdown
# Review-Followup: Ablauf im Einzelnen

`W`, `slug`, `aktiv`, `P`, `S`, `R` und die übrigen Werte kommen aus `prepare.js`. `F` ist die Datei mit den gewählten Gruppen; du liest sie nicht.

## Umsetzen

### Spec und Plan
1. Nacharbeiter des Original-Skills mit dessen Eingabezeilen, ohne `Runde:` und `Findings:`, dazu `Vorschläge: <F>` und `Ergebnis: <W>/nacharbeit/rework.json`.
2. Zusatz-Stopps des Original-Skills mit `--dir "<W>/nacharbeit"` statt `--dir "<W>/runde-<r>"`: Fragen bzw. Spec-Rückfragen sammeln wie dort. `OUTCOME all-red-escalated=true`: kein Nach-Review, Status `Rückfrage offen`.

### Implementierung
1. Brief = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" header "<P>" "<W>"`.
2. `dv-forge:implementation-implementer` mit `Brief: <brief>`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`.
3. Status `blocked` oder `needs-context`: kein Nach-Review, Status `blockiert`, die Rückgabe kommt in die Hinweise.

## Nach-Review

### Spec und Plan
1. `D = <W>/runde-1`. Schritte 1 bis 4 aus `loop.md` mit `r = 1` und genau den Reviewern aus `aktiv`, jeder mit seinen Eingabezeilen aus dem Original-Skill; die Aggregation mit `--expect <aktiv> --round 1`.
2. Danach Abschluss-Schritte 1 und 2 aus `loop.md`: Scout bei `red` > 0 oder `yellow` > 0, dann `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"`. Die Ausgabe ist der Scout-Abschnitt des Berichts.
3. Status: `clean=true` → `sauber nach Nach-Review`; ausgefallene Reviewer → `unvollständig nach Nach-Review, ausgefallen: <liste>`; sonst `k × 🔴 offen nach Nach-Review`.

### Implementierung
1. Paket = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <FIX_BASE> HEAD "<W>"`. Exit 1 (Bereich leer): Status `keine Änderung`, weiter mit dem Bericht.
2. `dv-forge:implementation-re-reviewer` mit `Brief: <brief>`, `Findings: <F>`, `Bericht: <W>/followup-report.md`, `Paket: <paket>`.
3. `node "<PLUGIN>/scripts/followup.js" drop review <slug>`. Kein Scout.
4. Status: Urteil `alle behoben, keine neuen 🔴` → `sauber nach Nach-Review`; sonst `offen nach Nach-Review`.

## Bericht
- `**Reviews:** 1 · **Nacharbeiten:** 1`; ohne Nach-Review `**Reviews:** 0 · **Nacharbeiten:** 1`.
- `### Letztes Review`: bei Spec und Plan der Abschnitt der Aggregation wie in `report-format.md`; bei der Implementierung die Antwort des Re-Reviewers unverändert.
- Zusatz-Abschnitt `### Umgesetzt`: je `WAHL`-Zeile ein Punkt `- <WAHL>`.
- Fragen bzw. Spec-Rückfragen als Zusatz-Abschnitt wie im Original-Skill.

## Nächster Schritt
- `sauber nach Nach-Review`: der Text des Original-Skills für `sauber`, bei Plan einschließlich der Commit-Prüfung.
- `Rückfrage offen`: der Text des Original-Skills für Fragen bzw. Spec-Rückfragen.
- Spec oder Plan offen: `Noch offen. Scout-Vorschläge oben lesen, dann /dv-forge:review-followup <artefakt> <auswahl> oder das volle Review erneut.`
- Implementierung offen, `keine Änderung` oder `blockiert`: `/dv-forge:implementation-review <P> erneut.`
- `unvollständig`: `Ausgefallene Reviewer: <liste>. Den Skill in einer frischen Session erneut starten.`
```

- [ ] **Step 5: Grün**

Run: `node --test plugins/forge/tests/review-followup-skill.test.js plugins/forge/tests/origin.test.js`
Expected: PASS

- [ ] **Step 6: Commit** (nach Ja)

```bash
git add plugins/forge/skills/review-followup plugins/forge/tests/review-followup-skill.test.js
git commit -m "feat(forge): review-followup skill applies chosen proposals with one narrow re-review"
```

---

### Task 11: Guard schützt beim Followup wie das Original-Review

**ACs:** AC-14

**Files:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js` · `COMMANDS`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `setupDirectory`

**Interfaces:**
- Consumes: `resolveFollowup(artifactPath, repo)` aus Task 5; `specOfPlan`, `gitToplevel` im Guard.

- [ ] **Step 1: Failing test** — `guard-orchestrator.test.js`: Import `const { makeRepo, commitFile, samePath } = require('./lib/git-repo');` oben ergänzen, dann anhängen

```js
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
```

- [ ] **Step 2: Rot**

Run: `node --test plugins/forge/tests/guard-orchestrator.test.js`
Expected: FAIL `onPrompt_ReviewFollowup_ProtectsLikeTheSavedReview` (`Cannot read properties of null`)

- [ ] **Step 3: Implementieren**

In `COMMANDS` nach `'/dv-forge:implementation-review'` einfügen:

```js
  '/dv-forge:review-followup': {
    reason: 'dv-forge:review-followup läuft: Der Orchestrator liest und ändert weder Artefakt, Spec noch Code. '
      + 'Umsetzen übernehmen Nacharbeiter bzw. Umsetzer, Prüfen die Reviewer-Agents.',
    protect: ([artifact], cwd) => (artifact ? followupEntries(path.resolve(cwd ?? '.', artifact), cwd) : null),
  },
```

Nach `function specOfPlan(planPath) { … }` einfügen:

```js
// Schützt dasselbe wie das Review, dessen Sicherung der Followup nutzt; ohne Sicherung scheitert prepare.js ohnehin.
function followupEntries(artifact, cwd) {
  let saved;
  try {
    saved = require('./followup').resolveFollowup(artifact, gitToplevel(path.dirname(artifact), cwd ?? '.'));
  } catch {
    return null;
  }
  if (!saved) return null;
  if (saved.role === 'spec-review') return [artifact];
  if (saved.role === 'plan-review') return [artifact, specOfPlan(artifact)];
  return [{ path: artifact, kind: 'repo' }];
}
```

- [ ] **Step 4: Grün**

Run: `node --test plugins/forge/tests/guard-orchestrator.test.js`
Expected: PASS, außer dem vorher roten `onPrompt_PlanReviewWithSpecLineInPlanHeader_ProtectsThatSpec`

- [ ] **Step 5: Gesamtlauf**

Run: `node --test plugins/forge/tests/*.test.js`
Expected: alle grün bis auf genau die 4 vorher roten Tests aus den Global Constraints

- [ ] **Step 6: Commit** (nach Ja)

```bash
git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/guard-orchestrator.test.js
git commit -m "feat(forge): guard protects review-followup like the saved review"
```

---

### Task 12: Entscheidungstabelle nachtragen

**ACs:** —

**Files:**
- Modify: `docs/wishes/all-wishes.md` · `| 3 · Scout-Vorschläge umsetzen |`

- [ ] **Step 1: Tabelle ändern** (Edit-Tool) — in Abschnitt 14 die Spalte `Stand` der Zeilen `3 · Scout-Vorschläge umsetzen` und `4 · Anker einmal prüfen` ersetzen:

Zeile 3, Stand `geplant, als Paket mit Punkt 4 über Spec + Plan` →
```markdown
umgesetzt (`skills/review-followup`, `scripts/followup.js`, `prepare.js review-followup`, Scouts schreiben `scout.md`, `loop.md` sichert vor `remove`, F-Einträge; Nach-Review Implementierung ohne Scout; Spec `docs/superpowers/specs/2026-09-28-review-followup-und-plan-anker-design.md`)
```

Zeile 4, Stand `geplant, im Paket mit Punkt 3` →
```markdown
umgesetzt (`scripts/plan-anchors.js` über `plan-tasks.js anchors`, `A=` aus `prepare.js`, ⚠ bei früherem Task, Anker-Suche wörtlich dann letztes Glied)
```

- [ ] **Step 2: Prüfen**

Run: `git diff --stat docs/wishes/all-wishes.md`
Expected: `1 file changed, 2 insertions(+), 2 deletions(-)`

- [ ] **Step 3: Commit** (nach Ja)

```bash
git add docs/wishes/all-wishes.md
git commit -m "docs(wishes): record decisions for review-followup and plan anchors"
```

---

### Task 13: Version 0.16.0

**ACs:** —

**Files:**
- Modify: `plugins/forge/.claude-plugin/plugin.json` · `"version"`

- [ ] **Step 1: Version setzen** — `"version": "0.15.0"` → `"version": "0.16.0"`

- [ ] **Step 2: Gesamtlauf**

Run: `node --test plugins/forge/tests/*.test.js`
Expected: alle grün bis auf die 4 vorher roten Tests

- [ ] **Step 3: Commit** (nach Ja)

```bash
git add plugins/forge/.claude-plugin/plugin.json
git commit -m "chore(forge): bump version to 0.16.0"
```
