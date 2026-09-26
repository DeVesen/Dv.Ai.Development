#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');

const SECTION = '## dv-forge';
const ENTRY = /^-\s+([^:]+):\s*(.*)$/;
const WORKITEM_LINE = /^Workitem:\s*(.+?)\s*$/m;
const USAGE = 'Aufruf: node forge-config.js show | get <Schlüssel>\n';

const DEFAULTS = {
  'Spec-Ablage': 'docs/forge/<datum>-<slug>/spec.md',
  'Plan-Ablage': '<spec-ordner>/plan.md',
  Glossar: 'docs/glossary',
  Profile: '<Glossar>',
  Workitem: 'keine',
  Worktree: 'nein',
  'Branch-Schema': 'feature/<slug>',
  'Worktree-Ordner': '../<repo>-worktrees',
  'Planungs-Skills': '',
  Build: '',
  Test: '',
  Lint: '',
  Suche: '',
  'Commit-Konvention': '',
};

class ConfigError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new ConfigError(`Kein Git-Repo: ${cwd}`);
  return path.resolve(result.stdout.trim());
}

function mainRoot(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' });
  const common = result.status === 0 ? path.resolve(result.stdout.trim()) : null;
  return common && path.basename(common) === '.git' ? path.dirname(common) : root;
}

function sectionLines(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === SECTION);
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2}\s/.test(line));
  return end === -1 ? rest : rest.slice(0, end);
}

function stripTicks(value) {
  return value.trim().replace(/^`(.*)`$/, '$1').trim();
}

function parseSection(text) {
  const entries = {};
  for (const line of sectionLines(text)) {
    const match = ENTRY.exec(line);
    if (match && Object.hasOwn(DEFAULTS, match[1].trim())) entries[match[1].trim()] = stripTicks(match[2]);
  }
  return entries;
}

function readConfig(cwd = process.cwd()) {
  const root = repoRoot(cwd);
  const file = path.join(root, 'CLAUDE.md');
  const found = fs.existsSync(file) ? parseSection(fs.readFileSync(file, 'utf8')) : {};
  const config = { ...DEFAULTS, ...found };
  if (config.Profile === '<Glossar>') config.Profile = config.Glossar;
  const main = mainRoot(root);
  config['Worktree-Ordner'] = config['Worktree-Ordner'].replace('<repo>', path.basename(main));
  return { root: toPosix(root), main: toPosix(main), config, configured: Object.keys(found) };
}

function getValue(key, cwd = process.cwd()) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new ConfigError(`Unbekannter Schlüssel: ${key}`);
  return readConfig(cwd).config[key];
}

function workitemOf(specPath) {
  const match = specPath && fs.existsSync(specPath) ? WORKITEM_LINE.exec(fs.readFileSync(specPath, 'utf8')) : null;
  return match ? stripTicks(match[1]) : '';
}

function branchFor(config, slug, specPath) {
  const schema = config['Branch-Schema'];
  const workitem = workitemOf(specPath);
  if (schema.includes('<workitem>') && !workitem) {
    throw new ConfigError(`Branch-Schema ${schema} braucht eine Workitem-Nummer, die Spec nennt keine.`);
  }
  return schema.replace('<slug>', slug).replace('<workitem>', workitem);
}

function show(cwd = process.cwd()) {
  const { config, configured } = readConfig(cwd);
  return Object.entries(config)
    .map(([key, value]) => `${key}=${value}${configured.includes(key) ? '' : '  (Default)'}`)
    .join('\n');
}

function main() {
  const [command, key] = process.argv.slice(2);
  const valid = (command === 'show' && key === undefined) || (command === 'get' && key !== undefined);
  if (!valid) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${command === 'show' ? show() : getValue(key)}\n`);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { ConfigError, DEFAULTS, parseSection, readConfig, getValue, show, workitemOf, branchFor };
