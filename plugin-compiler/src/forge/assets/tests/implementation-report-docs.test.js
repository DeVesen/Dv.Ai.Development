'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN = path.join(__dirname, '..');
const LOOP = path.join(PLUGIN, 'shared', 'review-loop', 'loop.md');
const SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');
const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.';

function closing(text) {
  return text.slice(text.indexOf('## Abschluss'));
}

test('loop_Closing_RunsScoutCheckReportSaveCleanupAndStatusLineInOrder', () => {
  // Arrange
  const text = closing(readText(LOOP));
  const parts = ['scout-check --review implementation-review --dir "<D>"', 'implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"',
    'followup.js" save <rolle> <slug> "<W>/abschluss"', 'Die zwei Befehle aus Abschnitt Jedes Ende', 'Im Chat steht als letzte Handlung genau die Review-Statuszeile'];

  // Act
  const positions = parts.map((part) => text.indexOf(part));

  // Assert
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(text.includes(PRIO));
  assert.ok(text.includes('die Ausgabe zeigst du nicht'));
  assert.ok(text.includes('Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>'));
  for (const gone of ['guard-orchestrator.js" show', '=== BERICHT ===']) assert.equal(text.includes(gone), false, gone);
});

test('loop_Closing_ScoutCheckOnlyAfterScoutAndFailedReportDropsSaveBeforeEnd', () => {
  // Arrange
  const text = closing(readText(LOOP));

  // Act
  const failure = text.split('\n').find((line) => line.startsWith('2. **Bericht:**'));

  // Assert
  assert.ok(text.includes('Lief der Scout: danach `node "<PLUGIN>/scripts/review-flow.js" scout-check --review implementation-review --dir "<D>"`'));
  assert.equal(text.includes('Du bewertest die Vorschläge nicht. Danach'), false, 'scout-check ohne Bedingung');
  assert.ok(failure.includes('`ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat'), failure);
  assert.ok(failure.includes('Exit ungleich 0: die Meldung unverändert ausgeben'), failure);
  assert.ok(failure.includes('`node "<PLUGIN>/scripts/followup.js" drop <rolle> <slug>`'), failure);
  assert.ok(failure.includes('weiter mit Abschnitt Jedes Ende'), failure);
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
  // Arrange
  const text = readText(FOLLOWUP_FLOW);

  // Act
  const implementation = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('## Ende'));

  // Assert
  assert.ok(implementation.includes('followup.js" keep review <slug> <nummern>'));
  assert.ok(implementation.includes('`alle behoben, keine neuen 🔴`'));
  assert.equal(text.includes('mit den bisherigen Nummern'), false);
});
