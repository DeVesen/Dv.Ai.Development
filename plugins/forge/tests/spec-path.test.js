'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, commitFile, git } = require('./lib/git-repo');
const { specPath, today } = require('../scripts/lib/spec-path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'spec-path.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

test('specPath_DefaultTemplate_FillsDateAndSlugAndNamesTheBase', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = specPath({ slug: 'export-csv', datum: '2026-10-25', cwd: repo });

  // Assert
  assert.deepEqual(result, { pfad: 'docs/forge/2026-10-25-export-csv/spec.md', basis: git(repo, 'rev-parse', '--short', 'HEAD') });
});

test('specPath_WithoutDatum_UsesTodayLocal', () => {
  assert.equal(today(new Date(2026, 0, 5)), '2026-01-05');
  const result = specPath({ slug: 'a', cwd: makeRepo(), now: new Date(2026, 11, 31) });
  assert.equal(result.pfad, 'docs/forge/2026-12-31-a/spec.md');
});

test('specPath_TemplateFromClaudeMd_IsUsed', () => {
  // Arrange
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Spec-Ablage: `docs/specs/<slug>/spec.md`\n', 'docs: config');

  // Act
  const result = specPath({ slug: 'x', datum: '2026-10-25', cwd: repo });

  // Assert
  assert.equal(result.pfad, 'docs/specs/x/spec.md');
});

test('cli_ExistingFolder_ExitOneWithNextFreeSlugAsSuggestion', () => {
  // Arrange
  const repo = makeRepo();
  fs.mkdirSync(path.join(repo, 'docs/forge/2026-10-25-x'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'docs/forge/2026-10-25-x-2'), { recursive: true });

  // Act
  const result = run(repo, '--slug', 'x', '--datum', '2026-10-25');

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Der Ort existiert bereits: docs\/forge\/2026-10-25-x\/spec\.md\. Vorschlag für einen anderen Slug: x-3/);
});

test('cli_FreeFolder_PrintsPfadAndBasis', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = run(repo, '--slug', 'neu', '--datum', '2026-10-25');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `PFAD=docs/forge/2026-10-25-neu/spec.md\nBASIS=${git(repo, 'rev-parse', '--short', 'HEAD')}\n`);
});

test('cli_TemplateWithoutOwnFolder_OnlyTheFileCounts', () => {
  // Arrange
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Spec-Ablage: `docs/specs/<slug>.md`\n', 'docs: config');
  const free = run(repo, '--slug', 'a');
  commitFile(repo, 'docs/specs/a.md', '# A\n', 'docs: a');

  // Act
  const taken = run(repo, '--slug', 'a');

  // Assert
  assert.equal(free.status, 0, free.stderr);
  assert.equal(taken.status, 1);
  assert.match(taken.stderr, /Vorschlag für einen anderen Slug: a-2/);
});

test('cli_InvalidSlugOrDate_ExitOne_MissingSlugOrUnknownOption_ExitTwo', () => {
  const repo = makeRepo();
  assert.equal(run(repo, '--slug', '../x').status, 1);
  assert.equal(run(repo, '--slug', 'x', '--datum', 'gestern').status, 1);
  assert.equal(run(repo).status, 2);
  assert.equal(run(repo, '--slug', 'x', '--foo', 'y').status, 2);
});
