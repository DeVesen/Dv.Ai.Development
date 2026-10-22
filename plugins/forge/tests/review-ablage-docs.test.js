'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText } = require('./lib/markdown');

const ROOT = path.join(__dirname, '..');
const FLOW = path.join(ROOT, 'shared', 'review-flow', 'flow.md');
const FOLLOWUP_FLOW = path.join(ROOT, 'skills', 'review-followup', 'references', 'flow.md');
const PLAN_REVIEW = path.join(ROOT, 'skills', 'plan-review', 'SKILL.md');
const FOLLOWUP = path.join(ROOT, 'skills', 'review-followup', 'SKILL.md');

test('flow_End_AblageAppendsOptionAndKeepsEverythingElse', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('**Ablage** (`prepare.js` liefert `ablage=<E>`): Schritt 1 bekommt `--ablage <E>`; die Ausgabe hat zusätzlich die Zeile `ABLAGE <datei> · FOLLOWUP <ja|nein>`, sonst bleibt alles gleich.'));
});

test('reviewFollowupFlow_Report_GetsAblageWhenPrepareNamesIt', () => {
  // Act
  const text = readText(FOLLOWUP_FLOW);

  // Assert
  assert.ok(text.includes('Liefert `prepare.js` `ablage=<E>`, bekommt `report` zusätzlich `--ablage <E>`.'));
});

test('planReview_AblageSection_PointsToFlowAndKeepsStandaloneRun', () => {
  // Act
  const { fields, body } = readMarkdown(PLAN_REVIEW);

  // Assert
  assert.ok(body.includes('## Ablage\nNennt `$ARGUMENTS` `--ablage <E>`, liefert `prepare.js` die Zeile `ablage=<E>`; dann gilt die Ablage aus `flow.md`, Abschnitt „Ende“. Ohne `--ablage` läuft alles wie beschrieben.'));
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>] [--bericht <datei>]');
});

test('reviewFollowup_Body_NamesAblageOption', () => {
  // Act
  const { body } = readMarkdown(FOLLOWUP);

  // Assert
  assert.ok(body.includes('`--ablage <E>` legt Bericht und Bericht-Daten in die Ablage der Session-Kette; dann liefert `prepare.js` `ablage=<E>`.'));
});
