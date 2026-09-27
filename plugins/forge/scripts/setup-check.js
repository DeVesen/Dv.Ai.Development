#!/usr/bin/env node
'use strict';

// Findet Stolperfallen im Projekt-Setup, die dv-forge ausbremsen: Regeln und Einträge aus der Zeit,
// als Build, Test und Lint über dev-mcp und build-log-filter liefen, oder Tools, die umgezogen sind.
// Die Regeln der Gruppe "toolchain" ziehen später mit den Skripten in forge-dotnet und forge-angular.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseSection } = require('./forge-config');
const { toPosix } = require('./lib/posix');

const USAGE = 'Aufruf: node setup-check.js [--cwd <projektordner>]\n';
const SKIPPED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git', '.angular', '.vs', '.forge']);

const TOOLCHAIN_TOOLS = /\b(test_dotnet_solution|test_angular_project|build_dotnet_solution|build_angular_project|lint_angular_project|run_npm_script|publish_dotnet_project|run_inspectcode)\b/;
const SCAFFOLD_TOOLS = /\b(scaffold_angular_component|scaffold_angular_service|scaffold_angular_directive|scaffold_spec_for|create_angular_project|create_dotnet_solution|scaffold_dotnet_project|scaffold_dto|scaffold_api_action|run_ef_migration)\b/;
const MOVED_TOOLS = /\b(read_method|read_signatures_only|read_class_summary|read_component_bundle|analyze_angular_architecture|insert_member|update_imports)\b/;
const DROPPED_TOOLS = { find_implementations: 'codebase-analyzer: find_type_hierarchy', rename_file_with_impact: 'Suche nach dem Dateinamen plus git mv' };
const SHELL_BAN = /\b(niemals|nie|never|verboten|verbot|kein|keine|nicht|no)\b.*\b(shell|powershell|bash)\b|\b(shell|powershell|bash)\b.*\b(verboten|verbot|niemals|never)\b/i;
const BUILD_WORDS = /\b(test|tests|build|lint|ng|dotnet|npm)\b/i;

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

function globalDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Plattformen des Projekts, für die Vorschläge zu Build, Test und Lint.
function platforms(root) {
  const found = { angular: [], dotnet: [] };
  const walk = (dir, depth) => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(path.join(dir, entry.name), depth + 1);
      } else if (entry.name === 'angular.json') found.angular.push(dir);
      else if (/\.(sln|slnx)$/.test(entry.name)) found.dotnet.push(path.join(dir, entry.name));
    }
  };
  walk(root, 0);
  return found;
}

function toolchainSuggestion(value) {
  const stack = /angular|ng\b|npm/i.test(value) ? 'angular' : 'dotnet';
  const kind = /lint|inspect/i.test(value) ? 'lint' : /test/i.test(value) ? 'test' : 'build';
  return `dv-forge: ${stack}-${kind}`;
}

// Je Regel: kurze Bezeichnung, warum sie stört, was du vorschlägst.
const RULES = {
  toolchain: { label: 'Build/Test/Lint über dev-mcp', why: 'dv-forge nutzt dafür eigene Skripte mit gefilterter Ausgabe.', proposal: 'auf dv-forge-Skripte umstellen oder streichen' },
  shellBan: { label: 'Verbot von Build/Test über die Shell', why: 'Die dv-forge-Skripte laufen über die Shell (`node …`).', proposal: 'Verbot auf direkte Aufrufe (`ng build`, `dotnet test` …) beschränken, dv-forge-Skripte ausnehmen' },
  scaffold: { label: 'Anlegen über dev-mcp', why: 'Anlegen läuft über die Shell, Konventionen stehen in den Skills angular und dotnet.', proposal: 'auf `ng generate`, `dotnet new` bzw. `dotnet ef` umstellen' },
  buildLogFilter: { label: 'build-log-filter erwähnt', why: 'Der Server entfällt; die dv-forge-Skripte filtern selbst.', proposal: 'streichen' },
  moved: { label: 'Lese-Tool beim dev-mcp verortet', why: 'Es liegt jetzt im codebase-analyzer.', proposal: '`dev-mcp` durch `codebase-analyzer` ersetzen' },
  dropped: { label: 'Tool, das wegfällt', why: 'find_implementations und rename_file_with_impact gibt es künftig nicht mehr.', proposal: 'find_type_hierarchy bzw. Suche plus `git mv`' },
  config: { label: 'dv-forge-Einstellung zeigt auf ein MCP-Tool', why: 'Build, Test und Lint laufen über die dv-forge-Skripte.', proposal: 'Wert aus „Vorschläge für Build, Test, Lint“ übernehmen' },
  mcpJson: { label: 'build-log-filter in .mcp.json', why: 'Der Server entfällt.', proposal: 'Eintrag entfernen' },
  denyNode: { label: 'node über die Shell verboten', why: 'Damit laufen die dv-forge-Skripte nicht.', proposal: 'Regel entfernen oder auf konkrete Befehle einschränken' },
};

