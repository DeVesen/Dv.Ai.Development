'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_ROUND_WORDINGS } = require('./lib/former-names');

const SKILL = path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

test('planOrchestrator_Frontmatter_ModelInvocableWithSpecOptionalWorkitemAndDebug', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'plan-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--debug]');
});

test('planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithoutReportParameters', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = ['`dv-forge:plan-writing` mit `<S>`', '`dv-forge:plan-review` mit `<P> <S>`.', '`dv-forge:review-followup` mit `<P> alle --spec <S>`.'];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
});

test('planOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommandOnceThePlanStands', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art plan --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
  assert.ok(body.includes('bis Schritt 2 auch `<BR>` = `bericht-review.json` und `<AB>` = `abschluss.md`'));
  assert.ok(body.indexOf('ablage --art plan') < body.indexOf('`dv-forge:plan-review` mit'), 'die Dateien stehen vor dem Review fest');
});

test('planOrchestrator_Body_ChecksSpecByHashAfterEverySkill', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('orchestrator-state.js" start --state "<ST>" --spec "<S>"'));
  assert.ok(body.includes('orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen.'));
  assert.equal(body.match(/Spec-Prüfung\./g).length, 3);
});

test('planOrchestrator_Body_BranchesOnTheLinesTheReviewWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.'));
  assert.ok(script.includes('⚠️ Unvollständig'));
});

test('planOrchestrator_Body_ReadsTheRulesFileForCommitsAndGitBansInsteadOfRepeatingThem', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
  for (const forbidden of ['git add', 'git commit', 'forge-config.js', 'Commit-ID', 'Spec-Änderungsbedarf', 'Nie committen', 'Kein Branch, kein Worktree', '## Rote Flaggen', 'Wünsche des Menschen']) {
    assert.ok(!body.includes(forbidden), `${forbidden} steht in der Regeldatei`);
  }
});

test('planOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('plan-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 5 aus, genau einmal.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief, `--fakten "<FK>"` nur wenn geschrieben.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
  for (const gone of ['dein Block statt seines', 'Pfade:', '### Wie es weitergeht', 'unverändert ausgeben']) assert.ok(!body.includes(gone), `${gone} darf nicht im Skill stehen`);
});

test('planOrchestrator_Body_PassesOnlyDeviationsToTheReportScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.'));
  for (const gone of ['`Stand`', '--stand', '--wi <WI>` nur wenn gegeben, `--fakten', '/dv-forge:implementation <P>']) assert.ok(!body.includes(gone), `${gone} kennt der Bericht nicht mehr`);
});

test('planOrchestrator_Body_SuggestsArgumentsTheImplementationSkillsAccept', () => {
  // Arrange
  const hint = (name) => readMarkdown(path.join(__dirname, '..', 'skills', name, 'SKILL.md')).fields['argument-hint'];

  // Act & Assert
  assert.match(hint('implementation'), /^<plan\.md>/);
  assert.match(hint('implementation-orchestrator'), /^<plan\.md> <spec\.md> \[workitem-nr\]/);
});

test('planOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung.'));
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Planning <WI> <slug>`, ohne `<WI>` `Planning <slug>`'));
});

test('planOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine.'));
});

test('planOrchestrator_Body_StaysUnder550Words', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 550, `${wordCount(body)} Wörter`);
});

test('planOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndStopsOnAbortOrWarning', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S>`.'));
  assert.ok(body.includes('mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5.'));
  for (const gone of [...FORMER_ROUND_WORDINGS, 'bericht-followup-1.json', 'bericht-followup-2.json']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
});

test('planOrchestrator_Body_FollowupRoundsNeverCommit', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const rounds = body.slice(body.indexOf('Followup-Runden bis zum Maximum'), body.indexOf('5. Abschlussbericht'));
  assert.ok(rounds.length > 0, 'Abschnitt der Followup-Runden fehlt');
  assert.equal(/ommit/.test(rounds), false, 'die Followup-Runden nennen keinen Commit');
});

test('planOrchestrator_Body_WritesChainEntryBeforeTheReportOnlyWhenThePlanStands', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`');
  const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.');
  const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan');
  assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
  assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
  assert.ok(body.includes('Steht `<P>` fest (Datei existiert):'));
  assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
});
