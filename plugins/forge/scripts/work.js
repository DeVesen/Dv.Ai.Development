#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { ConfigError, readConfig, branchFor, branchCandidates, workitemOf, branchWorkitem } = require('./forge-config');
const { describeTasks, PlanError } = require('./plan-tasks');

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node work.js start <slug> [--spec <pfad>] [--plan <pfad>] | switch <branch> | check | remove [<worktree>]\n';

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
    else if (line.startsWith('locked')) entries[entries.length - 1].locked = true;
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

const BASELINE_FILE = 'forge-baseline.json';

function fingerprint(root, file, code) {
  const target = path.join(root, file);
  const hash = fs.existsSync(target) && fs.statSync(target).isFile()
    ? crypto.createHash('sha1').update(fs.readFileSync(target)).digest('hex')
    : 'gone';
  return code + ':' + hash;
}

// Jede offene Datei einzeln (-uall), damit auch untracked Ordner pro Datei vergleichbar sind.
function snapshot(root) {
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain', '-uall', '-z'], { encoding: 'utf8' });
  const entries = String(result.stdout ?? '').split(String.fromCharCode(0)).filter(Boolean);
  const files = {};
  for (let index = 0; index < entries.length; index += 1) {
    const code = entries[index].slice(0, 2);
    const name = entries[index].slice(3);
    files[name] = fingerprint(root, name, code);
    if (code[0] === 'R' || code[0] === 'C') index += 1;
  }
  return files;
}

function baselinePath(root) {
  return path.join(path.resolve(root, git(root, ['rev-parse', '--absolute-git-dir']).out), BASELINE_FILE);
}

// Der erste Start hält den Vorbestand fest; ein erneuter Start überschreibt ihn nicht.
function saveBaseline(root, branch) {
  const file = baselinePath(root);
  if (fs.existsSync(file)) return;
  fs.writeFileSync(file, JSON.stringify({ branch, files: snapshot(root) }));
}

function readBaseline(root, branch) {
  try {
    const stored = JSON.parse(fs.readFileSync(baselinePath(root), 'utf8'));
    return stored.branch === branch ? stored.files : {};
  } catch {
    return {};
  }
}

function splitByBaseline(root, branch) {
  const baseline = readBaseline(root, branch);
  const now = snapshot(root);
  const names = Object.keys(now);
  return {
    open: names.filter((name) => baseline[name] !== now[name]),
    before: names.filter((name) => baseline[name] === now[name]),
  };
}

function render(values) {
  return Object.entries(values)
    .flatMap(([key, value]) => (Array.isArray(value) ? value.map((item) => `${key}=${toPosix(item)}`) : [`${key}=${toPosix(value)}`]))
    .join('\n');
}

function suggestedBranch(config, slug, spec) {
  try {
    return branchFor(config, slug, spec);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return `forge/${slug}`;
  }
}

function workitemConflict(config, branch, spec) {
  const own = workitemOf(spec);
  const found = branchWorkitem(config, branch);
  return own && found && found !== own ? found : null;
}

function startInPlace(root, config, slug, spec) {
  const branch = currentBranch(root);
  const standard = String(branch !== '' && branch === defaultBranch(root));
  const values = { modus: 'vor-ort', branch, standard, vorschlag: suggestedBranch(config, slug, spec), R: root };
  const conflict = workitemConflict(config, branch, spec);
  if (conflict) values['workitem-konflikt'] = conflict;
  return values;
}

const BASE_LINE = /^\*\*Basis:\*\*\s*`?([0-9a-f]{4,40})`?\s*$/m;

function driftFiles(root, plan) {
  if (!plan || !fs.existsSync(plan)) return [];
  const base = BASE_LINE.exec(fs.readFileSync(plan, 'utf8'));
  if (!base || !git(root, ['rev-parse', '--verify', '--quiet', `${base[1]}^{commit}`]).ok) return [];
  let files;
  try {
    files = [...new Set(describeTasks(plan).flatMap((task) => task.files.map((file) => file.path)))];
  } catch (error) {
    if (error instanceof PlanError) return [];
    throw error;
  }
  if (files.length === 0) return [];
  const out = git(root, ['diff', '--name-only', `${base[1]}`, 'HEAD', '--', ...files]).out;
  return out === '' ? [] : out.split('\n');
}

function hasBranchRef(root, branch) {
  return git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).ok;
}

// Ist der Branch schon im Haupt-Checkout aktiv, gibt es keinen eigenen Worktree: Modus nach tatsächlichem Zustand.
function startInMain(config, slug, spec, entry) {
  const values = { modus: 'vor-ort', branch: entry.branch, standard: 'false', vorschlag: suggestedBranch(config, slug, spec), R: entry.dir };
  const conflict = workitemConflict(config, entry.branch, spec);
  if (conflict) values['workitem-konflikt'] = conflict;
  return values;
}

function startWorktree(root, main, config, slug, spec) {
  const candidates = branchCandidates(config, slug, spec);
  const open = worktrees(root);
  const resumed = candidates.map((name) => open.find((entry) => entry.branch === name)).find(Boolean);
  if (resumed && resumed.dir === open[0].dir) return startInMain(config, slug, spec, resumed);
  if (resumed) return { modus: 'worktree', aktion: 'fortgesetzt', branch: resumed.branch, R: resumed.dir };
  const branch = candidates.find((name) => hasBranchRef(root, name)) ?? candidates[0];
  const dir = path.resolve(main, config['Worktree-Ordner'], branch);
  const hasBranch = hasBranchRef(root, branch);
  const args = hasBranch ? ['worktree', 'add', dir, branch] : ['worktree', 'add', '-b', branch, dir, 'HEAD'];
  const created = git(root, args);
  if (!created.ok) throw new WorkError(`Worktree konnte nicht angelegt werden: ${created.err}`);
  return { modus: 'worktree', aktion: hasBranch ? 'angehaengt' : 'angelegt', branch, R: dir };
}

