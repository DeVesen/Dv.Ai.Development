'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCANNED = ['skills', 'agents', 'shared', 'hooks', 'scripts', '.claude-plugin'];
const FORBIDDEN = [/subagent-driven/i, /Rulings, not stalls/i, /load-bearing/i, /Common Rationalizations/i];

function filesIn(dir) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { recursive: true })
    .map((entry) => path.join(absolute, entry))
    .filter((file) => fs.statSync(file).isFile());
}

test('pluginFiles_NoneMentionsOriginOfImplementation', () => {
  for (const file of SCANNED.flatMap(filesIn)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${path.relative(ROOT, file)} enthält ${pattern}`);
    }
  }
});
