'use strict';

// Decides whether a shell command (Bash or PowerShell tool) may run.
// Detection works on the whole command text, so chains with &&, ||, ;, | and
// several lines are covered. Text inside quotes with spaces, heredocs and
// PowerShell here-strings counts as data, not as a command. Indirection
// (variables as commands, Invoke-Expression, cmd /c, scripts, aliases) is out
// of reach; see README "Grenzen der Erkennung".

const { resolveContext, samePath, normalizeOrg, loginHint, setupHint } = require('./ado-context');

const AZ = String.raw`(?<![\w.$-])az(?:\.cmd|\.exe)?`;
const GLOBAL_FLAGS = String.raw`(?:\s+--?[\w-]+)*`;
const END = String.raw`(?![\w-])`;
const STOP = String.raw`[^;&|\n]*`;
const CMD_START = String.raw`(?:^|[;&|({\n])\s*`;

const RELEVANT = /az|azure_config_dir|ado-login/i;
const LOGIN = new RegExp(String.raw`${AZ}${GLOBAL_FLAGS}\s+(?:login|logout)${END}`, 'i');
const ACCOUNT_SWITCH = new RegExp(String.raw`${AZ}${GLOBAL_FLAGS}\s+account${GLOBAL_FLAGS}\s+(?:set|clear)${END}`, 'i');
const DEVOPS = new RegExp(String.raw`${AZ}${GLOBAL_FLAGS}\s+(?:boards|repos|devops|pipelines|artifacts)${END}`, 'i');
const LOGIN_SCRIPT = new RegExp(
  String.raw`${CMD_START}(?:&\s*)?(?:(?:bash|sh|pwsh|powershell)(?:\.exe)?\s+(?:-[\w-]+\s+)*|\.\s+)?[^\s;&|]*ado-login(?:\.sh|\.ps1)?${END}`,
  'i',
);
const CLEARED_ENV = new RegExp(String.raw`\benv\s+(?:-\S+\s+)*(?:-i|--ignore-environment)\b`, 'i');

const CONFIG_DIR_CHANGES = [
  // NAME=value at command position, also after env and other assignments
  new RegExp(String.raw`${CMD_START}(?:env\s+(?:-\S+\s+)*)?(?:[A-Za-z_]\w*=\S*\s+)*AZURE_CONFIG_DIR\+?=`, 'i'),
  new RegExp(String.raw`\b(?:export|declare|typeset|local|readonly|set)\s+(?:-\w+\s+)*(?:[A-Za-z_]\w*(?:=\S*)?\s+)*AZURE_CONFIG_DIR\+?=`, 'i'),
  /\$\{?env:AZURE_CONFIG_DIR\}?\s*\+?=(?!=)/i,
  new RegExp(String.raw`\bunset\b${STOP}\bAZURE_CONFIG_DIR\b`, 'i'),
  new RegExp(String.raw`\bexport\s+-n\b${STOP}\bAZURE_CONFIG_DIR\b`, 'i'),
  new RegExp(String.raw`\benv\b${STOP}(?:-u\s*|--unset[=\s]+)AZURE_CONFIG_DIR\b`, 'i'),
  new RegExp(
    String.raw`(?<![\w-])(?:Remove-Item|Set-Item|Clear-Item|New-Item|Rename-Item|Move-Item|ri|rm|del|erase|rd|rmdir|si|ni|cli|rni|mi|mv|move)(?![\w-])${STOP}Env:[\\/]?AZURE_CONFIG_DIR\b`,
    'i',
  ),
  new RegExp(String.raw`\bsetx\b${STOP}\bAZURE_CONFIG_DIR\b`, 'i'),
];
// Matched on the raw text, because the variable name sits inside quotes.
const SET_ENVIRONMENT = /SetEnvironmentVariable\s*\(\s*['"]AZURE_CONFIG_DIR['"]/i;

const ORG_ARGUMENT = /(?:^|\s)--org(?:anization)?(?:\s+|=)(?:"([^"]*)"|'([^']*)'|([^\s;|&)]+))/gi;
const ORG_DEFAULT = /(?:^|\s)organization=(?:"([^"]*)"|'([^']*)'|([^\s;|&)]+))/gi;

