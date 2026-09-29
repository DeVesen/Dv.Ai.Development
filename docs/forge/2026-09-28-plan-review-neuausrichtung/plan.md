# Plan-Review neu ausrichten — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Im Plan-Review blocken nur noch `coverage`, `feasibility`, der Kern von `buildability` und drei Skript-Prüfungen, und die Nacharbeit fragt die Spec nur bei Widerspruch oder Unmöglichem.
**Architektur:** Drei Skript-Prüfungen (Nummerierung, AC-Abdeckung, Anker) in `plugins/forge/scripts/lib/plan-checks.js` laufen über `SCRIPT_CHECKS['plan-review']` in Runde 1 und in der Nachprüfung von `review-flow.js`; ihre Befunde tragen die echte Kategorie und das Kennzeichen `script`, stehen immer als 🔴 und entscheiden ihre Stelle. `architecture` und `risks` deckelt `ADVISORY` auf 🟡; alles Übrige sind Texte der Reviewer-Agents, der Nacharbeit und des Skills.
**Tech-Stack:** Node.js 24 (CommonJS, `node:test`, `node:assert/strict`), Markdown-Agents und -Skills des Plugins `dv-forge`
**Spec:** `docs/forge/2026-09-28-plan-review-neuausrichtung/spec.md`
**Basis:** a46f0a7

## Global Constraints
- Blocken können nur `coverage`, `feasibility`, der Kern von `buildability` und die drei Skript-Prüfungen. Die Skript-Prüfungen übernehmen, was bisher `coverage` und `buildability` von Hand geprüft haben.
- Die Skript-Prüfungen urteilen ohne KI. Gleicher Plan, gleiche Spec und gleicher Code ergeben immer dieselben Befunde.
- W-Einträge in Spec und Plan sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding.
- Nur das Plan-Review ändert sich: `SCRIPT_CHECKS['spec-review']` und `ADVISORY['spec-review']` bleiben `[]`, die Spec-Review-Agents bleiben unberührt.
- Keine neuen Pakete; nur Node-Bordmittel wie im Bestand (`node:fs`, `node:path`, `node:os`, `node:child_process`, `node:test`, `node:assert/strict`).
- Tests laufen aus der Checkout-Wurzel mit `node --test <datei>`; der Gesamtlauf ist `node --test "plugins/forge/tests/*.test.js"` (Node 24 löst das Glob selbst auf). Die Projekt-`CLAUDE.md` schreibt dv-forge-Skripte nur für Angular- und .NET-Tests vor.
- Texte in Agents, Skills und Meldungen sind Deutsch; Bezeichner im Code Englisch wie im Bestand; Commit-Messages Conventional Commits auf Englisch mit Scope `forge`.
- Commits nur mit Pfadangabe (`git commit -m "<message>" -- <dateien>`): Im Repo arbeitet parallel ein anderer Agent, dessen gestagte Dateien nicht mitrutschen dürfen.
- Typografische Anführungszeichen: Bestehende `„…“` in Agent-Texten bleiben erhalten, neue Texte dieses Plans nutzen keine. Normalisiert dein Werkzeug U+201C, stellst du ihn per Node-Skript mit `\u201c` wieder her; der Test auf paarige Zeichen in `plugins/forge/tests/agents.test.js` muss grün bleiben.
- unit-integration-testing: Testnamen nach Convention A `<Einheit>_<Situation>_<Erwartung>`, wie im Bestand der forge-Tests; `describe`/`it` wird nicht eingeführt.
- unit-integration-testing: Jeder Test folgt der Reihenfolge Arrange, Act, Assert; die Kommentare `// Arrange` usw. entfallen wie im Bestand der forge-Tests.
- unit-integration-testing: Tests sind unabhängig; jeder legt seinen eigenen temporären Ordner an, kein geteilter Zustand.
- unit-integration-testing: Getestet wird Verhalten über die öffentliche Oberfläche: exportierte Funktionen, die CLI `review-flow.js`, Agent- und Skill-Texte über ihren Inhalt.
- unit-integration-testing: Ein Test prüft ein Verhalten; mehrere Asserts nur, wenn sie zusammen dieses eine Verhalten belegen.

---

### Task 1: Anker-Markierungen als Daten

**ACs:** AC-03, AC-05

**Dateien:**
- Modify: `plugins/forge/scripts/plan-anchors.js:118-161` · `buildAnchors`
- Test: `plugins/forge/tests/plan-anchors.test.js:1-60` · `anchorsOf`

**Interfaces:**
- Consumes: `checkedPlan(planPath: string): { lines: string[], tasks: Array<{ number: number, start: number, end: number }>, headerEnd: number }` und `PlanError` aus `plugins/forge/scripts/plan-tasks.js` (Bestand)
- Produces: `anchorMarks(planPath: string, repo: string): Array<{ task: number, mark: '✅' | '⚠' | '❌', line: string }>` aus `plugins/forge/scripts/plan-anchors.js`; `line` ist exakt die Zeile, die `anchors.md` für diese Dateizeile enthält. Wirft `PlanError`, wenn die Tasks nicht lückenlos ab 1 nummeriert sind oder das Repo fehlt.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/plan-anchors.test.js` anhängen:

```js
test('anchorMarks_RedWarningAndGreenLines_SameMarksAsAnchorFile', () => {
  const env = fixture({ 'src/a.js': SOURCE }, planWith(
    ['- Modify: `src/a.js` · `methode`', '- Modify: `src/a.js` · `Klasse.fehlt`'],
    ['- Modify: `src/a.js` · `neueFunktion`'],
  ));
  const marks = anchors.anchorMarks(env.plan, env.repo);
  const file = fs.readFileSync(anchors.writeAnchors(env.plan, env.repo, env.out), 'utf8');
  assert.deepEqual(marks.map(({ task, mark }) => `${task}:${mark}`), ['1:✅', '1:❌', '2:⚠']);
  for (const { line } of marks) assert.ok(file.includes(line), line);
});

