'use strict';

// Ton und 85-%-Regel stehen nur in shared/dialog-rules.md; die Dialog-Skills und der Brief jeder Etappe verweisen darauf.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText, readMarkdown } = require('./lib/markdown');

const ROOT = path.join(__dirname, '..');
const RULES = path.join(ROOT, 'shared', 'dialog-rules.md');
const BASE = path.join(ROOT, 'shared', 'session-chain', 'base-sub-agent.md');
const SCENARIO = path.join(__dirname, 'fixtures', 'dialog-rules', 'szenario.md');
const skill = (name) => readMarkdown(path.join(ROOT, 'skills', name, 'SKILL.md')).body;
const rounds = () => readText(path.join(ROOT, 'skills', 'spec-whiteboarding', 'references', 'grill-rounds.md'));

test('dialogRules_File_HasToneRuleAndRedFlags', () => {
  // Act
  const text = readText(RULES);

  // Assert
  for (const heading of ['## Ton\n', '## 85-%-Regel\n', '## Rote Flaggen\n']) assert.ok(text.includes(heading), heading);
});

test('dialogRules_Tone_ShortHardFairAndOnlyWithBenefit', () => {
  // Act
  const text = readText(RULES);

  // Assert
  for (const part of ['1. **Kurz:** Kern zuerst', '2. **Hart und fair:** Schwächen offen benennen, mit Grund und besserem Weg.', '3. **Mehrwert:**', 'Ohne Nutzen lässt du es weg.']) {
    assert.ok(text.includes(part), part);
  }
});

test('dialogRules_85Percent_DecidesWithEvidenceVisiblyAndNeverReleases', () => {
  // Act
  const text = readText(RULES);

  // Assert
  for (const part of [
    'mit mindestens 85 % Gewissheit aus dem Kontext ableiten, den dein Skill als Quelle zulässt, entscheidest du selbst und fragst nicht',
    'Die 85 % brauchen einen Beleg-Tag außer `ungeklärt`.',
    'Selbst entschieden:\n   - <Kurztitel>: <Entscheidung> · <Beleg-Tag> — <Grund>',
    'wird ein W-Eintrag mit diesem Beleg-Tag',
    'Unter 85 % fragst du, mit genau einer Empfehlung.',
    '5. **Nie selbst:** Freigaben bleiben beim Menschen',
  ]) assert.ok(text.includes(part), part);
});

test('dialogSkills_Body_PointToTheDialogRules', () => {
  // Arrange
  const pointers = {
    'spec-whiteboarding': '7. **Dialog.** Lies `<PLUGIN>/shared/dialog-rules.md` und befolge es',
    'spec-grilling': '`spec-format.md`, dazu `<PLUGIN>/shared/dialog-rules.md`.',
    'session-orchestrator': '6. Dialog: Für jede eigene Nachricht an den Menschen gilt `<PLUGIN>/shared/dialog-rules.md`.',
  };

  // Assert
  for (const [name, pointer] of Object.entries(pointers)) assert.ok(skill(name).includes(pointer), name);
});

test('whiteboardingWithDocs_Body_InheritsTheRulesByLoadingWhiteboarding', () => {
  // Act
  const body = skill('spec-whiteboarding-with-docs');

  // Assert
  assert.ok(body.includes('zuerst `dv-forge:spec-whiteboarding`, dann `dv-forge:domain-modeling`. Beide gelten vollständig.'));
});

test('baseSubAgent_Style_IsOnlyThePointer', () => {
  // Act
  const text = readText(BASE);

  // Assert
  assert.ok(text.includes('## Gesprächsstil\nLies `{{PLUGIN}}/shared/dialog-rules.md` und befolge es für jede eigene Nachricht an den Menschen.'));
  assert.equal(text.includes('Kaffeemaschine'), false);
});

test('grillRounds_SelfDecided_StandsBeforeTheQuestionsNotAsQuestion', () => {
  // Act
  const text = rounds();

  // Assert
  assert.ok(text.includes('steht im Block `Selbst entschieden` vor der ersten Frage, nicht als Frage.'));
  assert.ok(text.includes('3. Fakten und selbst Entschiedenes sind keine Fragen.'));
  assert.ok(text.includes('Selbst entschieden:\n- Export-Format: CSV · Aussage'));
  assert.equal(text.includes('**Export-Format**: CSV, Excel oder beides?'), false);
});

test('specGrilling_WEntry_SelfDecidedKeepsItsTag', () => {
  // Assert
  assert.ok(skill('spec-grilling').includes('eine selbst entschiedene trägt ihren Beleg-Tag statt `Aussage`.'));
});

test('dialogRules_Scenario_RedWithoutSkillGreenWithSkillAndRoundLint', () => {
  // Act
  const text = readText(SCENARIO);

  // Assert
  for (const part of [
    '`subagent_type: "general-purpose"`, `model: "sonnet"`', '## Rot: ohne Skill', 'Erwartet (rot): kein Block `Selbst entschieden:` oder eine Frage ohne Empfehlung mit Beleg-Tag.',
    '## Grün: mit Skill', 'Lies <R>/plugins/forge/skills/spec-whiteboarding/SKILL.md und folge ihm genau',
    'ein Block `Selbst entschieden:` vor der ersten Frage', '`node plugins/forge/scripts/spec-lint.js --runde <RUNDE>`', '## Lücke schließen',
  ]) assert.ok(text.includes(part), part);
});
