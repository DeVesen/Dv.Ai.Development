'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-review', 'SKILL.md');
const REVIEWERS = ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'];

test('planReviewSkill_Frontmatter_ManualOnlyWithArgumentHintWithoutRounds', () => {
  const { fields } = readMarkdown(SKILL);
  assert.equal(fields.name, 'plan-review');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>]');
});

test('planReviewSkill_Body_ReadsSharedFlowWithBuildingBlocks', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`', '`<SESSION>` = `${CLAUDE_SESSION_ID}`', '${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md',
    '`<art>` = `plan-review`', '`<DOK>` = `<P>`', 'Titel `Plan-Review`', 'Rolle `plan-review`', '${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" plan-review $ARGUMENTS']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.ok(!body.includes('review-loop/loop.md'));
  assert.ok(!body.includes('rework-outcome.js'));
  assert.ok(!body.includes('--rounds'));
});

test('planReviewSkill_Body_ListsAllAgentsAndInputs', () => {
  const { body } = readMarkdown(SKILL);
  for (const reviewer of REVIEWERS) assert.ok(body.includes(`dv-forge:plan-review-${reviewer}`), `${reviewer} fehlt`);
  for (const agent of ['dv-forge:plan-rework', 'dv-forge:plan-review-verifier', 'dv-forge:plan-review-scout']) assert.ok(body.includes(agent), `${agent} fehlt`);
  assert.ok(body.includes('`aktiv` kommt aus `prepare.js`'));
  assert.ok(body.includes('Du startest genau die Reviewer aus `aktiv`'));
  assert.ok(body.includes('`Build: <Build>`, `Test: <Test>`, `Lint: <Lint>`'));
  assert.ok(body.includes('Jeder Reviewer bekommt zusätzlich `Anker: <A>`, wenn es `A` gibt.'));
  assert.ok(body.includes('jede `WARN`-Zeile kommt in die Hinweise des Orchestrators'));
});

test('planReviewSkill_Body_AnchorsRefreshedAfterRework', () => {
  const { body } = readMarkdown(SKILL);
  const after = body.slice(body.indexOf('## Nach der Nacharbeit'), body.indexOf('## Nachprüfer'));
  assert.ok(after.includes('${CLAUDE_PLUGIN_ROOT}/scripts/plan-tasks.js" anchors "<P>" "<R>" "<W>"'));
});

test('planReviewSkill_Body_NextStepPerStatusWithCommitQuestion', () => {
  const { body } = readMarkdown(SKILL);
  for (const part of ['`sauber …`', '`Fragen offen`', '`nicht bereit …`', '`unvollständig …`', '/dv-forge:implementation <P>', 'frischen Session',
    'git status --porcelain -- "<S>" "<P>"', 'Leere Ausgabe: keine Frage', 'Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention',
    'Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.', '/dv-forge:review-followup <P> <auswahl>', 'Spec-Rückfragen',
    '`Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('planReviewSkill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('planReviewSkill_NextStep_TextPerStatusWithOnlyHintAndCommitOutcomes', () => {
  const { body } = readMarkdown(SKILL);
  const next = body.slice(body.indexOf('## Nächster Schritt'));
  for (const part of [
    'Hat `save` Scout-Vorschläge ausgegeben, steht zuerst `Offene 🟡: optional /dv-forge:review-followup <P> <auswahl>.` und der Auswahl-Hinweis.',
    'Leere Ausgabe: keine Frage, beide sind committet',
    'Sonst: `Plan ist bereit. Soll ich Spec und Plan jetzt committen?`',
    'Nach dem Ja committest du beide Dateien',
    'Dann in einer frischen Session ein Code-Block `/dv-forge:implementation <P>`.',
    'Bei Nein oder ohne Antwort: kein Commit und kein weiterer Schritt.',
    'Schlägt der Commit fehl: die Fehlermeldung wörtlich ausgeben, kein `/dv-forge:implementation <P>`.',
    '`Spec-Rückfragen offen. Spec anpassen, dann /dv-forge:spec-review <S>, danach /dv-forge:plan-review <P> erneut.`',
    'oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.',
  ]) {
    assert.ok(next.includes(part), `${part} fehlt`);
  }
});
