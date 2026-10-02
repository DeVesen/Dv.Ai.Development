'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.join(__dirname, '..');

test('scripts_EveryScript_HasItsTestFile', () => {
  const scripts = fs.readdirSync(path.join(PLUGIN_ROOT, 'scripts')).filter((name) => name.endsWith('.js'));

  const missing = scripts.filter((name) => !fs.existsSync(path.join(__dirname, name.replace(/\.js$/, '.test.js'))));

  assert.deepEqual(missing, []);
});
