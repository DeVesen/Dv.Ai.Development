'use strict';

// Git-Aufrufe der Session-Kette an einer Stelle: Aufruf mit und ohne Abbruch, Checkout-Wurzel, Änderungen an einer Datei,
// Worktree-Liste und Pfadvergleich. Pfade gehen über realPath, damit Windows-Kurznamen und git-Ausgaben vergleichbar sind.

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix, normalizePath, realPath } = require('./posix');
const { SessionChainError } = require('./session-chain-store');

// Ergebnis eines Aufrufs; `ok` false bei Exit ungleich 0.
function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

// Ausgabe eines Aufrufs; Exit ungleich 0 bricht mit SessionChainError ab.
function gitOrThrow(repo, args) {
  const result = git(repo, args);
  if (!result.ok) throw new SessionChainError(`git ${args.join(' ')}: ${result.err}`);
  return result.out;
}

function toplevel(dir) {
  const result = git(dir, ['rev-parse', '--show-toplevel']);
  if (!result.ok) throw new SessionChainError(`Kein Git-Repo: ${toPosix(dir)}`);
  return path.resolve(result.out);
}

function isDirty(repo, file) {
  return gitOrThrow(repo, ['status', '--porcelain', '--', file]) !== '';
}

function sameDir(a, b) {
  return normalizePath(realPath(a)) === normalizePath(realPath(b));
}

function worktreeListed(repo, worktree) {
  return git(repo, ['worktree', 'list', '--porcelain']).out.split('\n')
    .filter((line) => line.startsWith('worktree ')).some((line) => sameDir(line.slice('worktree '.length), worktree));
}

// Pfad relativ zur Checkout-Wurzel, mit `/`.
function relative(repo, file) {
  return toPosix(path.relative(realPath(repo), realPath(path.resolve(repo, file))));
}

module.exports = { git, gitOrThrow, toplevel, isDirty, sameDir, worktreeListed, relative };