function inPlace(values, dir) {
  if (values.branch !== '') saveBaseline(dir, values.branch);
  return values;
}

function start(slug, options = {}, cwd = process.cwd()) {
  const root = toplevel(cwd);
  const { config, main } = readConfig(root);
  const drift = driftFiles(root, options.plan);
  const finish = (values) => {
    const mapped = { ...values };
    for (const [key, file] of [['P', options.plan], ['S', options.spec]]) {
      if (file) mapped[key] = path.join(values.R, path.relative(root, path.resolve(file)));
    }
    return drift.length > 0 ? { ...mapped, drift } : mapped;
  };
  if (config.Worktree !== 'ja') return finish(inPlace(startInPlace(root, config, slug, options.spec), root));
  ensureCommitted(root, [options.spec, options.plan].filter(Boolean));
  const values = startWorktree(root, main, config, slug, options.spec);
  return finish(values.modus === 'vor-ort' ? inPlace(values, values.R) : values);
}

function check(cwd = process.cwd()) {
  const root = toplevel(cwd);
  const branch = currentBranch(root);
  if (branch === '') throw new WorkError('Kein Branch ausgecheckt (detached HEAD). Erst auf den Feature-Branch wechseln.');
  const { open, before } = splitByBaseline(root, branch);
  if (open.length > 0) throw new WorkError(`Nicht committet: ${open.join(', ')}${before.length > 0 ? `. Vorbestand seit dem Start, nicht gemeint: ${before.join(', ')}` : ''}`);
  const linked = isLinkedWorktree(root);
  const state = { modus: linked ? 'worktree' : 'vor-ort', branch, R: root, haupt: worktrees(root)[0].dir };
  return before.length > 0 ? { ...state, vorbestand: before } : state;
}

// Windows: das Präfix \?\ hebt die 260-Zeichen-Grenze auf. Links (Junctions) löscht rmSync als Link, nie ihr Ziel.
function removeDirectory(dir) {
  const long = `\\\\?\\${path.resolve(dir)}`;
  fs.rmSync(process.platform === 'win32' ? long : dir, { recursive: true, force: true });
}

// Erst git; scheitert es an der Umgebung (zu lange Pfade, gesperrte Datei), räumt ein zweiter Weg das Verzeichnis weg.
// Der Eintrag wird erst gelöst, wenn das Verzeichnis weg ist: nie abgemeldet mit Restdateien.
function removeWorktree(state) {
  const removed = git(state.haupt, ['worktree', 'remove', state.R]);
  if (removed.ok) return;
  if (worktrees(state.haupt).some((entry) => entry.dir === state.R && entry.locked)) {
    throw new WorkError(`Worktree ist gesperrt: ${removed.err}`);
  }
  try {
    removeDirectory(state.R);
  } catch (error) {
    throw new WorkError(`Worktree konnte nicht entfernt werden: ${removed.err} / ${error.message}. Er bleibt registriert.`);
  }
  if (fs.existsSync(state.R)) throw new WorkError(`Worktree konnte nicht vollständig entfernt werden: ${toPosix(state.R)} (${removed.err}). Er bleibt registriert.`);
  git(state.haupt, ['worktree', 'prune']);
}

function remove(cwd = process.cwd()) {
  const state = check(cwd);
  if (state.modus !== 'worktree') throw new WorkError('Kein Worktree: nichts zu entfernen, der Branch bleibt ausgecheckt.');
  const commit = git(state.R, ['rev-parse', 'HEAD']).out;
  process.chdir(state.haupt);
  removeWorktree(state);
  const tip = git(state.haupt, ['rev-parse', '--verify', '--quiet', `refs/heads/${state.branch}`]).out;
  if (tip !== commit) throw new WorkError(`Branch ${state.branch} zeigt nicht auf ${commit}. Bitte prüfen.`);
  return { entfernt: state.R, branch: state.branch, commit, haupt: state.haupt };
}

// Neuer Branch vor Ort statt des Standard-Branches; wie jeder Ortswechsel über das Skript, damit die Baseline zum Branch passt.
function switchBranch(branch, cwd = process.cwd()) {
  const root = toplevel(cwd);
  if (!git(root, ['check-ref-format', '--branch', branch]).ok) throw new WorkError(`Kein gültiger Branch-Name: ${branch}`);
  if (hasBranchRef(root, branch)) throw new WorkError(`Branch ${branch} existiert schon. Bitte einen anderen Namen wählen.`);
  const switched = git(root, ['switch', '--quiet', '-c', branch]);
  if (!switched.ok) throw new WorkError(`Branch ${branch} konnte nicht angelegt werden: ${switched.err}`);
  fs.rmSync(baselinePath(root), { force: true });
  saveBaseline(root, branch);
  return { modus: 'vor-ort', branch, standard: 'false', R: root };
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
  if (command === 'switch' && args.length === 1) return () => switchBranch(args[0]);
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

module.exports = { WorkError, start, switchBranch, check, remove, removeDirectory, isLinkedWorktree };
