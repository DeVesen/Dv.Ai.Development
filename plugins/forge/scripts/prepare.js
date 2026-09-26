#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');
const { slugOf } = require('./plan-tasks');
const { resolveTag, TagError } = require('./base-tag');
const { createWorkspace } = require('./workspace');
const { writePackage, PackageError } = require('./review-package');
const { ConfigError, readConfig, branchFor } = require('./forge-config');

const USAGE = [
  'Aufruf: node prepare.js spec-review <spec> [quelle] [--rounds N]',
  '       node prepare.js plan-review <plan> [spec] [--rounds N]',
  '       node prepare.js implementation <plan> [spec]',
  '       node prepare.js implementation-review <plan> [spec] [--spec <pfad>] [--context <pfad>]... [--base <ref>]',
  '',
].join('\n');
const SPEC_LINE = /^\*\*Spec:\*\*\s*(.+?)\s*$/m;
const DEFAULT_ROUNDS = '3';

class PrepareError extends Error {}
class UsageError extends Error {}

const FLAGS = {
  'spec-review': ['--rounds'],
  'plan-review': ['--rounds'],
  implementation: [],
  'implementation-review': ['--spec', '--context', '--base'],
};
const MAX_POSITIONAL = { 'spec-review': 2, 'plan-review': 2, implementation: 2, 'implementation-review': 2 };

function parseArgs(skill, args) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positional.push(arg.replace(/^@/, ''));
      continue;
    }
    if (!FLAGS[skill].includes(arg) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${arg}`);
    index += 1;
    (flags[arg] ??= []).push(args[index].replace(/^@/, ''));
  }
  if (positional.length === 0 || positional.length > MAX_POSITIONAL[skill]) throw new UsageError('Falsche Zahl an Pfad-Argumenten');
  return { positional, flags };
}

function existingFile(file, label = 'Datei') {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new PrepareError(`${label} nicht gefunden: ${toPosix(file)}`);
  return path.resolve(file);
}

function gitRoot(dir) {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) throw new PrepareError(`Kein Git-Repo: ${toPosix(dir)}`);
  return path.resolve(result.stdout.trim());
}

function currentBranch(root) {
  const result = spawnSync('git', ['-C', root, 'branch', '--show-current'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function candidates(planPath) {
  const dir = path.dirname(planPath);
  return fs.readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.md') && path.join(dir, name) !== planPath)
    .map((name) => toPosix(path.join(dir, name)));
}

function missingSpecError(planPath, reason) {
  const found = candidates(planPath);
  const list = found.length > 0 ? `Kandidaten: ${found.join(', ')}` : 'Keine Kandidaten im Plan-Ordner.';
  return new PrepareError(`${reason} ${list} Spec als zweites Argument angeben.`);
}

function specFromHeader(planPath, root) {
  const match = SPEC_LINE.exec(fs.readFileSync(planPath, 'utf8'));
  if (!match) return null;
  const value = match[1].replace(/^`(.*)`$/, '$1').trim();
  const options = path.isAbsolute(value) ? [value] : [path.join(root, value), path.join(path.dirname(planPath), value)];
  const hit = options.find((option) => fs.existsSync(option) && fs.statSync(option).isFile());
  if (!hit) throw missingSpecError(planPath, `Spec aus dem Plan-Kopf nicht gefunden: ${value}.`);
  return path.resolve(hit);
}

function resolveSpec(planPath, explicit, root) {
  if (explicit) return existingFile(path.resolve(explicit), 'Spec');
  const fromHeader = specFromHeader(planPath, root);
  if (fromHeader) return fromHeader;
  const beside = path.join(path.dirname(planPath), 'spec.md');
  if (fs.existsSync(beside)) return path.resolve(beside);
  throw missingSpecError(planPath, 'Spec nicht gefunden.');
}

function explicitSpec(positional, flags) {
  const second = positional[1];
  const flag = flags['--spec']?.[0];
  if (second && flag && path.resolve(second) !== path.resolve(flag)) throw new PrepareError('Zwei verschiedene Specs angegeben.');
  return flag ?? second;
}

function rounds(flags) {
  const value = flags['--rounds']?.[0] ?? DEFAULT_ROUNDS;
  if (!/^\d+$/.test(value)) throw new UsageError(`--rounds braucht eine Zahl: ${value}`);
  return value;
}

function checkLocation(root, slug, specPath) {
  const { config } = readConfig(root);
  if (config.Worktree !== 'ja') return;
  const expected = branchFor(config, slug, specPath);
  const actual = currentBranch(root);
  if (actual !== expected) {
    throw new PrepareError(`Falscher Ort: erwartet Branch ${expected} (Worktree der Umsetzung), aktuell ${actual || 'kein Branch'}. Session dort starten.`);
  }
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir, { recursive: true })
    .filter((entry) => String(entry).toLowerCase().endsWith('.md'))
    .map((entry) => path.join(dir, String(entry)));
}

function profileSummary(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').map((line) => line.trim());
  const title = (lines.find((line) => line.startsWith('#')) ?? '').replace(/^#+\s*/, '');
  const text = lines.find((line) => line !== '' && !line.startsWith('#') && !line.startsWith('---')) ?? '';
  return [title, text.length > 120 ? `${text.slice(0, 117)}...` : text].filter(Boolean).join(' — ');
}

function profileDirs(root) {
  const { config } = readConfig(root);
  const dirs = [config.Glossar, config.Profile, 'docs/application'].map((dir) => path.resolve(root, dir));
  return dirs.filter((dir, index) => dirs.indexOf(dir) === index);
}

function duplicateWarnings(files) {
  const byName = new Map();
  for (const file of files) {
    const name = path.basename(file).toLowerCase();
    byName.set(name, [...(byName.get(name) ?? []), file]);
  }
  return [...byName.values()].filter((group) => group.length > 1)
    .map((group) => `gleichnamige Profile an mehreren Orten: ${group.map(toPosix).join(', ')}`);
}

function writeProfileIndex(root, workspace) {
  const files = [...new Set(profileDirs(root).flatMap(markdownFiles))].sort();
  const lines = files.map((file) => `- ${toPosix(path.relative(root, file))} — ${profileSummary(file)}`);
  const index = path.join(workspace, 'profile-index.md');
  fs.writeFileSync(index, `# Profil-Index\n\nPfade relativ zu ${toPosix(root)}\n\n${lines.join('\n')}\n`);
  return { index, count: files.length, warnings: duplicateWarnings(files) };
}

