'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(PLUGIN_ROOT, '..', '..');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('marketplace_Catalog_ListsDvToolbeltWithItsFolder', () => {
  const catalog = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));

  const entry = catalog.plugins.find((plugin) => plugin.name === 'dv-toolbelt');

  assert.ok(entry, 'Eintrag dv-toolbelt fehlt im Katalog');
  assert.equal(entry.source, './plugins/toolbelt');
});

test('pluginJson_Metadata_NameAndVersion', () => {
  const meta = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));

  assert.equal(meta.name, 'dv-toolbelt');
  assert.equal(meta.version, '0.1.0');
});
