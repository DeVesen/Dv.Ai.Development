'use strict';

// Zielpfad einer neuen Spec aus der Einstellung `Spec-Ablage`: Platzhalter einsetzen, einen vorhandenen Ort nie überschreiben.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { getValue, readConfig } = require('../forge-config');
const { SLUG } = require('../followup');
const { toPosix } = require('./posix');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SPEC_FILE = 'spec.md';

class SpecPathError extends Error {}

function today(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function filled(template, slug, date) {
  return template.replaceAll('<datum>', date).replaceAll('<slug>', slug);
}

// Liegt die Spec als `spec.md` in einem eigenen Ordner, gehört der Ordner zu ihr; sonst zählt nur die Datei.
function occupied(root, relative) {
  const file = path.resolve(root, relative);
  const owned = path.basename(file).toLowerCase() === SPEC_FILE ? path.dirname(file) : file;
  return fs.existsSync(owned);
}

function suggestion(root, template, slug, date) {
  for (let number = 2; ; number += 1) {
    if (!occupied(root, filled(template, `${slug}-${number}`, date))) return `${slug}-${number}`;
  }
}

function shortHead(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new SpecPathError('Kein Commit im Repo: Basis nicht bestimmbar.');
  return result.stdout.trim();
}

// `options`: slug, datum (YYYY-MM-DD, sonst heute), cwd. Rückgabe: { pfad (relativ zur Repo-Wurzel, mit /), basis }.
function specPath({ slug, datum, cwd = process.cwd(), now }) {
  if (!SLUG.test(String(slug ?? ''))) throw new SpecPathError(`Slug ungültig: ${slug}`);
  if (datum !== undefined && !DATE.test(datum)) throw new SpecPathError(`--datum ist kein Datum YYYY-MM-DD: ${datum}`);
  const date = datum ?? today(now);
  const { root } = readConfig(cwd);
  const template = getValue('Spec-Ablage', cwd);
  const relative = filled(template, slug, date);
  if (occupied(root, relative)) {
    throw new SpecPathError(`Der Ort existiert bereits: ${toPosix(relative)}. Vorschlag für einen anderen Slug: ${suggestion(root, template, slug, date)}`);
  }
  return { pfad: toPosix(relative), basis: shortHead(root) };
}

module.exports = { specPath, today, SpecPathError };
