'use strict';

// Startprüfung und Paketordner für harness-refactoring: Git-Repo, Eingabe, Ordnername aus Ziel und Datum, nie überschreiben.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PACKAGE_AREA = '.harness';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

class HarnessError extends Error {}

function existingFolder(target) {
  let current = path.resolve(target);
  while (!fs.existsSync(current) || !fs.statSync(current).isDirectory()) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

// Wurzel des Git-Repos, in dem der Pfad liegt; null außerhalb eines Repos. Der Pfad muss noch nicht existieren.
function gitRootOf(target) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: existingFolder(target), encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : null;
}

function currentBranch(repoRoot) {
  const result = spawnSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function readFeedback(file) {
  if (!fs.existsSync(file)) throw new HarnessError(`Abbruch: Die Rückmeldedatei ${file} fehlt.`);
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    throw new HarnessError(`Abbruch: Die Rückmeldedatei ${file} ist nicht lesbar.`);
  }
  if (content.trim() === '') throw new HarnessError(`Abbruch: Die Rückmeldedatei ${file} ist leer.`);
  return content;
}

function checkInput({ ziele = [], rueckmeldung, text = false }) {
  if (rueckmeldung !== undefined) {
    readFeedback(rueckmeldung);
    return;
  }
  if (ziele.length === 0 && !text) throw new HarnessError('Abbruch: Weder Ziel noch Rückmeldung angegeben.');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateOf(now) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Mehrere Ziele ergeben einen Namen; ein Pfad zählt mit seinem letzten Teil.
function slugOf(names) {
  return names
    .map((name) => path.basename(name.replace(/[\\/]+$/, '')).toLowerCase().replace(/\.md$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-');
}

function folderNameFor(slug, date, exists) {
  const base = `${slug}-${date}`;
  if (!exists(base)) return base;
  for (let number = 2; ; number += 1) {
    if (!exists(`${base}-${number}`)) return `${base}-${number}`;
  }
}

function createPackage(repoRoot, names, date) {
  if (!DATE.test(date)) throw new HarnessError(`Datum ${date} hat nicht die Form JJJJ-MM-TT.`);
  const slug = slugOf(names);
  if (slug === '') throw new HarnessError('Kein Zielname für den Paketordner angegeben.');
  const area = path.join(repoRoot, PACKAGE_AREA);
  const folder = path.join(area, folderNameFor(slug, date, (candidate) => fs.existsSync(path.join(area, candidate))));
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, '.gitignore'), '*\n');
  return folder;
}

module.exports = { HarnessError, gitRootOf, currentBranch, readFeedback, checkInput, dateOf, slugOf, folderNameFor, createPackage };
