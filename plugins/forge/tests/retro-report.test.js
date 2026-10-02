'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { localDate, removeLeftovers } = require('../scripts/retro-report');
const { human, request, call, writeSession } = require('./lib/retro-session');
const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-report.js');
const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');

function setup({ draft = VALID, snapshot = {} } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
  const transcript = writeSession([human('Suche einmal freigeben', '10:00')]);
  const dir = path.join(home, '.dv-forge', 'retro');
  fs.mkdirSync(dir, { recursive: true });
  if (snapshot !== null) fs.writeFileSync(path.join(dir, 's1.snapshot.json'), JSON.stringify({ ...SNAPSHOT, transcript, ownTranscript: transcript, cwd: project, ...snapshot }));
  if (draft !== null) fs.writeFileSync(path.join(dir, 's1.entwurf.md'), draft);
  return { home, project, dir, transcript };
}

function report(env, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: env.home, USERPROFILE: env.home } });
}

function wishes(env) {
  return path.join(env.project, 'docs', 'wishes');
}

test('cli_Format_PrintsReportFormatUnchanged', () => {
  const result = report(setup(), '--format');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, fs.readFileSync(REPORT_FORMAT, 'utf8'));
});

test('cli_InvalidTopic_AbortsWithUsageAndWritesNothing', () => {
  const env = setup();
  for (const topic of ['Gross', 'mit leer', 'ümlaut', 'a/b', '', '-x', 'x-']) {
    const result = report(env, '--session', 's1', '--topic', topic);

    assert.equal(result.status, 2, topic);
    assert.match(result.stderr, /Aufruf: node retro-report\.js/);
  }
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_MissingTopic_AbortsWithUsage', () => {
  const result = report(setup(), '--session', 's1');

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--topic fehlt/);
});

test('cli_MissingDraft_NamesItsPath', () => {
  const env = setup({ draft: null });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(`Entwurf fehlt: ${path.join(env.dir, 's1.entwurf.md')}`));
});

test('cli_MissingSnapshot_NoReportAndExitOne', () => {
  const env = setup({ snapshot: null });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Snapshot fehlt: /);
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_UnreadableSnapshot_NoReportAndExitOne', () => {
  const env = setup();
  fs.writeFileSync(path.join(env.dir, 's1.snapshot.json'), 'kein json');

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Snapshot unlesbar: /);
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_SnapshotWithoutEntryCount_NoReportAndExitOne', () => {
  const env = setup({ snapshot: { transcriptEntries: null } });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Snapshot unlesbar: .*transcriptEntries fehlt/);
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_QuoteOnlyInDraftWriteAfterSnapshot_ReportedAsNotInProtocol', () => {
  const draft = VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Das hat niemand gesagt“');
  const env = setup({ draft });
  const write = request('r9', '10:05', [call('w1', 'Write', { file_path: path.join(env.dir, 's1.entwurf.md'), content: draft })]);
  fs.appendFileSync(env.transcript, `${JSON.stringify(write)}\n`);

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Zitat steht nicht im Protokoll: „Das hat niemand gesagt“/);
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_DraftWithViolations_ListsEachAndWritesNothing', () => {
  const draft = VALID.replace('## Kleinigkeiten\n', '').replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* ein Skill');
  const env = setup({ draft });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Prüfung: 2 Verstöße, keine Berichtsdatei geschrieben\n- Pflichtabschnitt fehlt: ## Kleinigkeiten\n- Reibung 1 /);
  assert.equal(fs.existsSync(wishes(env)), false);
  assert.ok(fs.existsSync(path.join(env.dir, 's1.entwurf.md')));
});

test('cli_ValidDraft_WritesDatedReportAndDeletesDraft', () => {
  const env = setup();

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 0, result.stderr);
  const file = path.join(wishes(env), `${localDate()}-planung.md`);
  assert.ok(result.stdout.includes(`Bericht: ${file}`));
  assert.match(result.stdout, /Prüfung: 0 Verstöße/);
  assert.match(fs.readFileSync(file, 'utf8'), /^# Erfahrungsbericht Planung eines Skripts\n[\s\S]*## Zahlen\n- Dauer: 10 min/);
  assert.equal(fs.existsSync(path.join(env.dir, 's1.entwurf.md')), false);
  assert.match(result.stdout, /Befunde: 3 \(Positiv 1, Reibung 1, Sparpotenzial 1\)\n/);
  assert.match(result.stdout, /Kosten der Retrospektive: /);
  assert.doesNotMatch(result.stdout, /Workitem/);
  assert.ok(result.stdout.includes(`Vormerken: git add "docs/wishes/${localDate()}-planung.md"`));
});

