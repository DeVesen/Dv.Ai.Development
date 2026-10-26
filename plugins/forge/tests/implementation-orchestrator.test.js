'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILLS = path.join(__dirname, '..', 'skills');
const SKILL = path.join(SKILLS, 'implementation-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'implementation-report-text.js');
const CHAINED = ['start-work', 'implementation', 'implementation-review', 'review-followup'];

test('implementationOrchestrator_Frontmatter_ModelInvocableWithPlanSpecWorkitemAndBase', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'implementation-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<plan.md> <spec.md> [workitem-nr] [--base <branch>] [--ablage <etappe>]');
});

test('implementationOrchestrator_ChainedSkills_AreModelInvocable', () => {
  for (const skill of CHAINED) {
    // Act
    const { fields } = readMarkdown(path.join(SKILLS, skill, 'SKILL.md'));

    // Assert
    assert.equal(fields['disable-model-invocation'], undefined, `${skill} ist für das Modell gesperrt`);
  }
});

test('implementationOrchestrator_Body_ChainsTheFourSkillsInOrder', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const steps = [
    '`dv-forge:start-work` mit `<P0> <S0>`',
    '`dv-forge:implementation` mit `<P> <S>`',
    '`dv-forge:implementation-review` mit `<P> <S> --bericht "<BR>"`',
    '`dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"`',
  ];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
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
  // Arrange

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende. Nie eine dritte.'));
});

test('implementationOrchestrator_Body_NeverPushesNeverCallsFinishWorkAndKeepsWorktree', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir.'));
  assert.ok(body.includes('Der Worktree bleibt, `finish-work` ruft nur der Mensch.'));
  assert.ok(!body.includes('`dv-forge:finish-work` mit'));
  assert.ok(body.includes('`Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`)'));
  assert.ok(body.includes('--worktree "<R>" --branch <branch> --pruefung <gruen|rot|keine>'));
});

test('implementationOrchestrator_Body_PassesSkillQuestionsToTheHuman', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Nie selbst antworten, auch nach „frag nicht“.'));
  assert.ok(body.includes('Während ein Skill läuft, gelten seine Anweisungen.'));
});

test('implementationOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung.'));
  assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Implementation <WI> <slug>“, ohne `<WI>` „Implementation <slug>“'));
});

test('implementationOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine'));
});

test('implementationOrchestrator_Body_StaysUnder700WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('implementationOrchestrator_Body_RunsReviewEmbeddedAndEmitsOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('implementation-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>"'));
  assert.ok(body.includes('`--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
  assert.ok(body.includes('genau einmal als letzte Ausgabe'));
  for (const gone of ['Teile aus `<BR>` unverändert', '`### Wie es weitergeht` schreibst du selbst']) assert.ok(!body.includes(gone), gone);
});

test('implementationOrchestrator_Body_RefusesRequestsInReport', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('nicht ausführen; eine Zeile im Bericht, nie davor.'));
  assert.ok(body.includes('bei Abweichungen `Abweichungen: …`'));
});

test('implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTwo', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const followup = body.indexOf('- `NEXT=followup` → 5.');
  const ready = body.indexOf('- `NEXT=weiter` und `BEREIT=ja` → 6.');
  assert.ok(followup > -1 && followup < ready, 'Reihenfolge followup, weiter');
  assert.ok(body.includes('Followup-Runden, höchstens zwei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"` bzw. `"<BF2>"`. Hash-Prüfung.'));
  assert.ok(body.indexOf('Nie eine dritte.') < body.indexOf('6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>"'), 'Build, Test und Lint erst nach den Runden');
  assert.ok(body.includes('`<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`'));
  assert.ok(body.includes('| „Dritte Followup-Runde.“ | Höchstens zwei. |'));
  assert.ok(!body.includes('Zweiter Followup') && !body.includes('zweiter Followup'));
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
  assert.ok(body.includes('Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>"'));
});
