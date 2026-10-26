'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION } = require('./lib/former-names');

const DIR = path.join(__dirname, '..', 'skills', 'review-followup');
const SKILL = path.join(DIR, 'SKILL.md');
const FLOW = path.join(DIR, 'references', 'flow.md');

test('reviewFollowupSkill_Frontmatter_ModelInvocableWithArgumentHint', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'review-followup');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl> [--spec <pfad>] [--base <ref>] [--whiteboarding] [--debug]');
});

test('reviewFollowupSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS', 'references/flow.md',
    '${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md', '`original`', '`offen`', 'dv-forge:implementation-implementer', 'dv-forge:implementation-re-reviewer',
    'Nachprüfung, genau eine', 'kein Reviewer läuft', 'shared/review-flow/flow.md', 'scripts/workspace.js" remove <rolle> <slug>', 'scripts/guard-orchestrator.js" release', 'run_in_background: false']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupFlow_Reference_SpecAndPlanWithoutReviewerRound', () => {
  const text = readText(FLOW);
  assert.doesNotMatch(text, /--expect <aktiv>|--round 1|plan-tasks.js" anchors/);
});

test('reviewFollowupFlow_Reference_FailedReworkOrVerifierStillReportsWithoutSaveOrDrop', () => {
  const text = readText(FLOW);
  assert.ok(text.includes('Meldet `attempt` für `nacharbeit` oder `nachprüfer` `AUSGEFALLEN`, geht es statt mit dem Abschnitt Ende von `flow.md` mit Schritt 5 von „Nachprüfung · Spec und Plan“ (`report`) weiter, danach mit dessen Schritt 6 ohne `save` und ohne `drop`.'));
});

test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
  assert.ok(fs.existsSync(FLOW));
  const text = readText(FLOW);
  for (const part of ['Vorschläge: <F>', 'Eintrag: R<n>', 'Ergebnis: <W>/nacharbeit/rework.json', '--quelle nacharbeit', 'review-flow.js" snapshot --dir "<W>" --doc "<DOC>"',
    'review-flow.js" rework-check <FLAGS>', 'review-flow.js" checklist <FLAGS>', 'review-flow.js" verify <FLAGS>', 'review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)"',
    'review-flow.js" script-checks <FLAGS> --runde runde-2',
    'Prüfliste: <W>/runde-2/pruefliste.md', 'Kein Reviewer läuft.', 'followup.js" save <rolle> <slug> "<W>/abschluss"',
    'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"', 'followup.js" drop review <slug>', 'Kein Scout', 'nicht gewählt',
    'bleibt die alte Sicherung', '--hinweis', 'keine Änderung', 'blockiert']) {
    assert.ok(text.includes(part), `${part} fehlt`);
  }
});

test('reviewFollowupFlow_ImplementationStatus_NamesNoGroupNumbersOfTheOldSave', () => {
  // keep nummeriert die verbliebenen Gruppen ab 1 neu; alte Nummern im Status wären danach falsch.
  const text = readText(FLOW);
  assert.ok(text.includes('dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen`'));
  assert.equal(text.includes('Gruppen <offen>'), false);
});

test('reviewFollowupSkill_Body_EndsWithTheStatusLineAfterCleanupAndPassesNoReportParameter', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const release = body.indexOf('scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}');

  // Assert
  assert.ok(release > -1, 'release fehlt');
  assert.ok(body.indexOf('Im Chat steht als letzte Handlung die Review-Statuszeile') > release, 'die Statuszeile steht nach dem Aufräumen');
  assert.ok(body.includes('die Formatregeln stehen in `flow.md`, Abschnitt Ende'));
  for (const gone of ['guard-orchestrator.js" show', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'Commit-Prüfung']) assert.equal(body.includes(gone), false, `${gone} entfällt`);
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_End_KeepsPriorityAndShowsOnlyTheStatusLine', () => {
  const text = readText(FLOW);
  const ending = text.slice(text.indexOf('## Ende'));
  assert.ok(ending.includes('genau die Review-Statuszeile'));
  assert.ok(ending.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
  for (const gone of [`## ${FORMER_EMBEDDED_SECTION}`, '## Nächster Schritt', '=== BERICHT ===', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'followup.js" next']) assert.equal(text.includes(gone), false, `${gone} entfällt`);
});

test('reviewFollowupSkill_Body_TakesNoNextStepTextsFromImplementationReview', () => {
  const { body } = readMarkdown(SKILL);
  assert.equal(body.includes('die Texte für `Nächster Schritt`'), false);
  assert.ok(body.includes('Bei `implementation-review` entfällt der Schritt: Implementer und Re-Reviewer bekommen ihre Eingaben aus `flow.md`, und es läuft kein Scout.'));
  assert.equal(body.includes('des Abschnitts Abschluss-Scout'), false, 'das Followup der Implementierung startet keinen Scout');
});

test('reviewFollowupFlow_ImplementationSave_FollowsTheBehaltenLineOfTheReportScript', () => {
  const text = readText(FLOW);
  const script = readText(path.join(__dirname, '..', 'scripts', 'lib', 'implementation-followup-report.js'));
  const step = text.slice(text.indexOf('3. Bericht und Sicherung:'), text.indexOf('4. Status:'));
  for (const part of ['implementation-report.js" followup --workspace "<W>" <<\'ANTWORT\'', '`STATUSZEILE <Review-Statuszeile>`', '`BEHALTEN <x>`', '`keine` → ', 'followup.js" drop review <slug>',
    'followup.js" keep review <slug> <nummern>', '`unveraendert` → nichts, es bleibt die alte Sicherung']) {
    assert.ok(step.includes(part), `${part} fehlt`);
  }
  for (const word of ['BEHALTEN unveraendert', "kept.join(',') : 'keine'"]) assert.ok(script.includes(word), `${word} fehlt im Skript`);
});

test('reviewFollowupFlow_ImplementationWithoutReReview_ContinuesAtReportDataStepWithOhneValue', () => {
  // Arrange
  const text = readText(FLOW);
  const implementing = text.slice(text.indexOf('### Implementierung'), text.indexOf('## Nachprüfung'));
  const checking = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('2. `dv-forge:implementation-re-reviewer`'));

  // Act
  const blocked = implementing.split('\n').find((line) => line.startsWith('3. Status `blocked`'));
  const unchanged = checking.split('\n').find((line) => line.startsWith('1. Paket'));

  // Assert
  assert.ok(blocked?.includes('weiter mit Schritt 3 von „Nachprüfung · Implementierung“ (`--ohne blockiert`)'));
  assert.ok(unchanged?.includes('weiter mit Schritt 3 dieses Abschnitts (`--ohne keine-aenderung`)'));
  assert.equal(text.includes('weiter mit dem Bericht'), false);
});