test('cli_ExistingReports_AddsNextCounter', () => {
  const env = setup();
  fs.mkdirSync(wishes(env), { recursive: true });
  fs.writeFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'alt');
  fs.writeFileSync(path.join(wishes(env), `${localDate()}-planung-2.md`), 'alt');

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(wishes(env), `${localDate()}-planung-3.md`)));
});

test('cli_QuoteFromSubagent_AcceptedAsProtocolText', () => {
  const env = setup({ draft: VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Agent fand drei Treffer“') });
  const agents = path.join(env.transcript.slice(0, -'.jsonl'.length), 'subagents');
  fs.mkdirSync(agents, { recursive: true });
  fs.writeFileSync(path.join(agents, 'a1.jsonl'), `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Agent fand drei Treffer' }] } })}\n`);

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 0, result.stderr);
});

test('cli_MissingProtocol_NamesPathAndWritesNothing', () => {
  const env = setup();
  fs.rmSync(env.transcript);

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(`Protokoll fehlt: ${env.transcript}`));
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_SnapshotCwdMissing_NamesCwdFlagAndWritesNothing', () => {
  const missing = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-gone-')), 'worktree');
  const env = setup({ snapshot: { cwd: missing } });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(`Projektordner fehlt: ${missing}; das Protokoll stammt aus einem anderen Projekt oder einer anderen Maschine, mit --cwd <projektordner> angeben`));
  assert.equal(fs.existsSync(missing), false);
});

test('cli_TokenInCommandList_ReportedAndNothingWritten', () => {
  const numbers = '- Dauer: 10 min · Modelle: claude-x\n\n**Wiederkehrende Shell-Befehle:**\n- `curl -H "Authorization: Bearer abcdef1234567890" https://example.test` (3×)';
  const env = setup({ snapshot: { numbers } });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Prüfung: 1 Verstöße, keine Berichtsdatei geschrieben\n- Geheimnis im Bericht: Bearer-Token in Zeile \d+: .*Authorization: \*\*\*/);
  assert.equal(result.stderr.includes('abcdef1234567890'), false);
  assert.equal(fs.existsSync(wishes(env)), false);
});

test('cli_SourcePath_WrittenWithoutUserFolder', () => {
  const mcp = 'Quelle: `C:\\Users\\max.muster\\.claude\\projects\\p\\s1.jsonl` · Hauptagent + 0 SubAgent(s) · 2 Tool-Aufrufe, davon 0 MCP';
  const env = setup({ snapshot: { mcp } });

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'utf8');
  assert.ok(text.includes('Quelle: `s1.jsonl` · Hauptagent + 0 SubAgent(s)'));
  assert.equal(text.includes('max.muster'), false);
});

test('cli_ProjectPathsInNumbers_WrittenRelative', () => {
  const env = setup();
  const numbers = `- Dauer: 10 min · Modelle: claude-x\n\n**Mehrfach gelesene Dateien:**\n- 3× ${path.join(env.project, 'src', 'Shift.ts')}`;
  fs.writeFileSync(path.join(env.dir, 's1.snapshot.json'), JSON.stringify({ ...SNAPSHOT, transcript: env.transcript, ownTranscript: env.transcript, cwd: env.project, numbers }));

  const result = report(env, '--session', 's1', '--topic', 'planung');

  assert.equal(result.status, 0, result.stderr);
  const text = fs.readFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'utf8');
  assert.ok(text.includes(`- 3× ${path.join('src', 'Shift.ts')}`));
  assert.equal(text.includes(env.project), false);
});

test('removeLeftovers_UndeletablePath_ReturnsWarningInsteadOfThrowing', () => {
  const blocked = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-blocked-'));

  const warnings = removeLeftovers([blocked]);

  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].startsWith(`Warnung: ${blocked} nicht gelöscht`));
});
