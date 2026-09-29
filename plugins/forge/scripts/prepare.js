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
const { archivePath } = require('./ledger');
const { writeAnchors } = require('./plan-anchors');
const { ART_OF_ROLE, FollowupError, latest, loadGroups, rolesFor, slugFor } = require('./followup');

const USAGE = [
  'Aufruf: node prepare.js spec-review <spec> [quelle] [--rounds N] [--only <reviewer,...>]',
  '       node prepare.js plan-review <plan> [spec] [--rounds N] [--only <reviewer,...>]',
  '       node prepare.js implementation <plan> [spec]',
  '       node prepare.js implementation-review <plan> [spec] [--spec <pfad>] [--context <pfad>]... [--base <ref>] [--only <reviewer,...>]',
  '       node prepare.js review-followup <spec|plan> <auswahl> [--spec <pfad>] [--base <ref>]   (auswahl: b | <n> | <g>:<n|b>,...)',
  '',
].join('\n');
const SPEC_LINE = /^\*\*Spec:\*\*\s*(.+?)\s*$/m;
const DEFAULT_ROUNDS = '3';

class PrepareError extends Error {}
class UsageError extends Error {}

const FLAGS = {
  'spec-review': ['--rounds', '--only'],
  'plan-review': ['--rounds', '--only'],
  implementation: [],
  'implementation-review': ['--spec', '--context', '--base', '--only'],
  'review-followup': ['--spec', '--base'],
};

// Reviewer je Review in fester Reihenfolge; --only wählt daraus, die Reihenfolge bleibt.
const REVIEWERS = {
  'spec-review': ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'],
  'plan-review': ['coverage', 'feasibility', 'architecture', 'risks', 'buildability'],
  'implementation-review': ['acceptance', 'plan-fidelity', 'design', 'tests', 'risks'],
};
const MAX_POSITIONAL = { 'spec-review': 2, 'plan-review': 2, implementation: 2, 'implementation-review': 2, 'review-followup': 2 };

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

