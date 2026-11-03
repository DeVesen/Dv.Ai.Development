'use strict';

// Befund 3: Eine Commit-Form für alle Stellen, die Commits vorschreiben. `git commit -- <pfad>` allein kennt eine neue Datei nicht,
// deshalb steht `git add -- <pfade>` direkt davor, mit denselben Pfaden; Sammelbefehle bleiben verboten.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const ROOT = path.join(__dirname, '..');
const TWO_STEPS = '`git add -- <pfade>` und direkt danach `git commit -m "<betreff>" -- <pfade>` mit denselben Pfaden';
const PLACES = [
  'skills/spec-whiteboarding/references/spec-format.md',
  'shared/session-chain/base-sub-agent.md',
  'agents/implementation-implementer.md',
];

for (const place of PLACES) {
  test(`commitRule_${path.basename(place, '.md')}_NamesAddThenCommitWithTheSamePaths`, () => {
    const text = readText(path.join(ROOT, place));
    assert.ok(text.includes(TWO_STEPS), place);
    // Im Brief stehen die Git-Verbote nur in der Regeldatei (session-chain-brief.test.js); Spec-Format und Umsetzer nennen sie selbst.
    if (!place.includes('base-sub-agent')) assert.ok(text.includes('nie `git add -A`, `git add .` oder `git commit -a`'), place);
    assert.ok(!text.includes('Nie stagen und committen getrennt'), place);
  });
}

test('commitRule_PlanFormat_CommitStepNamesPathsTwice', () => {
  const text = readText(path.join(ROOT, 'skills/plan-writing/references/plan-format.md'));
  assert.ok(text.includes('`git add -- <dateien>` · `git commit -m "<message>" -- <dateien>`'));
});
