'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILLS = path.join(__dirname, '..', 'skills');
const SKILL = path.join(SKILLS, 'implementation-orchestrator', 'SKILL.md');
const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'implementation-report-text.js');
const FOLLOWUP_FLOW = path.join(SKILLS, 'review-followup', 'references', 'flow.md');
const CHAINED = ['start-work', 'implementation', 'implementation-review', 'review-followup'];

test('implementationOrchestrator_Frontmatter_ModelInvocableWithPlanSpecWorkitemAndBase', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'implementation-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<plan.md> <spec.md> [workitem-nr] [--base <branch>]');
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
    '`dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF>"`, genau einmal',
  ];
  const positions = steps.map((step) => body.indexOf(step));
  for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('implementationOrchestrator_Body_ChecksPlanAndSpecByHashAfterEveryWritingSkill', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`git hash-object -- "<P>"` = PLAN-HASH, `git hash-object -- "<S>"` = SPEC-HASH'));
  assert.ok(body.includes('`git diff --no-index -- "<Kopie>" "<Datei>"`'));
  assert.ok(body.includes('Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.'));
  assert.equal(body.match(/Hash-Prüfung\./g).length, 3);
});

test('implementationOrchestrator_Body_BranchesOnTheResultsTheReportScriptWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['✅ Bereit zum Abschließen', '⛔ Noch nicht bereit']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in implementation-report-text.js`);
  }
  assert.ok(body.includes('`⛔ Noch nicht bereit` UND `FOLLOWUP ja` → 5.'));
});

test('implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnAReadyResult', () => {
  // Arrange
  const flow = readText(FOLLOWUP_FLOW);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(flow.includes('`Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <BD>`'));
  assert.ok(body.includes('Schlusszeile `Review abgeschlossen: ✅ …` → 6; sonst Ende.'));
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

test('implementationOrchestrator_Body_StaysUnder550WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 550, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('implementationOrchestrator_Body_RunsReviewEmbeddedAndEmitsOneClosingReportFromTheScript', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('implementation-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht.'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>"'));
  assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 5 lief'));
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
