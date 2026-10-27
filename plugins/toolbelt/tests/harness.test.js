'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse } = require('../scripts/harness');
const { HarnessError } = require('../scripts/lib/harness-package');
const { makeRepo, commitFile } = require('./lib/git-repo');
const { validFiles, replaced, writePackage } = require('./lib/harness-fixture');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'harness.js');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-cli-'));
}

function cli(cwd, home, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
}

test('parse_RepeatedTargetsSwitchAndValue_CollectedSeparately', () => {
  const result = parse(['--ziel', 'a', '--text', '--ziel', 'b', '--rueckmeldung', 'r.md', 'frei']);

  assert.deepEqual(result, { positional: ['frei'], flags: { ziel: ['a', 'b'], text: true, rueckmeldung: 'r.md' } });
});

test('parse_OptionWithoutValue_Throws', () => {
  assert.throws(() => parse(['--rueckmeldung']), HarnessError);
});

test('start_OutsideGitRepo_AbortsWithOneSentenceAndCreatesNothing', () => {
  const dir = tempDir();

  const result = cli(dir, dir, 'start', '--ziel', 'plugins/x');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `Abbruch: ${dir} liegt in keinem Git-Repo.\n`);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('start_NeitherTargetNorFeedback_AbortsWithOneSentenceAndCreatesNoPackage', () => {
  const repo = makeRepo();

  const result = cli(repo, tempDir(), 'start');

  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'Abbruch: Weder Ziel noch Rückmeldung angegeben.\n');
  assert.equal(fs.existsSync(path.join(repo, '.harness')), false);
});

test('start_EmptyFeedbackFile_AbortsNamingTheFile', () => {
  const repo = makeRepo();
  const file = path.join(tempDir(), 'retro.md');
  fs.writeFileSync(file, '');

  const result = cli(repo, tempDir(), 'start', '--rueckmeldung', file);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, `Abbruch: Die Rückmeldedatei ${file} ist leer.\n`);
});

test('start_TargetInRepo_RepoAndBranch', () => {
  const repo = makeRepo();

  const result = cli(repo, tempDir(), 'start', '--ziel', 'plugins/x');

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^REPO=.+\nBRANCH=main\n$/);
});

test('ziele_FeedbackNamingOneSkill_OneHit', () => {
  const repo = fs.realpathSync.native(makeRepo());
  commitFile(repo, 'plugins/werkzeug/.claude-plugin/plugin.json', '{"name":"dv-werkzeug"}\n', 'plugin');
  commitFile(repo, 'plugins/werkzeug/skills/plan-schreiben/SKILL.md', '---\n', 'skill');
  const feedback = path.join(tempDir(), 'retro.md');
  fs.writeFileSync(feedback, 'plan-schreiben fragt zu oft.\n');

  const result = cli(repo, tempDir(), 'ziele', '--rueckmeldung', feedback);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, `TREFFER=1\nskill | plan-schreiben | ${path.join(repo, 'plugins', 'werkzeug', 'skills', 'plan-schreiben')}\n`);
});

test('ziele_All_WholeInventoryWithCount', () => {
  const repo = fs.realpathSync.native(makeRepo());
  commitFile(repo, 'plugins/werkzeug/.claude-plugin/plugin.json', '{"name":"dv-werkzeug"}\n', 'plugin');

  const result = cli(repo, tempDir(), 'ziele', '--alle');

  assert.equal(result.status, 0);
  assert.equal(result.stdout, `INVENTAR=1\nplugin | dv-werkzeug | ${path.join(repo, 'plugins', 'werkzeug')}\n`);
});

test('scope_ThreePaths_OneLinePerPathWithResultAndReason', () => {
  const repo = makeRepo();
  const home = tempDir();

  const result = cli(repo, home, 'scope', '~/.claude/plugins/cache/x/SKILL.md', 'plugins/a/SKILL.md', 'src/app.js');

  assert.equal(result.status, 0);
  assert.equal(result.stdout, [
    'verboten | ~/.claude/plugins/cache/x/SKILL.md | Regel: installierte Plugins im Claude-Verzeichnis des Nutzers (Plugin-Cache, Marketplaces, Plugin-Store)',
    'erlaubt | plugins/a/SKILL.md | im Repo versioniertes Plugin-Verzeichnis',
    'unbekannt | src/app.js | in keinem erlaubten Bereich',
  ].join('\n') + '\n');
});

test('paket_SameTargetTwice_SecondFolderGetsSuffix', () => {
  const repo = fs.realpathSync.native(makeRepo());
  const home = tempDir();

  const first = cli(repo, home, 'paket', 'werkzeug', '--datum', '2026-10-27');
  const second = cli(repo, home, 'paket', 'werkzeug', '--datum', '2026-10-27');

  assert.equal(first.stdout, `PAKET=${path.join(repo, '.harness', 'werkzeug-2026-10-27')}\n`);
  assert.equal(second.stdout, `PAKET=${path.join(repo, '.harness', 'werkzeug-2026-10-27-2')}\n`);
});

test('pruefe_ValidPackage_ExitZeroAndValidVerdict', () => {
  const repo = makeRepo();

  const result = cli(repo, tempDir(), 'pruefe', writePackage(validFiles()));

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, 'Paket gültig\n');
});

test('pruefe_TaskWithUnknownFile_ExitOneWithErrorLines', () => {
  const repo = makeRepo();
  const files = replaced(validFiles(), 'tasks/T-01.md', '- `plugins/werkzeug/skills/a/SKILL.md` · erlaubt', '- `src/app.js` · erlaubt');

  const result = cli(repo, tempDir(), 'pruefe', writePackage(files));

  assert.equal(result.status, 1);
  assert.equal(result.stdout, [
    'FEHLER tasks/T-01.md: src/app.js ist unbekannt (in keinem erlaubten Bereich)',
    'FEHLER tasks/T-01.md: src/app.js steht als erlaubt, die Scope-Prüfung sagt unbekannt',
    'Paket ungültig: 2 Fehler',
  ].join('\n') + '\n');
});

test('main_UnknownCommandOrMissingArgument_UsageAndExitTwo', () => {
  const repo = makeRepo();

  assert.equal(cli(repo, tempDir(), 'loeschen').status, 2);
  assert.equal(cli(repo, tempDir(), 'scope').status, 2);
});