test('anchorMarks_BrokenNumbering_ThrowsPlanError', () => {
  const env = fixture({}, planWith(['- Create: `src/a.js`']).replace('### Task 1: T1', '### Task 2: T1'));
  assert.throws(() => anchors.anchorMarks(env.plan, env.repo), planTasks.PlanError);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-anchors.test.js` — erwartet: FAIL `anchorMarks_RedWarningAndGreenLines_SameMarksAsAnchorFile`, FAIL `anchorMarks_BrokenNumbering_ThrowsPlanError`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/plan-anchors.js` die Funktion `buildAnchors` vollständig durch diesen Block ersetzen (`writeAnchors` bleibt unverändert):

```js
// Prüft jede Dateizeile jedes Tasks; eine Zeile sieht nur, was frühere Tasks mit derselben Datei tun.
function checkTasks(root, lines, tasks) {
  const fenced = markFences(lines);
  const seen = new Map();
  return tasks.map((task) => {
    const entries = taskEntries(lines, fenced, task);
    const rows = entries.map((entry) => ({ entry, result: checkLine(root, entry, seen.get(entry.path)) }));
    for (const entry of entries) remember(seen, entry, task.number);
    return { task, entries, rows };
  });
}

function buildAnchors(planPath, repo) {
  const root = repoRoot(repo);
  const { lines, tasks } = checkedPlan(planPath);
  const overview = [];
  const checks = [];
  const excerpts = [];
  for (const { task, entries, rows } of checkTasks(root, lines, tasks)) {
    overview.push(`- Task ${task.number}: ${taskTitle(lines, task)} — Zeilen ${task.start + 1}-${task.end}`);
    const formatted = rows.map(({ entry, result }) => formatCheck(entry, result));
    checks.push(`### Task ${task.number}`, ...(formatted.length > 0 ? formatted : ['Keine Dateizeilen.']), '');
    for (const entry of entries.filter((item) => item.range)) {
      const block = excerpt(root, entry, task.number);
      if (block) excerpts.push(block, '');
    }
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

// Markierung je Dateizeile, genau wie sie in anchors.md steht; die Skript-Prüfung des Plan-Reviews wertet sie aus.
function anchorMarks(planPath, repo) {
  const root = repoRoot(repo);
  const { lines, tasks } = checkedPlan(planPath);
  return checkTasks(root, lines, tasks).flatMap(({ task, rows }) =>
    rows.map(({ entry, result }) => ({ task: task.number, mark: result.mark, line: formatCheck(entry, result) })));
}
```

  Die letzte Zeile der Datei wird zu:

```js
module.exports = { buildAnchors, writeAnchors, anchorMarks };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-anchors.test.js` — erwartet: PASS (auch alle bestehenden `anchors_*`-Tests, die `anchors.md` unverändert belegen)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/plan-anchors.js plugins/forge/tests/plan-anchors.test.js` · `git commit -m "feat(forge): expose the marks of the plan anchor check as data" -- plugins/forge/scripts/plan-anchors.js plugins/forge/tests/plan-anchors.test.js`

### Task 2: Kontext der Skript-Prüfungen im Arbeitsbereich

**ACs:** AC-01, AC-03

**Dateien:**
- Modify: `plugins/forge/scripts/workspace.js:32-57` · `removeWorkspace`
- Modify: `plugins/forge/scripts/prepare.js:213-231` · `preparePlanReview`
- Test: `plugins/forge/tests/workspace.test.js:1-20` · `createWorkspace_InRepo_CreatesRoleSlugFolder`
- Test: `plugins/forge/tests/prepare.test.js:258-275` · `planReview_AnchorCheckFails_WarnsWithoutAAndExitsZero`

**Interfaces:**
- Consumes: keine
- Produces: aus `plugins/forge/scripts/workspace.js`: `CONTEXT_FILE = 'kontext.json'`, `writeContext(dir: string, context: { spec: string, repo: string }): string` (Pfad der Datei), `readContext(dir: string): object` (leeres Objekt `{}`, wenn die Datei fehlt oder kein JSON-Objekt enthält). `prepare.js plan-review` schreibt `<W>/kontext.json` mit `{ "spec": "<S>", "repo": "<R>" }`, auch im Folge-Modus, der `preparePlanReview` aufruft.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/workspace.test.js` anhängen:

```js
test('readContext_AfterWriteContext_ReturnsSameValues', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-context-'));
  workspace.writeContext(dir, { spec: 'C:/r/spec.md', repo: 'C:/r' });
  assert.deepEqual(workspace.readContext(dir), { spec: 'C:/r/spec.md', repo: 'C:/r' });
});

test('readContext_MissingOrBrokenFile_ReturnsEmptyContext', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-context-'));
  const missing = workspace.readContext(dir);
  fs.writeFileSync(path.join(dir, workspace.CONTEXT_FILE), '[1, 2');
  assert.deepEqual([missing, workspace.readContext(dir)], [{}, {}]);
});
```

  In `plugins/forge/tests/prepare.test.js` direkt nach dem Test `planReview_AnchorCheckFails_WarnsWithoutAAndExitsZero` einfügen:

```js
test('planReview_Context_NamesSpecAndRepoInWorkspace', () => {
  const repo = planRepo();
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md'));
  const context = JSON.parse(fs.readFileSync(path.join(out.W, 'kontext.json'), 'utf8'));
  assert.ok(samePath(context.spec, out.S));
  assert.ok(samePath(context.repo, out.R));
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/workspace.test.js plugins/forge/tests/prepare.test.js` — erwartet: FAIL `readContext_AfterWriteContext_ReturnsSameValues`, FAIL `readContext_MissingOrBrokenFile_ReturnsEmptyContext`, FAIL `planReview_Context_NamesSpecAndRepoInWorkspace`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/workspace.js` direkt nach der Funktion `removeWorkspace` einfügen:

```js
const CONTEXT_FILE = 'kontext.json';

// Eingaben der Skript-Prüfungen eines Laufs; prepare.js schreibt sie, review-flow.js liest sie.
function writeContext(dir, context) {
  const file = path.join(dir, CONTEXT_FILE);
  fs.writeFileSync(file, `${JSON.stringify(context, null, 2)}\n`);
  return toPosix(file);
}

// Fehlt die Datei oder ist sie kein JSON-Objekt, ist der Kontext leer; die Skript-Prüfungen melden das selbst.
function readContext(dir) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(dir, CONTEXT_FILE), 'utf8'));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}
```

  Die letzte Zeile von `plugins/forge/scripts/workspace.js` wird zu:

```js
module.exports = { WorkspaceError, workspacePath, createWorkspace, removeWorkspace, writeContext, readContext, CONTEXT_FILE };
```

  In `plugins/forge/scripts/prepare.js` die Import-Zeile `const { createWorkspace } = require('./workspace');` ersetzen durch:

```js
const { createWorkspace, writeContext } = require('./workspace');
```

  In `preparePlanReview` direkt nach der Zeile `values.aktiv = aktiv;` einfügen:

```js
  // Spec und Repo für die Skript-Prüfungen von review-flow.js, auch im Folge-Modus.
  writeContext(values.W, { spec: toPosix(values.S), repo: toPosix(root) });
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/workspace.test.js plugins/forge/tests/prepare.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/workspace.js plugins/forge/scripts/prepare.js plugins/forge/tests/workspace.test.js plugins/forge/tests/prepare.test.js` · `git commit -m "feat(forge): record spec and repo of a plan review in its workspace" -- plugins/forge/scripts/workspace.js plugins/forge/scripts/prepare.js plugins/forge/tests/workspace.test.js plugins/forge/tests/prepare.test.js`

### Task 3: Skript-Befunde tragen ihre Kategorie und entscheiden ihre Stelle

**ACs:** AC-05, AC-35

**Dateien:**
- Modify: `plugins/forge/scripts/lib/review-rules.js:18-82` · `rateFinding`
- Modify: `plugins/forge/scripts/lib/review-groups.js:8-47` · `runScriptChecks`
- Modify: `plugins/forge/scripts/review-flow.js:236-325` · `verify`
- Modify: `plugins/forge/scripts/lib/flow-report.js:1-63` · `isScriptOnly`
- Test: `plugins/forge/tests/review-rules.test.js:83-96` · `rateFinding_ScriptCheckAtOpenQuestion_StaysRed`
- Test: `plugins/forge/tests/review-groups.test.js:54-59` · `runScriptChecks_Findings_AreRedScriptItems`
- Test: `plugins/forge/tests/flow-report.test.js:24-40` · `const verification`
- Test: `plugins/forge/tests/review-flow-round2.test.js:195-208` · `planReview_SpecQuestion_NoHaltCheckedOthersQuestionsOpen`

**Interfaces:**
- Consumes: keine
- Produces:
  - `runScriptChecks(text: string, checks: Array<{ name: string, run(text: string, context: object): Array<{ location: string, quote: string, category: string, consequence: string, rationale: string }> }>, context?: object): Array<{ reviewer: string, finding: object, script: true }>` in `plugins/forge/scripts/lib/review-groups.js`; `reviewer` ist `skript:<name>`, die Kategorie liefert die Prüfung selbst.
  - `classify(entries: Array<{ reviewer: string, finding: object, script?: boolean }>, options)`: jedes Item einer Gruppe trägt `script: boolean`; nur der Eintrag setzt es, nie ein Feld im Finding.
  - `rateFinding(finding, reviewer, unit, ctx, script = false)` in `plugins/forge/scripts/lib/review-rules.js`; `SCRIPT_CATEGORY` entfällt.
  - `verify`: Urteil `{ key: string, script: boolean, verdict: 'erledigt' | 'nicht erledigt', rationale: string }`; jeder Punkt, an dem jetzt ein roter Skript-Befund steht, bekommt ein Skript-Urteil.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/review-rules.test.js` den Test `rateFinding_ScriptCheckAtOpenQuestion_StaysRed` vollständig ersetzen durch:

```js
test('rateFinding_ScriptCheckAtOpenQuestion_StaysRed', () => {
  const result = rules.rateFinding(finding({ category: 'umsetzer-steckt-fest' }), 'skript:anker', unit(), ctx({ openKeys: new Set(['ac-7']) }), true);
  assert.equal(result.dropped, undefined);
  assert.equal(result.color, 'red');
});
```

  Im Test `rateFinding_VerificationOutsideChecklist_CappedUnlessContradictionInChange` die letzte `assert`-Zeile (sie enthält `rules.SCRIPT_CATEGORY`) ersetzen durch:

```js
  assert.equal(rules.rateFinding(finding({ category: 'ac-fehlt-im-plan' }), 'skript:ac-abdeckung', unit(), ctx({ verification: { checklist: new Set(), changed: new Set() } }), true).color, 'red');
```

  In `plugins/forge/tests/review-groups.test.js` den Test `runScriptChecks_Findings_AreRedScriptItems` vollständig ersetzen durch:

```js
test('runScriptChecks_Findings_KeepCategoryAndAreRedScriptItems', () => {
  const checks = [{ name: 'anker', run: (text, context) => [{ location: 'AC-01', quote: 'Gegeben A', category: 'umsetzer-steckt-fest', consequence: context.hint, rationale: 'b' }] }];
  const result = classify(groups.runScriptChecks(SPEC, checks, { hint: 'k' }), { openKeys: new Set(['ac-1']) });
  const item = result.groups[0].items[0];
  assert.deepEqual([result.groups[0].color, item.reviewer, item.category, item.script, item.consequence], ['red', 'skript:anker', 'umsetzer-steckt-fest', true, 'k']);
});

test('classify_ReviewerFindingWithScriptField_StaysReviewerFinding', () => {
  const result = classify([entry('clarity', { script: true })]);
  assert.deepEqual([result.groups[0].color, result.groups[0].items[0].script], ['yellow', false]);
});
```

  In `plugins/forge/tests/flow-report.test.js` in `const verification` die Zeile der Gruppe `AC-11` ersetzen durch:

```js
    group('AC-11', 'red', [item({ reviewer: 'skript:anker', category: 'umsetzer-steckt-fest', script: true })]),
```

  und am Ende der Datei anhängen:

```js
test('report_RedStelleWithReviewerAndScriptItems_ListedAsScriptFinding', () => {
  const both = group('Task 2', 'red', [
    item({ reviewer: 'feasibility', category: 'umsetzer-steckt-fest', consequence: 'Vorleistung fehlt' }),
    item({ reviewer: 'skript:anker', category: 'umsetzer-steckt-fest', script: true, consequence: 'Anker fehlt' }),
  ]);
  const text = flowReport.report({
    title: 'Plan-Review', artifact: 'p.md', status: 'nicht bereit, 1 × 🔴 offen', roundOne: { groups: [] },
    verification: { offen: 1, verdicts: [], groups: [both] }, reworked: true, open: [], asked: [],
  });
  assert.ok(text.includes('### Skript-Befunde\n- 🔴 Task 2 — 🔴 Vorleistung fehlt<br>🔴 Anker fehlt'));
  assert.ok(!text.includes('### Widersprüche'));
});
```

  Am Ende von `plugins/forge/tests/review-flow-round2.test.js` anhängen:

```js
const TWO_TASKS = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
const anchorAt = (location) => [{ name: 'anker', run: () => [{ location, quote: 'B.', category: 'umsetzer-steckt-fest', consequence: 'Anker fehlt', rationale: 'Skript' }] }];

test('checklist_ReviewerAndScriptAtSameTask_OneRedStelleJudgedByScript', () => {
  const ws = flowWorkspace(TWO_TASKS, 'plan.md');
  ws.review('feasibility', [finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  const round = flow.roundOne('plan-review', ws.doc, ws.workspace, ['feasibility'], anchorAt('Task 2'));
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'changed' }], questions: [] });
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.match(round, /^RUNDE1 rot=1 gelb=0 /);
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
});

