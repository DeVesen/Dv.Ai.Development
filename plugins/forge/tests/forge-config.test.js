'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../scripts/forge-config.js');
const { commitFile, makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'forge-config.js');
const SECTION = [
  '# Projekt',
  '',
  '## dv-forge',
  '',
  '- Worktree: ja',
  '- Branch-Schema: `feature/<workitem>-<slug>`',
  '- Glossar: docs/terms',
  '- Unbekannt: wird ignoriert',
  '',
  '## Anderes',
  '- Worktree: nein',
  '',
].join('\n');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('parseSection_KnownKeysOnly_StopsAtNextHeading', () => {
  const entries = config.parseSection(SECTION);
  assert.deepEqual(entries, { Worktree: 'ja', 'Branch-Schema': 'feature/<workitem>-<slug>', Glossar: 'docs/terms' });
});

test('readConfig_NoClaudeMd_AllDefaults', () => {
  const repo = makeRepo();
  const { config: values, configured } = config.readConfig(repo);
  assert.equal(values.Worktree, 'nein');
  assert.equal(values['Branch-Schema'], 'feature/<slug>');
  assert.equal(values.Profile, 'docs/glossary');
  assert.equal(values['Worktree-Ordner'], `../${path.basename(repo)}-worktrees`);
  assert.deepEqual(configured, []);
});

test('readConfig_Section_OverridesDefaultsAndProfileFollowsGlossary', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', SECTION, 'config');
  const { config: values } = config.readConfig(repo);
  assert.equal(values.Worktree, 'ja');
  assert.equal(values.Profile, 'docs/terms');
});

test('branchFor_WorkitemPlaceholder_ReadsSpecHeader', () => {
  const repo = makeRepo();
  commitFile(repo, 'spec.md', '# T\n\nWorkitem: `AB#12`\n', 'spec');
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  assert.equal(config.branchFor(values, 'foo', path.join(repo, 'spec.md')), 'feature/AB#12-foo');
  assert.throws(() => config.branchFor(values, 'foo', null), /braucht eine Workitem-Nummer/);
});

test('cli_ShowAndGet_MarkDefaults', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', SECTION, 'config');
  const shown = run(repo, 'show');
  assert.equal(shown.status, 0);
  assert.match(shown.stdout, /^Worktree=ja$/m);
  assert.match(shown.stdout, /^Lint=  \(Default\)$/m);
  assert.equal(run(repo, 'get', 'Glossar').stdout, 'docs/terms\n');
  assert.equal(run(repo, 'get', 'Quatsch').status, 1);
  assert.equal(run(repo, 'bogus').status, 2);
});
