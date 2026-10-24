'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const SKILL = path.join(__dirname, '..', 'skills', 'spec-grilling', 'SKILL.md');
const FIXTURE = path.join(__dirname, 'fixtures', 'spec-grilling', 'spec.md');
const SCENARIO = path.join(__dirname, 'fixtures', 'spec-grilling', 'szenario.md');

test('specGrilling_Frontmatter_ModelInvocableWithSpecArgument', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'spec-grilling');
  assert.match(fields.description, /^Use when/);
  assert.doesNotMatch(fields.description, /: /);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '<spec.md>');
});

test('specGrilling_Body_TreatsEveryDecisionAsAnswered', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Jeder W-Eintrag unter `## Entscheidungen` ist beantwortet. Eine Frage, die ein W-Eintrag beantwortet, stellst du nicht'));
  assert.ok(body.includes('| „Zur Sicherheit frag ich das Format nochmal.“ | Ein W-Eintrag ist beantwortet. |'));
});

test('specGrilling_Body_AsksOnlyEdgeCasesContradictionsAndGapsInRoundFormat', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const part of ['Grenzfälle:', 'Widersprüche zwischen Abschnitten', 'Lücken:', '<PLUGIN>/skills/spec-whiteboarding/references/', '`grill-rounds.md`', 'Rundenformat aus `grill-rounds.md`', 'je Runde die komplette Frontier']) {
    assert.ok(body.includes(part), part);
  }
});

test('specGrilling_Body_WritesChangesOnlyAfterBeforeAfterAndConfirmation', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('legst du je Stelle Abschnitt, Vorher und Nachher wörtlich vor. Du schreibst erst nach ausdrücklicher Bestätigung'));
  assert.ok(body.includes('bis dahin bleibt die Datei unverändert.'));
  assert.ok(body.includes('scripts/spec-lint.js'));
});

test('specGrilling_Body_RecordsNewDecisionsAsWEntries', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`- **W · <Kurztitel>** · Aussage — <Antwort>` unter `## Entscheidungen`'));
});

test('specGrilling_Body_EndsWithoutCommitAndStaysShort', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Kein Commit, kein automatischer Start.'));
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('specGrillingFixture_Spec_HasTheExportFormatDecision', () => {
  // Act
  const text = readText(FIXTURE);

  // Assert
  assert.ok(text.includes('- **W · Export-Format** · Aussage — CSV.'));
});

test('specGrillingFixture_Szenario_HasBothRunsWithPromptsAndExpectations', () => {
  // Act
  const text = readText(SCENARIO);

  // Assert
  for (const part of [
    'Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer.', '`subagent_type: "general-purpose"`, `model: "sonnet"`',
    '## Rot: ohne Skill', 'Grille die Spec <KOPIE> auf Grenzfälle, Widersprüche und Lücken.', 'eine Frage nach dem Export-Format (CSV/Excel)',
    '## Grün: mit Skill', 'Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau', 'keine Frage zum Export-Format',
    '`git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling/spec.md <KOPIE2>` — erwartet: Exit 0',
    '## Lücke schließen',
  ]) assert.ok(text.includes(part), part);
});
