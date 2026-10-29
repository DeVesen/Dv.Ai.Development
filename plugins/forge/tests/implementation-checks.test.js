'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, commitFile, git } = require('./lib/git-repo');
const { planDiff } = require('../scripts/lib/plan-diff');
const { testFindings } = require('../scripts/implementation-checks');

const SCRIPTS = path.join(__dirname, '..', 'scripts');
const PLAN = [
  '# Demo — Umsetzungsplan', '', '---', '',
  '### Task 1: Summe', '', '**Dateien:**', '- Create: `src/total.js`', '- Create: `tests/total.test.js`', '',
  '### Task 2: Format', '', '**Dateien:**', '- Modify: `src/format.js:1-3` · `format`', '- Test: `tests/format.test.js` · `formats`', '',
].join('\n');

function repoWithPlan() {
  const repo = makeRepo();
  commitFile(repo, 'src/format.js', 'module.exports = 1;\n', 'base');
  commitFile(repo, 'docs/forge/demo/plan.md', PLAN, 'plan');
  const base = git(repo, 'rev-parse', 'HEAD');
  commitFile(repo, 'src/total.js', 'module.exports = 2;\n', 'total');
  commitFile(repo, 'tests/total.test.js', 'test\n', 'test');
  commitFile(repo, 'src/extra.js', 'extra\n', 'extra');
  commitFile(repo, 'docs/forge/demo/umsetzung.md', 'archiv\n', 'archiv');
  return { repo, base, plan: path.join(repo, 'docs/forge/demo/plan.md') };
}

test('planDiff_MissingModifyAndTest_ExtraFileOutsidePlan', () => {
  const { repo, base, plan } = repoWithPlan();
  const result = planDiff(plan, repo, base);
  assert.deepEqual(result.missing.map((file) => `${file.kind} ${file.path} ${file.task}`), ['Modify src/format.js 2', 'Test tests/format.test.js 2']);
  assert.deepEqual(result.extra, ['src/extra.js']);
});

test('cli_WritesSkriptReviewAndAggregateIncludesIt', () => {
  const { repo, base, plan } = repoWithPlan();
  const out = path.join(repo, '.forge', 'w', 'skript.json');
  const run = spawnSync(process.execPath, [path.join(SCRIPTS, 'implementation-checks.js'), '--plan', plan, '--repo', repo, '--base', base, '--out', out], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^SKRIPT befunde=3\nPLANDIFF geplant=4 geaendert=4 fehlt=2 zuviel=1\nFEHLT Modify src\/format.js \(Task 2\)/);
  const review = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(review.findings.map((finding) => `${finding.severity} ${finding.location}`), ['red src/format.js', 'yellow tests/format.test.js', 'yellow src/extra.js']);

  const dir = path.join(repo, '.forge', 'w', 'runde-1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'design.json'), JSON.stringify({ reviewer: 'design', findings: [] }));
  const agg = spawnSync(process.execPath, [path.join(SCRIPTS, 'aggregate-findings.js'), '--dir', dir, '--expect', 'design', '--repo', repo, '--skript', out], { encoding: 'utf8' });
  assert.match(agg.stdout, /^STATUS clean=false red=1 yellow=2 green=0 failed=-/);
});

test('testFindings_RedRunRed_DockerOnlyIgnored', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dv-forge-tl-'));
  const file = path.join(dir, 'p.json');
  fs.writeFileSync(file, JSON.stringify({ head: 'abc', ergebnis: 'rot', laeufe: [{ schluessel: 'Test', befehl: 'npm test', exit: 1, ausgabe: 'a\n2 failing', docker: false }] }));
  assert.deepEqual(testFindings(file).map((finding) => [finding.location, finding.severity, finding.quote]), [['Testlauf', 'red', 'Quelle: npm test → exit 1: 2 failing']]);
  fs.writeFileSync(file, JSON.stringify({ head: 'abc', ergebnis: 'docker', laeufe: [{ schluessel: 'Test', befehl: 'npm test', exit: 1, ausgabe: 'x', docker: true }] }));
  assert.deepEqual(testFindings(file), []);
  assert.deepEqual(testFindings(path.join(dir, 'fehlt.json')), []);
});

test('testFindings_CommandNotStartable_YellowNotRed', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dv-forge-tl-'));
  const file = path.join(dir, 'p.json');
  fs.writeFileSync(file, JSON.stringify({ head: 'abc', ergebnis: 'umgebung', laeufe: [{ schluessel: 'Test', befehl: 'dv-dotnet-test', exit: 1, ausgabe: 'not recognized', docker: false, umgebung: true }] }));
  const findings = testFindings(file);
  assert.deepEqual(findings.map((finding) => [finding.severity, finding.consequence]), [['yellow', 'Test ist nicht gelaufen: Befehl nicht startbar auf abc.']]);
});
