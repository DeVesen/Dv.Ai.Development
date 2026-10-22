'use strict';

// Zustand einer Session-Kette je Slug unter <git-common-dir>/dv-forge/session-chain/<slug>/zustand.json, gemeinsam für den
// Haupt-Checkout und alle Worktrees eines Repos. Den Ordner löst storeDir aus chain.js auf, wie für die Ketten-Einträge.
// Die Ablage einer Etappe liegt in session-chain-ablage.js, die Turn-Zähler in session-chain-turn.js.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix, normalizePath } = require('./posix');
const { storeDir } = require('./chain');
const { slugOf } = require('../plan-tasks');
const { slugFor, SLUG } = require('../followup');

const ETAPPEN = ['whiteboarding', 'grill', 'spec-review', 'spec-nacharbeit', 'planning', 'plan-review', 'plan-nacharbeit', 'umsetzung', 'abschluss'];
const STATE_FILE = 'zustand.json';

class SessionChainError extends Error {}

// Meldungsteil für einen ungültigen Etappen-Namen, sonst null; die einzige Stelle dieser Prüfung.
function etappeError(etappe) {
  return ETAPPEN.includes(etappe) ? null : `erlaubt: ${ETAPPEN.join(', ')}; nicht ${etappe}`;
}

function checkedEtappe(etappe) {
  const error = etappeError(etappe);
  if (error) throw new SessionChainError(`Etappe unbekannt, ${error}`);
  return etappe;
}

function checkedSlug(slug) {
  if (!SLUG.test(String(slug ?? ''))) throw new SessionChainError(`Slug ungültig: ${slug}`);
  return slug;
}

// Slug wie bei den Reviews: Spec über slugFor, Plan über slugOf; Spec und Plan im selben Ordner teilen ihn.
function slugOfArtifact({ spec, plan }) {
  if (spec) return checkedSlug(slugFor(path.resolve(spec), ['spec-review']));
  if (plan) return checkedSlug(slugOf(path.resolve(plan)));
  throw new SessionChainError('Slug nicht bestimmbar: weder Spec noch Plan');
}

// Wurzel aller Session-Ketten des Repos, in dem `dir` liegt.
function chainsRoot(dir) {
  const root = storeDir(dir, 'session-chain');
  if (!root) throw new SessionChainError(`Kein Git-Repo: ${toPosix(dir)}`);
  return root;
}

function chainDir(dir, slug) {
  return path.join(chainsRoot(dir), checkedSlug(slug));
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${file}.tmp`, file);
}

// Zustand der Kette oder null, wenn es keinen gibt oder die Datei kein JSON-Objekt ist.
function readState(dir, slug) {
  const state = readJsonFile(path.join(chainDir(dir, slug), STATE_FILE));
  return state !== null && typeof state === 'object' && !Array.isArray(state) ? state : null;
}

function writeState(dir, slug, state) {
  writeJsonFile(path.join(chainDir(dir, slug), STATE_FILE), { ...state, slug });
  return state;
}

// Slug der Kette, deren Zustand diesen Worktree nennt; sonst null.
function slugByWorktree(dir, worktree) {
  const root = chainsRoot(dir);
  if (!fs.existsSync(root)) return null;
  const wanted = normalizePath(worktree);
  const hit = fs.readdirSync(root).filter((name) => SLUG.test(name)).find((name) => {
    const state = readJsonFile(path.join(root, name, STATE_FILE));
    return typeof state?.worktree === 'string' && normalizePath(state.worktree) === wanted;
  });
  return hit ?? null;
}

module.exports = {
  SessionChainError, ETAPPEN, etappeError, checkedEtappe, checkedSlug, slugOfArtifact, chainsRoot, chainDir, readJsonFile, writeJsonFile,
  readState, writeState, slugByWorktree,
};
