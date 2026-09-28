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
