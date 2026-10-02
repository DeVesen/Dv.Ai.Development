'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { human, request, usage, writeSession } = require('./lib/retro-session');

const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('sessionFacts_ProjectWithoutAnySettings_RunsAndWritesSnapshotInToolbeltFolder', () => {
  const home = tempDir('toolbelt-home-');
  const project = tempDir('toolbelt-project-');
  const transcript = writeSession([human('Los', '10:00'), request('r1', '10:01', [], usage(1000, 0, 0, 100))]);
  const env = { ...process.env, HOME: home, USERPROFILE: home };

  const result = spawnSync(process.execPath, [FACTS, '--file', transcript, '--session', 's1', '--cwd', project, '--snapshot'], { encoding: 'utf8', env, cwd: project });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.doesNotMatch(result.stdout, /forge|Kein Git-Repo/);
  assert.ok(result.stdout.includes(path.join(home, '.dv-toolbelt', 'retro', 's1.snapshot.json')));
  assert.deepEqual(fs.readdirSync(path.join(home, '.dv-toolbelt', 'retro')), ['s1.snapshot.json']);
  // AC-37: Der leere temporäre HOME-Ordner zeigt jede Schreibung in den alten Datenordner.
  assert.equal(fs.existsSync(path.join(home, '.dv-' + 'forge')), false);
});
