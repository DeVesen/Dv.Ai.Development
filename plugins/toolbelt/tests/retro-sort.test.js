'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { targetKey } = require('../scripts/retro-sort');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-sort.js');

function findingLines(number, title, target) {
  return [`${number}. **${title}.**`, '   *Situation:* s', `   *Ziel:* ${target}`, '   *Im Projekt:* p', ''];
}

function reportText({ friction = [], savings = [], relevance = null, heading = '# Erfahrungsbericht X' }) {
  return [
    heading, '', '**Lauf:** x', '**Ergebnis:** y', '', '## Zahlen', '- Dauer: 1 min', '', '## MCP-Nutzung', '', 'Quelle: x', '',
    ...(relevance ? ['**Relevanz:**', ...relevance.map(([mcp, value]) => `- ${mcp}: ${value}`), ''] : []),
    '## Positiv', '', '1. **Gut.** z', '',
    '## Reibung', '', ...friction.flatMap(([title, target], index) => findingLines(index + 1, title, target)),
    '## Sparpotenzial', '', ...savings.flatMap(([title, target], index) => findingLines(index + 1, title, target)),
    '## Neue Ideen', '', '- keine', '', '## Kleinigkeiten', '', '- keine', '',
  ].join('\n');
}

function wishesDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-wishes-'));
  const write = (name, text) => fs.writeFileSync(path.join(dir, name), text);
  write('2026-09-28-a.md', reportText({
    friction: [['Loop weckt Hauptsession', 'Skill · `dv-forge:plan-review` (Orchestrator)'], ['Warten ohne Skript', 'Skript · neu: wait-results']],
    savings: [['Review zu breit', 'Skill · `dv-forge:plan-review`']],
    relevance: [['dev-mcp', 'verzichtbar in dieser Session.'], ['codebase-analyzer', 'hätte genützt, weil 29 Grep-Aufrufe.']],
  }));
  write('2026-09-28-b.md', reportText({
    friction: [['Warten dauert', 'Skript · `neu:` Skript · wait-results']],
    relevance: [['dev-mcp', 'gebraucht für die Suche.'], ['codebase-analyzer', 'unklar']],
  }));
  write('2026-09-28-c.md', reportText({ friction: [['Unklar wohin', 'Ziel offen']] }));
  write('all-wishes.md', reportText({ heading: '# Verbesserungs-Wunschliste', friction: [['Zählt nicht', 'Hook · `x`']] }));
  write('2026-09-28-wunsch.md', reportText({ heading: '# Wunsch: Neu ausrichten', friction: [['Zählt nicht', 'Hook · `x`']] }));
  return dir;
}

function sortOf(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('cli_Reports_GroupedByTargetLargestFirst', () => {
  const output = sortOf('--dir', wishesDir());

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /^# Vorsortierung: 3 Berichte, 5 Befunde\n\n## Skill · dv-forge:plan-review \(2\)\n- Loop weckt Hauptsession · Reibung · 2026-09-28-a\.md\n- Review zu breit · Sparpotenzial · 2026-09-28-a\.md\n\n## Skript · neu: wait-results \(2\)\n[\s\S]*\n## Ziel offen \(1\)\n/);
});

test('cli_Reports_RelevanceTableCountsPerMcp', () => {
  const output = sortOf('--dir', wishesDir());

  assert.match(output.stdout, /\| MCP \| gebraucht \| hätte genützt \| verzichtbar \| sonstig \|\n\|---\|---\|---\|---\|---\|\n\| codebase-analyzer \| 0 \| 1 \| 0 \| 1 \|\n\| dev-mcp \| 1 \| 0 \| 1 \| 0 \|\n/);
});

test('cli_ReportWithoutRelevance_CountedNowhereAndNamed', () => {
  const output = sortOf('--dir', wishesDir());

  assert.match(output.stdout, /Ohne Relevanz-Zeile: 2026-09-28-c\.md\n/);
});

test('cli_MissingDir_ReportsAndExitsWithZero', () => {
  const output = sortOf('--dir', path.join(os.tmpdir(), 'gibt-es-nicht-retro'));

  assert.equal(output.status, 0);
  assert.match(output.stdout, /^Keine Berichte: Ordner .* fehlt\.\n$/);
});

test('cli_DirWithoutReports_ReportsAndExitsWithZero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-empty-'));
  fs.writeFileSync(path.join(dir, 'all-wishes.md'), '# Verbesserungs-Wunschliste\n');

  const output = sortOf('--dir', dir);

  assert.equal(output.status, 0);
  assert.match(output.stdout, /^Keine Berichte in .*\.\n$/);
});

test('targetKey_OldAndNewForms_SameGroup', () => {
  assert.deepEqual(
    [targetKey('Skript · neu: wait-results'), targetKey('Skript · `neu:` Skript · wait-results'), targetKey('Skill · `dv-forge:plan-review` (x)'), targetKey(undefined)],
    ['Skript · neu: wait-results', 'Skript · neu: wait-results', 'Skill · dv-forge:plan-review', 'Ziel offen'],
  );
});
