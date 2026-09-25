#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const USAGE = 'Aufruf: node review-package.js <base> <head> <dir>\n';

class PackageError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: result.status === 0, out: String(result.stdout ?? '') };
}

function commitOf(ref, cwd) {
  const result = git(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  if (!result.ok) throw new PackageError(`Ungültige Referenz: ${ref}`, 2);
  return result.out.trim();
}

function checkedRange(base, head, cwd) {
  const from = commitOf(base, cwd);
  const to = commitOf(head, cwd);
  if (from === to) throw new PackageError(`Bereich leer: ${base}..${head}`, 1);
  return { from, to };
}

function buildPackage(base, head, cwd = process.cwd()) {
  const { from, to } = checkedRange(base, head, cwd);
  const range = `${from}..${to}`;
  return [
    `# Review-Paket: ${base}..${head}`,
    '',
    '## Commits',
    git(cwd, ['log', '--oneline', range]).out.trimEnd(),
    '',
    '## Dateien',
    git(cwd, ['diff', '--stat', range]).out.trimEnd(),
    '',
    '## Diff',
    git(cwd, ['diff', '-U10', range]).out.trimEnd(),
    '',
  ].join('\n');
}

function writePackage(base, head, dir, cwd = process.cwd()) {
  const content = buildPackage(base, head, cwd);
  const { from, to } = checkedRange(base, head, cwd);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `review-${from.slice(0, 7)}..${to.slice(0, 7)}.diff`);
  fs.writeFileSync(file, content);
  return file;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${writePackage(...args)}\n`);
  } catch (error) {
    if (!(error instanceof PackageError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(error.exitCode);
  }
}

if (require.main === module) main();

module.exports = { PackageError, buildPackage, writePackage };