test('verify_ScriptNowReportsAiPoint_ScriptDecidesAndStelleCountsOnce', () => {
  const ws = flowWorkspace(TWO_TASKS, 'plan.md');
  ws.review('feasibility', [finding('Task 2', 'umsetzer-steckt-fest', { quote: 'B.' })]);
  flow.roundOne('plan-review', ws.doc, ws.workspace, ['feasibility'], []);
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 2', status: 'changed' }], questions: [] });
  ws.run('checklist', 'plan-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('Task 2', 'nicht erledigt')], findings: [] });
  const out = flow.verify('plan-review', ws.doc, ws.workspace, anchorAt('Task 2'));
  assert.match(out, /^NACHPRUEFUNG ok offen=1 /);
  assert.deepEqual(ws.readJson('runde-2/nachpruefung.json').verdicts, [{ key: 'Task 2', script: true, verdict: 'nicht erledigt', rationale: 'Skript-Prüfung meldet die Stelle' }]);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-rules.test.js plugins/forge/tests/review-groups.test.js plugins/forge/tests/flow-report.test.js plugins/forge/tests/review-flow-round2.test.js` — erwartet: FAIL `rateFinding_ScriptCheckAtOpenQuestion_StaysRed`, FAIL `rateFinding_VerificationOutsideChecklist_CappedUnlessContradictionInChange`, FAIL `runScriptChecks_Findings_KeepCategoryAndAreRedScriptItems`, FAIL `classify_ReviewerFindingWithScriptField_StaysReviewerFinding`, FAIL `report_Verification_ShowsVerdictPerPointContradictionsScriptAndGreen`, FAIL `report_RedStelleWithReviewerAndScriptItems_ListedAsScriptFinding`, FAIL `checklist_ReviewerAndScriptAtSameTask_OneRedStelleJudgedByScript`, FAIL `verify_ScriptNowReportsAiPoint_ScriptDecidesAndStelleCountsOnce`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/review-rules.js` die Zeile `const SCRIPT_CATEGORY = 'skript-pruefung';` löschen, die Funktion `rateFinding` samt ihrem Kommentar darüber und `module.exports` ersetzen durch:

```js
// ctx: { advisory, openKeys, quoteFromW(quote), verification: { checklist, changed } | null }; Mengen mit kanonischen Stellen.
// script: Befund einer Skript-Prüfung; er steht immer als 🔴 und wird weder verworfen noch herabgestuft.
function rateFinding(finding, reviewer, unit, ctx, script = false) {
  if (script) return { color: 'red', capped: [] };
  if (unit.kind === 'header') return { dropped: 'Kopfzeile' };
  if (ctx.openKeys.has(unit.canon)) return { dropped: 'offene Frage' };
  const capped = [];
  if (ctx.advisory.includes(reviewer)) capped.push('beratend');
  if (ctx.quoteFromW(finding.quote)) capped.push('Zitat aus W-Eintrag');
  if (mentionsSpelling(finding)) capped.push('Schreibweise');
  const verification = ctx.verification;
  const contradictionInChange = finding.category === 'widerspruch' && verification?.changed.has(unit.canon);
  if (verification && !verification.checklist.has(unit.canon) && !contradictionInChange) capped.push('außerhalb der Prüfliste');
  const color = CATEGORY_COLOR[finding.category];
  return { color: color === 'red' && capped.length > 0 ? 'yellow' : color, capped };
}

module.exports = {
  CATEGORY_COLOR, CATEGORIES, ADVISORY, COLOR_RANK, COLOR_ICON, reviewProblem, findingProblem, mentionsSpelling, rateFinding,
};
```

  In `plugins/forge/scripts/lib/review-groups.js` den Kommentar über `SCRIPT_CHECKS`, die Funktion `runScriptChecks` und die Funktion `classify` samt Kommentar ersetzen durch (`SCRIPT_CHECKS` selbst bleibt in dieser Task unverändert):

```js
// Skript-Prüfungen je Review: { name, run(text, context) → [{ location, quote, category, consequence, rationale }] }.
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': [] };

function runScriptChecks(text, checks, context = {}) {
  return checks.flatMap((check) => check.run(text, context).map((finding) => ({ reviewer: `skript:${check.name}`, finding, script: true })));
}
```

```js
// entries: [{ reviewer, finding, script? }]; script setzt nur runScriptChecks. Ergebnis: Gruppen je Stelle mit der höchsten Farbe ihrer Findings.
function classify(entries, { kind, text, openKeys = new Set(), verification = null, advisory = rules.ADVISORY[kind] }) {
  const model = parseUnits(text);
  const ctx = { advisory, openKeys, quoteFromW: (quote) => quoteFromW(quote, text), verification };
  const groups = new Map();
  const dropped = [];
  for (const { reviewer, finding, script = false } of entries) {
    const unit = resolveUnit(finding, model);
    const rating = rules.rateFinding(finding, reviewer, unit, ctx, script);
    if (rating.dropped) {
      dropped.push({ reviewer, key: unit.key, reason: rating.dropped });
      continue;
    }
    if (!groups.has(unit.canon)) groups.set(unit.canon, { key: unit.key, canon: unit.canon, color: 'green', items: [] });
    const group = groups.get(unit.canon);
    group.items.push({ reviewer, ...finding, script, color: rating.color, capped: rating.capped });
    if (rules.COLOR_RANK[rating.color] > rules.COLOR_RANK[group.color]) group.color = rating.color;
  }
  return { groups: [...groups.values()].sort(byColorThenPlace(model)), dropped };
}
```

  In `plugins/forge/scripts/review-flow.js` in `checklist` die Zeile `script: group.items.filter((item) => item.color === 'red').every((item) => item.category === rules.SCRIPT_CATEGORY),` ersetzen durch:

```js
    script: group.items.some((item) => item.script),
```

  Direkt vor `function verify(` einfügen:

```js
// Skript-Punkte und jede Stelle, an der jetzt ein roter Skript-Befund steht, entscheidet das Skript, nicht der Nachprüfer.
function scriptVerdict(item, redScript) {
  const reported = redScript.has(item.canon);
  const rationale = reported ? `Skript-Prüfung meldet die Stelle${item.script ? ' erneut' : ''}` : 'Skript-Prüfung meldet die Stelle nicht mehr';
  return { key: item.key, script: true, verdict: reported ? 'nicht erledigt' : 'erledigt', rationale };
}
```

  In `verify` diesen Block

```js
  const redScript = new Set(groups.filter((group) => group.color === 'red' && group.items.some((item) => item.category === rules.SCRIPT_CATEGORY)).map((group) => group.canon));
  const verdicts = list.items.map((item) => {
    if (item.script) {
      const again = redScript.has(item.canon);
      return { key: item.key, script: true, verdict: again ? 'nicht erledigt' : 'erledigt', rationale: again ? 'Skript-Prüfung meldet die Stelle erneut' : 'Skript-Prüfung meldet die Stelle nicht mehr' };
    }
    const verdict = result.verdicts.find((candidate) => normalizeLocation(candidate.location) === item.canon);
    return { key: item.key, script: false, verdict: verdict.verdict, rationale: verdict.rationale };
  });
```

  ersetzen durch:

```js
  const redScript = new Set(groups.filter((group) => group.color === 'red' && group.items.some((item) => item.script)).map((group) => group.canon));
  const verdicts = list.items.map((item) => {
    if (item.script || redScript.has(item.canon)) return scriptVerdict(item, redScript);
    const verdict = result.verdicts.find((candidate) => normalizeLocation(candidate.location) === item.canon);
    return { key: item.key, script: false, verdict: verdict.verdict, rationale: verdict.rationale };
  });
```

  Die Zeile `const offen = verdicts.filter((verdict) => !verdict.script && verdict.verdict === 'nicht erledigt').length + counts.red;` bleibt; ein vom Skript entschiedener Punkt zählt so nur über seine rote Gruppe.

  In `plugins/forge/scripts/lib/flow-report.js` die Zeile `const { SCRIPT_CATEGORY } = require('./review-rules');` löschen, die Funktion `isScriptOnly` ersetzen durch:

```js
// Eine rote Stelle mit Skript-Befund zählt als Skript-Befund, auch wenn ein Reviewer sie ebenfalls meldet.
function hasScript(group) {
  return group.items.some((item) => item.script);
}
```

  und in `report` die beiden `listSection`-Zeilen der Nachprüfung ersetzen durch:

```js
    parts.push(...listSection('Widersprüche', red.filter((group) => !hasScript(group))));
    parts.push(...listSection('Skript-Befunde', red.filter(hasScript)));
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-rules.test.js plugins/forge/tests/review-groups.test.js plugins/forge/tests/flow-report.test.js plugins/forge/tests/review-flow-round2.test.js` — erwartet: PASS
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/review-rules.js plugins/forge/scripts/lib/review-groups.js plugins/forge/scripts/review-flow.js plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/review-rules.test.js plugins/forge/tests/review-groups.test.js plugins/forge/tests/flow-report.test.js plugins/forge/tests/review-flow-round2.test.js` · `git commit -m "feat(forge): script findings keep their category and decide their location" -- plugins/forge/scripts/lib/review-rules.js plugins/forge/scripts/lib/review-groups.js plugins/forge/scripts/review-flow.js plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/review-rules.test.js plugins/forge/tests/review-groups.test.js plugins/forge/tests/flow-report.test.js plugins/forge/tests/review-flow-round2.test.js`

### Task 4: Skript-Prüfungen des Plans

**ACs:** AC-01, AC-02, AC-03, AC-30, AC-33, AC-36, AC-37

**Dateien:**
- Create: `plugins/forge/scripts/lib/plan-checks.js`
- Test: `plugins/forge/tests/plan-checks.test.js`

**Interfaces:**
- Consumes: `anchorMarks(planPath: string, repo: string): Array<{ task: number, mark: '✅' | '⚠' | '❌', line: string }>` (Task 1); aus `plugins/forge/scripts/plan-tasks.js` (Bestand) `markFences(lines: string[]): boolean[]`, `scanPlan(lines: string[]): { tasks: Array<{ number: number, start: number, end: number }>, headerEnd: number }`, `numberingError(tasks): string | null`; aus `plugins/forge/scripts/lib/document-units.js` (Bestand) `parseUnits(text: string): { units: Array<{ key, canon, section, kind, lines }> }`, `collapse(text: string): string`; `normalizeLocation(location: string): string` aus `plugins/forge/scripts/aggregate-findings.js` (Bestand)
- Produces: `PLAN_CHECKS` aus `plugins/forge/scripts/lib/plan-checks.js`, in dieser Reihenfolge: `[{ name: 'nummerierung', run }, { name: 'ac-abdeckung', run }, { name: 'anker', run }]` mit `run(text: string, context: { doc?: string, spec?: string | null, repo?: string | null }): Array<{ location: string, quote: string, category: 'ac-fehlt-im-plan' | 'umsetzer-steckt-fest', consequence: string, rationale: string }>`. Stellen: `AC-<n>` wie in der Spec, `Task <x>` wie in der Überschrift, `Plan` für einen Plan ohne Tasks und für jede Prüfung, die nicht laufen kann.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/forge/tests/plan-checks.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PLAN_CHECKS } = require('../scripts/lib/plan-checks.js');

const SPEC = [
  '# Demo', '', 'Status: bestätigt am 2026-09-29', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-03** Gegeben C, dann D.',
  '- **AC-05** Gegeben E, dann F.',
  '', '## Entscheidungen', '- **W · Deckel** · Aussage — Zwei Runden.', '',
].join('\n');
const SOURCE = 'class Klasse {\n  methode() {\n    return 1;\n  }\n}\n';
const ALL_ACS = 'AC-01, AC-03, AC-05';

function task(heading, acs, extra = []) {
  return [`### Task ${heading}: T`, '', `**ACs:** ${acs}`, '', ...extra, ''];
}

function plan(...tasks) {
  return ['# Demo — Umsetzungsplan', '', '**Basis:** abc', '', '## Global Constraints', '- Nur Node.js.', '', '---', '',
    ...tasks.flat(), '## Entscheidungen', '- Keine Fragen an den Menschen.', ''].join('\n');
}

// Eigenes Repo je Test mit Plan, Spec und Quelldateien; liefert Plan-Text und Kontext wie review-flow.js.
function setup(planText, files = {}, spec = SPEC) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-plan-checks-'));
  for (const [name, content] of Object.entries({ 'docs/plan.md': planText, 'docs/spec.md': spec, ...files })) {
    fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
    fs.writeFileSync(path.join(repo, name), content);
  }
  return { text: planText, context: { doc: path.join(repo, 'docs', 'plan.md'), spec: path.join(repo, 'docs', 'spec.md'), repo } };
}

function check(name, { text, context }) {
  return PLAN_CHECKS.find((candidate) => candidate.name === name).run(text, context);
}

const places = (findings) => findings.map((finding) => `${finding.location}: ${finding.category}`);

test('acCoverage_AcNamedOnlyInTaskText_AcFehltImPlanAtThatAc', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03', ['Setzt auch AC-05 um.'])));
  const findings = check('ac-abdeckung', env);
  assert.deepEqual(places(findings), ['AC-05: ac-fehlt-im-plan']);
});

test('acCoverage_AcIdOnlyInPlan_NoFinding', () => {
  const env = setup(plan(task(1, `${ALL_ACS}, AC-99`)));
  assert.deepEqual(check('ac-abdeckung', env), []);
});

test('acCoverage_SpecWithoutAcs_NoFinding', () => {
  const env = setup(plan(task(1, 'AC-01')), {}, '# Spec\n\n## Soll-Vorgaben\n- Nur Node.js.\n');
  assert.deepEqual(check('ac-abdeckung', env), []);
});

