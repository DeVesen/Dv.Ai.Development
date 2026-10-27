'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { classifyPath, resolveTarget, scopeLine, loadScopeContext } = require('../scripts/lib/harness-scope');
const { HarnessError } = require('../scripts/lib/harness-package');
const { makeRepo, commitFile } = require('./lib/git-repo');

const REPO = path.join(os.tmpdir(), 'scope-repo');
const HOME = path.join(os.tmpdir(), 'scope-home');
const CONTEXT = { repoRoot: REPO, home: HOME, pluginDirs: [path.join(REPO, 'tools', 'eigen')], installedDirs: [path.join(REPO, 'vendor', 'fremd')] };

function scope(...parts) {
  return classifyPath(path.join(...parts), CONTEXT);
}

test('classifyPath_PluginCacheMarketplacesAndStoreInUserClaudeFolder_Forbidden', () => {
  for (const area of ['cache', 'marketplaces', 'store']) {
    const result = scope(HOME, '.claude', 'plugins', area, 'x', 'SKILL.md');

    assert.equal(result.ergebnis, 'verboten', area);
    assert.match(result.grund, /^Regel: installierte Plugins im Claude-Verzeichnis des Nutzers/);
  }
});

test('classifyPath_InstalledPluginCopyInProjectConfig_ForbiddenEvenWithManifest', () => {
  const context = { ...CONTEXT, pluginDirs: [path.join(REPO, '.claude', 'plugins', 'kopie')] };

  const result = classifyPath(path.join(REPO, '.claude', 'plugins', 'kopie', 'skills', 'a', 'SKILL.md'), context);

  assert.equal(result.ergebnis, 'verboten');
  assert.equal(result.grund, 'Regel: installierte Plugin-Kopie in der Projekt-Konfiguration');
});

test('classifyPath_PathInListOfInstalledPlugins_Forbidden', () => {
  const result = scope(REPO, 'vendor', 'fremd', 'README.md');

  assert.equal(result.ergebnis, 'verboten');
  assert.equal(result.grund, 'Regel: steht in der Liste der installierten Plugins');
});

test('classifyPath_GlobalInstructionFileOfUser_Forbidden', () => {
  const result = scope(HOME, '.claude', 'CLAUDE.md');

  assert.equal(result.ergebnis, 'verboten');
  assert.match(result.grund, /globale Anweisungsdatei des Nutzers/);
});

test('classifyPath_ProjectConfigAndProjectInstructionFile_Allowed', () => {
  const allowed = [
    [REPO, '.claude', 'skills', 'a', 'SKILL.md'],
    [REPO, '.claude', 'agents', 'b.md'],
    [REPO, '.claude', 'hooks', 'c.js'],
    [REPO, '.claude', 'rules', 'd.md'],
    [REPO, '.claude', 'settings.json'],
    [REPO, '.claude', 'settings.local.json'],
    [REPO, 'CLAUDE.md'],
  ];

  for (const parts of allowed) assert.equal(scope(...parts).ergebnis, 'erlaubt', parts.join('/'));
});

test('classifyPath_RepoPluginFolderAndVersionedManifestFolder_Allowed', () => {
  assert.equal(scope(REPO, 'plugins', 'x', 'skills', 'y', 'SKILL.md').grund, 'im Repo versioniertes Plugin-Verzeichnis');
  assert.equal(scope(REPO, 'tools', 'eigen', 'agents', 'z.md').ergebnis, 'erlaubt');
});

test('classifyPath_GlobalSkillsAndAgents_Allowed', () => {
  assert.equal(scope(HOME, '.claude', 'skills', 'a', 'SKILL.md').grund, 'globale Skills und Agents des Nutzers');
  assert.equal(scope(HOME, '.claude', 'agents', 'b.md').ergebnis, 'erlaubt');
});

test('classifyPath_NeitherAllowedNorForbidden_Unknown', () => {
  for (const parts of [[REPO, 'src', 'app.js'], [REPO, '.claude', 'commands', 'x.md'], [HOME, '.claude', 'settings.json'], [REPO, 'pluginsx', 'a.md']]) {
    assert.deepEqual(scope(...parts), { ergebnis: 'unbekannt', grund: 'in keinem erlaubten Bereich' }, parts.join('/'));
  }
});

test('classifyPath_DifferentCaseAndSlashes_SameResult', () => {
  const result = classifyPath(`${HOME.toUpperCase()}/.CLAUDE/plugins/cache/x`, CONTEXT);

  assert.equal(result.ergebnis, 'verboten');
});

test('resolveTarget_TildeRelativeAndAbsolute_ResolvedAgainstHomeAndRepo', () => {
  assert.equal(resolveTarget('~/.claude/skills/a', CONTEXT), path.join(HOME, '.claude', 'skills', 'a'));
  assert.equal(resolveTarget('plugins/x', CONTEXT), path.join(REPO, 'plugins', 'x'));
  assert.equal(resolveTarget(path.join(HOME, 'y'), CONTEXT), path.join(HOME, 'y'));
});

test('scopeLine_Result_ResultPathAndReasonSeparatedByBars', () => {
  assert.equal(scopeLine('a/b.md', { ergebnis: 'erlaubt', grund: 'Projekt-Konfiguration' }), 'erlaubt | a/b.md | Projekt-Konfiguration');
});

test('loadScopeContext_TrackedManifestAndInstalledList_FoldersRead', () => {
  const repo = makeRepo();
  commitFile(repo, 'werkzeug/eigen/.claude-plugin/plugin.json', '{"name":"eigen"}\n', 'plugin');
  fs.mkdirSync(path.join(repo, 'lose', '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'lose', '.claude-plugin', 'plugin.json'), '{}\n');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-home-'));
  fs.mkdirSync(path.join(home, '.claude', 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'a@m': [{ installPath: 'C:/x/a' }] } }));

  const context = loadScopeContext(repo, home);

  assert.deepEqual(context.pluginDirs, [path.join(repo, 'werkzeug', 'eigen')]);
  assert.deepEqual(context.installedDirs, ['C:/x/a']);
});

test('loadScopeContext_NoInstalledList_EmptyInstalledFolders', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-home-'));

  assert.deepEqual(loadScopeContext(makeRepo(), home).installedDirs, []);
});

function homeWithInstalledList(content) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-home-'));
  fs.mkdirSync(path.join(home, '.claude', 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), content);
  return home;
}

test('loadScopeContext_BrokenInstalledJson_ThrowsHarnessError', () => {
  assert.throws(() => loadScopeContext(makeRepo(), homeWithInstalledList('{kaputt')), HarnessError);
});

test('loadScopeContext_InstalledListWithWrongStructure_ThrowsHarnessError', () => {
  for (const content of ['{"plugins":"x"}', '{"plugins":{"a@m":{"installPath":"C:/x"}}}', '{"plugins":null}']) {
    assert.throws(() => loadScopeContext(makeRepo(), homeWithInstalledList(content)), HarnessError, content);
  }
});

test('loadScopeContext_RepoWithoutGit_ThrowsHarnessError', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-nogit-'));

  assert.throws(() => loadScopeContext(folder, fs.mkdtempSync(path.join(os.tmpdir(), 'scope-home-'))), HarnessError);
});
