'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.join(__dirname, '..');
// Die Namen entstehen aus Teilen, damit diese Datei sie nicht selbst enthält.
const FOREIGN_NAMES = ['super' + 'powers', 'skill-' + 'creator', 'grill-' + 'me', 'dv-' + 'forge', 'forge-' + 'config'];

function filesOf(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesOf(full) : [full];
  });
}

test('plugin_AllFilesButReadme_NameNoForeignPluginOrSkill', () => {
  const hits = filesOf(PLUGIN_ROOT)
    .filter((file) => path.relative(PLUGIN_ROOT, file) !== 'README.md')
    .flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return FOREIGN_NAMES.filter((name) => text.includes(name)).map((name) => `${path.relative(PLUGIN_ROOT, file)}: ${name}`);
    });

  assert.deepEqual(hits, []);
});
