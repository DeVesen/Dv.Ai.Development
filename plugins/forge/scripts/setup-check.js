#!/usr/bin/env node
'use strict';

// Findet Stolperfallen im Projekt-Setup, die dv-forge ausbremsen: Regeln und Einträge aus der Zeit,
// als Werkzeuge noch über dev-mcp liefen oder umgezogen sind, und die alte Schreibweise "dv-forge: <stack>-<kommando>".
// Build, Test und Lint gehören den Plugins dv-dotnet und dv-angular; dv-forge meldet von ihnen nur die alte Schreibweise.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');

const USAGE = 'Aufruf: node setup-check.js [--cwd <projektordner>]\n';
const SKIPPED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git', '.angular', '.vs', '.forge']);

const SCAFFOLD_TOOLS = /\b(scaffold_angular_component|scaffold_angular_service|scaffold_angular_directive|scaffold_spec_for|create_angular_project|create_dotnet_solution|scaffold_dotnet_project|scaffold_dto|scaffold_api_action|run_ef_migration)\b/;
const MOVED_TOOLS = /\b(read_method|read_signatures_only|read_class_summary|read_component_bundle|analyze_angular_architecture|insert_member|update_imports)\b/;
const DROPPED_TOOLS = { find_implementations: 'codebase-analyzer: find_type_hierarchy', rename_file_with_impact: 'Suche nach dem Dateinamen plus git mv' };
const LEGACY_SPELLING = /\bdv-forge:\s*((?:angular|dotnet)-(?:build|test|lint))\b/g;

class CheckError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new CheckError(`Kein Git-Repo: ${cwd}`);
  return path.resolve(result.stdout.trim());
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// CLAUDE.md, Skills und Agents unter einem Ordner (Projekt: <root>/.claude, global: ~/.claude).
function markdownFiles(claudeMd, claudeDir) {
  const files = [claudeMd];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(dir, entry.name));
    }
  };
  walk(path.join(claudeDir, 'skills'));
  walk(path.join(claudeDir, 'agents'));
  return files.filter((file) => fs.existsSync(file));
}

// Installierte Plugins liegen unter <home>/plugins/cache/<marketplace>/<plugin>/<version>/.
// dv-forge selbst bleibt außen vor.
function pluginFiles(home) {
  const files = [];
  const walk = (dir, inContent) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && !/^(dv-)?forge$/.test(entry.name)) walk(full, inContent || ['skills', 'agents', 'commands'].includes(entry.name));
      } else if (inContent && entry.name.endsWith('.md')) files.push(full);
    }
  };
  const cache = path.join(home, 'plugins', 'cache');
  if (fs.existsSync(cache)) walk(cache, false);
  return files;
}

function globalDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Je Regel: kurze Bezeichnung, warum sie stört, was du vorschlägst.
const RULES = {
  legacyToolchain: { label: 'dv-forge-Schreibweise veraltet', why: 'Die Werkzeuge liegen jetzt in dv-dotnet und dv-angular und heißen dv-<stack>-<kommando>; dv-forge löst die alte Schreibweise nicht mehr auf.', proposal: 'durch den neuen Befehl ersetzen' },
  scaffold: { label: 'Anlegen über dev-mcp', why: 'Anlegen läuft über die Shell, Konventionen stehen in den Skills angular und dotnet.', proposal: 'auf `ng generate`, `dotnet new` bzw. `dotnet ef` umstellen' },
  moved: { label: 'Lese-Tool beim dev-mcp verortet', why: 'Es liegt jetzt im codebase-analyzer.', proposal: '`dev-mcp` durch `codebase-analyzer` ersetzen' },
  dropped: { label: 'Tool, das wegfällt', why: 'find_implementations und rename_file_with_impact gibt es künftig nicht mehr.', proposal: 'find_type_hierarchy bzw. Suche plus `git mv`' },
  denyNode: { label: 'node über die Shell verboten', why: 'Damit laufen die dv-forge-Skripte nicht.', proposal: 'Regel entfernen oder auf konkrete Befehle einschränken' },
};

// Die neuen Befehle der gefundenen alten Schreibweisen: "dv-forge: dotnet-test" → "dv-dotnet-test".
function legacyHints(text) {
  return [...text.matchAll(LEGACY_SPELLING)].map((match) => `dv-${match[1]}`);
}

