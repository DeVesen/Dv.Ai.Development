'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');
const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');

test('planOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr]');
});

test('planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithEmbeddedReports', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:plan-writing` mit `<S>`', '`dv-forge:plan-review` mit `<P> <S> --bericht "<BR>"`', '`dv-forge:review-followup` mit `<P> alle --bericht "<BF>"`'];
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

test('planOrchestrator_Body_BranchesOnTheLinesTheEmbeddedReviewPrints', () => {
  // Arrange
  const script = readText(REPORT_TEXT);
  const flow = readText(FLOW);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Zeile `Review abgeschlossen: ⛔ Noch nicht bereit …` UND `FOLLOWUP ja` → 4, sonst 5.'));
  assert.ok(flow.includes('`Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`'));
  assert.ok(script.includes('⛔ Noch nicht bereit'));
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

test('planOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('plan-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 5, genau einmal.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --stand "<Stand>"`'));
  assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 4 lief'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.'));
  for (const gone of ['dein Block statt seines', 'Pfade:', '### Wie es weitergeht']) assert.ok(!body.includes(gone), `${gone} darf nicht im Skill stehen`);
});

test('planOrchestrator_Body_PassesCommitStateAndDeviationsToTheReportScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`Stand` aus `git status --porcelain -- "<S>" "<P>"`'));
  assert.ok(body.includes('beide sauber „bereits committet“'));
  assert.ok(body.includes('eine Zeile `Abweichungen: …`: Toplevel/Branch ≠ START-STATE, abgelehnte Wünsche.'));
  assert.ok(body.includes('`--wi <WI>` nur wenn gegeben'));
  assert.ok(!body.includes('/dv-forge:implementation <P>'));
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
