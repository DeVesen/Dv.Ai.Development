'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const SHARED = path.join(__dirname, '..', 'shared', 'review-loop');
const OLD_REFERENCES = path.join(__dirname, '..', 'skills', 'spec-review', 'references');

test('sharedLoop_Files_ExistAndOldReferencesAreGone', () => {
  for (const name of ['loop.md', 'finding-format.md', 'severity-rules.md', 'report-format.md']) {
    assert.ok(fs.existsSync(path.join(SHARED, name)), `${name} fehlt`);
  }
  assert.equal(fs.existsSync(OLD_REFERENCES), false);
});

test('loop_BuildingBlocks_AllNamed', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  for (const block of ['Eingaben', 'Reviewer', 'Nacharbeiter', 'Fortschritts-Skript', 'Zusatz-Stopps', 'Abschluss-Scout', 'Bericht']) {
    assert.ok(text.includes(`| ${block} |`), `${block} fehlt`);
  }
});

test('loop_Closing_ScoutRunsOnlyOnRedOrYellowAndIsCheckedMechanically', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.match(text, /`red` > 0 oder `yellow` > 0/);
  assert.match(text, /ohne Runden nach dem einzigen Review/);
  assert.ok(text.includes('## Scout-Vorschläge'));
  assert.ok(text.includes('Scout ausgefallen'));
});

test('loop_Round_ForegroundAggregateStopsAndProgress', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  for (const part of ['run_in_background: false', '<PLUGIN>/scripts/aggregate-findings.js', '--expect <aktiv>',
    'failed=', 'clean=true', 'r = N+1', 'red=0', 'Stillstand in Runde r', '<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('loop_ProgressCheck_NamesNoConcreteScript', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.ok(!text.includes('file-hash.js'));
  assert.ok(!text.includes('${CLAUDE_PLUGIN_ROOT}'));
});

test('reportFormat_Generic_TitleAndSkillSpecificParts', () => {
  const text = readText(path.join(SHARED, 'report-format.md'));
  assert.ok(text.includes('## <Berichtstitel>: <pfad des Artefakts>'));
  assert.ok(text.includes('<Zusatz-Status des Skills>'));
  assert.ok(text.includes('<Zusatz-Abschnitte des Skills>'));
  assert.ok(text.includes('Scout ausgefallen'));
  assert.ok(!text.includes('Spec-Review:'));
});

test('findingFormat_Generic_LocationKeysIncludeTask', () => {
  const text = readText(path.join(SHARED, 'finding-format.md'));
  assert.ok(text.includes('`Task <n>`'));
  assert.ok(!text.includes('<completeness|consistency'));
});
