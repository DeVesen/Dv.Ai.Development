'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { lintPlan, lintReport } = require('../scripts/lib/plan-lint');
const { PLAN_CHECKS } = require('../scripts/lib/plan-checks');
const { ALL_ACS, planTask, planText } = require('./lib/plan-fixtures');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'plan-tasks.js');
const FIXTURE = path.join(__dirname, 'fixtures', 'plan-review', 'plan.md');
const CLEAN = planText(planTask(1, ALL_ACS));

function rules(text) {
  return lintPlan(text).map((entry) => `${entry.severity} ${entry.rule} ${entry.location}`);
}

function inTask(lines) {
  return planText(planTask(1, ALL_ACS, lines));
}

test('lintPlan_CleanPlanFixture_NoIssues', () => {
  // Act
  const issues = lintPlan(CLEAN);

  // Assert
  assert.deepEqual(issues, []);
});

test('lintPlan_PlaceholderPhrasesInProse_RedAtTheirTask', () => {
  // Arrange
  const phrases = ['TBD', 'todo', 'Später umsetzen', 'Details ergänzen', 'Passende Fehlerbehandlung ergänzen', 'Validierung hinzufügen', 'Randfälle behandeln', 'Wie Task 2'];

  // Act
  const found = phrases.map((phrase) => rules(inTask([`Hier: ${phrase}.`])));

  // Assert
  assert.deepEqual(found, phrases.map(() => ['fehler platzhalter Task 1']));
});

test('lintPlan_PlaceholderInsideCodeFence_OnlyTodoComments', () => {
  // Arrange
  const harmless = inTask(['```js', "const text = 'Details ergänzen'; // fertig", '```']);
  const todo = inTask(['```js', 'run(); // TODO später', '```']);
  const fixme = inTask(['```py', 'run()  # FIXME', '```']);

  // Act
  const found = [harmless, todo, fixme].map(rules);

  // Assert
  assert.deepEqual(found, [[], ['fehler platzhalter-code Task 1'], ['fehler platzhalter-code Task 1']]);
});

test('lintPlan_PlaceholderInCodeSpanOrDecisions_NoIssue', () => {
  // Arrange
  const text = inTask(['Der Test sucht `TBD` im Text.']).replace('- Keine Fragen an den Menschen.', '- **R1 · Task 1** — geändert — TBD ersetzt.');

  // Act
  const found = rules(text);

  // Assert
  assert.deepEqual(found, []);
});

test('lintPlan_HeadLineMissing_RedAtHead', () => {
  // Arrange
  const text = CLEAN.replace('**Architektur:** Eine Klasse.\n', '');

  // Act
  const found = rules(text);

  // Assert
  assert.deepEqual(found, ['fehler kopf-zeile Kopf']);
});

