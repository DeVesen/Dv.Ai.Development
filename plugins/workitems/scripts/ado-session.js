#!/usr/bin/env node
'use strict';

// SessionStart hook: tells the session which Azure DevOps project it belongs to
// and warns when AZURE_CONFIG_DIR does not point at the project's config folder.
// Silent in projects without .claude/ado.json.

const { resolveContext, samePath, setupHint } = require('./lib/ado-context');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function sessionMessage(cwd, env) {
  const context = resolveContext(cwd);
  if (context.result.status === 'missing') return null;
  if (context.result.status !== 'ok') {
    return `Azure DevOps: .claude/ado.json ist ungültig (${context.result.errors.join('; ')}). ${setupHint()}`;
  }
  const { organization, project } = context.result.config;
  const base = `Azure DevOps dieses Projekts: ${organization}, Projekt "${project}". Jeder Zugriff läuft über den Skill ado-cli.`;
  if (samePath(env.AZURE_CONFIG_DIR, context.configDir)) return base;
  return (
    `${base} WARNUNG: AZURE_CONFIG_DIR ist "${env.AZURE_CONFIG_DIR || '(nicht gesetzt)'}", erwartet "${context.configDir}". ` +
    'Azure-DevOps-Befehle werden blockiert, bis env.AZURE_CONFIG_DIR in .claude/settings.local.json stimmt und die Session neu gestartet ist.'
  );
}

async function main() {
  let input = {};
  try {
    input = JSON.parse((await readStdin()) || '{}');
  } catch {
    input = {};
  }
  const message = sessionMessage(input.cwd || process.cwd(), process.env);
  if (!message) return;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message } }),
  );
}

if (require.main === module) {
  main().catch((error) => process.stderr.write(`ado-session: ${error.message}\n`));
}

module.exports = { sessionMessage };
