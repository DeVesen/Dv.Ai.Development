'use strict';

// Scope-Prüfung für harness-refactoring: entscheidet je Pfad erlaubt, verboten oder unbekannt und nennt den Grund.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MANIFEST = /(^|\/)\.claude-plugin\/plugin\.json$/;

function normalize(file) {
  return path.resolve(file).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function isInside(file, folder) {
  const target = normalize(folder);
  return file === target || file.startsWith(`${target}/`);
}

function isFile(file, candidate) {
  return file === normalize(candidate);
}

// Verbotene Bereiche; sie werden vor den erlaubten geprüft, denn verboten gewinnt vor erlaubt.
function forbiddenRules({ repoRoot, home, installedDirs }) {
  return [
    { test: (file) => isInside(file, path.join(home, '.claude', 'plugins')), grund: 'Regel: installierte Plugins im Claude-Verzeichnis des Nutzers (Plugin-Cache, Marketplaces, Plugin-Store)' },
    { test: (file) => installedDirs.some((dir) => isInside(file, dir)), grund: 'Regel: steht in der Liste der installierten Plugins' },
    { test: (file) => isInside(file, path.join(repoRoot, '.claude', 'plugins')), grund: 'Regel: installierte Plugin-Kopie in der Projekt-Konfiguration' },
    { test: (file) => isFile(file, path.join(home, '.claude', 'CLAUDE.md')), grund: 'Regel: globale Anweisungsdatei des Nutzers, dafür gibt es claude-md-audit' },
  ];
}

function allowedRules({ repoRoot, home, pluginDirs }) {
  const config = path.join(repoRoot, '.claude');
  return [
    { test: (file) => ['skills', 'agents', 'hooks', 'rules'].some((name) => isInside(file, path.join(config, name))) || ['settings.json', 'settings.local.json'].some((name) => isFile(file, path.join(config, name))), grund: 'Projekt-Konfiguration' },
    { test: (file) => [path.join(repoRoot, 'CLAUDE.md'), path.join(config, 'CLAUDE.md')].some((name) => isFile(file, name)), grund: 'Anweisungsdatei des Projekts' },
    { test: (file) => isInside(file, path.join(repoRoot, 'plugins')) || pluginDirs.some((dir) => isInside(file, dir)), grund: 'im Repo versioniertes Plugin-Verzeichnis' },
    { test: (file) => ['skills', 'agents'].some((name) => isInside(file, path.join(home, '.claude', name))), grund: 'globale Skills und Agents des Nutzers' },
  ];
}

function classifyPath(file, context) {
  const target = normalize(file);
  const forbidden = forbiddenRules(context).find((rule) => rule.test(target));
  if (forbidden) return { ergebnis: 'verboten', grund: forbidden.grund };
  const allowed = allowedRules(context).find((rule) => rule.test(target));
  if (allowed) return { ergebnis: 'erlaubt', grund: allowed.grund };
  return { ergebnis: 'unbekannt', grund: 'in keinem erlaubten Bereich' };
}

// Pfade im Paket: `~/` steht für das Home-Verzeichnis, relative Pfade gelten ab der Repo-Wurzel.
function resolveTarget(file, { repoRoot, home }) {
  if (file === '~' || file.startsWith('~/')) return path.join(home, file.slice(2));
  return path.resolve(repoRoot, file);
}

function scopeLine(file, { ergebnis, grund }) {
  return `${ergebnis} | ${file} | ${grund}`;
}

function trackedPluginDirs(repoRoot) {
  const result = spawnSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) return [];
  return result.stdout.split('\0').filter((file) => MANIFEST.test(file)).map((file) => path.join(repoRoot, path.dirname(path.dirname(file))));
}

function installedPluginDirs(home) {
  try {
    const { plugins = {} } = JSON.parse(fs.readFileSync(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'));
    return Object.values(plugins).flat().map((entry) => entry.installPath).filter(Boolean);
  } catch {
    return [];
  }
}

function loadScopeContext(repoRoot, home) {
  return { repoRoot, home, pluginDirs: trackedPluginDirs(repoRoot), installedDirs: installedPluginDirs(home) };
}

module.exports = { classifyPath, resolveTarget, scopeLine, loadScopeContext };
