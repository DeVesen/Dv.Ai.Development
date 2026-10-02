'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scriptFor, failureMessage } = require('../bin/lib/run-toolchain');

const BIN = path.join(__dirname, '..', 'bin');
const STARTERS = ['dv-angular-build', 'dv-angular-test', 'dv-angular-lint'];
const FAKE_SCRIPT = 'process.stdout.write(JSON.stringify({ args: process.argv.slice(2) }));\nprocess.exit(3);\n';
const BASH = findBash();

// Git Bash unter Windows über den Ort von git, nie das WSL-bash.exe aus System32; unter POSIX bash vom PATH. Ohne Bash null.
function findBash() {
  if (process.platform !== 'win32') return spawnSync('bash', ['-c', 'true']).status === 0 ? 'bash' : null;
  const gitExecPath = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
  if (gitExecPath.status !== 0) return null;
  const bash = path.resolve(gitExecPath.stdout.trim(), '..', '..', '..', 'bin', 'bash.exe');
  return fs.existsSync(bash) ? bash : null;
}

// Kopie des Plugins mit dem echten bin/ und, auf Wunsch, Ersatz-Skripten unter scripts/toolchain/.
function pluginCopy(withScripts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-plugin-'));
  fs.cpSync(BIN, path.join(root, 'bin'), { recursive: true });
  if (!withScripts) return root;
  const scripts = path.join(root, 'scripts', 'toolchain');
  fs.mkdirSync(scripts, { recursive: true });
  for (const starter of STARTERS) fs.writeFileSync(path.join(scripts, `${starter.replace(/^dv-/, '')}.js`), FAKE_SCRIPT);
  return root;
}

function start(root, starter, args) {
  return spawnSync(process.execPath, [path.join(root, 'bin', starter), ...args], { encoding: 'utf8' });
}

for (const starter of STARTERS) {
  test(`${starter}_WithArguments_PassesThemAndExitCodeOfItsScript`, () => {
    const result = start(pluginCopy(true), starter, ['--root', 'web', '--', '--include', 'src/app/x.spec.ts']);
    assert.equal(result.status, 3);
    assert.deepEqual(JSON.parse(result.stdout), { args: ['--root', 'web', '--', '--include', 'src/app/x.spec.ts'] });
  });
}

test('starter_ScriptMissing_ReportsPathAndExitsOne', () => {
  const result = start(pluginCopy(false), 'dv-angular-test', []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-angular-test: Skript nicht gefunden: .*angular-test\.js\n$/);
});

test('scriptFor_StarterFile_MapsToToolchainScriptOfSameName', () => {
  const script = scriptFor(path.join('x', 'bin', 'dv-angular-lint'));
  assert.equal(path.basename(script), 'angular-lint.js');
  assert.equal(path.basename(path.dirname(script)), 'toolchain');
});

// Künstliche Ergebnisse von spawnSync statt eines echten Kindprozesses: auf Windows und POSIX gleich stabil.
test('failureMessage_StartErrorSignalOrExitCode_NamesCauseOrIsNull', () => {
  const starter = path.join('x', 'bin', 'dv-angular-test');
  assert.equal(failureMessage(starter, { error: new Error('spawn EACCES') }), 'dv-angular-test: Start fehlgeschlagen: spawn EACCES');
  assert.equal(failureMessage(starter, { signal: 'SIGTERM', status: null }), 'dv-angular-test: beendet durch Signal SIGTERM');
  assert.equal(failureMessage(starter, { status: 3 }), null);
});

// AC-10: Git Bash findet die Start-Befehle ohne Endung über den PATH und startet sie über den Node-Shebang.
test('starters_OnPathInGitBash_AreFoundAndStarted', { skip: BASH ? false : 'keine Git Bash' }, () => {
  const bin = path.join(pluginCopy(true), 'bin');
  for (const starter of STARTERS) fs.chmodSync(path.join(bin, starter), 0o755);
  const script = 'd=$(cygpath -u "$1" 2>/dev/null || printf %s "$1"); PATH="$d:$PATH"; shift; for s in "$@"; do "$s" x; echo "exit=$?"; done';
  const result = spawnSync(BASH, ['-c', script, '_', bin, ...STARTERS], { encoding: 'utf8' });
  assert.equal(result.stdout, '{"args":["x"]}exit=3\n'.repeat(STARTERS.length), result.stderr);
});
