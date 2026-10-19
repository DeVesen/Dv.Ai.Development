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
    '`dv-forge:review-followup` mit `<P> alle --spec <S>`, genau einmal',
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

test('implementationOrchestrator_Body_UsesReportMarkersTheReportScriptWrites', () => {
  // Arrange
  const script = readText(REPORT_TEXT);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const marker of ['**Ergebnis:** ✅ Bereit zum Abschließen', '**Ergebnis:** ⛔ Noch nicht bereit', '**Ergebnis:** ⚠️ Unvollständig', '### Wie es weitergeht']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in implementation-report-text.js`);
  }
});

test('implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnTheCleanLine', () => {
  // Arrange
  const flow = readText(FOLLOWUP_FLOW);

  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(flow.includes('`Alles sauber. Arbeit abschließen mit:`'));
  assert.ok(body.includes('`Alles sauber. Arbeit abschließen mit:` → 6; sonst Ende.'));
});

test('implementationOrchestrator_Body_NeverPushesNeverCallsFinishWorkAndKeepsWorktree', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Kein `git switch`, `git checkout`, `git worktree`, Merge, Push, force von dir.'));
  assert.ok(body.includes('Der Worktree bleibt, `finish-work` ruft nur der Mensch.'));
  assert.ok(body.includes('`Worktree bleibt: <R>`'));
  assert.ok(!body.includes('`dv-forge:finish-work` mit'));
  assert.ok(body.includes('Erste Zeile `Feature-Branch: <branch>`'));
  assert.ok(body.includes('Letzte Zeile: „Nicht gepusht: `git push -u origin <branch>`“.'));
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

test('implementationOrchestrator_Body_RunsReviewEmbeddedAndWritesOwnNextSteps', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('--bericht "<BR>"'));
  assert.ok(body.includes('Teile aus `<BR>` unverändert, vor `### Wie es weitergeht`.'));
  assert.ok(body.includes('`### Wie es weitergeht` schreibst du selbst'));
  assert.ok(body.includes('genau einmal als letzte Ausgabe'));
});

test('implementationOrchestrator_Body_RecommendsFinishWorkAfterCleanFollowupAndRefusesRequestsInReport', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('lief Schritt 5 und war sauber → `/dv-forge:finish-work` in `<R>`, nur manuell'));
  assert.ok(body.includes('nicht ausführen; eine Zeile im Bericht, nie davor.'));
});
