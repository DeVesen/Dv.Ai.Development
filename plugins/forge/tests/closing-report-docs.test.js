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
  assert.ok(start > -1, `Abschnitt ${title} fehlt`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test('flow_End_PrintsReportTextOnlyAndDropsOrchestratorAppendices', () => {
  const end = section(readText(FLOW), 'Ende');
  const report = end.split('\n').find((line) => line.startsWith('4. Bericht im Chat:'));
  assert.ok(report, 'Schritt 4 fehlt');
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
  assert.ok(report.includes('Der Text nach `=== BERICHT ===` unverändert'));
  assert.ok(section(text, 'Nächster Schritt').includes('Bei Spec und Plan steht der nächste Schritt im Bericht'));
});

test('flow_End_StepOne_NamesStatusLineForSkillStepsInsteadOfNextStep', () => {
  const end = section(readText(FLOW), 'Ende');
  assert.ok(end.includes('Die Zeile `ENDE <status>` braucht der Skill für eigene Schritte (Plan: `COMMIT-PRUEFUNG ja|nein`).'));
  assert.equal(end.includes('wählt den nächsten Schritt'), false);
});

test('reviewFollowupFlow_NextStep_PlanCommitCheckComesFromScriptLineAndLivesOnlyInPlanReviewSkill', () => {
  const flow = readText(FOLLOWUP_FLOW);
  const next = section(flow, 'Nächster Schritt');
  for (const part of ['followup.js" next --original <original> --status "<status>" --ergebnis "<zeile>"', '`COMMIT-PRUEFUNG ja`', 'Commit-Prüfung des Original-Skills (`plan-review`, Abschnitt Bericht)', 'weder Commit-Prüfung noch Frage']) {
    assert.ok(next.includes(part), `${part} fehlt`);
  }
  for (const gone of ['git status --porcelain', 'Soll ich Spec und Plan jetzt committen?', 'Commit-Konvention']) assert.equal(flow.includes(gone), false, `${gone} steht nur im Original-Skill`);
  const plan = readText(PLAN_SKILL);
  for (const part of ['git status --porcelain -- "<S>" "<P>"', 'Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention']) assert.ok(plan.includes(part), `${part} fehlt im plan-review-Skill`);
});

test('reviewFollowupFlow_NextStep_HasNoHandWrittenStepList', () => {
  const next = section(readText(FOLLOWUP_FLOW), 'Nächster Schritt');
  for (const gone of ['- `sauber nach Nach-Review`', '- `unvollständig, …`:', 'Implementierung offen, `keine Änderung`', 'chain.js" lookup']) assert.equal(next.includes(gone), false, gone);
  for (const kept of ['`NAECHSTER <text>`', '`CODE <befehl>`', '`--behalten <x>`', '`--plan "<P>"`']) assert.ok(next.includes(kept), `${kept} fehlt`);
});

test('reviewFollowupSkill_Body_NamesAlleAndLeavesHintsAndNextStepToReport', () => {
  const { body } = readMarkdown(FOLLOWUP_SKILL);
  assert.ok(body.includes('Auswahl: `alle`'), 'alle fehlt');
  for (const gone of ['Auswahl: `b` = bevorzugter Vorschlag je Gruppe', 'Scout-Abschnitt des letzten Berichts', 'Jede `WARN`-Zeile kommt in die Hinweise.', 'sowie die Texte für `Nächster Schritt`.']) assert.equal(body.includes(gone), false, gone);
  assert.equal(body.includes('Die Nummern stehen im letzten Bericht.'), false, 'der Bericht zeigt keine Gruppennummern');
  assert.ok(body.includes('`<n>` und `<g>:<n|b>,…` zählen die Gruppen in der Reihenfolge der gesicherten Abschlussdaten; der Bericht zeigt diese Nummern nicht, darum ist `alle` der Normalfall.'));
  assert.ok(body.includes('der Bericht enthält die Hinweise'));
  assert.ok(body.includes('bei `plan-review` die Commit-Prüfung'));
  assert.ok(wordCount(body) < 500);
});

test('flow_End_EmbeddedRunWritesDataSkipsShowAndPrintsOneLine', () => {
  const end = section(readText(FLOW), 'Ende');
  for (const part of ['**Eingebetteter Lauf**', '`--bericht "<BD>"`', '`ERGEBNIS <ergebnis>`', 'In Schritt 3 entfällt `show`.', '`Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`', 'keine Commit-Prüfung']) {
    assert.ok(end.includes(part), `${part} fehlt`);
  }
});

test('reviewSkills_EmbeddedSection_NamesBerichtAndKeepsStandaloneUnchanged', () => {
  for (const file of [SPEC_SKILL, PLAN_SKILL]) {
    const { fields, body } = readMarkdown(file);
    assert.ok(fields['argument-hint'].includes('[--bericht <datei>]'), file);
    const embedded = section(body, 'Eingebetteter Lauf');
    assert.ok(embedded.includes('Ohne `--bericht` läuft alles wie beschrieben.'), file);
  }
  assert.ok(section(readMarkdown(PLAN_SKILL).body, 'Eingebetteter Lauf').includes('keine Commit-Prüfung'));
});

test('reviewFollowupFlow_EmbeddedRun_PassesBerichtToReportAndImplementationScript', () => {
  const embedded = section(readText(FOLLOWUP_FLOW), 'Eingebetteter Lauf');
  for (const part of ['`--bericht "<BD>"`', 'Schritt 3 der Nachprüfung läuft mit dem `<BD>` aus `$ARGUMENTS`', 'In Schritt 6 entfällt `show`.']) {
    assert.ok(embedded.includes(part), `${part} fehlt`);
  }
  const flow = readText(FOLLOWUP_FLOW);
  for (const part of ['`node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" --artefakt "<P>" <<\'ANTWORT\'`', 'statt `--artefakt "<P>"` die Option `--bericht "<BD>"`', '`--ohne blockiert`']) {
    assert.ok(flow.includes(part), `${part} fehlt`);
  }
});

test('planReviewSkill_CommitCheck_RunsOnlyOnTheCommitCheckLineOfReport', () => {
  const report = section(readMarkdown(PLAN_SKILL).body, 'Bericht');
  assert.ok(report.includes('nur bei `COMMIT-PRUEFUNG ja` in der Ausgabe von `report` (bei `nein` weder Prüfung noch Frage)'));
  assert.equal(report.includes('bei `sauber nach Runde 1` und `sauber nach Nachprüfung`'), false, 'die Bedingung prüft das Skript');
});