test('lintPlan_SectionsMissingOrDecisionsNotLast_Red', () => {
  // Arrange
  const withoutConstraints = CLEAN.replace('## Global Constraints\n- Nur Node.js.\n', '');
  const withoutDecisions = CLEAN.replace(/## Entscheidungen[\s\S]*$/, '');
  const notLast = `${CLEAN}\n## Anhang\nText.\n`;

  // Act
  const found = [withoutConstraints, withoutDecisions, notLast].map(rules);

  // Assert
  assert.deepEqual(found, [['fehler abschnitt-fehlt Global Constraints'], ['fehler abschnitt-fehlt Entscheidungen'], ['fehler abschnitt-reihenfolge Entscheidungen']]);
});

test('lintPlan_StepGapOrNoSteps_YellowSchrittmuster', () => {
  // Arrange
  const gap = CLEAN.replace('**Schritt 1:', '**Schritt 2:');
  const none = CLEAN.replace(/- \[ \] \*\*Schritt 1[\s\S]*?PASS\n/, '');

  // Act
  const found = [gap, none].map(rules);

  // Assert
  assert.deepEqual(found, [['warnung schritte-luecke Task 1'], ['warnung schritte-fehlen Task 1', 'warnung verifikation-fehlt Task 1']]);
});

test('lintPlan_CommandWithoutExpected_YellowAndNoVerification', () => {
  // Arrange
  const text = CLEAN.replace(' — erwartet: PASS', '');

  // Act
  const found = rules(text);

  // Assert
  assert.deepEqual(found, ['warnung erwartet-fehlt Task 1', 'warnung verifikation-fehlt Task 1']);
});

test('lintPlan_TestFileInsteadOfCommand_Verified', () => {
  // Arrange
  const text = CLEAN.replace('  Befehl: `node --test` — erwartet: PASS', '  Test laufen lassen.').replace('Text.', '- Test: `tests/a.test.js` · `suite`\nText.');

  // Act
  const found = rules(text);

  // Assert
  assert.deepEqual(found, []);
});

test('lintPlan_AbsolutePathInFileLine_RedAtTask', () => {
  // Arrange
  const text = inTask(['- Create: `/home/user/a.js`', '- Modify: `C:\\repo\\b.js` · `f`', '- Test: `tests/c.test.js`']);

  // Act
  const found = rules(text);

  // Assert
  assert.deepEqual(found, ['fehler pfad-absolut Task 1', 'fehler pfad-absolut Task 1']);
});

test('lintPlan_ConsumesWithoutEarlierProducer_RedAtConsumer', () => {
  // Arrange
  const first = planTask(1, 'AC-01', ['- Consumes: `Foo.bar(x)`']);
  const second = planTask(2, 'AC-03', ['- Produces: `Foo.bar(x)`']);
  const third = planTask(3, 'AC-05', ['- Consumes: `Foo.bar(x)`']);

  // Act
  const found = rules(planText(first, second, third));

  // Assert
  assert.deepEqual(found, ['fehler consumes Task 1']);
});

test('lintPlan_ConsumesNothing_NoIssue', () => {
  // Act
  const found = rules(inTask(['- Consumes: —']));

  // Assert
  assert.deepEqual(found, []);
});

test('lintPlan_ReviewFixture_PlaceholderAtTaskTwoAndBackwardDependency', () => {
  // Arrange
  const text = fs.readFileSync(FIXTURE, 'utf8');

  // Act
  const found = rules(text);

  // Assert
  assert.ok(found.includes('fehler platzhalter Task 2'), found.join(', '));
  assert.ok(found.includes('fehler consumes Task 1'), found.join(', '));
});

test('planChecks_PlanFormatYellowFinding_CarriesColorYellowAndDetail', () => {
  // Arrange
  const check = PLAN_CHECKS.find((candidate) => candidate.name === 'plan-format');

  // Act
  const [found] = check.run(CLEAN.replace(' — erwartet: PASS', ''), {});

  // Assert
  assert.deepEqual([found.category, found.color, found.location], ['detail', 'yellow', 'Task 1']);
});

test('planChecks_PlanFormatError_NoColorAndUmsetzerStecktFest', () => {
  // Arrange
  const check = PLAN_CHECKS.find((candidate) => candidate.name === 'plan-format');

  // Act
  const [found] = check.run(inTask(['TBD']), {});

  // Assert
  assert.deepEqual([found.category, found.color], ['umsetzer-steckt-fest', undefined]);
});

test('lintReport_ErrorsAndWarnings_HeadLineAndExitOne', () => {
  // Act
  const { text, exit } = lintReport(inTask(['TBD']).replace(' — erwartet: PASS', ''));

  // Assert
  assert.equal(exit, 1);
  assert.match(text, /^LINT fehler=1 warnungen=2\nFEHLER platzhalter · Task 1: /);
});

function writePlan(text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-lint-')), 'plan.md');
  fs.writeFileSync(file, text);
  return file;
}

test('cli_LintCleanPlan_ExitZero', () => {
  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'lint', writePlan(CLEAN)], { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'LINT fehler=0 warnungen=0\n');
});

test('cli_LintFlawedPlan_ExitOneWithLines', () => {
  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'lint', writePlan(inTask(['TBD']))], { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^LINT fehler=1 warnungen=0\nFEHLER platzhalter · Task 1: /);
});

test('cli_LintWithoutPlanOrMissingFile_Exit2OrExit1', () => {
  // Act
  const without = spawnSync(process.execPath, [SCRIPT, 'lint'], { encoding: 'utf8' });
  const missing = spawnSync(process.execPath, [SCRIPT, 'lint', '/nicht/da/plan.md'], { encoding: 'utf8' });

  // Assert
  assert.equal(without.status, 2);
  assert.equal(missing.status, 1);
});
