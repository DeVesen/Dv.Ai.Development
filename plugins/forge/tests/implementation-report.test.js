'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { anchorsOf } = require('../scripts/lib/must-show');
const { isTestFile } = require('../scripts/lib/implementation-report');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
const Q = (text) => `\u201E${text}\u201C`;

const YELLOW = {
  location: 'src/round.js', severity: 'yellow', reviewers: ['design'],
  items: [{ reviewer: 'design', severity: 'yellow', location: 'src/round.js:12', quote: 'q', consequence: 'Die Rundung steht doppelt', rationale: 'r' }],
};
const RED = {
  location: 'src/save.js', severity: 'red', reviewers: ['risks'],
  items: [{ reviewer: 'risks', severity: 'red', location: 'src/save.js:4', quote: 'q', consequence: 'Fehler wird verschluckt', rationale: 'r' }],
};
const GREEN = {
  location: 'src/ok.js', severity: 'green', reviewers: ['tests'],
  items: [{ reviewer: 'tests', severity: 'green', location: 'src/ok.js', quote: 'q', consequence: 'Name holpert', rationale: 'r' }],
};
const SCOUT_YELLOW = [
  '### 🟡 src/round.js', 'Titel: Rundung der Summe', 'Beschreibung: Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
  'Empfehlung: Die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.', '1. Rundung bündeln.', '**Bevorzugt: 1** — einfach.', '',
];
const SCOUT_RED = [
  '### 🔴 src/save.js', 'Titel: Fehler wird verschluckt', 'Beschreibung: Ein Fehler beim Speichern bleibt unbemerkt.',
  'Empfehlung: Den Fehler melden, weil Nutzer sonst Datenverlust nicht sehen.', '1. Fehler melden.', '**Bevorzugt: 1** — klar.', '',
];
const PACKAGE = [
  '# Review-Paket: a1b2c3d..HEAD', '', '## Commits', 'abc feat: x', '', '## Dateien',
  ' src/round.js            |  3 ++-', ' tests/round.test.js      |  5 +++++', ' src/OrderTests.cs        |  2 +-', ' src/latest.js           |  1 +',
  ' 4 files changed, 10 insertions(+), 1 deletion(-)', '', '## Diff', 'diff --git a/x b/x',
].join('\n');
const SCOUT_NOTE = /- Der Scout hat keine gültigen Vorschläge geliefert; Beschreibungen stammen aus den Prüfergebnissen\./;

function aggregateOf(groups) {
  const blocks = groups.map((group) => [`### ${{ red: '🔴', yellow: '🟡', green: '🟢' }[group.severity]} ${group.location} (${group.reviewers.join(', ')})`,
    ...group.items.map((item) => `- [${item.reviewer} · ${item.severity}] Zitat: ${Q('q')} · Konsequenz: ${item.consequence} · Begründung: r`)].join('\n'));
  return ['STATUS clean=true red=0 yellow=0 green=0 failed=-', '=== REPORT ===', 'Tabelle', '=== REWORK ===', blocks.join('\n\n'), ''].join('\n');
}

function setup({ groups = [YELLOW], reviewers = ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'], failed = [], scout = null, hints, withResult = true } = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-impl-report-'));
  const dir = path.join(workspace, 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) counts[group.severity] += 1;
  if (withResult) fs.writeFileSync(path.join(dir, 'ergebnis.json'), JSON.stringify({ reviewers, failed, counts, groups }));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), aggregateOf(groups));
  if (scout) fs.writeFileSync(path.join(dir, 'scout.md'), ['## Scout-Vorschläge', '', ...scout].join('\n'));
  if (hints) fs.writeFileSync(path.join(workspace, 'hinweise.json'), JSON.stringify(hints));
  const plan = path.join(workspace, 'plan.md');
  fs.writeFileSync(plan, '# Bestellsumme berechnen — Plan\n\n### Task 1: Eins\n');
  const packageFile = path.join(workspace, 'review.diff');
  fs.writeFileSync(packageFile, PACKAGE);
  return { workspace, dir, plan, packageFile };
}

function report(env) {
  return spawnSync(process.execPath, [SCRIPT, '--dir', env.dir, '--workspace', env.workspace, '--plan', env.plan, '--bereich', 'a1b2c3d', '--paket', env.packageFile], { encoding: 'utf8' });
}

function read(env, ...parts) {
  return fs.readFileSync(path.join(env.workspace, 'abschluss', ...parts), 'utf8');
}

