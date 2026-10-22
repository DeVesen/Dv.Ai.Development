'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText } = require('./lib/markdown');

const SKILLS = path.join(__dirname, '..', 'skills');
const ABLAGE = path.join(__dirname, '..', 'shared', 'session-chain', 'ablage.md');
const STORE = {
  'spec-review-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`',
  'plan-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`',
  'implementation-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --plan "<P>" --neu --datei "<AB>" --datei "<BR>" --datei "<FK>"`',
};

function body(name) {
  return readMarkdown(path.join(SKILLS, name, 'SKILL.md')).body;
}

for (const [name, store] of Object.entries(STORE)) {
  test(`${name}_Arguments_NameAblageAsOptionalOption`, () => {
    // Act
    const text = body(name);

    // Assert
    assert.match(text, /`--ablage <E>` optional/);
  });

  test(`${name}_ClosingReport_PointsToAblageOnlyWithOptionAfterShowAndBeforeOutput`, () => {
    // Act
    const text = body(name);

    // Assert
    const show = text.indexOf('guard-orchestrator.js" show');
    const stored = text.indexOf(`Nur mit \`--ablage <E>\`: Lies \`<PLUGIN>/shared/session-chain/ablage.md\` und folge dem Abschnitt \`${name}\`; Ausgabe nicht zeigen, Fehler egal.`);
    const output = text.indexOf('Den Text nach `=== BERICHT ===` unverändert ausgeben');
    assert.ok(stored > -1, 'Verweis auf ablage.md fehlt');
    assert.ok(show < stored && stored < output, 'Verweis steht zwischen show und der Ausgabe');
  });

  test(`ablage_${name}_SectionNamesTheStoreCall`, () => {
    // Act
    const text = readText(ABLAGE);

    // Assert
    assert.ok(text.includes(`## ${name}\n${store}`), `${name}: ${store}`);
  });
}

test('specAndPlanOrchestrator_Arguments_AblageIsNoWorkitem', () => {
  // Act
  const texts = ['spec-review-orchestrator', 'plan-orchestrator'].map(body);

  // Assert
  for (const text of texts) assert.ok(text.includes('`--ablage <E>` optional, zählt nicht als `<WI>`.'));
});

test('ablage_Intro_OnlyWithOptionAndWithoutShowingOutput', () => {
  // Act
  const text = readText(ABLAGE);

  // Assert
  assert.ok(text.includes('Nur mit `--ablage <E>`.'));
  assert.ok(text.includes('Die Ausgabe zeigst du nicht; endet der Aufruf mit Fehler, folgt der Bericht trotzdem.'));
});
