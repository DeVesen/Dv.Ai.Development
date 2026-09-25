'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'plan-writing');

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('planFormat_Template_HeaderSectionsInOrder', () => {
  const text = reference('plan-format.md');
  const markers = ['# <Titel> — Umsetzungsplan', '**Ziel:**', '**Architektur:**', '**Tech-Stack:**', '**Spec:**',
    '## Global Constraints', '### Task 1: <Komponente>', '## Entscheidungen'];
  const positions = markers.map((marker) => text.indexOf(marker));
  markers.forEach((marker, index) => assert.ok(positions[index] >= 0, `${marker} fehlt`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('planFormat_Template_TaskBlockWithAcsFilesInterfacesSteps', () => {
  const text = reference('plan-format.md');
  const parts = ['**ACs:** AC-01, AC-03', '- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`', '- Consumes:',
    '- Produces:', '`<befehl oder Tool-Aufruf>`', '- [ ] **Schritt 1: Fehlschlagenden Test schreiben**',
    '- [ ] **Schritt 5: Commit**'];
  for (const part of parts) assert.ok(text.includes(part), `${part} fehlt`);
});

test('planFormat_Template_DecisionEntries', () => {
  const text = reference('plan-format.md');
  assert.ok(text.includes('- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>'));
  assert.ok(text.includes('- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>'));
});

test('planFormat_Rules_NumberingAnchorToolCallsImplementationCommand', () => {
  const text = reference('plan-format.md');
  assert.ok(text.includes('`### Task <n>: <Komponente>`'));
  assert.match(text, /lückenlos aufsteigend ab 1/);
  assert.match(text, /Task 3a/);
  assert.match(text, /Stabiler Anker/);
  assert.match(text, /Tool-Aufruf mit exakten Parametern/);
  assert.match(text, /Projekt-`CLAUDE\.md`/);
  assert.ok(text.includes("> Umsetzung mit `/dv-forge:implementation <plan.md>`"));
  assert.match(text, /nennt den Umsetzungs-Befehl/);
});

test('taskRules_Sections_StructureSizingStepsPlaceholders', () => {
  const text = reference('task-rules.md');
  for (const heading of ['## Dateistruktur zuerst', '## Zuschnitt eines Tasks', '## Schrittgröße', '## Verbotene Platzhalter']) {
    assert.ok(text.includes(`\n${heading}\n`), `${heading} fehlt`);
  }
});

test('taskRules_Structure_OneResponsibilityExistingPatternsFirst', () => {
  const text = reference('task-rules.md');
  assert.match(text, /eine klare Verantwortung/);
  assert.match(text, /Was sich gemeinsam ändert, liegt zusammen/);
  assert.match(text, /vorhandenen Muster/);
});

test('taskRules_Sizing_SmallestUnitWithOwnTestCycle', () => {
  const text = reference('task-rules.md');
  assert.match(text, /kleinste Einheit mit eigenem Testzyklus/);
  assert.match(text, /ablehnen und den Nachbarn trotzdem annehmen/);
});

test('taskRules_Steps_FiveActionsTwoToFiveMinutes', () => {
  const text = reference('task-rules.md');
  assert.match(text, /2–5 Minuten/);
  for (const word of ['fehlschlagenden Test', 'Fehlschlag', 'minimalen Code', 'Erfolg', 'committen']) {
    assert.ok(text.includes(word), `${word} fehlt`);
  }
});

test('taskRules_Placeholders_ListsForbiddenPatterns', () => {
  const text = reference('task-rules.md');
  const patterns = ['TBD', 'TODO', 'später umsetzen', 'Fehlerbehandlung ergänzen', 'Validierung hinzufügen',
    'Randfälle behandeln', 'Tests für das Obige', 'wie Task N', 'in keinem Task definiert'];
  for (const pattern of patterns) assert.ok(text.includes(pattern), `${pattern} fehlt`);
});

test('selfCheck_Checklist_CoveragePlaceholdersConsistencyFormat', () => {
  const text = reference('self-check.md');
  assert.match(text, /Spec-Abdeckung/);
  assert.match(text, /Platzhalter-Scan/);
  assert.match(text, /Namens- und Typ-Konsistenz/);
  assert.match(text, /Format/);
  assert.match(text, /kein SubAgent/);
  assert.match(text, /sofort im Plan/);
});
