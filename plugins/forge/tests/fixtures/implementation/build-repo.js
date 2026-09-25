#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SLUG = '2026-09-25-order-total';
const PLAN = path.join('docs', 'forge', SLUG, 'plan.md');
const USAGE = 'Aufruf: node build-repo.js <ziel> [--flawed]\n';

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

function copyLayer(name, target) {
  fs.cpSync(path.join(__dirname, name), target, { recursive: true });
  const rules = path.join(target, 'CLAUDE.fixture.md');
  if (fs.existsSync(rules)) fs.renameSync(rules, path.join(target, 'CLAUDE.md'));
}

function commitAll(target, message) {
  git(target, 'add', '--all');
  git(target, 'commit', '--quiet', '-m', message);
}

function buildRepo(target, { flawed = false } = {}) {
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) throw new Error(`Ziel ist nicht leer: ${target}`);
  fs.mkdirSync(target, { recursive: true });
  git(target, 'init', '--quiet', '--initial-branch=main');
  git(target, 'config', 'user.email', 'fixture@example.invalid');
  git(target, 'config', 'user.name', 'dv-forge fixture');
  git(target, 'config', 'commit.gpgsign', 'false');
  copyLayer('project', target);
  commitAll(target, 'chore: base');
  if (!flawed) return target;
  git(target, 'tag', `forge-base/${SLUG}`);
  copyLayer('flawed', target);
  commitAll(target, 'feat: order total');
  return target;
}

function main() {
  const [target, flag] = process.argv.slice(2);
  if (!target || (flag !== undefined && flag !== '--flawed')) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  process.stdout.write(`${buildRepo(path.resolve(target), { flawed: flag === '--flawed' })}\n`);
}

if (require.main === module) main();

module.exports = { SLUG, PLAN, buildRepo };
