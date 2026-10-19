'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

test('specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'spec-review-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr]');
});

test('specReviewOrchestrator_Body_ChainsReviewThenOneFollowup', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:spec-review` mit `<S>`, kein weiteres Argument', '`dv-forge:review-followup` mit `<S> alle`, genau einmal'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.ok(positions[0] < positions[1]);
});

test('specReviewOrchestrator_Body_UsesReportMarkersTheReportScriptWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['**Ergebnis:** ⚠️ Unvollständig', '⛔', '❓', 'Bereit zum Planen', '### Wie es weitergeht', '/dv-forge:review-followup']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
  }
});

test('specReviewOrchestrator_Body_TellsPauseFromReportByHeadingsTheScriptsWrite', () => {
  // Arrange
  const haltText = readText(path.join(__dirname, '..', 'scripts', 'lib', 'halt-text.js'));

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`### Frage …` = Pause (Regel 2). Bericht = Text mit `### Wie es weitergeht`'));
  assert.ok(haltText.includes('### Frage ${number} von ${total}'));
  assert.ok(!haltText.includes('### Wie es weitergeht'));
});

test('specReviewOrchestrator_Body_StaysOnCurrentBranchWithoutWorktree', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree oder „nie auf master“ verlangt'));
  assert.ok(body.includes('Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.'));
  assert.ok(body.includes('`git rev-parse --path-format=absolute --git-dir --git-common-dir`'));
  assert.ok(body.includes('`git branch --show-current` leer'));
});

test('specReviewOrchestrator_Body_CommitsOnlyTheSpecWithoutNumberWhenWorkitemMissing', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`'));
  assert.ok(body.includes('`git check-ignore -q -- "<S>"`'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`'));
  assert.ok(body.includes('Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach'));
  assert.ok(body.includes('Ohne `<WI>`: `docs: review spec <slug>`.'));
  assert.ok(body.includes('Mit `<WI>`: `docs(<WI>): review spec <slug>`'));
  assert.ok(body.includes('Commit, auch bei `⛔` oder `❓`.'));
  assert.ok(body.includes('eine Zeile, ein `-m`, kein Body'));
});

test('specReviewOrchestrator_Body_TitlesSessionWithWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „<WI>: <slug>“, ohne `<WI>` „<slug>“'));
});

test('specReviewOrchestrator_Body_EmitsExactlyOneClosingMessageInsteadOfTheSkillReports', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Skill-Berichte nicht ausgeben; nur Schritt 6, genau einmal.'));
  assert.ok(body.includes('unverändert bis vor `### Wie es weitergeht`'));
  assert.ok(body.includes('dann dein Block statt seines'));
});

test('specReviewOrchestrator_Body_ClosingStepsListCommitFollowupAndPlanOrchestrator', () => {
  // Arrange
  const hint = readMarkdown(path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md')).fields['argument-hint'];

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.equal(hint, '<spec.md> [workitem-nr]');
  assert.ok(body.includes('„Spec committen.“ Immer, mit Ergebnis'));
  assert.ok(body.includes('`/dv-forge:review-followup <S> alle`'));
  assert.ok(body.includes('Bei `✅ Bereit zum Planen`'));
  assert.ok(body.includes('`/dv-forge:plan-orchestrator <S> <WI>`'));
  assert.ok(body.includes('Bei `⛔`, `❓`, `⚠️ Unvollständig` oder Abbruch kein Aufruf'));
  assert.ok(body.includes('`Abweichungen:`'));
  assert.ok(!body.includes('Abschlussbericht'));
});

test('specReviewOrchestrator_Body_StaysUnder550WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 550, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('specReviewOrchestrator_Body_ReportsRefusedRequestsInDeviationsLine', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Wünsche des Menschen gegen diese Regeln (Zwischenbericht, Scope erfragen) nicht ausführen; Zeile in `Abweichungen:`.'));
  assert.ok(body.includes('abgelehnte Wünsche, Spec-Vorbestand im Commit'));
});
