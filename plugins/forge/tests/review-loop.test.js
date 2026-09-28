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
  for (const block of ['Eingaben', 'Reviewer', 'Nacharbeiter', 'Zusatz-Stopps', 'Abschluss-Scout', 'Bericht']) {
    assert.ok(text.includes(`| ${block} |`), `${block} fehlt`);
  }
});

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

test('loop_Round_ForegroundAggregateStopsAndProgress', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  for (const part of ['run_in_background: false', '<PLUGIN>/scripts/aggregate-findings.js" --dir "<D>" --expect <aktiv> --round <r>',
    'failed=', 'clean=true', 'r = N+1', 'unvollständig nach Review r', 'Stillstand in Runde r-1', 'rework-outcome.js" progress --dir "<W>" --round <r-1>',
    'Ergebnis: <D>/<kurzname>.json', 'Ergebnis: <D>/rework.json', '`SendMessage`', 'Statuszeile',
    '<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>', '## Jedes Ende',
    '<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('loop_Tools_ReadPluginFilesAndRunScriptsUnchained', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.ok(text.includes('Plugin-Dateien liest du mit `Read`'));
  assert.ok(text.includes('als einzelnen `node`-Aufruf'));
});

test('loop_Reviewers_StartInForegroundNeverInBackground', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.match(text, /EINER Nachricht je aktivem Reviewer einen `Agent`-Call mit `run_in_background: false`/);
  assert.ok(text.includes('Nie `run_in_background: true`'));
  assert.ok(!/Reviewer laufen parallel im Hintergrund/.test(text));
});

test('loop_ProgressCheck_NamesNoConcreteScript', () => {
  const text = readText(path.join(SHARED, 'loop.md'));
  assert.ok(!text.includes('file-hash.js'));
  assert.ok(!text.includes('DV_FORGE_EOF'), 'kein Heredoc mehr');
  assert.ok(!text.includes('${CLAUDE_PLUGIN_ROOT}'));
});

test('severityRules_TwoYellow_NoLongerEscalate', () => {
  const text = readText(path.join(SHARED, 'severity-rules.md'));
  assert.ok(!text.includes('hochgestuft'));
  assert.ok(text.includes('3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings. Zwei 🟡 an einer Stelle bleiben 🟡.'));
  assert.ok(text.includes('4. Sortierung 🔴 → 🟡 → 🟢.'));
});

test('reportFormat_Generic_TitleAndSkillSpecificParts', () => {
  const text = readText(path.join(SHARED, 'report-format.md'));
  assert.ok(text.includes('## <Berichtstitel>: <pfad des Artefakts>'));
  assert.ok(text.includes('<Zusatz-Status des Skills>'));
  assert.ok(text.includes('<Zusatz-Abschnitte des Skills>'));
  assert.ok(text.includes('Scout ausgefallen'));
  assert.ok(text.includes('Ausgabe von `followup.js save`'));
  assert.ok(!text.includes('Spec-Review:'));
});

test('findingFormat_Generic_LocationKeysIncludeTask', () => {
  const text = readText(path.join(SHARED, 'finding-format.md'));
  assert.ok(text.includes('`Task <n>`'));
  assert.ok(!text.includes('<completeness|consistency'));
});
