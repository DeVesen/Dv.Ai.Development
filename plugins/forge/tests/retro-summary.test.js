'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { findingSummary, retroCost, workitemCandidate, summaryLines } = require('../scripts/lib/retro-summary');
const { human, slash, request, usage, writeSession } = require('./lib/retro-session');
const { readEntries } = require('../scripts/lib/transcript');
const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');
const { makeRepo, commitFile } = require('./lib/git-repo');

function friction(number) {
  return [`${number}. **Reibung ${number}.**`, '   *Situation:* s', '   *Kosten:* 1 min', '   *Ursache:* u', '   *Besser gewesen:* b', '   *Vorschlag:* v', '   *Ziel:* Ziel offen', '   *Im Projekt:* nichts', ''].join('\n');
}

test('findingSummary_ValidDraft_CountsAndShortFindingsPerSection', () => {
  assert.deepEqual(findingSummary(VALID), [
    'Befunde: 3 (Positiv 1, Reibung 1, Sparpotenzial 1)',
    'Positiv: Tests liefen sofort grün',
    'Reibung: Suche im Protokoll blockiert',
    'Sparpotenzial: Zeitleiste statt Textsuche',
  ]);
});

test('findingSummary_FourFindings_ShowsFirstThree', () => {
  const start = VALID.indexOf('## Reibung\n');
  const end = VALID.indexOf('## Sparpotenzial\n');
  const draft = `${VALID.slice(0, start)}## Reibung\n\n${[1, 2, 3, 4].map(friction).join('\n')}\n${VALID.slice(end)}`;

  const lines = findingSummary(draft);

  assert.equal(lines[2], 'Reibung: Reibung 1 · Reibung 2 · Reibung 3');
});

test('retroCost_AfterSnapshotEntry_RequestsAndTokensSplit', () => {
  const transcript = writeSession([
    request('r0', '09:00', [], usage(9000, 9000, 9000, 9000)),
    slash('dv-forge:prozess-retrospektive', '', '10:00'),
    request('r1', '10:01', [], usage(1000, 2000, 50000, 300)),
    request('r2', '10:02', [], usage(500, 0, 52000, 200)),
    request('r2', '10:02', [], usage(500, 0, 52000, 200)),
  ]);
  const fromEntryNo = readEntries(transcript)[1].entryNo;

  assert.equal(retroCost(transcript, fromEntryNo), 'Kosten der Retrospektive: 2 Anfragen · Tokens 4k neu verarbeitet, 102k aus dem Cache, 1k Ausgabe');
});

test('retroCost_NoRetroCallButEarlierRetro_CountsOnlyAfterSnapshot', () => {
  const transcript = writeSession([
    slash('dv-forge:prozess-retrospektive', '', '08:00'),
    request('r0', '08:01', [], usage(9000, 9000, 9000, 9000)),
    human('Weiter', '09:00'),
    request('r1', '10:01', [], usage(1000, 0, 0, 100)),
  ]);
  const fromEntryNo = readEntries(transcript)[2].entryNo;

  assert.equal(retroCost(transcript, fromEntryNo), 'Kosten der Retrospektive: 1 Anfragen · Tokens 1k neu verarbeitet, 0k aus dem Cache, 0k Ausgabe');
});

test('summaryLines_OwnTranscriptNotEvaluated_CostNotMeasurable', () => {
  const repo = makeRepo();
  const own = writeSession([request('r1', '10:01', [], usage(1000, 0, 0, 100))]);
  const snapshot = { ...SNAPSHOT, transcript: writeSession([human('Los', '10:00')]), ownTranscript: own, transcriptEntries: 0 };

  const lines = summaryLines({ file: path.join(repo, 'docs', 'wishes', 'x.md'), cwd: repo, text: VALID, snapshot });

  assert.ok(lines.includes('Kosten der Retrospektive: nicht messbar (eigenes Protokoll ist nicht das ausgewertete)'));
});

test('summaryLines_OwnTranscriptUnknown_CostNotTakenFromForeignProtocol', () => {
  const repo = makeRepo();
  const foreign = writeSession([
    slash('dv-forge:prozess-retrospektive', '', '10:00'),
    request('r1', '10:01', [], usage(1000, 0, 0, 100)),
  ]);
  const snapshot = { ...SNAPSHOT, transcript: foreign, ownTranscript: null };

  const lines = summaryLines({ file: path.join(repo, 'docs', 'wishes', 'x.md'), cwd: repo, text: VALID, snapshot });

  assert.ok(lines.includes('Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)'));
});

test('workitemCandidate_SpecWithWorkitem_TakesSpecFirst', () => {
  const repo = makeRepo();
  commitFile(repo, 'docs/spec.md', '# Spec\n\nWorkitem: AB#123\n', 'spec');

  const candidate = workitemCandidate({ ...SNAPSHOT, specs: ['docs/spec.md'], branch: 'feature/AB#77-x' }, repo);

  assert.equal(candidate, 'AB#123 (aus Spec docs/spec.md)');
});

test('workitemCandidate_NoSpecButBranchMatchesPattern_TakesBranch', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n\n- Workitem: `\\d{6}`\n', 'config');

  const candidate = workitemCandidate({ ...SNAPSHOT, specs: [], branch: 'feature/307326-result' }, repo);

  assert.equal(candidate, '307326 (aus Branch feature/307326-result)');
});

test('workitemCandidate_NeitherSpecNorPattern_None', () => {
  const repo = makeRepo();

  assert.equal(workitemCandidate({ ...SNAPSHOT, specs: [], branch: 'feature/x' }, repo), 'keiner');
});