function markdownFindings(file, label) {
  const findings = [];
  const add = (rule, line, hint) => findings.push({ file: label, rule, line, hint });
  let inConfig = false;
  fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((text, index) => {
    const line = index + 1;
    // Der eigene Abschnitt ## dv-forge gehört der Einstellungs-Regel, nicht der Textsuche.
    if (/^#{1,2}\s/.test(text)) inConfig = text.trim() === '## dv-forge';
    if (inConfig) return;
    const toolchain = TOOLCHAIN_TOOLS.exec(text);
    if (toolchain) add('toolchain', line, toolchainSuggestion(toolchain[1]));
    else if (SHELL_BAN.test(text) && BUILD_WORDS.test(text) && !/dv-forge/i.test(text)) add('shellBan', line);
    if (SCAFFOLD_TOOLS.test(text)) add('scaffold', line);
    if (/build-log-filter/i.test(text)) add('buildLogFilter', line);
    if (MOVED_TOOLS.test(text) && /dev-mcp/i.test(text)) add('moved', line);
    if (Object.keys(DROPPED_TOOLS).some((tool) => text.includes(tool))) add('dropped', line);
  });
  return findings;
}

function configFindings(root) {
  const file = path.join(root, 'CLAUDE.md');
  if (!fs.existsSync(file)) return [];
  const entries = parseSection(fs.readFileSync(file, 'utf8'));
  return ['Build', 'Test', 'Lint'].filter((key) => /mcp/i.test(entries[key] ?? ''))
    .map((key) => ({ file: 'CLAUDE.md', rule: 'config', line: 0, hint: `${key}: ${toolchainSuggestion(`${key} ${entries[key]}`)}` }));
}

function mcpFindings(root) {
  const config = readJson(path.join(root, '.mcp.json'));
  return Object.keys(config?.mcpServers ?? {}).filter((name) => /build-log-filter/i.test(name))
    .map((name) => ({ file: '.mcp.json', rule: 'mcpJson', line: 0, hint: name }));
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
    ...configFindings(root),
    ...mcpFindings(root),
    ...settingsFindings(root),
  ];
  const global = path.resolve(home) === path.resolve(root, '.claude') ? [] : markdownFiles(path.join(home, 'CLAUDE.md'), home)
    .flatMap((file) => markdownFindings(file, `~/.claude/${toPosix(path.relative(home, file))}`));
  return { root, project, global, platforms: platforms(root) };
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

function render({ root, project, global, platforms: found }) {
  const used = [...new Set([...project, ...global].map((f) => f.rule))];
  const lines = [`# Setup-Check: ${toPosix(root)}`, '', `Projekt: ${project.length} Stellen in ${new Set(project.map((f) => f.file)).size} Dateien · Global: ${global.length} Stellen in ${new Set(global.map((f) => f.file)).size} Dateien`, ''];
  if (used.length > 0) lines.push('## Warum', ...used.map((rule) => `- ${RULES[rule].label}: ${RULES[rule].why}`), '');
  lines.push('## Projekt', '', ...(project.length > 0 ? renderGroup(project) : ['Keine Stolperfallen.', '']));
  if (global.length > 0) lines.push('## Global (in der Quelle ändern, nicht in der installierten Kopie)', '', ...renderGroup(global));
  lines.push('## Vorschläge für Build, Test, Lint');
  const relative = (target) => toPosix(path.relative(root, target)) || '.';
  for (const sln of found.dotnet) lines.push(`- .NET ${relative(sln)}: \`dv-forge: dotnet-build --path ${relative(sln)}\`, \`dv-forge: dotnet-test --path ${relative(sln)}\`, \`dv-forge: dotnet-lint --path ${relative(sln)}\``);
  for (const dir of found.angular) lines.push(`- Angular ${relative(dir)}: \`dv-forge: angular-build --root ${relative(dir)}\`, \`dv-forge: angular-test --root ${relative(dir)}\`, \`dv-forge: angular-lint --root ${relative(dir)}\``);
  if (found.dotnet.length === 0 && found.angular.length === 0) lines.push('- keine .sln oder angular.json gefunden: Befehle beim Menschen erfragen');
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

module.exports = { check, render, toolchainSuggestion };
