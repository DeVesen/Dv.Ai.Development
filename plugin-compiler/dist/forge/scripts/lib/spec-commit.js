'use strict';

// Commit der Spec am Ende des Spec-Review-Orchestrators als Skript statt als Prosa (Schritt 5 des Skills).
// `preflight` meldet Ort, Spec-Vorbestand, Ignorierung und Diff; `commit` committet nur die Spec und meldet `COMMIT=<hash>|nichts|ignoriert|frei`.

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { placeOf, readStateFile } = require('../orchestrator-state');
const { getValue } = require('../forge-config');
const { toPosix, realPath } = require('./posix');

class SpecCommitError extends Error {}

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

function repoOf(spec) {
  const dir = path.dirname(path.resolve(spec));
  const top = git(dir, ['rev-parse', '--show-toplevel']);
  if (!top.ok) throw new SpecCommitError(`Kein Git-Repo: ${toPosix(dir)}`);
  return { dir, top: top.out };
}

// Ignoriert nur, was git nicht verfolgt: Eine versionierte Datei meldet check-ignore nie.
function isIgnored(dir, spec) {
  return git(dir, ['check-ignore', '-q', '--', path.resolve(spec)]).ok;
}

function hasDiff(dir, spec) {
  return git(dir, ['status', '--porcelain', '--', path.resolve(spec)]).out !== '';
}

// Zeilen für den Skill. Ein anderer Ort als beim Start (Checkout, Branch, Worktree, detached HEAD) ist `failed`.
function preflight({ spec, state }) {
  const { dir, top } = repoOf(spec);
  const saved = readStateFile(path.resolve(state));
  const place = placeOf(saved, dir);
  const relativeSpec = toPosix(path.relative(realPath(top), realPath(spec)));
  const before = (saved.vorbestand ?? []).some((line) => toPosix(line.slice(3)) === relativeSpec);
  const where = place.same && !place.here.worktree ? 'ok' : `abweichung ${place.here.worktree ? 'worktree ' : ''}${place.here.toplevel} ${place.here.branch || '(kein Branch)'}`;
  return {
    failed: where !== 'ok',
    output: [`ORT=${where}`, `SPEC-VORBESTAND=${before ? 'ja' : 'nein'}`, `IGNORIERT=${isIgnored(dir, spec) ? 'ja' : 'nein'}`, `DIFF=${hasDiff(dir, spec) ? 'ja' : 'leer'}`].join('\n'),
  };
}

function subjectOf(slug, workitem) {
  return workitem ? `docs(${workitem}): review spec ${slug}` : `docs: review spec ${slug}`;
}

// `git commit` ohne `--no-verify`; scheitert er (etwa ein Hook), bleibt die Spec gestaged und die Meldung sagt das.
function commit({ spec, slug, wi }) {
  const { dir } = repoOf(spec);
  if (!git(dir, ['branch', '--show-current']).out) throw new SpecCommitError('Kein Branch ausgecheckt (detached HEAD); nichts committet.');
  if (isIgnored(dir, spec)) return 'COMMIT=ignoriert';
  if (!hasDiff(dir, spec)) return 'COMMIT=nichts';
  if (getValue('Commit-Konvention', dir) !== '') return 'COMMIT=frei';
  const file = path.resolve(spec);
  const added = git(dir, ['add', '--', file]);
  if (!added.ok) throw new SpecCommitError(`git add fehlgeschlagen: ${added.err}`);
  const done = git(dir, ['commit', '-m', subjectOf(slug, wi), '--', file]);
  if (!done.ok) throw new SpecCommitError(`Commit fehlgeschlagen, die Spec bleibt gestaged: ${done.err || done.out}`);
  return `COMMIT=${git(dir, ['rev-parse', '--short', 'HEAD']).out}`;
}

module.exports = { preflight, commit, subjectOf, SpecCommitError };
