'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const DIR = path.join(__dirname, 'fixtures', 'spec-grilling-belegregeln');

test('specGrillingBelegregelnFixture_Bestand_ImportsFilterModuleButColumnsHaveNoFilter', () => {
  // Act
  const text = readText(path.join(DIR, 'bestand', 'rampe-spalten.ts'));

  // Assert
  assert.ok(text.includes('NumberFilterModule'));
  assert.doesNotMatch(text, /filter:|sortable:/);
});

test('specGrillingBelegregelnFixture_Szenario_HasRedAndGreenRunWithExpectations', () => {
  // Act
  const text = readText(path.join(DIR, 'szenario.md'));

  // Assert
  for (const part of [
    'Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer.', '## Alte Fassung sichern', 'git archive <BASIS> plugins/forge',
    '## Rot: alte Fassung', 'Lies <ALT>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau',
    '## Grün: neue Fassung', 'Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau',
    'keine Empfehlung mit „falls … sonst …“', '„nicht in diese Story“',
    '`git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling-belegregeln/spec.md <KOPIE2>` — erwartet: Exit 0',
    '## Lücke schließen',
  ]) assert.ok(text.includes(part), part);
});
