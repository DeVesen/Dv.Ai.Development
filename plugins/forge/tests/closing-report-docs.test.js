'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION } = require('./lib/former-names');

const PLUGIN = path.join(__dirname, '..');
const FLOW = path.join(PLUGIN, 'shared', 'review-flow', 'flow.md');
const SPEC_SKILL = path.join(PLUGIN, 'skills', 'spec-review', 'SKILL.md');
const PLAN_SKILL = path.join(PLUGIN, 'skills', 'plan-review', 'SKILL.md');
const IMPLEMENTATION_SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
const FOLLOWUP_SKILL = path.join(PLUGIN, 'skills', 'review-followup', 'SKILL.md');
const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');

function section(text, title) {
  const start = text.indexOf(`## ${title}\n`);
  assert.ok(start > -1, `Abschnitt ${title} fehlt`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_End_ReportWritesToTheAblageAndTheChatShowsOnlyTheStatusLine', () => {
  // Arrange
  const text = readText(FLOW);

  // Act
  const end = section(text, 'Ende');
  const chat = end.split('\n').find((line) => line.startsWith('4. Im Chat steht als letzte Handlung'));

  // Assert
  assert.ok(end.includes('Die Ausgabe hat zwei Zeilen: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`.'));
  assert.ok(end.includes('du übergibst dafür nichts'));
  assert.ok(chat, 'Schritt 4 fehlt');
  assert.ok(chat.includes('genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert'));
  assert.ok(chat.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
  for (const gone of ['=== BERICHT ===', FORMER_ABLAGE_OPTION, FORMER_REPORT_OPTION, 'guard-orchestrator.js" show', 'COMMIT-PRUEFUNG', FORMER_EMBEDDED_SECTION, 'Nächster Schritt']) assert.equal(text.includes(gone), false, gone);
  assert.ok(text.includes('| Bericht | Titel und Artefakt |'));
});

test('reviewSkills_Ablage_NamedWithoutParametersForSpecPlanAndImplementation', () => {
  for (const file of [SPEC_SKILL, PLAN_SKILL, IMPLEMENTATION_SKILL]) {
    // Act
    const { fields, body } = readMarkdown(file);

    // Assert
    assert.ok(section(body, 'Ablage').includes('Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.'), file);
    assert.ok(fields['argument-hint'].includes('[--debug]'), file);
    for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION]) assert.equal(fields['argument-hint'].includes(gone), false, `${gone} im Hint von ${file}`);
    for (const gone of [FORMER_EMBEDDED_SECTION, FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'Auswahl-Hinweis', 'Hinweise des Orchestrators']) assert.equal(body.includes(gone), false, `${gone} in ${file}`);
    assert.ok(wordCount(body) < 500, file);
  }
});

test('specReviewSkill_Report_ComesFromReportAndPassesTheWhiteboardingSwitchOnlyThroughPrepare', () => {
  // Act
  const { fields, body } = readMarkdown(SPEC_SKILL);

  // Assert
  assert.ok(section(body, 'Bericht').includes('den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile'));
  assert.ok(fields['argument-hint'].includes('[--whiteboarding]'));
  assert.ok(section(body, 'Ablage').includes('`--whiteboarding` und `--debug` reicht `prepare.js` selbst durch.'));
});

test('planReviewSkill_Report_AsksNoCommitQuestionAndKeepsTheSpecQuestionInTheReport', () => {
  // Act
  const { body } = readMarkdown(PLAN_SKILL);
  const report = section(body, 'Bericht');

  // Assert
  assert.ok(report.includes('Du fragst nicht nach einem Commit.'));
  assert.ok(report.includes('Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen.'));
  for (const gone of ['Soll ich Spec und Plan jetzt committen?', 'git status --porcelain', 'COMMIT-PRUEFUNG', 'Commit-Konvention']) assert.equal(body.includes(gone), false, gone);
});

test('reviewFollowupSkill_HintAcceptsAlleAndTheBodyStaysShort', () => {
  // Act
  const { fields, body } = readMarkdown(FOLLOWUP_SKILL);

  // Assert
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl>');
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_SpecAndPlan_ReportFromScriptAndSaveAlways', () => {
  // Arrange
  const text = readText(FOLLOWUP_FLOW);

  // Act
  const verification = text.slice(text.indexOf('## Nachprüfung'), text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')));

  // Assert
  assert.ok(verification.includes('6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.'));
  assert.ok(verification.includes('Die Ausgabe hat zwei Zeilen: `ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat.'));
  assert.equal(verification.includes('entfällt `save`'), false);
});

test('reviewFollowupSkill_Body_NamesAlleAndLeavesHintsToTheReport', () => {
  // Act
  const { body } = readMarkdown(FOLLOWUP_SKILL);

  // Assert
  assert.ok(body.includes('Auswahl: `alle`'), 'alle fehlt');
  assert.ok(body.includes('`<n>` und `<g>:<n|b>,…` zählen die Gruppen in der Reihenfolge der gesicherten Abschlussdaten; der Bericht zeigt diese Nummern nicht, darum ist `alle` der Normalfall.'));
  assert.ok(body.includes('der Bericht enthält die Hinweise'));
  assert.ok(body.includes('Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.'));
  for (const gone of ['Commit-Prüfung', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'guard-orchestrator.js" show']) assert.equal(body.includes(gone), false, gone);
});
