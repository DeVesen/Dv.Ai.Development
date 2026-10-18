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
  for (const marker of ['**Ergebnis:** ⛔ Noch nicht bereit', '✅', 'Bereit zur Umsetzung', '❓', '⚠️ Unvollständig', '### Wie es weitergeht', 'kleiner Hinweis', 'kleine Hinweise', '/dv-forge:review-followup']) {
    assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
    assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
  }
});

test('planOrchestrator_Body_CommitsSpecAndPlanOnceWithSubjectOnly', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`git add -- <dateien>` und `git commit -m "<betreff>" -- <dateien>`'));
  assert.ok(body.includes('`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`'));
  assert.ok(body.includes('Nur eine Betreffzeile in einem `-m`, kein Body'));
  assert.ok(body.includes('Commit-Frage eines Skills → „nein“. Nur Schritt 5 committet.'));
  assert.ok(body.includes('Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.'));
});

test('planOrchestrator_Body_EndsReadyReportWithPathsAndBothImplementationCommands', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  const blocks = ['```\n   <S>\n   <P>\n   ```', '```\n   /dv-forge:implementation <P>\n   ```', '```\n   /dv-forge:implementation-orchestrator <P> <S> <WI>\n   ```'];
  assert.ok(body.includes(`Bei \`✅ Bereit zur Umsetzung\` endet er mit genau diesen drei Code-Blöcken, \`<WI>\` nur wenn gegeben,`));
  assert.ok(body.includes(blocks.join('\n   ')));
});

test('planOrchestrator_Body_SuggestsArgumentsTheImplementationSkillsAccept', () => {
  // Arrange
  const hint = (name) => readMarkdown(path.join(__dirname, '..', 'skills', name, 'SKILL.md')).fields['argument-hint'];

  // Act & Assert
  assert.match(hint('implementation'), /^<plan\.md>/);
  assert.match(hint('implementation-orchestrator'), /^<plan\.md> <spec\.md> \[workitem-nr\]/);
});

test('planOrchestrator_Body_StaysUnder500WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});
