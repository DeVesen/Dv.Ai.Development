'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN = path.join(__dirname, '..');
const LOOP = path.join(PLUGIN, 'shared', 'review-loop', 'loop.md');
const SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');
const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.';

function closing(text) {
  return text.slice(text.indexOf('## Abschluss'));
}

test('loop_Closing_RunsScoutCheckReportSaveShowInOrder', () => {
  const text = closing(readText(LOOP));
  const parts = ['scout-check --review implementation-review --dir "<D>"', 'implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"',
    'followup.js" save <rolle> <slug> "<W>/abschluss"', 'guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"', 'Die zwei Befehle aus „Jedes Ende“'];
  const positions = parts.map((part) => text.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(text.includes(PRIO));
  assert.ok(text.includes('die Ausgabe zeigst du nicht'));
  assert.ok(text.includes('Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>'));
});

test('loop_BuildingBlocks_ReportRowNamesTitleAndArtifactOnly', () => {
  assert.ok(readText(LOOP).includes('| Bericht | Titel und Artefakt |'));
});

test('implementationReviewSkill_Report_ComesFromScriptWithoutSelectionHint', () => {
  const { body } = readMarkdown(SKILL);
  const report = body.slice(body.indexOf('## Bericht'));
  for (const part of ['den Rest liefert `implementation-report.js`', '`<P>`, `<B>` und `<K>`', '`geprüft, k × 🔴 offen`']) assert.ok(report.includes(part), part);
  for (const gone of ['Auswahl-Hinweis', 'Auswahl: b =', 'Hinweise des Orchestrators', 'Nächster Schritt:']) assert.equal(body.includes(gone), false, gone);
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_Implementation_KeepsOnlyOpenGroupsAndOffersAlle', () => {
  const text = readText(FOLLOWUP_FLOW);
  const implementation = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('## Bericht'));
  assert.ok(implementation.includes('followup.js" keep review <slug> <offen>'));
  assert.ok(implementation.includes('`alle behoben, keine neuen 🔴`'));
  const next = text.slice(text.indexOf('## Nächster Schritt'));
  assert.ok(next.includes('/dv-forge:review-followup <artefakt> alle'));
  assert.equal(next.includes('mit den bisherigen Nummern'), false);
});
