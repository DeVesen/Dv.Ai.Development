'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');
const { isMostlyGerman } = require('./lib/german');

const REFERENCES = path.join(__dirname, '..', 'skills', 'writing-skills', 'references');

function reference(name) {
  return readText(path.join(REFERENCES, name));
}

test('triggerEval_Concept_TwentyQueriesHalfAndHalfNearMissesTrainAndTestSet', () => {
  const text = reference('trigger-eval.md');

  assert.ok(text.includes('etwa 20 Testanfragen'));
  assert.ok(text.includes('„soll auslösen“'));
  assert.ok(text.includes('„soll nicht auslösen“'));
  assert.ok(text.includes('knappe Fehlgriffe'));
  assert.ok(text.includes('Trainingsmenge'));
  assert.ok(text.includes('Testmenge'));
  assert.ok(isMostlyGerman(text));
});

test('testingWithSubagents_Method_BaselineWithoutSkillPressureAndControlGroup', () => {
  const text = reference('testing-with-subagents.md');

  assert.ok(text.includes('## Ablauf'));
  assert.ok(text.includes('**Ohne Skill.**'));
  assert.ok(text.includes('| Zeit |'));
  assert.ok(text.includes('Kontrollgruppe'));
  assert.ok(text.includes('Mindestens fünf Läufe'));
  assert.ok(isMostlyGerman(text));
});

test('persuasionPrinciples_Guide_PrinciplesMixPerSkillTypeAndLoopholes', () => {
  const text = reference('persuasion-principles.md');

  assert.ok(text.includes('| Autorität |'));
  assert.ok(text.includes('| Selbstverpflichtung |'));
  assert.ok(text.includes('## Welche Mischung für welche Skill-Art'));
  assert.ok(text.includes('Tabelle der Ausreden'));
  assert.ok(text.includes('Liste der Warnzeichen'));
  assert.ok(isMostlyGerman(text));
});
