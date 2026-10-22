'use strict';

// Einstieg der Session-Kette: Codewort und Pfade aus dem Aufruf prüfen, erste Etappe bestimmen, Workitem und Basis-Branch
// aus Spec-Kopf, Aufruf und Zustand ableiten und sagen, wonach die Leit-Session einmal fragen muss.
// Geprüft wird nur, ob die Pfade existieren; den Review-Status früherer Etappen prüft der Einstieg nicht.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { readConfig, workitemOf, workitemPattern } = require('../forge-config');
const { git } = require('./session-chain-git');
const { slugOfArtifact, readState, slugByWorktree, checkedSlug } = require('./session-chain-store');

const CODEWORDS = {
  grill: { etappe: 'grill', paths: ['spec'] },
  'spec-review': { etappe: 'spec-review', paths: ['spec'] },
  planning: { etappe: 'planning', paths: ['spec'] },
  'plan-review': { etappe: 'plan-review', paths: ['spec', 'plan'] },
  implementation: { etappe: 'go', paths: ['spec', 'plan'] },
  finish: { etappe: 'abschluss', paths: ['worktree'] },
};
const NO_WORKITEM = 'keine';

class EntryError extends Error {}

function existing(value, kind) {
  const absolute = path.resolve(value);
  const ok = kind === 'worktree' ? fs.existsSync(absolute) && fs.statSync(absolute).isDirectory() : fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  if (!ok) throw new EntryError(`Pfad nicht gefunden: ${value}`);
  return toPosix(absolute);
}

function parseCall(args) {
  if (args.length === 0) return { einstieg: 'ohne', etappe: 'whiteboarding', values: {} };
  const [codeword, ...rest] = args;
  const entry = CODEWORDS[codeword];
  if (!entry) throw new EntryError(`Unbekanntes Codewort: ${codeword}. Gültige Codewörter: ${Object.keys(CODEWORDS).join(', ')}.`);
  if (rest.length < entry.paths.length || rest.length > entry.paths.length + 1) {
    throw new EntryError(`${codeword} braucht: ${entry.paths.map((name) => `<${name}>`).join(' ')} [workitem-nr]`);
  }
  const values = Object.fromEntries(entry.paths.map((name, index) => [name, existing(rest[index], name)]));
  return { einstieg: codeword, etappe: entry.etappe, values, wi: rest[entry.paths.length] };
}

function currentBranch(dir) {
  return git(dir, ['branch', '--show-current']).out;
}

// Workitem aus dem Spec-Kopf; `Workitem: keine` zählt als keines.
function workitemOfSpec(spec) {
  const wi = workitemOf(spec);
  return wi && wi !== NO_WORKITEM ? wi : undefined;
}

// Wie die Konfigurations-Logik: leer, `keine` oder ein ungültiges Muster heißen „keine Workitem-Nummern“.
function usesWorkitems(dir) {
  try {
    return workitemPattern(readConfig(dir).config.Workitem) !== null;
  } catch {
    return false;
  }
}

// Spec und Plan müssen denselben Slug haben, sonst lägen Zustand und Ablage des Plan-Reviews in verschiedenen Ordnern.
function slugOfCall(dir, values) {
  if (values.worktree) return slugByWorktree(dir, values.worktree) ?? checkedSlug(path.basename(values.worktree).replace(/[^A-Za-z0-9._-]/g, '-'));
  if (values.spec && values.plan) {
    const [specSlug, planSlug] = [slugOfArtifact({ spec: values.spec }), slugOfArtifact({ plan: values.plan })];
    if (specSlug !== planSlug) throw new EntryError(`Spec und Plan haben verschiedene Slugs (${specSlug} / ${planSlug}); lege beide in denselben Ordner als spec.md und plan.md.`);
  }
  return values.spec || values.plan ? slugOfArtifact(values) : null;
}

// `args`: Wörter nach dem Skill-Namen; `cwd`: Ordner der Leit-Session. Rückgabe: Felder für die Zeilen `<Name>=<Wert>`
// und, bei vorhandenem Zustand, `state`.
function analyseEntry(args, cwd) {
  const call = parseCall(args);
  const slug = slugOfCall(cwd, call.values);
  const state = slug ? readState(cwd, slug) : null;
  const result = { einstieg: call.einstieg, etappe: call.etappe, ...call.values, ...(slug ? { slug } : {}), zustand: state ? 'vorhanden' : 'neu' };
  const wi = workitemOfSpec(call.values.spec ?? state?.spec) ?? call.wi ?? state?.wi;
  if (wi) result.wi = wi;
  else if (usesWorkitems(cwd)) result['frage-wi'] = 'ja';
  if (state?.basis) result.basis = state.basis;
  else if (call.etappe !== 'abschluss') Object.assign(result, { 'basis-vorschlag': currentBranch(cwd), 'frage-basis': 'ja' });
  return { fields: result, state };
}

module.exports = { EntryError, CODEWORDS, analyseEntry };
