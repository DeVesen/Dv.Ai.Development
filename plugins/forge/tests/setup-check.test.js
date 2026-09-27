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
    '',
    '## dv-forge',
    '- Test: `dev-mcp: test_dotnet_solution`',
    '',
  ].join('\n'));
  write(repo, '.claude/skills/angular/references/op-tooling.md', 'VERBOTEN: `ng build` als Shell-Kommando.\nfind_implementations nutzen.\n');
  write(repo, '.mcp.json', JSON.stringify({ mcpServers: { 'build-log-filter': {}, 'codebase-analyzer': {} } }));
  write(repo, '.claude/settings.json', JSON.stringify({ permissions: { deny: ['Bash(node:*)', 'Bash(rm -rf:*)'] } }));
  write(repo, 'src/App.sln', '');
  write(repo, 'web/angular.json', '{}');
  write(home, 'skills/dev-mcp/SKILL.md', 'Use build_dotnet_solution via dev-mcp.\n');
  return { repo, home };
}

test('cli_ProjectWithOldRules_FindingsGroupedPerFile', () => {
  const { repo, home } = setup();
  const result = run(repo, home);
  assert.equal(result.status, 0, result.stderr);
  const out = result.stdout;
  assert.match(out, /### CLAUDE\.md \(4 Stellen\)/);
  assert.match(out, /- Build\/Test\/Lint über dev-mcp · Z\. 2 → auf dv-forge-Skripte umstellen oder streichen \(`dv-forge: angular-test`\)/);
  assert.match(out, /- Lese-Tool beim dev-mcp verortet · Z\. 3 → `dev-mcp` durch `codebase-analyzer` ersetzen/);
  assert.match(out, /- build-log-filter erwähnt · Z\. 4 → streichen/);
  assert.match(out, /- dv-forge-Einstellung zeigt auf ein MCP-Tool → .*\(`Test: dv-forge: dotnet-test`\)/);
  assert.doesNotMatch(out, /Z\. 5\b/, 'harmless build line must not be flagged');
  assert.match(out, /### \.claude\/skills\/angular\/references\/op-tooling\.md \(2 Stellen\)\n- Verbot von Build\/Test über die Shell · Z\. 1/);
  assert.match(out, /- Tool, das wegfällt · Z\. 2/);
  assert.match(out, /### \.mcp\.json \(1 Stelle\)\n- build-log-filter in \.mcp\.json → Eintrag entfernen \(`build-log-filter`\)/);
  assert.match(out, /### \.claude\/settings\.json \(1 Stelle\)\n- node über die Shell verboten → .*\(`Bash\(node:\*\)`\)/);
});

test('cli_GlobalSkills_ListedSeparatelyAsSource', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /Global: 1 Stellen in 1 Dateien/);
  assert.match(out, /## Global \(in der Quelle ändern, nicht in der installierten Kopie\)\n\n### ~\/\.claude\/skills\/dev-mcp\/SKILL\.md \(1 Stelle\)/);
});

test('cli_Platforms_SuggestToolchainCommands', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /- \.NET src\/App\.sln: `dv-forge: dotnet-build --path src\/App\.sln`, `dv-forge: dotnet-test --path src\/App\.sln`/);
  assert.match(out, /- Angular web: `dv-forge: angular-build --root web`/);
});

test('cli_CleanProject_NoFindings', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  const out = run(repo, home).stdout;
  assert.match(out, /Projekt: 0 Stellen/);
  assert.match(out, /Keine Stolperfallen\./);
  assert.match(out, /keine \.sln oder angular\.json gefunden/);
});

test('cli_BadArgs_ExitTwo', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--foo'], { encoding: 'utf8' }).status, 2);
});
