'use strict';

// Ketten-Einträge: je Slug ein Vermerk, welcher Orchestrator zuletzt Spec, Plan oder Umsetzung erzeugt oder geprüft hat.
// Ort: <git-common-dir>/dv-forge/chain/<slug>.json, gemeinsam für den Haupt-Checkout und alle Worktrees eines Repos.
// Ein Eintrag gilt nur für Berichte seiner Stufe und nur, solange die Pfade seiner Stufe existieren.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix, normalizePath } = require('./posix');
const { slugOf } = require('../plan-tasks');
const { slugFor, SLUG } = require('../followup');

const STAGES = ['spec', 'plan', 'implementation'];
const NEEDED = { spec: ['spec'], plan: ['plan', 'spec'], implementation: ['plan', 'spec', 'worktree', 'branch'] };
// Pfade, die existieren müssen, damit der Eintrag gilt; bei `implementation` Spec, Plan und Worktree.
const EXISTING = { spec: ['spec'], plan: ['plan', 'spec'], implementation: ['plan', 'spec', 'worktree'] };

class ChainError extends Error {}

function checkedStage(stage) {
  if (!STAGES.includes(stage)) throw new ChainError(`Stufe unbekannt: ${stage} (erlaubt: ${STAGES.join(', ')})`);
  return stage;
}

// Slug wie bei den Reviews: Spec über slugFor, Plan über slugOf; die Regel `SLUG` teilt chain.js mit followup.js.
function rawSlug(stage, artifact) {
  return stage === 'spec' ? slugFor(artifact, ['spec-review']) : slugOf(artifact);
}

// Nur der Schreibpfad wirft bei einem Slug außerhalb der Regel; der Lesepfad liefert dann null.
function checkedSlug(stage, artifact) {
  const slug = rawSlug(stage, artifact);
  if (!SLUG.test(slug)) throw new ChainError(`Slug ungültig: ${slug}`);
  return slug;
}

// Ordner `<git-common-dir>/dv-forge/<name>`, gemeinsam für Haupt-Checkout und Worktrees; null, wenn `dir` in keinem Git-Repo liegt.
// `name` ist `chain` für die Ketten-Einträge, `session-chain` für Zustand und Ablage einer Session-Kette.
function storeDir(dir, name = 'chain') {
  const result = spawnSync('git', ['-C', dir, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return path.join(path.resolve(dir, result.stdout.trim()), 'dv-forge', name);
}

function sameDir(a, b) {
  return normalizePath(a) === normalizePath(b);
}

function parseEntry(file) {
  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
    return STAGES.includes(entry?.stage) ? entry : null;
  } catch {
    return null;
  }
}

function missingPath(entry) {
  return EXISTING[entry.stage].find((key) => typeof entry[key] !== 'string' || !fs.existsSync(entry[key]));
}

function absolute(value) {
  return value ? toPosix(path.resolve(value)) : undefined;
}

// `input`: stage, spec, plan, wi, worktree, branch. Fehlt ein Wert oder Pfad der Stufe, bleibt der Speicher unverändert.
function writeEntry(input) {
  const stage = checkedStage(input.stage);
  const absent = NEEDED[stage].filter((key) => !input[key]);
  if (absent.length > 0) throw new ChainError(`${stage}: fehlt: ${absent.join(', ')}`);
  const artifact = stage === 'spec' ? input.spec : input.plan;
  const entry = {
    stage, slug: checkedSlug(stage, artifact), spec: absolute(input.spec), plan: absolute(input.plan),
    wi: input.wi || undefined, worktree: absolute(input.worktree), branch: input.branch || undefined,
  };
  const gone = missingPath(entry);
  if (gone) throw new ChainError(`${stage}: Pfad nicht gefunden: ${gone}=${entry[gone] ?? '-'}`);
  const store = storeDir(path.dirname(path.resolve(artifact)));
  if (!store) throw new ChainError(`Kein Git-Repo: ${toPosix(path.dirname(path.resolve(artifact)))}`);
  fs.mkdirSync(store, { recursive: true });
  const file = path.join(store, `${entry.slug}.json`);
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify({ ...entry, writtenAt: new Date().toISOString() }, null, 2)}\n`);
  fs.renameSync(`${file}.tmp`, file);
  return entry;
}

// Der Eintrag der Stufe zum Slug des Artefakts (Spec bei `spec`, sonst Plan) oder null: kein Eintrag, andere Stufe, Pfad fehlt,
// Slug außerhalb der Regel. Ein Einzel-Bericht darf am Lesen nie scheitern.
function readEntry({ stage, artifact }) {
  checkedStage(stage);
  const resolved = path.resolve(artifact);
  const slug = rawSlug(stage, resolved);
  if (!SLUG.test(slug)) return null;
  const store = storeDir(path.dirname(resolved));
  if (!store) return null;
  const entry = parseEntry(path.join(store, `${slug}.json`));
  return entry && entry.stage === stage && missingPath(entry) === undefined ? entry : null;
}

// Ein eingebetteter Lauf (`--bericht`) bleibt von einem Ketten-Eintrag unberührt: Die Regel steht nur hier, für alle Berichtsbauer.
function readEntryFor({ embedded, stage, artifact }) {
  return embedded ? null : readEntry({ stage, artifact });
}

// Entfernt die Einträge der Stufe `implementation` zu diesem Worktree; Rückgabe: Zahl der entfernten Einträge.
function removeByWorktree(dir, worktree) {
  const store = storeDir(dir);
  if (!store || !fs.existsSync(store)) return 0;
  const hits = fs.readdirSync(store).filter((name) => name.endsWith('.json')).map((name) => path.join(store, name))
    .filter((file) => {
      const entry = parseEntry(file);
      return entry?.stage === 'implementation' && typeof entry.worktree === 'string' && sameDir(entry.worktree, worktree);
    });
  hits.forEach((file) => fs.rmSync(file, { force: true }));
  return hits.length;
}

module.exports = { ChainError, STAGES, storeDir, writeEntry, readEntry, readEntryFor, removeByWorktree };