test('numbering_TasksOneTwoFour_UmsetzerStecktFestAtTaskFour', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(4, 'AC-05')));
  assert.deepEqual(places(check('nummerierung', env)), ['Task 4: umsetzer-steckt-fest']);
});

test('numbering_DuplicateNumber_FindingAtPositionThree', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(2, 'AC-05'), task(3, '')));
  const [finding] = check('nummerierung', env);
  assert.deepEqual([finding.location, finding.consequence], ['Task 2', 'An Position 3 steht Task 2; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.']);
});

test('numbering_WrongOrder_FindingAtPositionTwo', () => {
  const env = setup(plan(task(1, 'AC-01'), task(3, 'AC-03'), task(2, 'AC-05')));
  const [finding] = check('nummerierung', env);
  assert.deepEqual([finding.location, finding.consequence], ['Task 3', 'An Position 2 steht Task 3; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.']);
});

test('numbering_SuffixedTaskNumber_FindingAtThatTask', () => {
  const env = setup(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(3, 'AC-05'), task('3a', '')));
  assert.deepEqual(places(check('nummerierung', env)), ['Task 3a: umsetzer-steckt-fest']);
});

test('numbering_PlanWithoutTasks_FindingAtPlanAndEveryAcMissing', () => {
  const env = setup(plan());
  const result = PLAN_CHECKS.map((candidate) => places(candidate.run(env.text, env.context)));
  assert.deepEqual(result, [['Plan: umsetzer-steckt-fest'], ['AC-01: ac-fehlt-im-plan', 'AC-03: ac-fehlt-im-plan', 'AC-05: ac-fehlt-im-plan'], []]);
});

test('anchors_RedLine_UmsetzerStecktFestAtItsTask', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  const findings = check('anker', env);
  assert.deepEqual(places(findings), ['Task 1: umsetzer-steckt-fest']);
  assert.ok(findings[0].quote.includes('❌ Modify `src/a.js` · `Klasse.fehlt` — Anker nicht gefunden'));
});

test('anchors_TwoRedLinesInOneTask_OneFindingEach', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`', '- Modify: `src/weg.js` · `x`'])), { 'src/a.js': SOURCE });
  assert.deepEqual(places(check('anker', env)), ['Task 1: umsetzer-steckt-fest', 'Task 1: umsetzer-steckt-fest']);
});

test('anchors_WarningLineFromEarlierTask_NoScriptFinding', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `methode`']), task(2, '', ['- Modify: `src/a.js` · `neueFunktion`'])), { 'src/a.js': SOURCE });
  assert.deepEqual(check('anker', env), []);
});

test('anchors_BrokenNumbering_LeftToNumberingFinding', () => {
  const env = setup(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`']), task(3, '')), { 'src/a.js': SOURCE });
  assert.deepEqual([places(check('nummerierung', env)), check('anker', env)], [['Task 3: umsetzer-steckt-fest'], []]);
});

test('checks_NoSpecOrRepoInContext_FailureAtPlan', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const bare = { text: env.text, context: { doc: env.context.doc } };
  assert.deepEqual([places(check('ac-abdeckung', bare)), places(check('anker', bare))], [['Plan: umsetzer-steckt-fest'], ['Plan: umsetzer-steckt-fest']]);
});

test('checks_SpecNotReadable_FailureAtPlanNamingTheSpec', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const missing = { text: env.text, context: { ...env.context, spec: path.join(env.context.repo, 'docs', 'fehlt.md') } };
  const [finding] = check('ac-abdeckung', missing);
  assert.deepEqual([finding.location, finding.category], ['Plan', 'umsetzer-steckt-fest']);
  assert.match(finding.rationale, /^Spec nicht lesbar: .*fehlt\.md \(ENOENT\)$/);
});

test('checks_AnchorCheckAborts_FailureAtPlanWithMessage', () => {
  const env = setup(plan(task(1, ALL_ACS)));
  const noRepo = { text: env.text, context: { ...env.context, repo: path.join(env.context.repo, 'gibt-es-nicht') } };
  const [finding] = check('anker', noRepo);
  assert.equal(finding.location, 'Plan');
  assert.match(finding.rationale, /^Anker-Prüfung abgebrochen: Repo nicht gefunden: /);
});

test('planChecks_SamePlanSpecAndCodeTwice_SameFindings', () => {
  const env = setup(plan(task(1, 'AC-01', ['- Modify: `src/a.js` · `fehlt`']), task(2, 'AC-03'), task('2a', '')), { 'src/a.js': SOURCE });
  const runAll = () => PLAN_CHECKS.map((candidate) => candidate.run(env.text, env.context));
  const first = runAll();
  assert.deepEqual(runAll(), first);
  assert.deepEqual(first.map((findings) => findings.length), [1, 1, 1]);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-checks.test.js` — erwartet: FAIL, die Datei bricht beim Laden mit `Cannot find module '../scripts/lib/plan-checks.js'` ab
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/forge/scripts/lib/plan-checks.js`:

```js
'use strict';

const fs = require('node:fs');
const { normalizeLocation } = require('../aggregate-findings');
const { markFences, numberingError, scanPlan } = require('../plan-tasks');
const { anchorMarks } = require('../plan-anchors');
const { parseUnits, collapse } = require('./document-units');

// Skript-Prüfungen des Plan-Reviews. Sie urteilen ohne KI über den Plan-Text und über Spec und Repo aus { doc, spec, repo }.
const TASK_HEADING = /^###\s+Task\s+([^\s:]+)\s*:/;
const SECTION_HEADING = /^##\s/;
const AC_LINE = /^\s*\*\*ACs:\*\*(.*)$/;
const AC_ID = /AC-\d+/gi;
const AC_KEY = /^AC-\d+$/i;
const PLAN_KEY = 'Plan';

function finding(location, quote, category, consequence, rationale) {
  return { location, quote, category, consequence, rationale };
}

// Eine Skript-Prüfung, die nicht laufen kann, ist selbst ein Befund am Plan.
function failure(check, message) {
  return finding(PLAN_KEY, `Quelle: Skript-Prüfung ${check}`, 'umsetzer-steckt-fest',
    `Die Skript-Prüfung ${check} konnte nicht laufen; ihr Ergebnis fehlt.`, message);
}

function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

// Jede Überschrift ### Task <x>: zählt, auch mit einer Nummer wie 3a; ein Task endet an der nächsten Task- oder ##-Überschrift.
function taskBlocks(lines, fenced) {
  const tasks = [];
  let open = null;
  lines.forEach((line, index) => {
    if (fenced[index]) return;
    const heading = TASK_HEADING.exec(line);
    if (!heading && !(open && SECTION_HEADING.test(line))) return;
    if (open) open.end = index;
    open = heading ? { token: heading[1], heading: line, start: index, end: lines.length } : null;
    if (open) tasks.push(open);
  });
  return tasks;
}

function readPlan(text) {
  const lines = splitLines(text);
  const fenced = markFences(lines);
  return { lines, fenced, tasks: taskBlocks(lines, fenced) };
}

function numberingFindings(text) {
  const { tasks } = readPlan(text);
  if (tasks.length === 0) {
    return [finding(PLAN_KEY, 'Quelle: Plan ohne Task-Überschrift', 'umsetzer-steckt-fest',
      'Der Plan hat keinen Task; der Umsetzer hat nichts umzusetzen.', 'Skript-Prüfung Nummerierung: kein Task gefunden')];
  }
  const wrong = tasks.findIndex((task, index) => !/^\d+$/.test(task.token) || Number(task.token) !== index + 1);
  if (wrong === -1) return [];
  const task = tasks[wrong];
  return [finding(`Task ${task.token}`, task.heading, 'umsetzer-steckt-fest',
    `An Position ${wrong + 1} steht Task ${task.token}; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.`, 'Skript-Prüfung Nummerierung')];
}

// Nur die Zeile **ACs:** eines Tasks zählt, nicht eine Nennung im übrigen Text.
function plannedAcs(text) {
  const { lines, fenced, tasks } = readPlan(text);
  const planned = new Set();
  for (const task of tasks) {
    for (let index = task.start; index < task.end; index += 1) {
      const match = fenced[index] ? null : AC_LINE.exec(lines[index]);
      for (const id of match ? match[1].match(AC_ID) ?? [] : []) planned.add(normalizeLocation(id));
    }
  }
  return planned;
}

function specAcs(specText) {
  const acs = new Map();
  for (const unit of parseUnits(specText).units) {
    if (unit.kind === 'item' && AC_KEY.test(unit.key) && !acs.has(unit.canon)) acs.set(unit.canon, unit);
  }
  return [...acs.values()];
}

function readSpec(context) {
  if (!context?.spec) return { error: 'Der Arbeitsbereich nennt keine Spec (kontext.json fehlt oder ist unvollständig).' };
  try {
    return { text: fs.readFileSync(context.spec, 'utf8').replace(/\r\n/g, '\n') };
  } catch (error) {
    return { error: `Spec nicht lesbar: ${context.spec} (${error.code ?? error.message})` };
  }
}

// Richtung Spec nach Plan: Eine AC-ID im Plan ohne Gegenstück in der Spec ist kein Befund.
function coverageFindings(text, context) {
  const spec = readSpec(context);
  if (spec.error) return [failure('AC-Abdeckung', spec.error)];
  const planned = plannedAcs(text);
  return specAcs(spec.text).filter((unit) => !planned.has(unit.canon)).map((unit) => finding(unit.key,
    `Quelle: Spec · ${collapse(unit.lines[0])}`, 'ac-fehlt-im-plan',
    `${unit.key} steht in keinem Task unter **ACs:**; kein Task setzt es um.`, 'Skript-Prüfung AC-Abdeckung'));
}

// Jede ❌-Zeile der bestehenden Anker-Prüfung ist ein Befund an ihrem Task; ⚠-Zeilen prüft feasibility.
function anchorFindings(text, context) {
  if (numberingError(scanPlan(splitLines(text)).tasks)) return [];
  if (!context?.repo) return [failure('Anker', 'Der Arbeitsbereich nennt kein Repo (kontext.json fehlt oder ist unvollständig).')];
  let marks;
  try {
    marks = anchorMarks(context.doc, context.repo);
  } catch (error) {
    return [failure('Anker', `Anker-Prüfung abgebrochen: ${error.message}`)];
  }
  return marks.filter((mark) => mark.mark === '❌').map((mark) => finding(`Task ${mark.task}`, `Quelle: Anker-Prüfung · ${mark.line}`,
    'umsetzer-steckt-fest', 'Die Anker-Prüfung markiert diese Dateizeile mit ❌; der Umsetzer findet Datei oder Anker nicht.', 'Skript-Prüfung Anker'));
}

const PLAN_CHECKS = [
  { name: 'nummerierung', run: (text) => numberingFindings(text) },
  { name: 'ac-abdeckung', run: coverageFindings },
  { name: 'anker', run: anchorFindings },
];

module.exports = { PLAN_CHECKS };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-checks.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/plan-checks.js plugins/forge/tests/plan-checks.test.js` · `git commit -m "feat(forge): add plan script checks for numbering, AC coverage and anchors" -- plugins/forge/scripts/lib/plan-checks.js plugins/forge/tests/plan-checks.test.js`

### Task 5: Skript-Prüfungen im Plan-Review verdrahten

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-33, AC-35, AC-36, AC-37

**Dateien:**
- Modify: `plugins/forge/scripts/lib/review-groups.js:1-16` · `SCRIPT_CHECKS`
- Modify: `plugins/forge/scripts/review-flow.js:101-121` · `roundOne`
- Test: `plugins/forge/tests/review-flow-plan-checks.test.js`
- Test: `plugins/forge/tests/lib/flow-workspace.js:37-63` · `flowWorkspace`
- Test: `plugins/forge/tests/review-flow-round1.test.js:116-123` · `reworkCheck_PlanSpecQuestion_NoHalt`
- Test: `plugins/forge/tests/review-flow-round2.test.js:195-208` · `planReview_SpecQuestion_NoHaltCheckedOthersQuestionsOpen`

**Interfaces:**
- Consumes: `PLAN_CHECKS` (Task 4); `runScriptChecks(text, checks, context)` (Task 3); `readContext(dir: string): object` und `writeContext(dir: string, context: { spec: string, repo: string }): string` aus `plugins/forge/scripts/workspace.js` (Task 2)
- Produces: `SCRIPT_CHECKS['plan-review'] === PLAN_CHECKS`; `review-flow.js round1` und `verify` rufen die Prüfungen mit `{ doc, spec, repo }` auf. Test-Helfer `flowWorkspace(text, name)` liefert zusätzlich `root: string`, `repoFile(relative: string, value: string): void` und `context(specText: string): void` (schreibt die Spec nach `<root>/kontext-spec.md` und `<W>/kontext.json` mit `repo = root`).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/lib/flow-workspace.js` nach der Zeile `const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'review-flow.js');` einfügen:

```js
const { writeContext } = require('../../scripts/workspace');
```

  und die Funktion `flowWorkspace` vollständig ersetzen durch:

```js
function flowWorkspace(text = SPEC, name = 'spec.md') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-flow-'));
  const doc = path.join(root, name);
  const workspace = path.join(root, '.forge', 'ws');
  fs.writeFileSync(doc, text);
  fs.mkdirSync(path.join(workspace, 'runde-1'), { recursive: true });
  const file = (relative) => path.join(workspace, relative);
  return {
    root,
    doc,
    workspace,
    file,
    review: (reviewer, findings) => fs.writeFileSync(file(`runde-1/${reviewer}.json`), JSON.stringify({ reviewer, summary: 's', findings })),
    json: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), JSON.stringify(value));
    },
    text: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), value);
    },
    read: (relative) => fs.readFileSync(file(relative), 'utf8'),
    readJson: (relative) => JSON.parse(fs.readFileSync(file(relative), 'utf8')),
    edit: (change) => fs.writeFileSync(doc, change(fs.readFileSync(doc, 'utf8'))),
    run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }),
    repoFile: (relative, value) => {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value);
    },
    // Kontext wie von prepare.js: eine Spec neben dem Dokument, Repo ist der Test-Ordner.
    context: (specText) => {
      const spec = path.join(root, 'kontext-spec.md');
      fs.writeFileSync(spec, specText);
      writeContext(workspace, { spec, repo: root });
    },
  };
}
```

  In `plugins/forge/tests/review-flow-round1.test.js` im Test `reworkCheck_PlanSpecQuestion_NoHalt` und in `plugins/forge/tests/review-flow-round2.test.js` im Test `planReview_SpecQuestion_NoHaltCheckedOthersQuestionsOpen` jeweils direkt nach der Zeile `const ws = flowWorkspace(plan, 'plan.md');` einfügen:

```js
  ws.context('# Spec\n');
