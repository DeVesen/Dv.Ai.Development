#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const { ConfigError, readConfig, branchFor } = require('./forge-config');

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node work.js start <slug> [--spec <pfad>] [--plan <pfad>] | check | remove [<worktree>]\n';

class WorkError extends Error {}

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: String(result.stdout ?? '').trim(), err: String(result.stderr ?? '').trim() };
}

function toplevel(cwd) {
  const result = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!result.ok) throw new WorkError(`Kein Git-Repo: ${toPosix(cwd)}`);
  return path.resolve(result.out);
}

function currentBranch(root) {
  return git(root, ['branch', '--show-current']).out;
}

function defaultBranch(root) {
  const remote = git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (remote.ok) return remote.out.replace(/^origin\//, '');
  return ['main', 'master'].find((name) => git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]).ok) ?? '';
}

function isLinkedWorktree(root) {
  const dir = git(root, ['rev-parse', '--absolute-git-dir']).out;
  const common = path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).out);
  return path.resolve(dir) !== common;
}

function worktrees(root) {
  const entries = [];
  for (const line of git(root, ['worktree', 'list', '--porcelain']).out.split('\n')) {
    if (line.startsWith('worktree ')) entries.push({ dir: path.resolve(line.slice(9)) });
    else if (line.startsWith('branch refs/heads/')) entries[entries.length - 1].branch = line.slice(18);
  }
  return entries;
}

function uncommitted(root, files = []) {
  const out = git(root, ['status', '--porcelain', '--', ...files]).out;
  return out === '' ? [] : out.split('\n').map((line) => line.slice(3));
}

function ensureCommitted(root, files) {
  const open = uncommitted(root, files.map((file) => path.resolve(file)));
  if (open.length > 0) throw new WorkError(`Nicht committet: ${open.join(', ')}. Erst committen, sonst fehlen die Dateien im Worktree.`);
}

function render(values) {
  return Object.entries(values).map(([key, value]) => `${key}=${toPosix(value)}`).join('\n');
}

function suggestedBranch(config, slug, spec) {
  try {
    return branchFor(config, slug, spec);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return `forge/${slug}`;
  }
}

function startInPlace(root, config, slug, spec) {
  const branch = currentBranch(root);
  const standard = String(branch !== '' && branch === defaultBranch(root));
  return { modus: 'vor-ort', branch, standard, vorschlag: suggestedBranch(config, slug, spec), R: root };
}

function startWorktree(root, main, config, slug, spec) {
  const branch = branchFor(config, slug, spec);
  const existing = worktrees(root).find((entry) => entry.branch === branch);
  if (existing) return { modus: 'worktree', aktion: 'fortgesetzt', branch, R: existing.dir };
  const dir = path.resolve(main, config['Worktree-Ordner'], branch);
  const hasBranch = git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).ok;
  const args = hasBranch ? ['worktree', 'add', dir, branch] : ['worktree', 'add', '-b', branch, dir, 'HEAD'];
  const created = git(root, args);
  if (!created.ok) throw new WorkError(`Worktree konnte nicht angelegt werden: ${created.err}`);
  return { modus: 'worktree', aktion: hasBranch ? 'angehaengt' : 'angelegt', branch, R: dir };
}

function start(slug, options = {}, cwd = process.cwd()) {
  const root = toplevel(cwd);
  const { config, main } = readConfig(root);
  if (config.Worktree !== 'ja') return startInPlace(root, config, slug, options.spec);
  ensureCommitted(root, [options.spec, options.plan].filter(Boolean));
  return startWorktree(root, main, config, slug, options.spec);
}

function check(cwd = process.cwd()) {
  const root = toplevel(cwd);
  const branch = currentBranch(root);
  if (branch === '') throw new WorkError('Kein Branch ausgecheckt (detached HEAD). Erst auf den Feature-Branch wechseln.');
  const open = uncommitted(root);
  if (open.length > 0) throw new WorkError(`Nicht committet: ${open.join(', ')}`);
  const linked = isLinkedWorktree(root);
  return { modus: linked ? 'worktree' : 'vor-ort', branch, R: root, haupt: worktrees(root)[0].dir };
}

function remove(cwd = process.cwd()) {
  const state = check(cwd);
  if (state.modus !== 'worktree') throw new WorkError('Kein Worktree: nichts zu entfernen, der Branch bleibt ausgecheckt.');
  const commit = git(state.R, ['rev-parse', 'HEAD']).out;
  const removed = git(state.haupt, ['worktree', 'remove', state.R]);
  if (!removed.ok) throw new WorkError(`Worktree konnte nicht entfernt werden: ${removed.err}`);
  const tip = git(state.haupt, ['rev-parse', '--verify', '--quiet', `refs/heads/${state.branch}`]).out;
  if (tip !== commit) throw new WorkError(`Branch ${state.branch} zeigt nicht auf ${commit}. Bitte prüfen.`);
  return { entfernt: state.R, branch: state.branch, commit, haupt: state.haupt };
}

function parseStart(args) {
  const [slug, ...rest] = args;
  if (!SLUG.test(slug ?? '')) return null;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = { '--spec': 'spec', '--plan': 'plan' }[rest[index]];
    if (!key || rest[index + 1] === undefined) return null;
    options[key] = rest[index + 1].replace(/^@/, '');
  }
  return { slug, options };
}

function run(command, args) {
  if (command === 'start') {
    const parsed = parseStart(args);
    return parsed && (() => start(parsed.slug, parsed.options));
  }
  if (command === 'check' && args.length === 0) return () => check();
  if (command === 'remove' && args.length <= 1) return () => remove(args[0] ? path.resolve(args[0]) : process.cwd());
  return null;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  const action = run(command, args);
  if (!action) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${render(action())}\n`);
  } catch (error) {
    if (!(error instanceof WorkError || error instanceof ConfigError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { WorkError, start, check, remove, isLinkedWorktree };
