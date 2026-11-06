#!/usr/bin/env node
'use strict';

// Per-project Azure DevOps setup for the ado-cli skill.
//   show            valid .claude/ado.json plus configDir as JSON (exit 1 if missing or invalid)
//   suggest         organization, project, repository derived from git remote origin
//   write --organization <url> --project <name> --repository <name> --tenant <guid> --user <upn> --pr-target <branch>
//                   checks .gitignore, writes ado.json, creates .claude/azure, sets env.AZURE_CONFIG_DIR
//                   in .claude/settings.local.json
//   check-identity  compares `az account show` in the project config folder with ado.json
//   login-command   prints the login command the user runs
// All commands take --cwd <dir> (default: current directory).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ctx = require('./lib/ado-context');

const WRITE_OPTIONS = {
  organization: 'organization',
  project: 'project',
  repository: 'repository',
  tenant: 'tenantId',
  user: 'user',
  'pr-target': 'prTargetBranch',
};

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith('--')) throw new UsageError(`Unerwartetes Argument: ${arg}`);
    const eq = arg.indexOf('=');
    if (eq > 0) {
      options[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const value = rest[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`Wert fehlt für ${arg}`);
      options[arg.slice(2)] = value;
      i += 1;
    }
  }
  return { command, options };
}

function requireRoot(cwd) {
  const root = ctx.findMainCheckout(cwd);
  if (!root) throw new Error(`Kein Git-Repository: ${cwd}`);
  return root;
}

function show(cwd) {
  const root = requireRoot(cwd);
  const result = ctx.readAdoConfig(root);
  if (result.status !== 'ok') {
    return { exit: 1, error: `${result.errors.join('; ')}. ${ctx.setupHint()}` };
  }
  return { exit: 0, output: { ...result.config, root, configDir: ctx.configDirFor(root) } };
}

function suggest(cwd) {
  const root = requireRoot(cwd);
  const remote = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', windowsHide: true });
  const url = remote.status === 0 ? remote.stdout.trim() : '';
  const parsed = url ? ctx.parseRemote(url) : null;
  return {
    exit: 0,
    output: {
      root,
      remote: url || null,
      ...(parsed || { organization: null, project: null, repository: null }),
      tenantId: null,
      user: null,
      prTargetBranch: null,
    },
  };
}

function isIgnored(root, relative) {
  const result = spawnSync('git', ['check-ignore', '-q', '--no-index', relative], { cwd: root, windowsHide: true });
  return result.status === 0;
}

function isTracked(root, relative) {
  const result = spawnSync('git', ['ls-files', '--', relative], { cwd: root, encoding: 'utf8', windowsHide: true });
  return result.status === 0 && result.stdout.trim() !== '';
}

// Worktrees the Claude app creates copy the files listed in .worktreeinclude,
// so worktree sessions get env.AZURE_CONFIG_DIR as well.
function ensureWorktreeInclude(root) {
  const file = path.join(root, '.worktreeinclude');
  const entry = '.claude/settings.local.json';
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (text.split(/\r?\n/).some((line) => line.trim() === entry)) return file;
  const prefix = text && !text.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(file, `${text}${prefix}${entry}\n`);
  return file;
}

function mergeSettings(file, configDir) {
  let settings = {};
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    try {
      settings = text.trim() ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error(`${file} ist kein gültiges JSON (${error.message}); bitte von Hand korrigieren.`);
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error(`${file} enthält kein JSON-Objekt; bitte von Hand korrigieren.`);
    }
  }
  const env = settings.env && typeof settings.env === 'object' && !Array.isArray(settings.env) ? settings.env : {};
  settings.env = { ...env, AZURE_CONFIG_DIR: configDir };
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}