test('implementationReport_OneYellowWithValidScout_ReadyAndFilesFiltered', () => {
  // Arrange
  const env = setup({ groups: [YELLOW, GREEN], scout: SCOUT_YELLOW, hints: ['Ein Hinweis aus der Vorbereitung.'] });

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE sauber nach Review 1\n=== BERICHT ===\n## Implementierungs-Review · Ergebnis · Bestellsumme berechnen — Plan\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\nAblauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung\./);
  assert.match(result.stdout, /- Bereich: `a1b2c3d\.\.HEAD`\n- 4 geänderte Dateien, davon 2 Tests\n- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken/);
  assert.match(result.stdout, /- Aufbau: 0 Hindernisse, 1 Hinweis\n- Tests: 0 Hindernisse, 0 Hinweise/);
  assert.match(result.stdout, /- 🟡 \*\*Rundung der Summe\*\* · aus: Aufbau\n  Die Rundung steht an zwei Stellen und kann auseinanderlaufen\.\n  Vorschlag \(empfohlen\): Die Rundung in einer Funktion bündeln/);
  assert.match(result.stdout, /### Hinweise zum Ablauf\n- Ein Hinweis aus der Vorbereitung\./);
  assert.ok(result.stdout.includes(`/dv-forge:review-followup ${env.plan} alle`));
  assert.equal(read(env, 'bericht.md'), `${result.stdout.split('=== BERICHT ===\n')[1].trimEnd()}\n`);
  const aggregate = read(env, 'aggregate.md');
  assert.ok(aggregate.includes('### 🟡 src/round.js (design)'));
  assert.equal(aggregate.includes('src/ok.js'), false);
  assert.match(read(env, 'scout.md'), /^## Scout-Vorschläge\n\n### 🟡 src\/round\.js/);
});

test('implementationReport_RedFinding_GeprueftWithHindranceAndSaveKeepsScoutBlocks', () => {
  // Arrange
  const env = setup({ groups: [RED, YELLOW], scout: [...SCOUT_RED, ...SCOUT_YELLOW] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE geprüft, 1 × 🔴 offen\n/);
  assert.match(result.stdout, /⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(result.stdout, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken/);
  assert.match(read(env, 'scout.md'), /### 🔴 src\/save\.js[\s\S]*### 🟡 src\/round\.js/);
});

test('implementationReport_FailedReviewer_UnvollstaendigWithNoteAndFailedLine', () => {
  // Arrange
  const env = setup({ groups: [], reviewers: ['acceptance', 'plan-fidelity', 'design', 'tests'], failed: ['risks'] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE unvollständig nach Review 1, ausgefallen: risks\n/);
  assert.match(result.stdout, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
  assert.match(result.stdout, /- Risiken: ausgefallen/);
  assert.match(result.stdout, /- Der Prüfer für Risiken ist ausgefallen\. Dieser Blickwinkel fehlt in der Prüfung\./);
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('implementationReport_ScoutMissingOrInvalid_FallbackTextNoteAndNoScoutFile', () => {
  // Arrange
  const missing = setup({ groups: [YELLOW] });
  const invalid = setup({ groups: [YELLOW], scout: SCOUT_YELLOW.filter((line) => !line.startsWith('Titel:')) });

  // Act
  const results = [report(missing), report(invalid)];

  // Assert
  for (const [index, result] of results.entries()) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- 🟡 \*\*src\/round\.js\*\* · aus: Aufbau\n  Die Rundung steht doppelt \(ohne Scout-Beschreibung\)\n/);
    assert.equal(result.stdout.includes('Vorschlag (empfohlen)'), false);
    assert.match(result.stdout, SCOUT_NOTE);
    assert.match(result.stdout, /1\. Der Hinweis hat keinen Lösungsvorschlag\./);
    assert.equal(result.stdout.includes('/dv-forge:review-followup'), false);
    assert.equal(fs.existsSync(path.join([missing, invalid][index].workspace, 'abschluss', 'scout.md')), false);
  }
});

test('implementationReport_ScoutValidForSomeGroupsOnly_AllFallbackWithoutFollowupStep', () => {
  // Arrange
  const env = setup({ groups: [RED, YELLOW], scout: SCOUT_YELLOW });

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^ENDE geprüft, 1 × 🔴 offen\n/);
  assert.match(result.stdout, /- 🔴 \*\*src\/save\.js\*\* · aus: Risiken\n  Fehler wird verschluckt \(ohne Scout-Beschreibung\)\n/);
  assert.match(result.stdout, /- 🟡 \*\*src\/round\.js\*\* · aus: Aufbau\n  Die Rundung steht doppelt \(ohne Scout-Beschreibung\)\n/);
  assert.match(result.stdout, /1\. Das Hindernis hat keinen Lösungsvorschlag\. Selbst beheben, dann erneut prüfen:/);
  assert.equal(result.stdout.includes('/dv-forge:review-followup'), false);
  assert.match(result.stdout, SCOUT_NOTE);
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('implementationReport_ScoutOkButGroupsMissingFromAggregate_FallbackWithScoutNote', () => {
  // Arrange
  const env = setup({ groups: [YELLOW], scout: [] });
  fs.writeFileSync(path.join(env.dir, 'aggregate.md'), aggregateOf([]));

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /- 🟡 \*\*src\/round\.js\*\* · aus: Aufbau\n  Die Rundung steht doppelt \(ohne Scout-Beschreibung\)\n/);
  assert.match(result.stdout, SCOUT_NOTE);
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('implementationReport_StaleClosingFiles_AreRemovedBeforeWriting', () => {
  // Arrange
  const env = setup({ groups: [YELLOW] });
  fs.mkdirSync(path.join(env.workspace, 'abschluss'), { recursive: true });
  fs.writeFileSync(path.join(env.workspace, 'abschluss', 'scout.md'), '## Scout-Vorschläge\n\n### 🟡 src/alt.js\n');

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'scout.md')), false);
});

test('implementationReport_NoFindingsNoHintsFile_ReadyWithoutNotes', () => {
  // Arrange
  const env = setup({ groups: [] });

  // Act
  const result = report(env);

  // Assert
  assert.match(result.stdout, /^ENDE sauber nach Review 1\n/);
  assert.equal(result.stdout.includes('Hinweise zum Ablauf'), false);
  assert.equal(read(env, 'aggregate.md'), '=== REWORK ===\n');
});

test('implementationReport_Bericht_CarriesHeadingAnchorsForShow', () => {
  // Arrange
  const env = setup({ groups: [YELLOW], scout: SCOUT_YELLOW });

  // Act
  report(env);

  // Assert
  const anchors = anchorsOf(read(env, 'bericht.md'));
  assert.ok(anchors.includes('## Implementierungs-Review · Ergebnis · Bestellsumme berechnen — Plan'));
  assert.ok(anchors.includes('### Was geprüft wurde'));
  assert.ok(anchors.includes('### Wie es weitergeht'));
});

test('implementationReport_MissingErgebnis_ExitsOneWithReason', () => {
  // Arrange
  const env = setup({ withResult: false });

  // Act
  const result = report(env);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-forge implementation-report: Datei fehlt: .*ergebnis\.json/);
});

test('implementationReport_BrokenErgebnis_ExitsOneWithoutStackTrace', () => {
  // Arrange
  const broken = setup({ withResult: false });
  fs.writeFileSync(path.join(broken.dir, 'ergebnis.json'), 'kein json');
  const shapeless = setup({ withResult: false });
  fs.writeFileSync(path.join(shapeless.dir, 'ergebnis.json'), '{}');

  // Act
  const results = [report(broken), report(shapeless)];

  // Assert
  assert.equal(results[0].status, 1);
  assert.match(results[0].stderr, /^dv-forge implementation-report: kein gültiges JSON: .*ergebnis\.json/);
  assert.equal(results[1].status, 1);
  assert.match(results[1].stderr, /^dv-forge implementation-report: ungültiges Ergebnis: .*ergebnis\.json/);
  for (const result of results) assert.equal(/\n\s+at /.test(result.stderr), false, result.stderr);
});

test('implementationReport_InvalidGroupInErgebnis_ExitsOneWithReason', () => {
  // Arrange
  const variants = [
    { ...YELLOW, severity: 'blue' },
    { ...YELLOW, items: [] },
    { ...YELLOW, items: [{ ...YELLOW.items[0], consequence: { text: 'x' } }] },
    { ...YELLOW, reviewers: [1] },
  ];
  const envs = variants.map((group) => setup({ groups: [YELLOW] }));
  envs.forEach((env, index) => {
    const result = JSON.parse(fs.readFileSync(path.join(env.dir, 'ergebnis.json'), 'utf8'));
    fs.writeFileSync(path.join(env.dir, 'ergebnis.json'), JSON.stringify({ ...result, groups: [variants[index]] }));
  });

  // Act
  const results = envs.map(report);

  // Assert
  for (const result of results) {
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /^dv-forge implementation-report: ungültiges Ergebnis: .*ergebnis\.json/);
    assert.equal(/\n\s+at /.test(result.stderr), false, result.stderr);
  }
});

test('implementationReport_HintsNotAListOfTexts_ExitsOneWithReason', () => {
  // Arrange
  const envs = [setup({ hints: { text: 'x' } }), setup({ hints: [{ text: 'x' }] })];

  // Act
  const results = envs.map(report);

  // Assert
  for (const result of results) {
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /^dv-forge implementation-report: keine Liste von Texten: .*hinweise\.json/);
    assert.equal(/\n\s+at /.test(result.stderr), false, result.stderr);
  }
});

test('implementationReport_MissingArgument_ExitsTwoWithUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', 'x'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Aufruf: node implementation-report\.js/);
});

test('isTestFile_PathPatterns_CountTestFilesOnly', () => {
  const tests = ['tests/round.test.js', 'src/OrderTests.cs', 'src/OrderTest.java', 'pkg/order_test.go', 'web/app.spec.ts', 'src/__tests__/a.js', 'test/a.js'];
  const others = ['src/latest.js', 'src/contest.ts', 'src/round.js', 'docs/testing.md'];
  for (const file of tests) assert.equal(isTestFile(file), true, file);
  for (const file of others) assert.equal(isTestFile(file), false, file);
});

test('isTestFile_DocumentationFiles_NeverCountAsTests', () => {
  const docs = ['docs/api-spec.md', 'docs/smoke-test.md', 'tests/README.md', 'notes/a.test.txt', 'doc/x.spec.rst', 'test/guide.adoc'];
  for (const file of docs) assert.equal(isTestFile(file), false, file);
});
