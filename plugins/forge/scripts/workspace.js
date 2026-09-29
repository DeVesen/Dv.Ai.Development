#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');

const ROLES = new Set(['implementation', 'review', 'spec-review', 'plan-review']);
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node workspace.js create|remove <implementation|review|spec-review|plan-review> <slug>\n';

class WorkspaceError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new WorkspaceError(`Kein Git-Repo: ${cwd}`);
  return path.resolve(result.stdout.trim());
}

function workspacePath(role, slug, cwd = process.cwd()) {
  return path.join(repoRoot(cwd), '.forge', role, slug);
}

function createWorkspace(role, slug, cwd = process.cwd()) {
  const dir = workspacePath(role, slug, cwd);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '..', '..', '.gitignore'), '*\n');
  return toPosix(dir);
}

function removeWorkspace(role, slug, cwd = process.cwd()) {
  const dir = workspacePath(role, slug, cwd);
  fs.rmSync(dir, { recursive: true, force: true });
  return toPosix(dir);
}

const CONTEXT_FILE = 'kontext.json';

// Eingaben der Skript-Prüfungen eines Laufs; prepare.js schreibt sie, review-flow.js liest sie.
function writeContext(dir, context) {
  const file = path.join(dir, CONTEXT_FILE);
  fs.writeFileSync(file, `${JSON.stringify(context, null, 2)}\n`);
  return toPosix(file);
}

// Fehlt die Datei oder ist sie kein JSON-Objekt, ist der Kontext leer; die Skript-Prüfungen melden das selbst.
function readContext(dir) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(dir, CONTEXT_FILE), 'utf8'));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const ACTIONS = { create: createWorkspace, remove: removeWorkspace };

function main() {
  const [action, role, slug] = process.argv.slice(2);
  if (!Object.hasOwn(ACTIONS, action) || !ROLES.has(role) || !SLUG.test(slug ?? '')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${ACTIONS[action](role, slug)}\n`);
  } catch (error) {
    if (!(error instanceof WorkspaceError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { WorkspaceError, workspacePath, createWorkspace, removeWorkspace, writeContext, readContext, CONTEXT_FILE };
