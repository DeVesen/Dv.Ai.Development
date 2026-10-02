'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const { human, request, say, call, result, hint, summary, plainSummary, stamp, writeSession } = require('./lib/retro-session');
const { projectDir } = require('../scripts/lib/session-files');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-timeline.js');
const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

function longSession() {
  return writeSession(Array.from({ length: 310 }, (_, index) => human(`Eingabe ${index + 1}`, '10:00')));
}

function timelineSession() {
  return writeSession([
    human('Plane X', '10:00'),
    request('r1', '10:01', [say('Ich lese den Plan'), call('t1', 'Read', { file_path: 'plan.md' })]),
    result('t1', '10:01', 'Datei fehlt', true),
    hint('total_tokens_reminder', '10:01'),
    plainSummary('This session is being continued from a previous conversation.', '10:20'),
    human('Weiter', '10:30'),
  ]);
}

function timeline(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
}

test('cli_Timeline_OneShortLinePerInputTextCallErrorAndSummary', () => {
  const output = timeline('--file', timelineSession());

  assert.equal(output.status, 0, output.stderr);
  assert.equal(output.stdout, [
    '#1 10:00 Mensch: Plane X',
    '#2 10:01 Text: Ich lese den Plan',
    '#2 10:01 Aufruf: Read plan.md',
    '#3 10:01 Fehler: Datei fehlt',
    '#5 10:20 Zusammenfassung',
    '#6 10:30 Mensch: Weiter',
    '',
  ].join('\n'));
});

test('cli_TimelineLongText_ShortenedToEightyCharacters', () => {
  const output = timeline('--file', writeSession([request('r1', '10:00', [say('x'.repeat(200))])]));

  assert.equal(output.stdout.trimEnd(), `#1 10:00 Text: ${'x'.repeat(79)}…`);
});

test('cli_Entry_ShowsEntryAndNeighboursInDetail', () => {
  const output = timeline('--file', timelineSession(), '--entry', '3');

  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /## Eintrag 3 · 10:01 · user ← gesucht\nErgebnis \(Fehler\): Datei fehlt/);
  for (const number of [1, 2, 4, 5]) assert.match(output.stdout, new RegExp(`## Eintrag ${number} · `));
  assert.doesNotMatch(output.stdout, /## Eintrag 6 /);
});

test('cli_EntryOutsideProtocol_ReportedWithExitOne', () => {
  for (const number of ['99', '0']) {
    const output = timeline('--file', timelineSession(), '--entry', number);

    assert.equal(output.status, 1, number);
    assert.match(output.stderr, new RegExp(`Eintrag ${number} liegt außerhalb des Protokolls \\(1-6\\)`));
  }
});

test('cli_NoSource_ExitsWithTwo', () => {
  assert.equal(timeline().status, 2);
});

test('cli_SummaryWithCompactMarker_ShownAsSummary', () => {
  const output = timeline('--file', writeSession([human('Los', '10:00'), summary('This session is being continued.', '10:20')]));

  assert.equal(output.stdout, '#1 10:00 Mensch: Los\n#2 10:20 Zusammenfassung\n');
});

test('cli_SystemCompactEntry_CountedAndShownAsSummaryAlike', () => {
  const file = writeSession([
    human('Los', '10:00'),
    { type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted', timestamp: stamp('10:20') },
  ]);

  const counted = spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8' });
  const shown = timeline('--file', file);

  assert.match(counted.stdout, /Zusammenfassungen: 1\n/);
  assert.equal(shown.stdout, '#1 10:00 Mensch: Los\n#2 10:20 Zusammenfassung\n');
});

test('cli_TimelineOverRowLimit_EndsWithHintToContinue', () => {
  const output = timeline('--file', longSession());
  const lines = output.stdout.trimEnd().split('\n');

  assert.equal(output.status, 0, output.stderr);
  assert.equal(lines.length, 301);
  assert.equal(lines[299], '#300 10:00 Mensch: Eingabe 300');
  assert.equal(lines[300], '… weitere 10 Zeilen bis #310; mit --from 301 fortsetzen oder --entry nutzen');
});

test('cli_TimelineFrom_ListsRemainingRowsWithoutHint', () => {
  const output = timeline('--file', longSession(), '--from', '301');

  assert.equal(output.status, 0, output.stderr);
  assert.equal(output.stdout, `${Array.from({ length: 10 }, (_, index) => `#${301 + index} 10:00 Mensch: Eingabe ${301 + index}`).join('\n')}\n`);
});

test('cli_Session_ReadsProtocolFromProjectFolder', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
  const dir = projectDir(cwd, home);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(writeSession([human('Plane X', '10:00')]), path.join(dir, 'eigene.jsonl'));

  const output = spawnSync(process.execPath, [SCRIPT, '--session', 'eigene', '--cwd', cwd], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, TZ: 'UTC' } });

  assert.equal(output.status, 0, output.stderr);
  assert.equal(output.stdout, '#1 10:00 Mensch: Plane X\n');
});
