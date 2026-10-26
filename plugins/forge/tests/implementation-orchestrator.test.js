'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_ROUND_WORDINGS } = require('./lib/former-names');

const SKILLS = path.join(__dirname, '..', 'skills');
const SKILL = path.join(SKILLS, 'implementation-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'implementation-report-text.js');
const CHAINED = ['start-work', 'implementation', 'implementation-review', 'review-followup'];

test('implementationOrchestrator_Frontmatter_ModelInvocableWithPlanSpecWorkitemBaseAndDebug', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'implementation-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<plan.md> <spec.md> [workitem-nr] [--base <branch>] [--debug]');
});

test('implementationOrchestrator_ChainedSkills_AreModelInvocable', () => {
  for (const skill of CHAINED) {
    // Act
    const { fields } = readMarkdown(path.join(SKILLS, skill, 'SKILL.md'));

    // Assert
    assert.equal(fields['disable-model-invocation'], undefined, `${skill} ist für das Modell gesperrt`);
  }
});

test('implementationOrchestrator_Body_ChainsTheFourSkillsInOrderWithoutReportParameters', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = [
    '`dv-forge:start-work` mit `<P0> <S0>`',
    '`dv-forge:implementation` mit `<P> <S>`',
    '`dv-forge:implementation-review` mit `<P> <S>`.',
    '`dv-forge:review-followup` mit `<P> alle --spec <S>`.',
  ];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
});

test('implementationOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommandAfterStartWork', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art implementation --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
  assert.ok(body.includes('bis Schritt 2 auch `<AB>` = `abschluss.md`'));
  assert.ok(body.indexOf('ablage --art implementation') < body.indexOf('`dv-forge:implementation-review` mit'), 'die Dateien stehen vor dem Review fest');
});

test('implementationOrchestrator_Body_ChecksPlanAndSpecByHashAfterEveryWritingSkill', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('orchestrator-state.js" start --state "<ST>" --spec "<S>" --plan "<P>"'));
  assert.ok(body.includes('orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen.'));
  assert.ok(body.includes('Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.'));
  assert.equal(body.match(/Hash-Prüfung\./g).length, 3);
});

test('implementationOrchestrator_Body_BranchesOnTheResultsTheReportScriptWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['✅ Bereit zum Abschließen', '⚠️ Unvollständig']) assert.ok(script.includes(marker), `${marker} fehlt in implementation-report-text.js`);
  assert.ok(body.includes('- `NEXT=followup` → 5.'));
  assert.ok(body.includes('- `NEXT=weiter` und `BEREIT=ja` → 6.'));
});

test('implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnAReadyResult', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende.'));
});

test('implementationOrchestrator_Body_KeepsTheWorktreeAndLeavesFinishWorkToTheHuman', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Der Worktree bleibt, `finish-work` ruft nur der Mensch.'));
  assert.ok(!body.includes('`dv-forge:finish-work` mit'));
  assert.ok(body.includes('`Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`)'));
  for (const gone of ['--worktree "<R>" --branch <branch> --pruefung', '--pruefung gruen', 'Kein `git switch`', 'Push, force von dir']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder entfällt`);
});

test('implementationOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
  for (const gone of ['## Rote Flaggen', 'Wünsche des Menschen', 'finish-work` gleich mit']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei`);
});

test('implementationOrchestrator_Body_PassesSkillQuestionsToTheHuman', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Nie selbst antworten, auch nach `frag nicht`.'));
  assert.ok(body.includes('Während ein Skill läuft, gelten seine Anweisungen.'));
});

test('implementationOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung.'));
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Implementation <WI> <slug>`, ohne `<WI>` `Implementation <slug>`'));
});

test('implementationOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine'));
});

test('implementationOrchestrator_Body_StaysUnder700Words', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
});

test('implementationOrchestrator_Body_RunsReviewAndEmitsOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('implementation-review und review-followup zeigen nur ihre Review-Statuszeile.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('genau einmal als letzte Ausgabe'));
  assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
  for (const gone of ['Teile aus `<BR>` unverändert', '`### Wie es weitergeht` schreibst du selbst', 'unverändert ausgeben']) assert.ok(!body.includes(gone), gone);
});

test('implementationOrchestrator_Body_ReportsDeviationsAndVerdictsInFactLines', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Abweichungen, `Urteil:`-Zeilen → Bericht.'));
  assert.ok(body.includes('bei Abweichungen `Abweichungen: …`'));
});

test('implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTheRulesFileMaximum', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const followup = body.indexOf('- `NEXT=followup` → 5.');
  const ready = body.indexOf('- `NEXT=weiter` und `BEREIT=ja` → 6.');
  assert.ok(followup > -1 && followup < ready, 'Reihenfolge followup, weiter');
  assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S>`. Hash-Prüfung.'));
  assert.ok(body.indexOf('Maximum der Regeldatei') < body.indexOf('6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>"'), 'Build, Test und Lint erst nach den Runden');
  for (const gone of [...FORMER_ROUND_WORDINGS, 'bericht-followup-1.json', 'bericht-followup-2.json']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
});

test('implementationOrchestrator_Body_WritesChainEntryWithWorktreeAndBranchBeforeTheReportWhenStartWorkRan', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`');
  const failure = body.indexOf('Fehler: Meldung in `Abweichungen: …` von `<FK>`; der Bericht folgt trotzdem.');
  const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation');
  assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
  assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
  assert.ok(body.includes('Lief Schritt 2 (`<R>` und Branch stehen fest):'));
  assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen.'));
});

test('implementationOrchestrator_Body_AbortBeforeReviewStillGetsReport', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>" --fakten "<FK>"`.'));
});

test('implementationOrchestrator_Body_KeepsPruefungFileInStateAndReportsNoRunWithoutIt', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<PR>` = `pruefung.json` (schreibt Schritt 6)'));
  assert.ok(body.includes('`Prüfung: <ergebnis aus <PR>>` oder `Prüfung: keine (Schritt 6 lief nicht)`'));
});
