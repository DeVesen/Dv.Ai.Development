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

test('specReviewOrchestrator_Body_ChainsEmbeddedReviewThenOneFollowup', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:spec-review` mit `<S> --bericht "<BR>"`, sonst kein Argument', '`dv-forge:review-followup` mit `<S> alle --bericht "<BF>"`, genau einmal'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.ok(positions[0] < positions[1]);
});

test('specReviewOrchestrator_Body_BranchesOnTheLinesTheEmbeddedReviewPrints', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['⚠️ Unvollständig', '⛔', '❓']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
  }
  assert.ok(body.includes('`FOLLOWUP ja`, auch für Hinweise → 4, sonst 5.'));
});

test('specReviewOrchestrator_Body_TellsPauseFromEndByHeadingAndClosingLine', () => {
  // Arrange
  const haltText = readText(path.join(__dirname, '..', 'scripts', 'lib', 'halt-text.js'));
  const flow = readText(path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md'));

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`### Frage …` = Pause (Regel 2). Ende = Zeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · …`'));
  assert.ok(haltText.includes('### Frage ${number} von ${total}'));
  assert.ok(flow.includes('`Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`'));
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

test('specReviewOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Spec-Review <WI> <slug>“, ohne `<WI>` „Spec-Review <slug>“'));
});

test('specReviewOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('spec-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 6, genau einmal.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --spec "<S>" --commit "<Commit>"`'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.'));
  assert.ok(!body.includes('dein Block statt seines'));
});

test('specReviewOrchestrator_Body_PassesCommitResultAndDeviationsToTheReportScript', () => {
  // Arrange
  const hint = readMarkdown(path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md')).fields['argument-hint'];

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.equal(hint, '<spec.md> [workitem-nr]');
  assert.ok(body.includes('`Commit` = Commit-ID, „nichts zu committen“, „ignoriert“ oder Grund dagegen.'));
  assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 4 lief, `--wi <WI>` nur wenn gegeben'));
  assert.ok(body.includes('`Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.'));
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