function write(cwd, options) {
  const root = requireRoot(cwd);
  const config = {};
  for (const [option, field] of Object.entries(WRITE_OPTIONS)) {
    if (options[option] !== undefined) config[field] = String(options[option]).trim();
  }
  const errors = ctx.validateConfig(config);
  if (errors.length > 0) return { exit: 1, error: `Werte unvollständig oder ungültig: ${errors.join('; ')}` };

  const tracked = ['.claude/azure', '.claude/ado.json'].filter((p) => isTracked(root, p));
  if (tracked.length > 0) {
    return {
      exit: 1,
      error: `Abbruch: ${tracked.join(' und ')} ist bereits in Git eingecheckt. Bitte aus dem Index entfernen (git rm --cached) und die Einrichtung erneut starten.`,
    };
  }
  const notIgnored = ['.claude/azure/', '.claude/ado.json'].filter((p) => !isIgnored(root, p));
  if (notIgnored.length > 0) {
    return {
      exit: 1,
      error:
        `Abbruch: ${notIgnored.join(' und ')} ist nicht gitignored. In .claude/azure liegen Zugangstokens. ` +
        'Bitte in .gitignore ergänzen (z. B. ".claude/azure/" und ".claude/ado.json") und die Einrichtung erneut starten.',
    };
  }

  const configDir = ctx.configDirFor(root);
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(ctx.configFileFor(root), `${JSON.stringify(config, null, 2)}\n`);
  const settingsFile = path.join(root, '.claude', 'settings.local.json');
  mergeSettings(settingsFile, configDir);
  const includeFile = ensureWorktreeInclude(root);
  return {
    exit: 0,
    output: {
      written: [ctx.configFileFor(root), settingsFile, includeFile],
      configDir,
      next: 'Session neu starten (erst dann gilt AZURE_CONFIG_DIR), danach meldet sich der Nutzer selbst an.',
      login: ctx.loginCommands(),
    },
  };
}

// On Windows az is az.cmd and needs the shell; one fixed command string, no spaces in the query.
function runAccountShow(configDir) {
  const options = { encoding: 'utf8', windowsHide: true, env: { ...process.env, AZURE_CONFIG_DIR: configDir } };
  const args = ['account', 'show', '--query', '{user:user.name,tenant:tenantId}', '-o', 'json'];
  if (process.platform === 'win32') return spawnSync(`az ${args.join(' ')}`, { ...options, shell: true });
  return spawnSync('az', args, options);
}

function checkIdentity(cwd, accountShow = runAccountShow) {
  const shown = show(cwd);
  if (shown.exit !== 0) return shown;
  const { configDir, tenantId, user } = shown.output;
  const result = accountShow(configDir);
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || '').trim().split(/\r?\n/)[0];
    return { exit: 1, error: `Nicht angemeldet in ${configDir}${detail ? ` (${detail})` : ''}. ${ctx.loginHint()}` };
  }
  let account;
  try {
    account = JSON.parse(result.stdout);
  } catch {
    return { exit: 1, error: `Antwort von az account show nicht lesbar. ${ctx.loginHint()}` };
  }
  const userOk = String(account.user || '').toLowerCase() === user.toLowerCase();
  const tenantOk = String(account.tenant || '').toLowerCase() === tenantId.toLowerCase();
  if (!userOk || !tenantOk) {
    return {
      exit: 1,
      error:
        `Falsche Identität: angemeldet als ${account.user} (Tenant ${account.tenant}), erwartet ${user} (Tenant ${tenantId}). ` +
        ctx.loginHint(),
    };
  }
  return { exit: 0, output: { identity: 'ok', user: account.user, tenant: account.tenant } };
}

function run(argv, { cwd = process.cwd(), accountShow } = {}) {
  const { command, options } = parseArgs(argv);
  const dir = options.cwd ? path.resolve(options.cwd) : cwd;
  switch (command) {
    case 'show':
      return show(dir);
    case 'suggest':
      return suggest(dir);
    case 'write':
      return write(dir, options);
    case 'check-identity':
      return checkIdentity(dir, accountShow);
    case 'login-command':
      return { exit: 0, output: ctx.loginCommands() };
    default:
      throw new UsageError('Aufruf: ado-setup.js show|suggest|write|check-identity|login-command [--cwd <dir>] [Optionen]');
  }
}

function main() {
  let result;
  try {
    result = run(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error instanceof UsageError ? 2 : 1);
  }
  if (result.output !== undefined) process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`);
  if (result.error) process.stderr.write(`${result.error}\n`);
  process.exit(result.exit);
}

if (require.main === module) main();

module.exports = { run, parseArgs, UsageError };
