'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, commitFile, git } = require('./lib/git-repo');
const { codeHints } = require('../scripts/lib/code-hints');

function repoWith(files) {
  const repo = makeRepo();
  const base = git(repo, 'rev-parse', 'HEAD');
  for (const [file, content] of Object.entries(files)) commitFile(repo, file, content, `add ${file}`);
  return { repo, base };
}

function places(repo, base) {
  return codeHints(repo, base).map((entry) => `${entry.severity} ${entry.location}`);
}

test('codeHints_EmptyCatchAndCatchReturningEmptyList_YellowAtTheCatchLine', () => {
  // Arrange
  const { repo, base } = repoWith({
    'src/a.js': 'function a() {\n  try {\n    run();\n  } catch (error) {\n  }\n}\n',
    'src/b.ts': 'function b() {\n  try {\n    run();\n  } catch {\n    return [];\n  }\n}\n',
  });

  // Act
  const found = codeHints(repo, base);

  // Assert
  assert.deepEqual(found.map((entry) => `${entry.severity} ${entry.location}`), ['yellow src/a.js:4', 'yellow src/b.ts:4']);
  assert.match(found[0].rationale, /^Skript-Prüfung Code-Hinweis: verschluckter Fehler/);
});

test('codeHints_CatchWithOnlyAComment_CountsAsEmpty', () => {
  const { repo, base } = repoWith({ 'src/a.js': 'try {\n  run();\n} catch (e) {\n  // egal\n}\n' });
  assert.deepEqual(places(repo, base), ['yellow src/a.js:3']);
});

test('codeHints_CSharpEmptyCatch_Found', () => {
  const { repo, base } = repoWith({ 'src/Order.cs': 'class Order {\n  void Run() {\n    try { Go(); }\n    catch (Exception) { }\n  }\n}\n' });
  assert.deepEqual(places(repo, base), ['yellow src/Order.cs:4']);
});

test('codeHints_CatchThatHandlesTheError_NotReported', () => {
  const { repo, base } = repoWith({ 'src/a.js': 'try {\n  run();\n} catch (error) {\n  log(error);\n  throw error;\n}\n' });
  assert.deepEqual(places(repo, base), []);
});

test('codeHints_CatchOutsideTheAddedLines_NotReported', () => {
  // Arrange
  const repo = makeRepo();
  commitFile(repo, 'src/a.js', 'try {\n  run();\n} catch {\n}\n', 'old');
  const base = git(repo, 'rev-parse', 'HEAD');
  commitFile(repo, 'src/a.js', 'try {\n  run();\n} catch {\n}\nconst neu = 1;\n', 'new');

  // Act and Assert
  assert.deepEqual(places(repo, base), []);
});

test('codeHints_FileTypeWithoutCatchSemantics_NotScanned', () => {
  const { repo, base } = repoWith({ 'notes.txt': 'catch {\n}\n', 'src/a.py': 'try:\n  x\nexcept:\n  pass\n' });
  assert.deepEqual(places(repo, base), []);
});

test('codeHints_SecretPatterns_YellowAndTheSecretValueNeverInTheQuote', () => {
  // Arrange
  const { repo, base } = repoWith({
    'src/aws.js': "const key = 'AKIAABCDEFGHIJKLMNOP';\n",
    'src/key.pem': '-----BEGIN RSA PRIVATE KEY-----\nMIIE\n',
    'src/db.js': "const password = 'geheim123';\n",
  });

  // Act
  const found = codeHints(repo, base);

  // Assert
  assert.deepEqual(found.map((entry) => `${entry.location} ${entry.quote}`), ['src/aws.js:1 AKIA', 'src/db.js:1 password = \'', 'src/key.pem:1 -----BEGIN RSA PRIVATE KEY-----']);
  assert.equal(found.some((entry) => /geheim123|ABCDEFGH/.test(JSON.stringify(entry))), false);
  assert.ok(found.every((entry) => entry.severity === 'yellow'));
});

test('codeHints_SecretPatternInTestFileOrDocument_NotReported', () => {
  const { repo, base } = repoWith({ 'tests/db.test.js': "const password = 'x';\n", 'README.md': 'password = "x"\n' });
  assert.deepEqual(places(repo, base), []);
});

test('codeHints_FileGrowingByMoreThan500Lines_YellowExactlyAt501', () => {
  // Arrange
  const lines = (count) => Array.from({ length: count }, (_, index) => `const v${index} = ${index};`).join('\n').concat('\n');
  const { repo, base } = repoWith({ 'src/gross.js': lines(501), 'src/knapp.js': lines(500), 'docs/lang.md': lines(900), 'package-lock.json': lines(900) });

  // Act
  const found = codeHints(repo, base);

  // Assert
  assert.deepEqual(found.map((entry) => entry.location), ['src/gross.js']);
  assert.match(found[0].consequence, /501 Zeilen/);
  assert.equal(found[0].quote, 'const v0 = 0;');
});

test('implementationChecksCli_CodeHints_AreWrittenAsYellowFindingsOfTheSkriptReviewer', () => {
  // Arrange
  const { repo, base } = repoWith({ 'src/a.js': 'try {\n  run();\n} catch {\n}\n', 'docs/forge/x/plan.md': '# Plan\n\n### Task 1: Eins\n\n**Dateien:**\n- Create: `src/a.js`\n' });
  const out = path.join(repo, '.forge', 'skript.json');

  // Act
  const run = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'implementation-checks.js'), '--plan', path.join(repo, 'docs/forge/x/plan.md'), '--repo', repo, '--base', base, '--out', out], { encoding: 'utf8' });

  // Assert
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^SKRIPT befunde=1\n/);
  const review = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(review.findings.map((finding) => [finding.severity, finding.location]), [['yellow', 'src/a.js:3']]);
});
