#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROLES = new Set(['implementation', 'review']);
const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const USAGE = 'Aufruf: node workspace.js create|remove <implementation|review> <slug>\n';

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
  return dir;
}

function removeWorkspace(role, slug, cwd = process.cwd()) {
  const dir = workspacePath(role, slug, cwd);
  fs.rmSync(dir, { recursive: true, force: true });
  return dir;
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

module.exports = { WorkspaceError, workspacePath, createWorkspace, removeWorkspace };
