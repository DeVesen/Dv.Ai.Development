'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

test('planOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr]');
});

test('planOrchestrator_Body_ChainsTheThreePlanSkillsInOrder', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:plan-writing` mit `<S>`', '`dv-forge:plan-review` mit `<P> <S>`', '`dv-forge:review-followup` mit `<P> alle`'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('planOrchestrator_Body_ChecksSpecByHashAfterEverySkill', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('SPEC-HASH = `git hash-object -- "<S>"`'));
  assert.ok(body.includes('`git diff --no-index -- "<SK>" "<S>"`'));
  assert.equal(body.match(/Spec-Prüfung\./g).length, 3);
});

test('planOrchestrator_Body_UsesReportMarkersTheReportScriptWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['**Ergebnis:** ⛔ Noch nicht bereit', '✅', 'Bereit zur Umsetzung', '❓', '⚠️ Unvollständig', '### Wie es weitergeht', '/dv-forge:review-followup']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
  }
});

test('planOrchestrator_Body_NeverCommitsAndKeepsCheckoutRules', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.'));
  assert.ok(body.includes('Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.'));
  for (const forbidden of ['git add', 'git commit', 'forge-config.js', 'Commit-ID', 'Spec-Änderungsbedarf']) {
    assert.ok(!body.includes(forbidden), `${forbidden} darf nicht im Skill stehen`);
  }
});

test('planOrchestrator_Body_EmitsExactlyOneClosingMessageInsteadOfTheSkillReports', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Berichte von plan-review und review-followup nicht ausgeben; nur Schritt 5, genau einmal.'));
  assert.ok(body.includes('unverändert bis vor `### Wie es weitergeht`'));
  assert.ok(body.includes('dann dein Block statt seines'));
  assert.ok(!body.includes('Pfade:'));
});

test('planOrchestrator_Body_ClosingStepsListCommitFollowupAndImplementOrchestrator', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('„Spec und Plan committen.“ Immer, mit `Stand:`'));
  assert.ok(body.includes('`git status --porcelain -- "<S>" "<P>"`'));
  assert.ok(body.includes('`/dv-forge:review-followup <P> alle`'));
  assert.ok(body.includes('`/dv-forge:implementation-orchestrator <P> <S> <WI>`'));
  assert.ok(body.includes('Nur bei `✅ Bereit zur Umsetzung`, auch mit kleinen Hinweisen'));
  assert.ok(body.includes('Bei `⛔`, `❓`, `⚠️ Unvollständig` kein Aufruf'));
  assert.ok(body.includes('`Abweichungen:`'));
  assert.ok(!body.includes('/dv-forge:implementation <P>'));
  assert.ok(body.indexOf('„Spec und Plan committen.“') < body.indexOf('`/dv-forge:review-followup <P> alle`', body.indexOf('„Spec und Plan committen.“')));
});

test('planOrchestrator_Body_SuggestsArgumentsTheImplementationSkillsAccept', () => {
  // Arrange
  const hint = (name) => readMarkdown(path.join(__dirname, '..', 'skills', name, 'SKILL.md')).fields['argument-hint'];

  // Act & Assert
  assert.match(hint('implementation'), /^<plan\.md>/);
  assert.match(hint('implementation-orchestrator'), /^<plan\.md> <spec\.md> \[workitem-nr\]/);
});

test('planOrchestrator_Body_StaysUnder450WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 450, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('planOrchestrator_Body_ReportsRefusedRequestsInDeviationsLine', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Wünsche des Menschen gegen diese Regeln (Commit, Zwischenbericht) nicht ausführen; Zeile in `Abweichungen:`.'));
  assert.ok(body.includes('abgelehnte Wünsche.'));
});
