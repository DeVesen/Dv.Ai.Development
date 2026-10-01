'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'setup-check.js');

function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

function run(repo, home) {
  return spawnSync(process.execPath, [SCRIPT, '--cwd', repo], { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: home } });
}

function setup() {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'CLAUDE.md', [
    '# Projekt',
    '| Angular-Tests | `dev-mcp`: `test_angular_project` — niemals via Shell/PowerShell |',
    '| Klasse lesen | `dev-mcp`: `read_method` |',
    '| `build-log-filter` | Docker HTTP |',
    '- Build-Ausgaben immer knapp halten.',
    '| Tests | `dv-forge: dotnet-test` — nie direkt `dotnet test` über die Shell |',
    '- Komponenten mit `scaffold_angular_component` anlegen.',
    '',
    '## dv-forge',
    '- Test: `dv-forge: angular-test --root web`',
    '',
  ].join('\n'));
  write(repo, '.claude/skills/angular/references/op-tooling.md', 'VERBOTEN: `ng build` als Shell-Kommando.\nfind_implementations nutzen.\n');
  write(repo, '.mcp.json', JSON.stringify({ mcpServers: { 'build-log-filter': {}, 'codebase-analyzer': {} } }));
  write(repo, '.claude/settings.json', JSON.stringify({ permissions: { deny: ['Bash(node:*)', 'Bash(rm -rf:*)'] } }));
  write(repo, 'src/App.sln', '');
  write(repo, 'web/angular.json', '{}');
  write(home, 'skills/dev-mcp/SKILL.md', 'Use build_dotnet_solution via dev-mcp.\nAlt: dv-forge: dotnet-lint --path x\n');
  write(home, 'plugins/cache/dv-market/dv-angular/1.0.0/skills/angular-migration/SKILL.md', 'Verify with dv-forge: angular-build --root web.\n');
  write(home, 'plugins/cache/dv-market/dv-angular/1.0.0/README.md', 'dv-forge: angular-build outside skills\n');
  write(home, 'plugins/cache/dv-market/dv-forge/0.6.0/skills/init/SKILL.md', 'dv-forge: dotnet-test\n');
  return { repo, home };
}

test('cli_OldSpellingInClaudeMd_ReportedAsOutdatedWithNewCommand', () => {
  const { repo, home } = setup();
  const result = run(repo, home);
  assert.equal(result.status, 0, result.stderr);
  const out = result.stdout;
  assert.match(out, /### CLAUDE\.md \(\d+ Stellen\)/);
  assert.match(out, /- dv-forge-Schreibweise veraltet · Z\. 6, 10 → durch den neuen Befehl ersetzen \(`dv-dotnet-test`, `dv-angular-test`\)/);
});

test('cli_EverySpellingOfTheSixTools_NamesItsReplacement', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  const tools = ['dotnet-build', 'dotnet-test', 'dotnet-lint', 'angular-build', 'angular-test', 'angular-lint'];
  write(repo, 'CLAUDE.md', tools.map((tool) => `- Befehl: dv-forge: ${tool} --path x`).join('\n'));
  const out = run(repo, home).stdout;
  for (const tool of tools) assert.ok(out.includes(`\`dv-${tool}\``), `${tool} ohne Ersatz`);
});

test('cli_OldRulesAboutMovedTools_AreNoLongerReported', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.doesNotMatch(out, /Build\/Test\/Lint über dev-mcp|Verbot von Build\/Test|build-log-filter|Vorschläge für Build/);
  assert.doesNotMatch(out, /### \.mcp\.json/);
  assert.doesNotMatch(out, /dv-forge-Einstellung zeigt auf ein MCP-Tool/);
});

test('cli_RemainingRules_StillReported', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /- Anlegen über dev-mcp · Z\. 7 → auf `ng generate`/);
  assert.match(out, /- Lese-Tool beim dev-mcp verortet · Z\. 3 → `dev-mcp` durch `codebase-analyzer` ersetzen/);
  assert.match(out, /### \.claude\/skills\/angular\/references\/op-tooling\.md \(1 Stelle\)\n- Tool, das wegfällt · Z\. 2/);
  assert.match(out, /### \.claude\/settings\.json \(1 Stelle\)\n- node über die Shell verboten → .*\(`Bash\(node:\*\)`\)/);
});

test('cli_GlobalSkills_ListedSeparatelyAsSource', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /Global: 2 Stellen in 2 Dateien/);
  assert.match(out, /## Global \(in der Quelle ändern, nicht in der installierten Kopie; Plugins danach mit `\/plugin update`\)\n\n### ~\/\.claude\/skills\/dev-mcp\/SKILL\.md \(1 Stelle\)/);
  assert.match(out, /### ~\/\.claude\/plugins\/cache\/dv-market\/dv-angular\/1\.0\.0\/skills\/angular-migration\/SKILL\.md \(1 Stelle\)/);
  assert.doesNotMatch(out, /dv-forge\/0\.6\.0|README\.md/);
});

test('cli_NewSpelling_IsNotReported', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'CLAUDE.md', '# P\n- Test: dv-dotnet-test --path src/App.sln\n');
  assert.match(run(repo, home).stdout, /Keine Stolperfallen\./);
});

test('cli_CleanProject_NoFindingsAndNoSuggestionsForMovedTools', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'src/App.sln', '');
  const out = run(repo, home).stdout;
  assert.match(out, /Projekt: 0 Stellen/);
  assert.match(out, /Keine Stolperfallen\./);
  assert.doesNotMatch(out, /Vorschläge|dv-dotnet-|dv-angular-|dv-forge: /);
});

test('cli_BadArgs_ExitTwo', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--foo'], { encoding: 'utf8' }).status, 2);
});
