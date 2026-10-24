'use strict';

// Vertrag zwischen Skill-Texten und Skripten: Jeder Skript-Aufruf in einer Markdown-Datei zeigt auf ein
// existierendes Skript, einen bekannten Befehl und bekannte Optionen; Skripte für Orchestratoren stehen in der Allowlist.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const CALL = /node "(?:<PLUGIN>|\$\{CLAUDE_PLUGIN_ROOT\})\/scripts\/([a-z-]+\.js)"([^`\n]*)/g;
const SC_CALL = /<SC> ([a-z-]+)([^`\n]*)/g;
const OPTION = /(?<![\w-])--[a-z][a-z-]*/g;

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

function sourceOf(script) {
  const own = fs.readFileSync(path.join(SCRIPTS, script), 'utf8');
  const libs = fs.readdirSync(path.join(SCRIPTS, 'lib')).map((file) => fs.readFileSync(path.join(SCRIPTS, 'lib', file), 'utf8'));
  return [own, ...libs].join('\n');
}

function calls() {
  const files = ['skills', 'shared', 'agents'].flatMap((dir) => markdownFiles(path.join(ROOT, dir)));
  return files.flatMap((file) => {
    const text = fs.readFileSync(file, 'utf8');
    const direct = [...text.matchAll(CALL)].map((match) => ({ file, script: match[1], rest: match[2] }));
    const chain = [...text.matchAll(SC_CALL)].map((match) => ({ file, script: 'session-chain.js', rest: ` ${match[1]}${match[2]}` }));
    return [...direct, ...chain];
  });
}

function subcommandOf(rest) {
  const first = rest.trim().split(/\s+/)[0] ?? '';
  return /^[a-z][a-z-]*$/.test(first) ? first : null;
}

const ALL = calls();

test('scriptCalls_Found_InSkillsAndShared', () => {
  assert.ok(ALL.length > 50, `nur ${ALL.length} Aufrufe gefunden`);
});

test('scriptCalls_EveryScript_Exists', () => {
  for (const call of ALL) assert.ok(fs.existsSync(path.join(SCRIPTS, call.script)), `${path.relative(ROOT, call.file)}: ${call.script}`);
});

test('scriptCalls_EveryScript_AllowedForGuardedOrchestrator', () => {
  const { ALLOWED_SCRIPTS } = require('../scripts/guard-orchestrator.js');
  for (const call of ALL) {
    // Den Guard rufen Skills direkt auf; setup-check.js läuft nur im Dialog von init, nie unter dem Guard.
    if (['guard-orchestrator.js', 'setup-check.js'].includes(call.script)) continue;
    assert.ok(ALLOWED_SCRIPTS.includes(call.script), `${path.relative(ROOT, call.file)}: ${call.script} fehlt in ALLOWED_SCRIPTS`);
  }
});

test('scriptCalls_EverySubcommand_KnownToScript', () => {
  for (const call of ALL) {
    const sub = subcommandOf(call.rest);
    if (!sub) continue;
    const source = sourceOf(call.script);
    const known = new RegExp(`['"\`]${sub}['"\`]|[{,\\s]${sub}[,}:\\s(]`).test(source);
    assert.ok(known, `${path.relative(ROOT, call.file)}: ${call.script} ${sub} unbekannt`);
  }
});

test('scriptCalls_EveryOption_KnownToScript', () => {
  for (const call of ALL) {
    const source = sourceOf(call.script);
    for (const option of call.rest.match(OPTION) ?? []) {
      assert.ok(source.includes(`'${option}'`) || source.includes(`"${option}"`) || source.includes(`\`${option}`)
        || source.includes(`${option} `) || source.includes(`'${option.slice(2)}'`),
      `${path.relative(ROOT, call.file)}: ${call.script} kennt ${option} nicht`);
    }
  }
});
