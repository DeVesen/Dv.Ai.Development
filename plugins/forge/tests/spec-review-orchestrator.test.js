'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-review-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

test('specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecWorkitemWhiteboardingAndDebug', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'spec-review-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--whiteboarding] [--debug]');
});

test('specReviewOrchestrator_Body_ChainsReviewThenFollowupWithoutReportParameters', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:spec-review` mit `<S>`, mit `--whiteboarding` dazu `--whiteboarding`, sonst kein Argument.', '`dv-forge:review-followup` mit `<S> alle`, mit `--whiteboarding` dazu `--whiteboarding`.'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.ok(positions[0] < positions[1]);
  for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
});

test('specReviewOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommand', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art spec --spec "<S>"`, mit `--whiteboarding` dazu `--whiteboarding`. Exit 1 → stopp.'));
  assert.ok(body.includes('`<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
  assert.ok(body.indexOf('ablage --art spec') < body.indexOf('`dv-forge:spec-review` mit'), 'die Dateien stehen vor dem Review fest');
});

test('specReviewOrchestrator_Body_BranchesOnTheLinesTheReviewWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['⛔', '❓']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
  }
  assert.ok(script.includes('⚠️ Unvollständig'));
  assert.ok(readText(path.join(__dirname, '..', 'scripts', 'orchestrator-state.js')).includes("result.startsWith('⚠️')"), 'next endet bei ⚠️');
  assert.ok(body.includes('`NEXT=followup`, auch für Hinweise, `⛔` und `❓` → 5, sonst 6.'));
});

test('specReviewOrchestrator_Body_TellsPauseFromEndByHeadingAndClosingLine', () => {
  // Arrange
  const haltText = readText(path.join(__dirname, '..', 'scripts', 'lib', 'halt-text.js'));

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`### Frage …` = Pause (Regel 2). Danach `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`'));
  assert.ok(haltText.includes('### Frage ${number} von ${total}'));
});

test('specReviewOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
  assert.ok(body.includes('Stopp bei Exit 1, `SPEC-IM-CHECKOUT=nein` oder `WORKTREE=ja`.'));
  for (const gone of ['EnterWorktree', '## Rote Flaggen', 'Wünsche des Menschen', 'Dritte Followup-Runde']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei`);
});

test('specReviewOrchestrator_Body_CommitsOnlyTheSpecWithoutNumberWhenWorkitemMissing', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`node "<PLUGIN>/scripts/spec-commit.js" preflight --spec "<S>" --state "<ST>"`; Exit 1 (anderer Ort) → stopp'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/spec-commit.js" commit --spec "<S>" --slug "<slug>"`, dazu `--wi <WI>` nur wenn gegeben.'));
  assert.ok(body.includes('Exit 1 → Meldung, Spec bleibt gestaged (nennen), 7.'));
  assert.ok(body.includes('`COMMIT=frei`: das Projekt setzt eine Konvention (`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`)'));
  assert.ok(body.includes('`git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`'));
  assert.ok(body.includes('Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach'));
  assert.ok(body.includes('Commit, auch bei `⛔` oder `❓`.'));
  assert.ok(body.includes('eine Zeile, ein `-m`, kein Body'));
  for (const gone of ['git check-ignore', 'docs: review spec <slug>', 'git status --porcelain -- "<S>"']) assert.equal(body.includes(gone), false, `${gone} steht jetzt im Skript`);
});

test('specReviewOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Spec-Review <WI> <slug>`, ohne `<WI>` `Spec-Review <slug>`'));
});

test('specReviewOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('spec-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 7 aus, genau einmal.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
  for (const gone of ['dein Block statt seines', 'unverändert ausgeben', '--ohne-weiter']) assert.equal(body.includes(gone), false, gone);
});

test('specReviewOrchestrator_Body_PassesTheCommitAsFactLineAndDeviationsToTheReportScript', () => {
  // Arrange
  const hint = readMarkdown(path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md')).fields['argument-hint'];

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.equal(hint, '<spec.md> [workitem-nr] [--debug]');
  assert.ok(body.includes('`Commit` = Hash aus `COMMIT=`, `nichts zu committen`, `ignoriert` oder Grund dagegen.'));
  assert.ok(body.includes('`<FK>` schreiben: eine Zeile `Commit: <Commit>`, bei Abweichungen dazu eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.'));
  for (const gone of ['--commit', '--wi <WI>` nur wenn gegeben, `--fakten']) assert.equal(body.includes(gone), false, `${gone} kennt der Bericht nicht mehr`);
});

test('specReviewOrchestrator_Body_StaysUnder700Words', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
});

test('specReviewOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndCommitsOnlyAfterTheLastOne', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<S> alle`'));
  assert.ok(body.includes('`NEXT=ende` → kein Commit, 7; `NEXT=followup` → nächste Runde; sonst 6.'));
  assert.ok(body.indexOf('Maximum der Regeldatei') < body.indexOf('6. Commit, auch bei `⛔` oder `❓`.'));
  for (const gone of ['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
});

test('specReviewOrchestrator_Body_WritesChainEntryOfStageSpecBeforeTheReportAlsoAfterAStop', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`');
  const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen; der Bericht folgt trotzdem.');
  const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec');
  assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
  assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
  assert.ok(body.includes('Steht `<S>` fest (Datei existiert):'));
  assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
  assert.ok(body.includes('7. Abschlussbericht, letzte Handlung:'));
  assert.ok(body.includes('Stopp = Schritt 7 mit dem Grund; nach dem Bericht nichts weiter.'));
});

test('specReviewOrchestrator_Body_WhiteboardingSkipsCommitAndPassesTheSwitchOnToTheReviewCalls', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette.'));
  assert.ok(body.includes('Mit `--whiteboarding` kein Commit: `Commit` = `kein Commit (Whiteboarding)`, weiter mit 7.'));
  assert.equal((body.match(/mit `--whiteboarding` dazu `--whiteboarding`/g) || []).length, 3, 'ablage, spec-review und review-followup bekommen den Schalter');
});
