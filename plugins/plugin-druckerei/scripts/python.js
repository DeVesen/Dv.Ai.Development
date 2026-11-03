'use strict';

// Findet einen Python-Interpreter (python3, python, py -3) und startet damit ein Skript der Druckerei.
const { spawnSync } = require('node:child_process');

const CANDIDATES = process.platform === 'win32'
  ? [['py', ['-3']], ['python', []], ['python3', []]]
  : [['python3', []], ['python', []]];

function findPython() {
  for (const [cmd, pre] of CANDIDATES) {
    const probe = spawnSync(cmd, [...pre, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { stdio: 'ignore', shell: false });
    if (probe.status === 0) return [cmd, pre];
  }
  return null;
}

function runPython(script, args, options = {}) {
  const python = findPython();
  if (!python) return { status: null, missing: true, stdout: '', stderr: 'Python 3.10 oder neuer nicht gefunden (python3, python oder py -3).' };
  const [cmd, pre] = python;
  return spawnSync(cmd, [...pre, script, ...args], { encoding: 'utf8', ...options });
}

module.exports = { findPython, runPython };
