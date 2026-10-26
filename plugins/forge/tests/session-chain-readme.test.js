'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

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

test('readme_Ablage_NamesOptionPlaceAndUnchangedDefault', () => {
  // Act
  const text = readText(README);

  // Assert
  assert.ok(text.includes('Mit `--ablage <etappe>` legen die drei Orchestratoren, `plan-review` und `review-followup`'));
  assert.ok(text.includes('Ohne die Option bleibt alles wie bisher.'));
});
