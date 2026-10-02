'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('../scripts/forge-config.js');
const fs = require('node:fs');
const { commitFile, git, makeRepo } = require('./lib/git-repo');

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
  assert.equal(values['MCP-Erwartet'], '');
  assert.deepEqual(configured, []);
});

test('readConfig_Section_OverridesDefaultsAndProfileFollowsGlossary', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', SECTION, 'config');
  const { config: values } = config.readConfig(repo);
  assert.equal(values.Worktree, 'ja');
  assert.equal(values.Profile, 'docs/terms');
});

function worktreeWithUntrackedConfig() {
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, '.gitignore'), 'CLAUDE.md\n.wt/\n');
  git(repo, 'add', '.gitignore');
  git(repo, 'commit', '--quiet', '-m', 'ignore');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '## dv-forge\n- Test: dv-forge: angular-test --root src/frontend\n');
  const worktree = path.join(repo, '.wt', 'feature');
  git(repo, 'worktree', 'add', '--quiet', '-b', 'feature', worktree);
  return { repo, worktree };
}

test('readConfig_WorktreeWithoutClaudeMd_FallsBackToMainCheckout', () => {
  const { worktree } = worktreeWithUntrackedConfig();
  const { config: values, source } = config.readConfig(worktree);
  assert.equal(values.Test, 'dv-forge: angular-test --root src/frontend');
  assert.equal(source, 'haupt');
});

test('readConfig_OwnClaudeMd_WinsAndSourceIsOwn', () => {
  const { worktree } = worktreeWithUntrackedConfig();
  fs.writeFileSync(path.join(worktree, 'CLAUDE.md'), '## dv-forge\n- Test: eigener Befehl\n');
  const { config: values, source } = config.readConfig(worktree);
  assert.equal(values.Test, 'eigener Befehl');
  assert.equal(source, 'eigen');
});

test('cli_Get_FallbackToMainCheckout_NotedOnStderrOnly', () => {
  const { worktree } = worktreeWithUntrackedConfig();
  const result = run(worktree, 'get', 'Lint');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '\n');
  assert.match(result.stderr, /Konfiguration aus dem Haupt-Checkout/);
});

test('branchFor_WorkitemPlaceholder_ReadsSpecHeader', () => {
  const repo = makeRepo();
  commitFile(repo, 'spec.md', '# T\n\nWorkitem: `AB#12`\n', 'spec');
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  assert.equal(config.branchFor(values, 'foo', path.join(repo, 'spec.md')), 'feature/AB#12-foo');
  assert.throws(() => config.branchFor(values, 'foo', null), /braucht eine Workitem-Nummer/);
});

function specWith(workitem) {
  const repo = makeRepo();
  commitFile(repo, 'spec.md', `# T\n\nWorkitem: \`${workitem}\`\n`, 'spec');
  return path.join(repo, 'spec.md');
}

test('branchFor_SlugWithDateAndWorkitem_DropsBothOnce', () => {
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  const spec = specWith('307326');
  assert.equal(config.branchFor(values, '2026-09-28-307326-result-status', spec), 'feature/307326-result-status');
  assert.equal(config.branchFor(values, '2026-09-28-result-status', spec), 'feature/307326-result-status');
  assert.equal(config.branchFor(values, '307326-result-status', spec), 'feature/307326-result-status');
  assert.equal(config.branchFor(values, 'result-status', spec), 'feature/307326-result-status');
});

test('branchFor_WorkitemWithPrefix_MatchesNumberOrFullValueInSlug', () => {
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  assert.equal(config.branchFor(values, '2026-09-28-307326-foo', specWith('#307326')), 'feature/#307326-foo');
  assert.equal(config.branchFor(values, '2026-09-28-AB#12-foo', specWith('AB#12')), 'feature/AB#12-foo');
  assert.equal(config.branchFor(values, '2026-09-28-12-foo', specWith('AB#12')), 'feature/AB#12-foo');
});

test('branchFor_OtherNumberInSlug_StaysInSlug', () => {
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  assert.equal(config.branchFor(values, '2026-09-28-1234-foo', specWith('307326')), 'feature/307326-1234-foo');
});

test('branchFor_SchemaWithoutWorkitem_DropsOnlyDateAndKeepsNumber', () => {
  const values = { 'Branch-Schema': 'feature/<slug>' };
  assert.equal(config.branchFor(values, '2026-09-28-307326-foo', specWith('307326')), 'feature/307326-foo');
  assert.equal(config.branchFor(values, 'foo', null), 'feature/foo');
});

test('branchCandidates_ShortenedSlug_AlsoNamesLegacyBranch', () => {
  const values = { 'Branch-Schema': 'feature/<workitem>-<slug>' };
  const spec = specWith('307326');
  assert.deepEqual(config.branchCandidates(values, '2026-09-28-307326-foo', spec),
    ['feature/307326-foo', 'feature/307326-2026-09-28-307326-foo']);
  assert.deepEqual(config.branchCandidates(values, 'foo', spec), ['feature/307326-foo']);
});

test('cli_ShowAndGet_MarkDefaults', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', SECTION, 'config');
  const shown = run(repo, 'show');
  assert.equal(shown.status, 0);
  assert.match(shown.stdout, /^Worktree=ja$/m);
  assert.match(shown.stdout, /^Lint=  \(Default\)$/m);
  assert.match(shown.stdout, /^MCP-Erwartet=  \(Default\)$/m);
  assert.equal(run(repo, 'get', 'Glossar').stdout, 'docs/terms\n');
  assert.equal(run(repo, 'get', 'Quatsch').status, 1);
  assert.equal(run(repo, 'bogus').status, 2);
});

test('parseSection_TwoSections_BothReadLaterWins', () => {
  const text = '## dv-forge\n- Worktree: ja\n- Glossar: a\n\n## Sonst\n- Glossar: x\n\n## dv-forge\n- Glossar: b\n';
  assert.deepEqual(config.parseSection(text), { Worktree: 'ja', Glossar: 'b' });
});

test('initSkill_McpExpected_NamesPlaceKeyAndExampleWithTwoServers', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'), 'utf8');

  assert.match(text, /\| `MCP-Erwartet` \|/);
  assert.ok(text.includes('- MCP-Erwartet: dev-mcp, codebase-analyzer'));
  assert.ok(text.includes('Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`'));
});

test('branchWorkitem_PatternInBranch_ReturnsMatch', () => {
  assert.equal(config.branchWorkitem({ Workitem: '\\d{6}' }, 'feature/307326-result'), '307326');
});

test('branchWorkitem_NoneEmptyInvalidNoBranchOrNoMatch_Null', () => {
  const cases = [
    [{ Workitem: 'keine' }, 'feature/307326-x'],
    [{ Workitem: '' }, 'feature/307326-x'],
    [{ Workitem: '(' }, 'feature/307326-x'],
    [{ Workitem: '\\d{6}' }, ''],
    [{ Workitem: '\\d{6}' }, 'feature/x'],
  ];

  assert.deepEqual(cases.map(([values, branch]) => config.branchWorkitem(values, branch)), [null, null, null, null, null]);
});

test('getValue_TestWithOldToolchainSpelling_ReturnsTheValueUnresolved', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n\n- Test: `dv-forge: dotnet-test --path src/App.sln`\n', 'config');
  assert.equal(config.getValue('Test', repo), 'dv-forge: dotnet-test --path src/App.sln');
});