function chosenReviewers(skill, flags) {
  const all = REVIEWERS[skill];
  if (!flags['--only']) return all;
  const wanted = flags['--only'].flatMap((value) => value.split(',')).map((name) => name.trim()).filter(Boolean);
  const unknown = wanted.filter((name) => !all.includes(name));
  if (wanted.length === 0 || unknown.length > 0) {
    throw new UsageError(`--only erlaubt für ${skill}: ${all.join(',')}${unknown.length > 0 ? `; unbekannt: ${unknown.join(',')}` : ''}`);
  }
  return all.filter((name) => wanted.includes(name));
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

// Ein Profil je Ordner trägt immer denselben Namen; nur andere doppelte Namen sind verdächtig.
const PER_FOLDER_NAMES = new Set(['feature.md', 'module.md', 'readme.md', 'index.md']);

function duplicateWarnings(files) {
  const byName = new Map();
  for (const file of files) {
    const name = path.basename(file).toLowerCase();
    if (PER_FOLDER_NAMES.has(name)) continue;
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
  const chosen = chosenReviewers('spec-review', flags);
  const slug = path.basename(spec).toLowerCase() === 'spec.md' ? path.basename(path.dirname(spec)) : path.basename(spec, path.extname(spec));
  values.slug = slug;
  values.W = createWorkspace('spec-review', slug, root);
  values.art = /^Art:\s*frei\s*$/m.test(fs.readFileSync(spec, 'utf8')) ? 'frei' : 'verankert';
  const warnings = [];
  if (values.art === 'frei') {
    values.profile = 'nein';
  } else {
    const profiles = writeProfileIndex(root, values.W);
    values.profile = profiles.count > 0 ? 'ja' : 'nein';
    if (profiles.count > 0) {
      values.PI = profiles.index;
      // Der Profil-Reviewer schreibt den Auszug in Runde 1; spätere Runden lesen nur ihn.
      values.PA = path.join(values.W, 'profil-auszug.md');
    }
    warnings.push(...profiles.warnings);
  }
  const active = chosen.filter((name) => name !== 'profiles' || values.profile === 'ja');
  if (flags['--only'] && active.length < chosen.length) warnings.push('profiles nicht aktiv: keine Profile oder freie Spec');
  if (active.length === 0) throw new UsageError('--only lässt keinen aktiven Reviewer übrig');
  values.aktiv = active.join(',');
  if (warnings.length > 0) values.WARN = warnings;
  return values;
}

function preparePlanReview({ positional, flags }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(path.dirname(plan));
  const values = { P: plan, S: resolveSpec(plan, positional[1], root), R: root, N: rounds(flags) };
  const aktiv = chosenReviewers('plan-review', flags).join(',');
  const { config } = readConfig(root);
  values.slug = slugOf(plan);
  values.W = createWorkspace('plan-review', values.slug, root);
  values.aktiv = aktiv;
  // Anker einmal deterministisch prüfen; ein Fehler darf das Review nicht verhindern.
  try {
    values.A = writeAnchors(plan, root, values.W);
  } catch (error) {
    values.WARN = [`Anker-Prüfung fehlgeschlagen: ${error.message}`];
  }
  // Erlaubte Befehle wörtlich aus der Konfiguration, damit buildability sie nicht aus Plugin-Quellen herleitet.
  for (const key of ['Build', 'Test', 'Lint']) values[key] = config[key];
  return values;
}

function prepareImplementation({ positional }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(path.dirname(plan));
  return { P: plan, S: resolveSpec(plan, positional[1], root), R: gitRoot(process.cwd()), slug: slugOf(plan) };
}

const REPORT_STATE = /^- Stand: ([0-9a-f]{4,40})\s*$/m;

// Commits nach dem Stand des Umsetzungsberichts, ohne den Bericht selbst: Sie fehlen in Urteilen und Bereich.
function commitsAfterReport(report, root) {
  const state = REPORT_STATE.exec(fs.readFileSync(report, 'utf8'));
  if (!state) return null;
  // realpath gleicht kurze (8.3) und lange Windows-Pfade an, sonst zeigt der Ausschluss aus dem Repo heraus.
  const relative = toPosix(path.relative(fs.realpathSync.native(root), fs.realpathSync.native(report)));
  const log = spawnSync('git', ['-C', root, 'log', '--format=%h %s', `${state[1]}..HEAD`, '--', '.', `:(exclude)${relative}`], { encoding: 'utf8' });
  if (log.status !== 0) return `Stand ${state[1]} des Umsetzungsberichts nicht prüfbar: ${log.stderr.trim().split('\n')[0]}`;
  const commits = log.stdout.trim().split('\n').filter(Boolean);
  return commits.length === 0 ? null : `Commits nach dem Umsetzungsbericht (Stand ${state[1]}): ${commits.join(' · ')}`;
}

function prepareImplementationReview({ positional, flags }) {
  const plan = existingFile(path.resolve(positional[0]), 'Plan');
  const root = gitRoot(process.cwd());
  const spec = resolveSpec(plan, explicitSpec(positional, flags), gitRoot(path.dirname(plan)));
  const slug = slugOf(plan);
  checkLocation(root, slug, spec);
  const contexts = (flags['--context'] ?? []).map((file) => existingFile(path.resolve(file), 'Kontext-Datei'));
  const base = flags['--base']?.[0] ?? resolveTag(slug, root);
  const aktiv = chosenReviewers('implementation-review', flags).join(',');
  const workspace = createWorkspace('review', slug, root);
  const pack = writePackage(base, 'HEAD', workspace, root);
  const values = {
    P: plan, S: spec, R: root, slug, B: base, W: workspace, K: pack, C: contexts,
    N: '0', aktiv, Test: readConfig(root).config.Test,
  };
  if (fs.existsSync(archivePath(plan))) {
    values.Z = archivePath(plan);
    const late = commitsAfterReport(values.Z, root);
    if (late) values.WARN = late;
  }
  return values;
}

const SELECTION = /^(?:b|\d+|\d+:(?:\d+|b)(?:,\d+:(?:\d+|b))*)$/;

function selectionPairs(text, groups) {
  if (!text.includes(':')) return groups.map((group) => [String(group.number), text]);
  return text.split(',').map((part) => part.split(':'));
}

function chooseProposal(group, wanted) {
  if (wanted === 'b') {
    if (!group.preferred) throw new PrepareError(`Gruppe ${group.number} hat keinen bevorzugten Vorschlag.`);
    return group.preferred;
  }
  const choice = Number(wanted);
  if (choice < 1 || choice > group.proposals.length) {
    throw new PrepareError(`Gruppe ${group.number}: Vorschlag ${wanted} gibt es nicht (1-${group.proposals.length}).`);
  }
  return choice;
}

function parseSelection(text, groups) {
  if (!SELECTION.test(text)) throw new UsageError(`Auswahl ungültig: ${text} (erlaubt: b, <n>, <g>:<n|b>,...)`);
  if (groups.length === 0) throw new PrepareError('Die Sicherung enthält keine Scout-Gruppen.');
  const seen = new Set();
  return selectionPairs(text, groups).map(([number, wanted]) => {
    const group = groups[Number(number) - 1];
    if (!group) throw new PrepareError(`Gruppe ${number} gibt es nicht (1-${groups.length}).`);
    if (seen.has(group.number)) throw new PrepareError(`Gruppe ${group.number} doppelt gewählt.`);
    seen.add(group.number);
    return { group, choice: chooseProposal(group, wanted) };
  });
}

function selectionText(chosen) {
  const blocks = chosen.map(({ group, choice }) => [
    `### ${group.number} · ${group.severity} ${group.location} (${group.reviewers.join(', ')})`,
    ...group.findings,
    `Gewählt: Vorschlag ${choice}`,
    group.proposals[choice - 1],
  ].join('\n'));
  return `# Gewählte Scout-Vorschläge\n\n${blocks.join('\n\n')}\n`;
}

// Die gewählten Gruppen im Aggregat-Format, damit rework-outcome.js die Nacharbeit wie eine Loop-Runde auswertet.
function reworkText(chosen) {
  const blocks = chosen.map(({ group }) => [
    `### ${group.severity} ${group.location} (${group.reviewers.join(', ')})`,
    ...group.findings,
  ].join('\n'));
  return `=== REWORK ===\n${blocks.join('\n\n')}\n`;
}

// Reicht --spec und --base in der Form weiter, die der Original-Preparer erwartet.
function originalCall(art, artifact, flags, affected) {
  const only = { '--only': [affected.join(',')] };
  const spec = flags['--spec']?.[0];
  if (art === 'plan-review') return { positional: spec ? [artifact, spec] : [artifact], flags: only };
  if (art === 'implementation-review') {
    const passed = Object.fromEntries(['--spec', '--base'].filter((flag) => flags[flag]).map((flag) => [flag, flags[flag]]));
    return { positional: [artifact], flags: { ...only, ...passed } };
  }
  return { positional: [artifact], flags: only };
}

function headCommit(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new PrepareError(`HEAD nicht lesbar: ${toPosix(root)}`);
  return result.stdout.trim();
}

function prepareReviewFollowup({ positional, flags }) {
  if (positional.length !== 2) throw new UsageError('review-followup braucht <artefakt> <auswahl>');
  const artifact = existingFile(path.resolve(positional[0]), 'Artefakt');
  const root = gitRoot(path.dirname(artifact));
  const roles = rolesFor(artifact);
  const slug = slugFor(artifact, roles);
  const saved = latest(root, slug, roles);
  if (!saved) throw new PrepareError(`Keine Scout-Vorschläge gesichert für ${slug}. Zuerst das Review laufen lassen.`);
  const groups = loadGroups(saved.dir);
  const chosen = parseSelection(positional[1], groups);
  const affected = [...new Set(chosen.flatMap(({ group }) => group.reviewers))];
  const art = ART_OF_ROLE[saved.role];
  const values = PREPARERS[art](originalCall(art, artifact, flags, affected));
  const selection = path.join(values.W, 'auswahl.md');
  fs.writeFileSync(selection, selectionText(chosen));
  fs.mkdirSync(path.join(values.W, 'nacharbeit'), { recursive: true });
  fs.writeFileSync(path.join(values.W, 'nacharbeit', 'aggregate.md'), reworkText(chosen));
  // Vorher-Stand für die geänderten Bereiche der Nachprüfung (review-flow.js followup-checklist).
  if (art !== 'implementation-review') fs.copyFileSync(artifact, path.join(values.W, 'dokument-vorher.md'));
  const chosenNumbers = chosen.map(({ group }) => group.number);
  values.original = art;
  values.F = selection;
  values.gruppen = chosenNumbers.join(',');
  values.offen = groups.filter((group) => !chosenNumbers.includes(group.number)).map((group) => group.number).join(',');
  values.WAHL = chosen.map(({ group, choice }) => `${group.number} · ${group.severity} ${group.location} · Vorschlag ${choice}`);
  if (art === 'implementation-review') values.FIX_BASE = headCommit(values.R);
  return values;
}

const PREPARERS = {
  'spec-review': prepareSpecReview,
  'plan-review': preparePlanReview,
  implementation: prepareImplementation,
  'implementation-review': prepareImplementationReview,
  'review-followup': prepareReviewFollowup,
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
    if (![PrepareError, TagError, PackageError, ConfigError, FollowupError].some((type) => error instanceof type)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { PrepareError, UsageError, prepare, resolveSpec, parseArgs };