const ALLOW = Object.freeze({ decision: 'allow' });

function deny(reason) {
  return { decision: 'deny', reason };
}

// Joins continued lines, drops heredoc bodies and here-strings, and replaces
// quoted text: a single token (az, a path) stays as plain text, anything with
// spaces becomes an empty string. Script paths with spaces stay detectable.
function toCode(command) {
  return command
    .replace(/[\\`]\r?\n/g, ' ')
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/@(["'])\r?\n[\s\S]*?\r?\n\1@/g, ' ')
    .replace(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g, (_, double, single) => {
      const text = double ?? single;
      if (/^[\w.:\\/@~+-]+$/.test(text)) return text;
      if (/ado-login\.(?:sh|ps1)$/i.test(text)) return text.replace(/\s/g, '_');
      return '""';
    });
}

function collect(pattern, text) {
  return [...text.matchAll(pattern)].map((m) => m[1] ?? m[2] ?? m[3]);
}

function orgArguments(command) {
  return collect(ORG_ARGUMENT, command);
}

function isVariable(value) {
  return /[$%`]/.test(value);
}

function checkDevopsCall(command, code, cwd, env) {
  if (CLEARED_ENV.test(code)) {
    return deny('Azure-DevOps-Aufruf blockiert: env -i entfernt AZURE_CONFIG_DIR, der Befehl liefe mit der globalen Anmeldung.');
  }
  const context = resolveContext(cwd);
  if (context.result.status === 'missing') {
    return deny(`Azure-DevOps-Aufruf blockiert: .claude/ado.json fehlt in diesem Projekt. ${setupHint()}`);
  }
  if (context.result.status !== 'ok') {
    return deny(`Azure-DevOps-Aufruf blockiert: .claude/ado.json ist ungültig (${context.result.errors.join('; ')}). ${setupHint()}`);
  }
  const current = env.AZURE_CONFIG_DIR;
  if (!samePath(current, context.configDir)) {
    return deny(
      `Azure-DevOps-Aufruf blockiert: AZURE_CONFIG_DIR ist "${current || '(nicht gesetzt)'}", erwartet "${context.configDir}". ` +
        'Eintrag env.AZURE_CONFIG_DIR in .claude/settings.local.json prüfen (Einrichtung) und die Session neu starten.',
    );
  }
  const expected = normalizeOrg(context.result.config.organization);
  const values = [...collect(ORG_ARGUMENT, command), ...collect(ORG_DEFAULT, command)];
  const foreign = values.filter((value) => !isVariable(value) && normalizeOrg(value) !== expected);
  if (foreign.length > 0) {
    return deny(
      `Azure-DevOps-Aufruf blockiert: Organisation "${foreign[0]}" gehört nicht zu diesem Projekt. ` +
        `Erlaubt ist nur "${context.result.config.organization}" aus .claude/ado.json.`,
    );
  }
  return ALLOW;
}

function evaluate({ command, cwd, env = process.env }) {
  if (typeof command !== 'string' || !RELEVANT.test(command)) return ALLOW;
  const code = toCode(command);
  if (LOGIN.test(code) || ACCOUNT_SWITCH.test(code)) {
    return deny(`az login, az logout, az account set und az account clear sind gesperrt, sie würden die Anmeldung des Projekts ändern. ${loginHint()}`);
  }
  if (SET_ENVIRONMENT.test(command) || CONFIG_DIR_CHANGES.some((pattern) => pattern.test(code))) {
    return deny('AZURE_CONFIG_DIR darf nicht gesetzt, überschrieben oder entfernt werden. Der Wert kommt aus .claude/settings.local.json (Einrichtung über ado-cli).');
  }
  if (LOGIN_SCRIPT.test(code)) {
    return deny(`Das Login-Skript startet nur der Nutzer selbst. ${loginHint()}`);
  }
  if (DEVOPS.test(code)) return checkDevopsCall(command, code, cwd, env);
  return ALLOW;
}

module.exports = { evaluate, orgArguments, toCode };
