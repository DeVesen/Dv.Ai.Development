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
  const result = [];
  let inside = false;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.trim() === SECTION) inside = true;
    else if (/^#{1,2}\s/.test(line)) inside = false;
    else if (inside) result.push(line);
  }
  return result;
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

// Eine nicht versionierte CLAUDE.md fehlt in jedem Worktree; dann gilt die des Haupt-Checkouts.
function configFile(root, main) {
  const own = path.join(root, 'CLAUDE.md');
  if (fs.existsSync(own)) return { file: own, source: 'eigen' };
  const fallback = path.join(main, 'CLAUDE.md');
  if (main !== root && fs.existsSync(fallback)) return { file: fallback, source: 'haupt' };
  return { file: null, source: 'keine' };
}

function readConfig(cwd = process.cwd()) {
  const root = repoRoot(cwd);
  const main = mainRoot(root);
  const { file, source } = configFile(root, main);
  const found = file ? parseSection(fs.readFileSync(file, 'utf8')) : {};
  const config = { ...DEFAULTS, ...found };
  if (config.Profile === '<Glossar>') config.Profile = config.Glossar;
  config['Worktree-Ordner'] = config['Worktree-Ordner'].replace('<repo>', path.basename(main));
  return { root: toPosix(root), main: toPosix(main), config, configured: Object.keys(found), source };
}

function getValue(key, cwd = process.cwd()) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new ConfigError(`Unbekannter Schlüssel: ${key}`);
  return readConfig(cwd).config[key];
}

function workitemOf(specPath) {
  const match = specPath && fs.existsSync(specPath) ? WORKITEM_LINE.exec(fs.readFileSync(specPath, 'utf8')) : null;
  return match ? stripTicks(match[1]) : '';
}

function workitemPattern(source) {
  if (!source || source === 'keine') return null;
  try {
    return new RegExp(source);
  } catch {
    // Ein ungültiges Muster in den Projekt-Einstellungen findet kein Workitem.
    return null;
  }
}

// Das Workitem-Muster der Projekt-Einstellungen im Branch: null bei `keine`, leerem oder ungültigem Muster,
// leerem Branch oder ohne Treffer, sonst der Treffer. Die einzige Stelle dieser Regel.
function branchWorkitem(config, branch) {
  const pattern = workitemPattern(config.Workitem);
  const found = pattern && branch ? pattern.exec(branch) : null;
  return found ? found[0] : null;
}

const LEADING_DATE = /^\d{4}-\d{2}-\d{2}-/;

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Der Slug ist der Dateiname und trägt oft schon Datum und Workitem-Nummer. Im Branch fällt das Datum weg,
// die Nummer nur, wenn das Schema sie selbst einsetzt; sonst stünde sie doppelt da.
function branchSlug(slug, workitem, schema) {
  const withoutDate = slug.replace(LEADING_DATE, '');
  if (!schema.includes('<workitem>') || !workitem) return withoutDate;
  const forms = [...new Set([workitem, workitem.replace(/^.*#/, '')])].filter(Boolean).map(escapeRegExp);
  return withoutDate.replace(new RegExp(`^(?:${forms.join('|')})[-_]`), '');
}

function schemaWorkitem(schema, specPath) {
  const workitem = workitemOf(specPath);
  if (schema.includes('<workitem>') && !workitem) {
    throw new ConfigError(`Branch-Schema ${schema} braucht eine Workitem-Nummer, die Spec nennt keine.`);
  }
  return workitem;
}

function fill(schema, slug, workitem) {
  return schema.replace('<slug>', slug).replace('<workitem>', workitem);
}

function branchFor(config, slug, specPath) {
  const schema = config['Branch-Schema'];
  const workitem = schemaWorkitem(schema, specPath);
  return fill(schema, branchSlug(slug, workitem, schema), workitem);
}

// Neuer Branch-Name zuerst, danach der alte mit ungekürztem Slug, damit laufende Arbeit gefunden wird.
function branchCandidates(config, slug, specPath) {
  const schema = config['Branch-Schema'];
  const workitem = schemaWorkitem(schema, specPath);
  return [...new Set([branchFor(config, slug, specPath), fill(schema, slug, workitem)])];
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
    const { source, main: mainCheckout } = readConfig();
    if (source === 'haupt') process.stderr.write(`Hinweis: Konfiguration aus dem Haupt-Checkout ${mainCheckout}/CLAUDE.md\n`);
    process.stdout.write(`${command === 'show' ? show() : getValue(key)}\n`);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { ConfigError, DEFAULTS, parseSection, readConfig, getValue, show, workitemOf, branchWorkitem, branchFor, branchCandidates };
