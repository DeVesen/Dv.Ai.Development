'use strict';

// Inventarliste für harness-refactoring: Plugins, Skills, Agents, Hooks und Skripte der erlaubten Bereiche und ihr Abgleich mit einer Rückmeldung.

const fs = require('node:fs');
const path = require('node:path');

function entriesOf(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function folderItems(dir, art) {
  return entriesOf(dir).filter((entry) => entry.isDirectory()).map((entry) => ({ art, name: entry.name, pfad: path.join(dir, entry.name) }));
}

function fileItems(dir, art, extension = '') {
  return entriesOf(dir)
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => ({ art, name: entry.name.slice(0, entry.name.length - extension.length), pfad: path.join(dir, entry.name) }));
}

function pluginName(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), 'utf8')).name || path.basename(dir);
  } catch {
    return path.basename(dir);
  }
}

function configItems(dir) {
  return [...folderItems(path.join(dir, 'skills'), 'skill'), ...fileItems(path.join(dir, 'agents'), 'agent', '.md'), ...fileItems(path.join(dir, 'hooks'), 'hook')];
}

function pluginItems(dir) {
  return [{ art: 'plugin', name: pluginName(dir), pfad: dir }, ...configItems(dir), ...fileItems(path.join(dir, 'scripts'), 'skript', '.js')];
}

function inventoryOf({ repoRoot, home, pluginDirs }) {
  return [
    ...configItems(path.join(repoRoot, '.claude')),
    ...pluginDirs.flatMap(pluginItems),
    ...folderItems(path.join(home, '.claude', 'skills'), 'skill'),
    ...fileItems(path.join(home, '.claude', 'agents'), 'agent', '.md'),
  ];
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Ein Name trifft nur als ganzes Wort; Bindestrich und Unterstrich zählen zum Wort. Ein Pfad trifft relativ zur Repo-Wurzel.
// Aufrufzeilen wie `/plugin:skill`, `plugin:agent` oder `node ".../scripts/name.js"` treffen über ihre Bestandteile, denn `:`, `/`, `.` und `"` sind keine Wortzeichen.
function mentions(text, item, repoRoot) {
  const name = new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(item.name.toLowerCase())}($|[^a-z0-9_-])`);
  const relative = path.relative(repoRoot, item.pfad).replace(/\\/g, '/').toLowerCase();
  return name.test(text) || (!relative.startsWith('..') && !path.isAbsolute(relative) && text.includes(relative));
}

function matchTargets(text, inventory, repoRoot) {
  const lower = text.toLowerCase().replace(/\\/g, '/');
  const seen = new Set();
  return inventory.filter((item) => {
    if (seen.has(item.pfad) || !mentions(lower, item, repoRoot)) return false;
    seen.add(item.pfad);
    return true;
  });
}

function itemLine({ art, name, pfad }) {
  return `${art} | ${name} | ${pfad}`;
}

module.exports = { inventoryOf, matchTargets, itemLine };
