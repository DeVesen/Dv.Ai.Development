'use strict';

// Shared logic for hook, setup script and login scripts:
// find the main checkout, read and validate .claude/ado.json, derive the config folder.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CONFIG_FILE = path.join('.claude', 'ado.json');
const CONFIG_DIR = path.join('.claude', 'azure');
const REQUIRED_FIELDS = ['organization', 'project', 'repository', 'tenantId', 'user', 'prTargetBranch'];
const ORG_PATTERN = /^https:\/\/dev\.azure\.com\/[^/\s]+\/?$/i;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0 || !result.stdout) return null;
  return result.stdout.trim();
}

// The parent of the common git dir is the main checkout, also from inside a worktree.
// Submodules keep their git dir under .git/modules/<name>; there the top level is used.
function findMainCheckout(cwd) {
  if (!cwd || !fs.existsSync(cwd)) return null;
  const commonDir = git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (!commonDir) return null;
  const resolved = path.resolve(commonDir);
  if (path.basename(resolved).toLowerCase() === '.git') return path.dirname(resolved);
  const topLevel = git(cwd, ['rev-parse', '--show-toplevel']);
  return topLevel ? path.resolve(topLevel) : null;
}

function configFileFor(root) {
  return path.join(root, CONFIG_FILE);
}

function configDirFor(root) {
  return path.resolve(root, CONFIG_DIR);
}

function validateConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return ['ado.json enthält kein JSON-Objekt'];
  }
  for (const field of REQUIRED_FIELDS) {
    if (typeof config[field] !== 'string' || config[field].trim() === '') {
      errors.push(`Pflichtfeld "${field}" fehlt oder ist leer`);
    }
  }
  if (typeof config.organization === 'string' && config.organization && !ORG_PATTERN.test(config.organization)) {
    errors.push('"organization" muss die Form https://dev.azure.com/<org> haben');
  }
  if (typeof config.tenantId === 'string' && config.tenantId && !GUID_PATTERN.test(config.tenantId)) {
    errors.push('"tenantId" muss eine GUID sein');
  }
  return errors;
}

function readAdoConfig(root) {
  const file = configFileFor(root);
  if (!fs.existsSync(file)) return { status: 'missing', file, errors: ['.claude/ado.json fehlt'] };
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch (error) {
    return { status: 'invalid', file, errors: [`ado.json ist kein gültiges JSON: ${error.message}`] };
  }
  const errors = validateConfig(config);
  if (errors.length > 0) return { status: 'invalid', file, errors };
  return { status: 'ok', file, config, errors: [] };
}

function toComparablePath(value) {
  let text = String(value).trim().replace(/\\/g, '/');
  const gitBash = process.platform === 'win32' ? /^\/([a-z])(\/|$)/i.exec(text) : null;
  if (gitBash) text = `${gitBash[1]}:/${text.slice(3)}`;
  text = text.replace(/\/+$/, '');
  if (/^[a-z]:/i.test(text) || process.platform === 'win32') text = text.toLowerCase();
  return text;
}

function samePath(a, b) {
  if (!a || !b) return false;
  return toComparablePath(a) === toComparablePath(b);
}

function normalizeOrg(url) {
  return String(url).trim().replace(/\/+$/, '').toLowerCase();
}

function parseRemote(url) {
  const match = /^https:\/\/(?:[^@/]+@)?dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/?#]+)/i.exec(String(url).trim());
  if (!match) return null;
  return {
    organization: `https://dev.azure.com/${match[1]}`,
    project: decodeURIComponent(match[2]),
    repository: decodeURIComponent(match[3]),
  };
}

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

// The login is always run by the user, from the project folder, never by an agent.
function loginCommands(pluginRoot = PLUGIN_ROOT) {
  const scripts = path.join(pluginRoot, 'scripts');
  return {
    powershell: `& "${path.join(scripts, 'ado-login.ps1')}"`,
    bash: `bash "${path.join(scripts, 'ado-login.sh').replace(/\\/g, '/')}"`,
  };
}

function loginHint(pluginRoot = PLUGIN_ROOT) {
  const commands = loginCommands(pluginRoot);
  return `Der Nutzer meldet sich selbst an, im Projektordner: PowerShell ${commands.powershell} oder Bash ${commands.bash}`;
}

function setupHint() {
  return 'Einrichtung über den Skill ado-cli ("ADO einrichten", references/setup.md).';
}

function resolveContext(cwd) {
  const root = findMainCheckout(cwd);
  if (!root) return { root: null, configDir: null, result: { status: 'missing', errors: ['kein Git-Repository'] } };
  return { root, configDir: configDirFor(root), result: readAdoConfig(root) };
}

module.exports = {
  CONFIG_FILE,
  CONFIG_DIR,
  REQUIRED_FIELDS,
  findMainCheckout,
  configFileFor,
  configDirFor,
  validateConfig,
  readAdoConfig,
  samePath,
  normalizeOrg,
  parseRemote,
  resolveContext,
  loginCommands,
  loginHint,
  setupHint,
};