```

  Neue Datei `plugins/forge/tests/review-flow-plan-checks.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { finding, flowWorkspace } = require('./lib/flow-workspace');

const SPEC = [
  '# Demo', '', 'Status: bestätigt am 2026-09-29', 'Art: verankert', 'Basis: 3ce509e', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-03** Gegeben C, dann D.',
  '- **AC-05** Gegeben E, dann F.',
  '', '## Entscheidungen', '- **W · Deckel** · Aussage — Zwei Runden.', '',
].join('\n');
const SOURCE = 'class Klasse {\n  methode() {\n    return 1;\n  }\n}\n';
const ALL_ACS = 'AC-01, AC-03, AC-05';
const RULE = 'die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.';

function task(heading, acs, extra = []) {
  return [`### Task ${heading}: T`, '', `**ACs:** ${acs}`, '', ...extra, 'Text.', ''];
}

function plan(...tasks) {
  return ['# Demo — Umsetzungsplan', '', '**Basis:** abc', '', '## Global Constraints', '- Nur Node.js.', '', '---', '',
    ...tasks.flat(), '## Entscheidungen', '- Keine Fragen an den Menschen.', ''].join('\n');
}

function planWorkspace(text, files = {}) {
  const ws = flowWorkspace(text, 'plan.md');
  ws.context(SPEC);
  for (const [name, content] of Object.entries(files)) ws.repoFile(name, content);
  return ws;
}

// Runde 1 mit coverage (ohne Findings, falls nicht anders gegeben) und den übrigen Reviews.
function roundOne(ws, reviews = {}) {
  const all = { coverage: [], ...reviews };
  for (const [reviewer, findings] of Object.entries(all)) ws.review(reviewer, findings);
  return ws.run('round1', 'plan-review', ws.doc, ws.workspace, Object.keys(all).join(',')).stdout;
}

const red = (state) => state.groups.filter((group) => group.color === 'red')
  .map((group) => `${group.key}: ${group.items.map((item) => `${item.reviewer}/${item.category}`).join(' + ')}`);
const scriptConsequences = (ws) => ws.readJson('runde-1/runde.json').groups
  .flatMap((group) => group.items.filter((item) => item.script).map((item) => `${group.key}: ${item.consequence}`));

test('round1_AcInNoTask_ScriptRedAtThatAc', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03', ['Setzt auch AC-05 um.'])));
  const out = roundOne(ws);
  assert.equal(out, 'RUNDE1 rot=1 gelb=0 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=ja\n');
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['AC-05: skript:ac-abdeckung/ac-fehlt-im-plan']);
});

test('round1_TasksOneTwoFour_ScriptRedAtTaskFour', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(4, 'AC-05')));
  roundOne(ws);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['Task 4: skript:nummerierung/umsetzer-steckt-fest']);
});

test('round1_AnchorNotInFileAndNoEarlierTask_ScriptRedAtThatTask', () => {
  const ws = planWorkspace(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  roundOne(ws);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['Task 1: skript:anker/umsetzer-steckt-fest']);
});

test('round1_DuplicateNumber_ScriptRedAtFirstTaskOffItsPosition', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(2, 'AC-03'), task(2, 'AC-05'), task(3, '')));
  roundOne(ws);
  assert.deepEqual(scriptConsequences(ws), [`Task 2: An Position 3 steht Task 2; ${RULE}`]);
});

test('round1_WrongOrder_ScriptRedAtFirstTaskOffItsPosition', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01'), task(3, 'AC-03'), task(2, 'AC-05')));
  roundOne(ws);
  assert.deepEqual(scriptConsequences(ws), [`Task 3: An Position 2 steht Task 3; ${RULE}`]);
});

test('round1_PlanWithoutTasks_PlanRedAndEveryAcRed', () => {
  const ws = planWorkspace(plan());
  const out = roundOne(ws);
  assert.match(out, /^RUNDE1 rot=4 /);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), [
    'AC-01: skript:ac-abdeckung/ac-fehlt-im-plan', 'AC-03: skript:ac-abdeckung/ac-fehlt-im-plan', 'AC-05: skript:ac-abdeckung/ac-fehlt-im-plan',
    'Plan: skript:nummerierung/umsetzer-steckt-fest',
  ]);
});

test('round1_SamePlanSpecAndCodeTwice_SameFindings', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01', ['- Modify: `src/a.js` · `fehlt`']), task(2, 'AC-03'), task('2a', '')), { 'src/a.js': SOURCE });
  const first = [roundOne(ws), ws.read('runde-1/runde.json')];
  const second = [roundOne(ws), ws.read('runde-1/runde.json')];
  assert.deepEqual(second, first);
  assert.match(first[0], /^RUNDE1 rot=3 /);
});

test('round1_ReviewerAndScriptAtSameAc_StelleCountsOnceScriptDecides', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01, AC-03')));
  const out = roundOne(ws, { coverage: [finding('AC-05', 'ac-fehlt-im-plan', { quote: 'Text.' })] });
  ws.json('runde-1/rework.json', { results: [{ location: 'AC-05', status: 'changed' }], questions: [] });
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.match(out, /^RUNDE1 rot=1 /);
  assert.deepEqual(red(ws.readJson('runde-1/runde.json')), ['AC-05: coverage/ac-fehlt-im-plan + skript:ac-abdeckung/ac-fehlt-im-plan']);
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=0 nachpruefer=nein\n');
});

test('verify_ReworkRemovesOnlyMentionOfAc_ScriptRedAtAcOutsideChecklist', () => {
  const ws = planWorkspace(plan(task(1, 'AC-01, AC-03'), task(2, 'AC-05')));
  roundOne(ws, { feasibility: [finding('Task 1', 'umsetzer-steckt-fest', { quote: 'Text.' })] });
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }], questions: [] });
  ws.edit((text) => text.replace('**ACs:** AC-05', '**ACs:** -'));
  ws.run('checklist', 'plan-review', ws.doc, ws.workspace);
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [{ location: 'Task 1', verdict: 'erledigt', rationale: 'passt' }], findings: [] });
  const out = ws.run('verify', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.equal(out, 'NACHPRUEFUNG ok offen=1 hinweise=0\nNEXT scout=nein\n');
  assert.deepEqual(red(ws.readJson('runde-2/nachpruefung.json')), ['AC-05: skript:ac-abdeckung/ac-fehlt-im-plan']);
  assert.ok(!ws.readJson('runde-2/pruefliste.json').items.some((item) => item.key === 'AC-05'));
});