function prepareSpecReview({ positional, flags }) {
  const spec = existingFile(path.resolve(positional[0]), 'Spec');
  const root = gitRoot(path.dirname(spec));
  const values = { S: spec, R: root };
  if (positional[1]) values.Q = existingFile(path.resolve(positional[1]), 'Quelle');
  values.N = rounds(flags);
  const slug = path.basename(spec).toLowerCase() === 'spec.md' ? path.basename(path.dirname(spec)) : path.basename(spec, path.extname(spec));
  values.W = createWorkspace('spec-review', slug, root);
  const profiles = writeProfileIndex(root, values.W);
  values.profile = profiles.count > 0 ? 'ja' : 'nein';
  if (profiles.count > 0) values.PI = profiles.index;
  if (profiles.warnings.length > 0) values.WARN = profiles.warnings;
  return values;
}

function preparePlanReview({ positional, flags }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(path.dirname(plan));
  const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root, N: rounds(flags) };
  values.W = createWorkspace('plan-review', slugOf(plan), root);
  return values;
}

function prepareImplementation({ positional }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(path.dirname(plan));
  return { P: plan, S: resolveSpec(plan, positional[1], root), R: gitRoot(process.cwd()), slug: slugOf(plan) };
}

function prepareImplementationReview({ positional, flags }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(process.cwd());
  const spec = resolveSpec(plan, explicitSpec(positional, flags), gitRoot(path.dirname(plan)));
  const slug = slugOf(plan);
  checkLocation(root, slug, spec);
  const contexts = (flags['--context'] ?? []).map((file) => existingFile(path.resolve(file), 'Kontext-Datei'));
  const base = flags['--base']?.[0] ?? resolveTag(slug, root);
  const workspace = createWorkspace('review', slug, root);
  const pack = writePackage(base, 'HEAD', workspace, root);
  return {
    P: plan, S: spec, R: root, slug, B: base, W: workspace, K: pack, C: contexts,
    N: '0', aktiv: 'acceptance,plan-fidelity,design,tests,risks',
  };
}

const PREPARERS = {
  'spec-review': prepareSpecReview,
  'plan-review': preparePlanReview,
  implementation: prepareImplementation,
  'implementation-review': prepareImplementationReview,
};

function render(values) {
  return Object.entries(values)
    .flatMap(([key, value]) => (Array.isArray(value) ? value.map((item) => `${key}=${toPosix(item)}`) : [`${key}=${toPosix(value)}`]))
    .join('\n');
}

function prepare(skill, args) {
  if (!Object.hasOwn(PREPARERS, skill)) throw new UsageError(`Unbekannter Skill: ${skill}`);
  return render(PREPARERS[skill](parseArgs(skill, args)));
}

function main() {
  const [skill, ...args] = process.argv.slice(2);
  try {
    process.stdout.write(`${prepare(skill, args)}\n`);
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    if (![PrepareError, TagError, PackageError, ConfigError].some((type) => error instanceof type)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { PrepareError, UsageError, prepare, resolveSpec, parseArgs };