function markdownFindings(file, label) {
  const findings = [];
  const add = (rule, line, hint) => findings.push({ file: label, rule, line, hint });
  let inConfig = false;
  fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((text, index) => {
    const line = index + 1;
    for (const hint of legacyHints(text)) add('legacyToolchain', line, hint);
    // Der eigene Abschnitt ## dv-forge gehört den Einstellungen, nicht der übrigen Textsuche.
    if (/^#{1,2}\s/.test(text)) inConfig = text.trim() === '## dv-forge';
    if (inConfig) return;
    if (SCAFFOLD_TOOLS.test(text)) add('scaffold', line);
    if (MOVED_TOOLS.test(text) && /dev-mcp/i.test(text)) add('moved', line);
    if (Object.keys(DROPPED_TOOLS).some((tool) => text.includes(tool))) add('dropped', line);
  });
  return findings;
}

function settingsFindings(root) {
  return ['settings.json', 'settings.local.json'].flatMap((name) => {
    const settings = readJson(path.join(root, '.claude', name));
    return (settings?.permissions?.deny ?? []).filter((rule) => /^Bash\(node\b/.test(rule))
      .map((rule) => ({ file: `.claude/${name}`, rule: 'denyNode', line: 0, hint: rule }));
  });
}

function check(cwd) {
  const root = repoRoot(cwd);
  const home = globalDir();
  const project = [
    ...markdownFiles(path.join(root, 'CLAUDE.md'), path.join(root, '.claude'))
      .flatMap((file) => markdownFindings(file, toPosix(path.relative(root, file)))),
    ...settingsFindings(root),
  ];
  const global = path.resolve(home) === path.resolve(root, '.claude') ? [] : markdownFiles(path.join(home, 'CLAUDE.md'), home)
    .concat(pluginFiles(home))
    .flatMap((file) => markdownFindings(file, `~/.claude/${toPosix(path.relative(home, file))}`));
  return { root, project, global };
}

// Je Datei eine Gruppe, je Regel eine Zeile mit allen Fundstellen: eine Entscheidung pro Datei.
function renderGroup(findings) {
  const lines = [];
  const files = [...new Set(findings.map((f) => f.file))];
  for (const file of files) {
    const own = findings.filter((f) => f.file === file);
    lines.push(`### ${file} (${own.length} ${own.length === 1 ? 'Stelle' : 'Stellen'})`);
    for (const rule of [...new Set(own.map((f) => f.rule))]) {
      const hits = own.filter((f) => f.rule === rule);
      const where = hits.some((f) => f.line > 0) ? ` · Z. ${[...new Set(hits.map((f) => f.line))].join(', ')}` : '';
      const hints = [...new Set(hits.map((f) => f.hint).filter(Boolean))];
      lines.push(`- ${RULES[rule].label}${where} → ${RULES[rule].proposal}${hints.length > 0 ? ` (${hints.map((h) => `\`${h}\``).join(', ')})` : ''}`);
    }
    lines.push('');
  }
  return lines;
}

function render({ root, project, global }) {
  const used = [...new Set([...project, ...global].map((f) => f.rule))];
  const lines = [`# Setup-Check: ${toPosix(root)}`, '', `Projekt: ${project.length} Stellen in ${new Set(project.map((f) => f.file)).size} Dateien · Global: ${global.length} Stellen in ${new Set(global.map((f) => f.file)).size} Dateien`, ''];
  if (used.length > 0) lines.push('## Warum', ...used.map((rule) => `- ${RULES[rule].label}: ${RULES[rule].why}`), '');
  lines.push('## Projekt', '', ...(project.length > 0 ? renderGroup(project) : ['Keine Stolperfallen.', '']));
  if (global.length > 0) lines.push('## Global (in der Quelle ändern, nicht in der installierten Kopie; Plugins danach mit `/plugin update`)', '', ...renderGroup(global));
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = process.argv.slice(2);
  if (!(args.length === 0 || (args.length === 2 && args[0] === '--cwd'))) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(render(check(args[1] ?? process.cwd())));
  } catch (error) {
    if (!(error instanceof CheckError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { check, render };