test('verify_RedAnchorLineFixedByRework_PointDoneBecauseScriptNoLongerReportsIt', () => {
  const ws = planWorkspace(plan(task(1, ALL_ACS, ['- Modify: `src/a.js` · `Klasse.fehlt`'])), { 'src/a.js': SOURCE });
  roundOne(ws);
  ws.json('runde-1/rework.json', { results: [{ location: 'Task 1', status: 'changed' }], questions: [] });
  ws.edit((text) => text.replace('`Klasse.fehlt`', '`Klasse.methode`'));
  const list = ws.run('checklist', 'plan-review', ws.doc, ws.workspace).stdout;
  ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [], findings: [] });
  const out = ws.run('verify', 'plan-review', ws.doc, ws.workspace).stdout;
  assert.equal(list, 'PRUEFLISTE punkte=0 skript=1 geaendert=1 nachpruefer=ja\n');
  assert.equal(out, 'NACHPRUEFUNG ok offen=0 hinweise=0\nNEXT scout=nein\n');
  assert.deepEqual(ws.readJson('runde-2/nachpruefung.json').verdicts,
    [{ key: 'Task 1', script: true, verdict: 'erledigt', rationale: 'Skript-Prüfung meldet die Stelle nicht mehr' }]);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-plan-checks.test.js` — erwartet: FAIL `round1_AcInNoTask_ScriptRedAtThatAc`, FAIL `round1_TasksOneTwoFour_ScriptRedAtTaskFour`, FAIL `round1_AnchorNotInFileAndNoEarlierTask_ScriptRedAtThatTask`, FAIL `round1_DuplicateNumber_ScriptRedAtFirstTaskOffItsPosition`, FAIL `round1_WrongOrder_ScriptRedAtFirstTaskOffItsPosition`, FAIL `round1_PlanWithoutTasks_PlanRedAndEveryAcRed`, FAIL `round1_SamePlanSpecAndCodeTwice_SameFindings`, FAIL `round1_ReviewerAndScriptAtSameAc_StelleCountsOnceScriptDecides`, FAIL `verify_ReworkRemovesOnlyMentionOfAc_ScriptRedAtAcOutsideChecklist`, FAIL `verify_RedAnchorLineFixedByRework_PointDoneBecauseScriptNoLongerReportsIt`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/review-groups.js` nach der Zeile `const rules = require('./review-rules');` einfügen:

```js
const { PLAN_CHECKS } = require('./plan-checks');
```

  und die Zeile `const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': [] };` ersetzen durch:

```js
const SCRIPT_CHECKS = { 'spec-review': [], 'plan-review': PLAN_CHECKS };
```

  In `plugins/forge/scripts/review-flow.js` nach der Zeile `const flowReport = require('./lib/flow-report');` einfügen:

```js
const { readContext } = require('./workspace');
```

  direkt vor `function roundOne(` einfügen:

```js
// Eingaben der Skript-Prüfungen: das geprüfte Dokument und, was prepare.js im Arbeitsbereich festhält.
function scriptContext(doc, workspace) {
  const { spec = null, repo = null } = readContext(workspace);
  return { doc, spec, repo };
}
```

  und an beiden Stellen, in `roundOne` und in `verify`, den Ausdruck `groupsLib.runScriptChecks(text, checks)` ersetzen durch:

```js
groupsLib.runScriptChecks(text, checks, scriptContext(doc, workspace))
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-plan-checks.test.js plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/review-flow-round2.test.js` — erwartet: PASS
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/review-groups.js plugins/forge/scripts/review-flow.js plugins/forge/tests/lib/flow-workspace.js plugins/forge/tests/review-flow-plan-checks.test.js plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/review-flow-round2.test.js` · `git commit -m "feat(forge): run plan script checks in round 1 and in verification" -- plugins/forge/scripts/lib/review-groups.js plugins/forge/scripts/review-flow.js plugins/forge/tests/lib/flow-workspace.js plugins/forge/tests/review-flow-plan-checks.test.js plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/review-flow-round2.test.js`

### Task 6: architecture und risks sind beratend

**ACs:** AC-19, AC-20

**Dateien:**
- Modify: `plugins/forge/scripts/lib/review-rules.js:18-19` · `ADVISORY`
- Modify: `plugins/forge/agents/plan-review-architecture.md:25-26` · `## Nicht deine Aufgabe`
- Modify: `plugins/forge/agents/plan-review-risks.md:25-27` · `## Nicht deine Aufgabe`
- Test: `plugins/forge/tests/review-flow-round1.test.js:143-149` · `cli_UnknownKindOrCommand_ExitsTwo`
- Test: `plugins/forge/tests/agents.test.js:225-231` · `plan-review-architecture_Body_LooksForExistingCounterparts`

