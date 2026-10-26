'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');
const { SUB_SKILLS, START_COMMAND } = require('../scripts/lib/entry-guard');

const README = path.join(__dirname, '..', 'README.md');

test('readme_Skills_ListSessionOrchestratorAndSpecGrilling', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes('| `session-orchestrator` | Session-Kette führen'));
  assert.ok(text.includes('| `spec-grilling` | Geschriebene Spec auf Grenzfälle'));
});

test('readme_Ablauf_NamesSessionChainStateAndBaseFile', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes('4. **Session-Kette:** `session-orchestrator`'));
  assert.ok(text.includes('`<git-common-dir>/dv-forge/session-chain/`'));
  assert.ok(text.includes('`shared/session-chain/base-sub-agent.md`'));
  assert.ok(text.includes('Das Whiteboarding prüft seine Spec in derselben Etappen-Session mit dem Spec-Review-Orchestrator; jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session.'));
});

test('readme_Ablage_NamesTheOneDataChannelAndItsPlace', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes('Die Ablage ist der eine Datenkanal zwischen Etappe und Leit-Session und immer eingeschaltet'));
  assert.ok(text.includes('`<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/`'));
});

test('readme_StartCommand_NamesTheOnlyEntryTheDebugSwitchAndTheTools', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes(`**Startbefehl:** dv-forge betritt man nur über \`${START_COMMAND}\``));
  assert.ok(text.includes('Zum Debuggen hängt man `--debug` an'));
  assert.ok(text.includes('`init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe und bleiben von Hand aufrufbar.'));
});

test('readme_SkillTable_MarksEverySubSkillAsInternAndTheOthersNot', () => {
  // Arrange
  const rows = readText(README).split('\n').filter((line) => line.startsWith('| `'));
  const rowOf = (name) => rows.find((line) => line.split('|')[1].split(',').map((cell) => cell.trim()).includes(`\`${name}\``));

  // Assert
  for (const name of SUB_SKILLS) assert.ok(rowOf(name)?.endsWith('| intern |'), `${name}: ${rowOf(name)}`);
  assert.ok(rowOf('session-orchestrator').endsWith('| Startbefehl |'));
  for (const name of ['init', 'commit-message', 'domain-modeling', 'merge-conflict-resolution']) assert.ok(rowOf(name).endsWith('| von Hand |'), name);
});

test('readme_Orchestrators_EndWithThreeSectionsAndReviewsPrintOnlyTheStatusLine', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes('Alle drei Orchestratoren enden mit genau einem Abschlussbericht in drei Abschnitten'));
  assert.ok(text.includes('Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>'));
  assert.equal(text.includes('Wie es weitergeht'), false);
});

test('readme_FollowupRounds_DescribeRedOnlyLoopAbortAndHalt', () => {
  // Act
  const text = readText(README);

  // Assert
  for (const part of ['solange der letzte Bericht ein offenes 🔴 mit Scout-Vorschlag nennt', '`ABBRUCH=maximum|stillstand`', '🟡 und 🟢 lösen keine Runde aus', '`Iterationen: <n> von <max>`', 'die Leit-Session zeigt die Zeile am Haltepunkt und führt offene 🔴 mit Herkunft']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
  assert.equal(text.includes('unabhängig von ✅, ⛔ oder ❓'), false, 'das alte Followup-Kriterium ist weg');
});
