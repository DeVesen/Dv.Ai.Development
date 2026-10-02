'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');

const PLUGIN = path.join(__dirname, '..');
const FLOW = path.join(PLUGIN, 'shared', 'review-flow', 'flow.md');
const SPEC_SKILL = path.join(PLUGIN, 'skills', 'spec-review', 'SKILL.md');
const PLAN_SKILL = path.join(PLUGIN, 'skills', 'plan-review', 'SKILL.md');
const FOLLOWUP_SKILL = path.join(PLUGIN, 'skills', 'review-followup', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');

function section(text, title) {
  const start = text.indexOf(`## ${title}\n`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_End_PrintsReportTextOnlyAndDropsOrchestratorAppendices', () => {
  const end = section(readText(FLOW), 'Ende');
  const report = end.split('\n').find((line) => line.startsWith('3. Bericht im Chat:'));
  assert.ok(report, 'Schritt 3 fehlt');
  assert.ok(report.includes('der Text nach `=== BERICHT ===` unverändert'));
  for (const gone of ['Hinweise des Orchestrators', 'Zusatz-Abschnitte', 'Nächster Schritt:', 'Ausgabe von `save`']) assert.equal(report.includes(gone), false, gone);
  assert.ok(report.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
  assert.ok(readText(FLOW).includes('| Bericht | Titel und Artefakt |'));
});

test('specReviewSkill_Report_ComesFromReportWithoutSelectionHintOrNextStepText', () => {
  const text = readText(SPEC_SKILL);
  const report = section(text, 'Bericht');
  assert.ok(report.includes('den Rest liefert `report`'));
  for (const gone of ['Auswahl-Hinweis', 'Nächster Schritt:', 'Auswahl: b =']) assert.equal(text.includes(gone), false, gone);
  assert.equal(text.includes('Hinweise des Orchestrators'), false);
});

test('planReviewSkill_Report_KeepsCommitCheckAndDropsSelectionHint', () => {
  const text = readText(PLAN_SKILL);
  const report = section(text, 'Bericht');
  for (const part of ['den Rest liefert `report`', 'git status --porcelain -- "<S>" "<P>"', 'Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention']) {
    assert.ok(report.includes(part), `${part} fehlt`);
  }
  for (const gone of ['Auswahl-Hinweis', 'Auswahl: b =', 'Hinweise des Orchestrators']) assert.equal(text.includes(gone), false, gone);
});

test('reviewFollowupSkill_HintAcceptsAlleAndShowsReportFromScript', () => {
  const { fields, body } = readMarkdown(FOLLOWUP_SKILL);
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl>');
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_SpecAndPlan_ReportFromScriptAndSaveAlways', () => {
  const text = readText(FOLLOWUP_FLOW);
  const verification = text.slice(text.indexOf('## Nachprüfung'), text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')));
  assert.ok(verification.includes('6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.'));
  assert.equal(verification.includes('entfällt `save`'), false);
  const report = section(text, 'Bericht');
  assert.ok(report.includes('- Spec und Plan: der Text nach `=== BERICHT ===` unverändert.'));
  const specPlanLine = report.split('\n').find((line) => line.startsWith('- Spec und Plan:'));
  assert.equal(specPlanLine.includes('Umgesetzt'), false);
  assert.ok(section(text, 'Nächster Schritt').includes('Bei Spec und Plan steht der nächste Schritt im Bericht'));
});