**Interfaces:**
- Consumes: `flow.roundOne(kind, doc, workspace, active, checks)` aus `plugins/forge/scripts/review-flow.js` (Bestand)
- Produces: `ADVISORY['plan-review']` ist `['architecture', 'risks']`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/review-flow-round1.test.js` anhängen:

```js
test('roundOne_PlanAdvisoryReviewersWithRedCategories_AtMostYellow', () => {
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const ws = flowWorkspace(plan, 'plan.md');
  ws.review('architecture', [finding('Task 1', 'umsetzer-steckt-fest', { quote: 'A.' })]);
  ws.review('risks', [finding('Task 2', 'widerspruch', { quote: 'B.' })]);
  const out = flow.roundOne('plan-review', ws.doc, ws.workspace, ['architecture', 'risks'], []);
  assert.equal(out, 'RUNDE1 rot=0 gelb=2 gruen=0 fragen=0 ausgefallen=-\nNEXT scout=ja nacharbeit=nein');
  assert.deepEqual(ws.readJson('runde-1/runde.json').groups.map((group) => group.items[0].capped), [['beratend'], ['beratend']]);
});
```

  Am Ende von `plugins/forge/tests/agents.test.js` anhängen:

```js
test('plan-review-advisory_Body_FindingsAtMostYellow', () => {
  for (const name of ['architecture', 'risks']) {
    const { body } = readAgent(`plan-review-${name}`);
    assert.ok(body.includes('## Beratend'), name);
    assert.ok(body.includes('Du bist beratend. Ein Skript stuft jedes deiner Findings höchstens auf 🟡, gleich welche Kategorie es trägt; deine Findings blocken nie.'), name);
  }
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/agents.test.js` — erwartet: FAIL `roundOne_PlanAdvisoryReviewersWithRedCategories_AtMostYellow`, FAIL `plan-review-advisory_Body_FindingsAtMostYellow`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/review-rules.js` die zwei Zeilen

```js
// Beratende Reviewer je Review; keiner ist beratend, solange ein Review keinen nennt.
const ADVISORY = { 'spec-review': [], 'plan-review': [] };
```

  ersetzen durch:

```js
// Beratende Reviewer je Review; ihre Findings stehen höchstens als 🟡.
const ADVISORY = { 'spec-review': [], 'plan-review': ['architecture', 'risks'] };
```

  In `plugins/forge/agents/plan-review-architecture.md` und in `plugins/forge/agents/plan-review-risks.md` jeweils direkt vor der Zeile `## Nicht deine Aufgabe` einfügen (mit einer Leerzeile danach):

```markdown
## Beratend
Du bist beratend. Ein Skript stuft jedes deiner Findings höchstens auf 🟡, gleich welche Kategorie es trägt; deine Findings blocken nie. Die Kategorie wählst du trotzdem nach der Sache.
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/agents.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/review-rules.js plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): cap architecture and risks findings at yellow" -- plugins/forge/scripts/lib/review-rules.js plugins/forge/agents/plan-review-architecture.md plugins/forge/agents/plan-review-risks.md plugins/forge/tests/review-flow-round1.test.js plugins/forge/tests/agents.test.js`

### Task 7: coverage prüft Teilumsetzung, Tests und Soll-Vorgaben

**ACs:** AC-06, AC-07, AC-08, AC-09, AC-38, AC-39, AC-40

**Dateien:**
- Modify: `plugins/forge/agents/plan-review-coverage.md:1-28` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js:207-213` · `plan-review-coverage_Body_SplitsAcIntoPartsAndReportsAllGapsInOneFinding`

**Interfaces:**
- Consumes: keine
- Produces: keine

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/agents.test.js` anhängen:

```js
test('plan-review-coverage_Body_CategoryPerCheckAndDefinitions', () => {
  const { body } = readAgent('plan-review-coverage');
  for (const part of [
    'Ob jede AC-ID der Spec unter `**ACs:**` eines Tasks steht, prüft ein Skript; das meldest du nicht.',
    '1. **Teilweise umgesetzt:**',
    'Ein Test ist ein automatisierter Testfall, den der Plan anlegt, ändert oder als vorhanden nennt, samt dem Befehl, der ihn ausführt.',
    'Ein Befehl oder Tool-Aufruf mit erwarteter Ausgabe ohne solchen Testfall ist Verifikation, aber kein Test.',
    'Belegt kein Test das AC, auch wenn ein Befehl es prüft: Finding an `AC-<Zahl>`, immer Kategorie `ac-fehlt-im-plan`.',
    'Jeder Aufzählungspunkt im Abschnitt `## Soll-Vorgaben` der Spec ist eine Soll-Vorgabe.',
    'Fehlt sie dort oder weicht sie ab: je Soll-Vorgabe ein eigenes Finding an `Global Constraints`, immer Kategorie `ac-fehlt-im-plan`.',
    'Fehlt der Abschnitt `## Global Constraints`, fehlt jede Soll-Vorgabe.',
    'Hat die Spec keine Soll-Vorgaben, entsteht daraus kein Finding.',
    'Fehlt sie: Finding an `Task <n>`, immer Kategorie `detail`.',
    'Ein AC ohne Test und ein Task ohne Verifikation meldest du getrennt, jedes mit seinem eigenen Finding.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('1. Jede AC-ID der Spec steht unter `**ACs:**` in mindestens einem Task.'), 'alte Handprüfung der AC-Abdeckung');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `plan-review-coverage_Body_CategoryPerCheckAndDefinitions`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/plan-review-coverage.md` die Frontmatter-Zeile `description:` ersetzen durch:

```markdown
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked against its spec for acceptance criteria a task names but implements only in part or proves without a test, for missing or deviating global constraints and for tasks without verification.
```

  Den Abschnitt von `## Prüfauftrag` bis vor `## W-Einträge` (also `## Prüfauftrag` und `## Nicht deine Aufgabe`) vollständig ersetzen durch:

```markdown
## Prüfauftrag
Ob jede AC-ID der Spec unter `**ACs:**` eines Tasks steht, prüft ein Skript; das meldest du nicht. Du prüfst, was die genannten ACs und die Soll-Vorgaben im Plan tatsächlich abdecken.
1. **Teilweise umgesetzt:** Jedes AC, das ein Task unter `**ACs:**` nennt, setzt dieser Task vollständig um. Dazu zerlegst du jedes AC in seine Teilaussagen (jede Stelle, jeder Fall, jeder Wert, den es nennt) und hakst jede einzeln gegen den Task ab. Fehlt eine: Finding an `AC-<Zahl>`, immer Kategorie `ac-fehlt-im-plan`; du nennst alle fehlenden Teilaussagen in einem Finding, jede in `consequence`, nicht nur die erste.
2. **Ohne Test:** Jedes genannte AC belegt ein Test. Ein Test ist ein automatisierter Testfall, den der Plan anlegt, ändert oder als vorhanden nennt, samt dem Befehl, der ihn ausführt. Ein Befehl oder Tool-Aufruf mit erwarteter Ausgabe ohne solchen Testfall ist Verifikation, aber kein Test. Belegt kein Test das AC, auch wenn ein Befehl es prüft: Finding an `AC-<Zahl>`, immer Kategorie `ac-fehlt-im-plan`.
3. **Soll-Vorgaben:** Jeder Aufzählungspunkt im Abschnitt `## Soll-Vorgaben` der Spec ist eine Soll-Vorgabe. Jede steht in `## Global Constraints` des Plans, mit dem Wert aus der Spec. Fehlt sie dort oder weicht sie ab: je Soll-Vorgabe ein eigenes Finding an `Global Constraints`, immer Kategorie `ac-fehlt-im-plan`. Fehlt der Abschnitt `## Global Constraints`, fehlt jede Soll-Vorgabe. Hat die Spec keine Soll-Vorgaben, entsteht daraus kein Finding.
4. **Verifikation:** Jeder Task hat mindestens eine Verifikation, also einen Test oder einen Befehl bzw. Tool-Aufruf mit erwarteter Ausgabe. Fehlt sie: Finding an `Task <n>`, immer Kategorie `detail`. Ein AC ohne Test und ein Task ohne Verifikation meldest du getrennt, jedes mit seinem eigenen Finding.

## Nicht deine Aufgabe
Ob eine AC-ID überhaupt unter `**ACs:**` steht, prüft ein Skript. Code, Architektur, Reihenfolge, Risiken, Formulierung, Stil. Doku-Zitate, Meldungstexte, Selektoren und Signaturen fremder Bibliotheken sowie Tool-Parameter prüft `buildability`.

```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS (auch `plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed` und `plan-review-coverage_Body_SplitsAcIntoPartsAndReportsAllGapsInOneFinding`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/plan-review-coverage.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): coverage reports partial ACs, missing tests and missing constraints" -- plugins/forge/agents/plan-review-coverage.md plugins/forge/tests/agents.test.js`

### Task 8: feasibility nennt die Kategorie je Prüfung

**ACs:** AC-10, AC-11, AC-12, AC-13, AC-30

**Dateien:**
- Modify: `plugins/forge/agents/plan-review-feasibility.md:21-27` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js:261-265` · `plan-review-feasibility_Body_NoExistenceCheckButWarningLines`

**Interfaces:**
- Consumes: keine
- Produces: keine

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/agents.test.js` anhängen:

```js
test('plan-review-feasibility_Body_CategoryPerCheckAndNoRedAnchorLines', () => {
  const { body } = readAgent('plan-review-feasibility');
  for (const part of [
    'Sonst: Finding an `Task <n>` des Tasks, der es braucht, Kategorie `umsetzer-steckt-fest`.',
    'Sonst: Finding an einem der beiden Tasks, Kategorie `umsetzer-steckt-fest`.',
    'Finding an einem Task, der die Voraussetzung nutzt, Kategorie `umsetzer-steckt-fest`.',
    'Ein späterer Task hebt auf, was ein früherer gebaut hat. Finding an dem späteren Task, Kategorie `widerspruch`.',
    'Führt keiner von ihnen den Anker ein: Finding an `Task <n>` der ⚠-Zeile, Kategorie `umsetzer-steckt-fest`.',
    '❌-Zeilen meldet ein Skript; du meldest sie nie, damit derselbe Anker nicht doppelt gemeldet wird.',
  ]) {
    assert.ok(body.includes(part), part);
  }
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `plan-review-feasibility_Body_CategoryPerCheckAndNoRedAnchorLines`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/plan-review-feasibility.md` die fünf nummerierten Punkte unter `## Prüfauftrag` vollständig ersetzen durch:

```markdown
1. **Reihenfolge:** Alles, was ein Task braucht, etwa unter `Consumes`, produziert ein früherer Task oder existiert bereits im Repo. Sonst: Finding an `Task <n>` des Tasks, der es braucht, Kategorie `umsetzer-steckt-fest`.
2. **Namen und Typen:** Dieselbe Funktion, derselbe Typ, dasselbe Feld heißt in allen Tasks gleich und hat dieselbe Signatur. Sonst: Finding an einem der beiden Tasks, Kategorie `umsetzer-steckt-fest`.
3. **Externe Voraussetzungen:** Pakete, Dienste, Zugangsdaten oder Werkzeuge, die der Plan nutzt, aber weder herstellt noch im Repo als vorhanden belegt sind. Im Repo nachsehen, bevor du meldest. Finding an einem Task, der die Voraussetzung nutzt, Kategorie `umsetzer-steckt-fest`.
4. **Widersprüche zwischen Tasks:** Ein späterer Task hebt auf, was ein früherer gebaut hat. Finding an dem späteren Task, Kategorie `widerspruch`.
5. **⚠-Zeilen:** Gibt es `Anker:`, prüfst du jede ⚠-Zeile gegen den Code, den die früheren Tasks im Plan schreiben. Führt keiner von ihnen den Anker ein: Finding an `Task <n>` der ⚠-Zeile, Kategorie `umsetzer-steckt-fest`. ❌-Zeilen meldet ein Skript; du meldest sie nie, damit derselbe Anker nicht doppelt gemeldet wird.
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS (auch `plan-review-feasibility_Body_NoExistenceCheckButWarningLines`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/plan-review-feasibility.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): feasibility names a category per check and leaves red anchors to the script" -- plugins/forge/agents/plan-review-feasibility.md plugins/forge/tests/agents.test.js`

### Task 9: buildability behält nur seinen Kern

**ACs:** AC-14, AC-15, AC-16, AC-17, AC-18, AC-31, AC-32

**Dateien:**
- Modify: `plugins/forge/agents/plan-review-buildability.md:1-38` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js:218-259` · `plan-review-buildability_Body_ReportsOnlyRedAnchorLines`

**Interfaces:**
- Consumes: keine
- Produces: keine

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` im Test `plan-review-buildability_Body_CommandsFromInputNoPluginResearch` die Zeile `assert.match(body, /In \`node_modules\` liest du nur für Auftrag 8/);` ersetzen durch:

```js
  assert.match(body, /In `node_modules` liest du nur für Auftrag 6/);
```

  Den Test `plan-review-buildability_Body_ReportsOnlyRedAnchorLines` vollständig ersetzen durch:

```js
test('plan-review-buildability_Body_NoFilesAnchorsOrNumbering', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.ok(body.includes('Dateien, Anker und Nummerierung prüfst du nicht; das tun Skripte.'));
  for (const old of ['**Dateien und Anker:**', '**Nummerierung:**', 'ist jede ❌-Zeile aus der Anker-Datei ein Finding an ihrem Task']) {
    assert.ok(!body.includes(old), old);
  }
});

test('plan-review-buildability_Body_CoreIsStuckRestIsDetail', () => {
  const { body } = readAgent('plan-review-buildability');
  for (const part of [
    'Ein Platzhalter statt Code ist `umsetzer-steckt-fest`.',
    'Ein Schritt, der Code verlangt, enthält einen vollständigen Code-Block. Fehlt er: `umsetzer-steckt-fest`.',
    'Ein verbotener Weg ist `umsetzer-steckt-fest`.',
    'falscher oder fehlender Parametername ist `umsetzer-steckt-fest`.',
    'Ein Gate, das nicht verdrahtet ist, ist `umsetzer-steckt-fest`, auch wenn der Weg erlaubt wäre.',
    'Schritte, die deutlich mehr als eine Aktion sind: `detail`.',
    'Fremd-Code ist, was der Plan von einer Bibliothek übernimmt oder voraussetzt, die das Projekt nicht selbst schreibt',
    'passt etwas nicht zur installierten Version: `detail`.',
  ]) {
    assert.ok(body.includes(part), part);
  }
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `plan-review-buildability_Body_CommandsFromInputNoPluginResearch`, FAIL `plan-review-buildability_Body_NoFilesAnchorsOrNumbering`, FAIL `plan-review-buildability_Body_CoreIsStuckRestIsDetail`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/plan-review-buildability.md` die Frontmatter-Zeile `description:` ersetzen durch:

```markdown
description: Use when the dv-forge plan-review orchestrator needs a plan.md checked for placeholders, code steps without code, forbidden commands, tool calls with wrong parameters, gates that are not set up, oversized tasks and foreign code.
```

  In der Zeile, die mit `Quellen und Tests des Plugins liest du nicht;` beginnt, `nur für Auftrag 8` durch `nur für Auftrag 6` ersetzen.

  Direkt nach der Zeile `## Prüfauftrag` die Zeile einfügen:

```markdown
Dateien, Anker und Nummerierung prüfst du nicht; das tun Skripte.
```

  Punkt 1 (`1. **Platzhalter:** …`) bleibt Wort für Wort, einschließlich seiner Anführungszeichen; an sein Ende nach `… die in keinem Task definiert sind und im Repo nicht existieren.` wird mit einem Leerzeichen angehängt:

```markdown
Ein Platzhalter statt Code ist `umsetzer-steckt-fest`.
```

  Die Punkte 2 bis 8 (von `2. **Code-Schritte ohne Code:**` bis zum Ende von `8. **Fremd-Code und Doku:** …`) vollständig ersetzen durch:

```markdown
2. **Code-Schritte ohne Code:** Ein Schritt, der Code verlangt, enthält einen vollständigen Code-Block. Fehlt er: `umsetzer-steckt-fest`.
3. **Befehle und Tool-Aufrufe:** Jeder ist ausführbar und laut Projekt-`CLAUDE.md` im Repo erlaubt. Ein verbotener Weg ist `umsetzer-steckt-fest`. Jeden Tool-Aufruf gleichst du mit dem echten Schema ab, das du per `ToolSearch` lädst: falscher oder fehlender Parametername ist `umsetzer-steckt-fest`. Ältere Pläne sind kein Beleg.
4. **Gates verdrahtet:** Für jeden vorgeschriebenen Build-, Test- oder Lint-Schritt prüfst du, dass er im Projekt eingerichtet ist: Script in der Build-Datei, Target, installierte Abhängigkeit oder Tool. Ein Gate, das nicht verdrahtet ist, ist `umsetzer-steckt-fest`, auch wenn der Weg erlaubt wäre.
5. **Zuschnitt:** Ein Task mit mehreren unabhängig ablehnbaren Ergebnissen, oder Schritte, die deutlich mehr als eine Aktion sind: `detail`.
6. **Fremd-Code und Doku:** Fremd-Code ist, was der Plan von einer Bibliothek übernimmt oder voraussetzt, die das Projekt nicht selbst schreibt: Selektoren, Meldungstexte, Signaturen und Beispiele aus ihrer Doku. Ihn und jedes Doku-Zitat einer Bibliothek prüfst du am installierten Paket oder an der Doku; passt etwas nicht zur installierten Version: `detail`. Das prüft nur dieser Reviewer.
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS (auch `plan-review-buildability_Body_GatesSchemaAndForeignCode` und `plan-review-buildability_Frontmatter_NameToolsModelDescription`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): buildability keeps its core and leaves files, anchors and numbering to scripts" -- plugins/forge/agents/plan-review-buildability.md plugins/forge/tests/agents.test.js`

### Task 10: Nacharbeit fragt die Spec nur bei Widerspruch oder Unmöglichem

**ACs:** AC-21, AC-22, AC-23

**Dateien:**
- Modify: `plugins/forge/agents/plan-rework.md:21-26` · `## Regeln`
- Test: `plugins/forge/tests/agents.test.js:213-217` · `plan-rework_Body_AcFindingChecksTheWholeAc`

**Interfaces:**
- Consumes: keine
- Produces: keine

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/agents.test.js` anhängen:

```js
test('plan-rework_Body_SpecQuestionOnlyForContradictionOrImpossible', () => {
  const { body } = readAgent('plan-rework');
  for (const part of [
    '**spec-rückfrage** — nur wenn sich die Spec widerspricht, etwa zwei ACs, die sich ausschließen, oder wenn sie Unmögliches verlangt.',
    'Unmöglich ist eine Anforderung, wenn keine Festlegung im Plan sie erfüllen kann, ohne eine andere Aussage der Spec zu verletzen oder eine nicht herstellbare Voraussetzung zu brauchen.',
    'Der Plan bleibt an dieser Stelle unverändert.',
    'Lässt die Spec eine Festlegung offen, triffst du sie selbst im Plan: Ausgang **geändert**, die Festlegung steht im R-Eintrag. Dafür gibt es keine Spec-Rückfrage.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('lässt eine Festlegung offen, die der Plan nicht selbst treffen darf'), 'alte Rückfrage bei offener Festlegung');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: FAIL `plan-rework_Body_SpecQuestionOnlyForContradictionOrImpossible`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/plan-rework.md` unter `## Regeln`, Punkt 2, die Zeile, die mit `   - **spec-rückfrage** —` beginnt, vollständig ersetzen durch diese zwei Zeilen (drei Leerzeichen Einzug wie die übrigen Unterpunkte):

```markdown
   - **spec-rückfrage** — nur wenn sich die Spec widerspricht, etwa zwei ACs, die sich ausschließen, oder wenn sie Unmögliches verlangt. Unmöglich ist eine Anforderung, wenn keine Festlegung im Plan sie erfüllen kann, ohne eine andere Aussage der Spec zu verletzen oder eine nicht herstellbare Voraussetzung zu brauchen. Der Plan bleibt an dieser Stelle unverändert.
   Lässt die Spec eine Festlegung offen, triffst du sie selbst im Plan: Ausgang **geändert**, die Festlegung steht im R-Eintrag. Dafür gibt es keine Spec-Rückfrage.
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/agents.test.js` — erwartet: PASS (auch `reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions` und `reworkAgents_Body_FollowupModeAppliesChosenProposalsWithFEntries`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/plan-rework.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): plan rework asks the spec only on contradiction or impossibility" -- plugins/forge/agents/plan-rework.md plugins/forge/tests/agents.test.js`

### Task 11: Frühere Spec-Rückfrage filtert nichts

**ACs:** AC-24

**Dateien:**
- Test: `plugins/forge/tests/review-flow-round1.test.js:143-149` · `cli_UnknownKindOrCommand_ExitsTwo`

**Interfaces:**
- Consumes: `flowWorkspace(text, name)` mit `context(specText: string): void` aus `plugins/forge/tests/lib/flow-workspace.js` (Task 5); `finding(location, category, overrides)` aus derselben Datei (Bestand)
- Produces: keine

- [ ] **Schritt 1: Absicherungstest schreiben**
  Am Ende von `plugins/forge/tests/review-flow-round1.test.js` anhängen:

```js
test('round1_EarlierSpecQuestionAtAc_FindingKeptWithCategoryAndColour', () => {
  const spec = '# S\n\n## Akzeptanzkriterien\n- **AC-01** Gegeben A, dann B.\n- **AC-04** Gegeben C, dann D.\n';
  const plan = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n### Task 1: Eins\n\n**ACs:** AC-01, AC-04\n\nA.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';
  const earlierQuestion = plan.replace('- Keine Fragen an den Menschen.', '- **R1 · AC-04** — spec-rückfrage — Die Spec lässt den leeren Fall offen.');
  const stateAfterRoundOne = (text) => {
    const ws = flowWorkspace(text, 'plan.md');
    ws.context(spec);
    ws.review('coverage', [finding('AC-04', 'ac-fehlt-im-plan', { quote: 'A.' })]);
    ws.run('round1', 'plan-review', ws.doc, ws.workspace, 'coverage');
    const { groups, dropped } = ws.readJson('runde-1/runde.json');
    return { groups: groups.map((group) => [group.key, group.color, group.items.map((item) => item.category)]), dropped };
  };
  const withEarlier = stateAfterRoundOne(earlierQuestion);
  assert.deepEqual(withEarlier, stateAfterRoundOne(plan));
  assert.deepEqual(withEarlier, { groups: [['AC-04', 'red', ['ac-fehlt-im-plan']]], dropped: [] });
});
```

- [ ] **Schritt 2: Absicherungstest laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-round1.test.js` — erwartet: PASS `round1_EarlierSpecQuestionAtAc_FindingKeptWithCategoryAndColour`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Commit**
  `git add plugins/forge/tests/review-flow-round1.test.js` · `git commit -m "test(forge): an earlier spec question does not filter a new plan review" -- plugins/forge/tests/review-flow-round1.test.js`

### Task 12: Nächster Schritt im Bericht

**ACs:** AC-25, AC-26, AC-27, AC-28, AC-29, AC-34

**Dateien:**
- Modify: `plugins/forge/skills/plan-review/SKILL.md:40-47` · `## Nächster Schritt`
- Test: `plugins/forge/tests/plan-review-skill.test.js:48-59` · `planReviewSkill_Body_StaysUnder500Words`

**Interfaces:**
- Consumes: keine
- Produces: keine

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/plan-review-skill.test.js` anhängen:

```js
test('planReviewSkill_NextStep_TextPerStatusWithOnlyHintAndCommitOutcomes', () => {
  const { body } = readMarkdown(SKILL);
  const next = body.slice(body.indexOf('## Nächster Schritt'));
  for (const part of [
    'Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis.',
    'Leere Ausgabe: keine Frage, beide sind committet',
    'Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?`',
    'Nach dem Ja committest du beide Dateien',
    'Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.',
    'Bei Nein oder ohne Antwort: kein Commit und kein weiterer Schritt.',
    'Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben, kein `/dv-forge:implementation <P>`.',
    '`Spec-Rückfragen offen. Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`',
    'oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.',
  ]) {
    assert.ok(next.includes(part), `${part} fehlt`);
  }
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-review-skill.test.js` — erwartet: FAIL `planReviewSkill_NextStep_TextPerStatusWithOnlyHintAndCommitOutcomes`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/plan-review/SKILL.md` den Abschnitt `## Nächster Schritt` bis zum Dateiende vollständig ersetzen durch:

```markdown
## Nächster Schritt
Auswahl-Hinweis: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

- `sauber …`: Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis. Nach dem Freigeben des Guards `git status --porcelain -- "<S>" "<P>"`. Leere Ausgabe: keine Frage, beide sind committet; weiter mit dem Code-Block `/dv-forge:implementation <P>` wie unten. Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?` Nach dem Ja committest du beide Dateien, Nachricht nach `Commit-Konvention` aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention`, mit der Workitem-Nummer der Spec, falls sie eine nennt. Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`. Bei Nein oder ohne Antwort: kein Commit und kein weiterer Schritt. Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben, kein `/dv-forge:implementation <P>`.
- `Fragen offen`: `Spec-Rückfragen offen. Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`
- `nicht bereit …`: `Plan nicht bereit. Nachprüfung und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.` und der Auswahl-Hinweis.
- `unvollständig …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.`
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/plan-review-skill.test.js` — erwartet: PASS (auch `planReviewSkill_Body_NextStepPerStatusWithCommitQuestion` und `planReviewSkill_Body_StaysUnder500Words`)
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/plan-review/SKILL.md plugins/forge/tests/plan-review-skill.test.js` · `git commit -m "feat(forge): plan review names --only and the commit outcomes in its next step" -- plugins/forge/skills/plan-review/SKILL.md plugins/forge/tests/plan-review-skill.test.js`

## Entscheidungen
- **W · Skript-Prüfung ohne Lauf** · Aussage — Bricht die Anker-Prüfung ab, weil die Task-Nummerierung kaputt ist, steht nur der Nummerierungs-Befund (🔴). Jeder andere Fehler einer Skript-Prüfung (Spec oder Repo nicht lesbar, Anker-Prüfung bricht ab) wird ein eigener 🔴-Befund `umsetzer-steckt-fest` an der Stelle `Plan` mit der Fehlermeldung; der Lauf läuft zu Ende und ist nicht sauber.
- **W · Planungs-Skills** · Aussage — Für diesen Plan gilt `unit-integration-testing`.
- **E · Kennzeichen der Skript-Befunde** · Planer — Skript-Befunde tragen ihre echte Kategorie (`ac-fehlt-im-plan`, `umsetzer-steckt-fest`) statt `skript-pruefung`; dass ein Befund vom Skript stammt, steht im Eintrag (`script: true`), den nur `runScriptChecks` setzt. Grund: AC-01 bis AC-03 verlangen die Kategorie, und ein Feld im Reviewer-JSON darf keinen Skript-Rang erschleichen.
- **E · Kontext der Skript-Prüfungen** · Planer — `prepare.js` schreibt Spec und Repo nach `<W>/kontext.json`, `review-flow.js` liest sie dort. Grund: Die Befehle in `shared/review-flow/flow.md` bleiben gleich, und der Folge-Modus bekommt den Kontext über `preparePlanReview` mit.
- **E · Auswertung der Anker-Prüfung** · Planer — Das Skript ruft `anchorMarks` aus `plan-anchors.js` auf, das dieselbe Prüfung je Zeile wie `anchors.md` ausführt, statt `anchors.md` zu lesen. Grund: kein veralteter Stand, wenn die Nacharbeit die Nummerierung bricht und `plan-tasks.js anchors` scheitert; die Prüfung wird nicht neu gebaut. Der Schritt `plan-tasks.js anchors` nach der Nacharbeit im Skill bleibt unverändert.
- **E · Dieselbe Stelle** · Planer — Reviewer- und Skript-Befund gehören zur selben Stelle, wenn `resolveUnit` beide auf dieselbe Einheit legt (`AC-<n>`, `Task <n>` oder `Plan`); innerhalb eines Tasks wird nicht feiner unterschieden. Steht an einem KI-Punkt der Prüfliste in der Nachprüfung ein roter Skript-Befund, entscheidet das Skript den Punkt, und er zählt nur einmal.
- **E · Überschriften der Nummerierung** · Planer — Die Nummerierungs-Prüfung zählt jede Überschrift `### Task <x>:` außerhalb von Code-Blöcken, auch `Task 3a` oder `Task 3.1`, und vergleicht `<x>` mit der Position. Grund: `buildability` prüft die Nummerierung nicht mehr, und `plan-tasks.js` übersieht solche Überschriften.
- **E · Stelle `Plan`** · Planer — Der Befund eines Plans ohne Tasks und jeder Befund einer Skript-Prüfung, die nicht laufen kann, hängt an der Stelle `Plan`.
- **E · Fremd-Code** · Planer — Fremd-Code ist, was der Plan von einer Bibliothek übernimmt oder voraussetzt, die das Projekt nicht selbst schreibt: Selektoren, Meldungstexte, Signaturen und Beispiele aus ihrer Doku (Festlegung nach „W · Randfälle an den Plan“ der Spec).
- **E · Tests ohne AAA-Kommentare** · Planer — Neue Tests folgen der Reihenfolge Arrange, Act, Assert ohne die Kommentare aus `unit-integration-testing`, weil kein forge-Test sie nutzt und der Bestand Vorrang hat.
