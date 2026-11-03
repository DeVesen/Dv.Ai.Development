'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate, evaluateRun, stability, keyOf } = require('../scripts/lib/eval-review');
const { writeContext } = require('../scripts/workspace');
const { writeReviewer, flow, readJsonFile } = require('./lib/review-flow-fixture');
const { buildRepo, SLUG, PLAN } = require('./fixtures/implementation/build-repo.js');

const ROOT = path.join(__dirname, '..');
const EVALS = path.join(ROOT, 'evals');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(EVALS, `${name}.json`), 'utf8'));

test('goldenSets_EveryFile_ValidAndFixtureExists', () => {
  const files = fs.readdirSync(EVALS).filter((name) => name.endsWith('.json'));
  assert.equal(files.length, 3);
  for (const file of files) {
    const set = JSON.parse(fs.readFileSync(path.join(EVALS, file), 'utf8'));
    assert.ok(['spec-review', 'plan-review', 'implementation-review'].includes(set.review), file);
    assert.ok(fs.existsSync(path.join(ROOT, set.fixture.split(' ')[0])), set.fixture);
    assert.ok(set.erwartet.some((entry) => entry.pflicht), file);
    const ids = set.erwartet.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, `${file}: doppelte id`);
    for (const entry of set.erwartet) {
      assert.ok(Array.isArray(entry.stellen) && entry.stellen.length > 0, `${file}: ${entry.id}`);
      assert.ok(['yellow', 'red'].includes(entry.minFarbe), `${file}: ${entry.id}`);
    }
  }
});

test('evaluateRun_HitsMissesAndExtras', () => {
  const set = { erwartet: [
    { id: 'a', stellen: ['AC-01'], minFarbe: 'red', pflicht: true },
    { id: 'b', stellen: ['AC-03'], minFarbe: 'yellow', pflicht: true },
  ], erlaubt: ['Titel'] };
  const run = { groups: [{ key: 'ac-1', color: 'red', items: [] }, { key: 'ac-3', color: 'green', items: [] }, { key: 'ac-9', color: 'yellow', items: [] }],
    belege: { x: { belegt: 3, unbelegt: 1 } } };
  const result = evaluateRun(set, run);
  assert.deepEqual([result.recall, result.precision, result.belegquote], [0.5, 0.5, 0.75]);
  assert.deepEqual([result.verfehlt, result.zusatz], [['b'], ['ac-9']]);
});

test('evaluateRun_WrongCategoryOrColor_NoHit', () => {
  const set = { erwartet: [{ id: 'w', stellen: ['AC-04'], kategorien: ['widerspruch'], minFarbe: 'red', pflicht: true }] };
  assert.equal(evaluateRun(set, { groups: [{ key: 'ac-4', color: 'red', items: [{ category: 'detail' }] }] }).recall, 0);
  assert.equal(evaluateRun(set, { groups: [{ key: 'ac-4', color: 'yellow', items: [{ category: 'widerspruch' }] }] }).recall, 0);
  assert.equal(evaluateRun(set, { groups: [{ key: 'ac-4', color: 'red', items: [{ category: 'widerspruch' }] }] }).recall, 1);
});

test('stability_IdenticalAndDisjointRuns', () => {
  assert.equal(stability([{ stellen: ['a', 'b'] }, { stellen: ['a', 'b'] }]), 1);
  assert.equal(stability([{ stellen: ['a'] }, { stellen: ['b'] }]), 0);
  assert.equal(stability([{ stellen: ['a'] }]), null);
});

test('keyOf_FileWithLines_NormalizedLikeAggregation', () => {
  assert.equal(keyOf('src/Order-Total.js:12-14'), 'src/order-total.js');
  assert.equal(keyOf('AC-03'), 'ac-3');
});

// Baseline ohne KI: Was die Skript-Prüfungen allein vom Golden-Set des Plan-Reviews finden.
test('baseline_PlanReviewScriptChecksOnly_FindDependencyPlaceholderAndMissingAc', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-eval-'));
  const doc = path.join(root, 'plan.md');
  const spec = path.join(root, 'spec.md');
  fs.copyFileSync(path.join(ROOT, 'tests/fixtures/plan-review/plan.md'), doc);
  fs.copyFileSync(path.join(ROOT, 'tests/fixtures/plan-review/spec.md'), spec);
  fs.cpSync(path.join(ROOT, 'tests/fixtures/plan-review/repo'), root, { recursive: true });
  const workspace = path.join(root, '.forge', 'ws');
  fs.mkdirSync(workspace, { recursive: true });
  writeContext(workspace, { spec, repo: root });
  const env = { workspace, doc };
  writeReviewer(env, 'coverage', []);
  flow('script-checks', '--review', 'plan-review', '--dir', workspace, '--doc', doc);
  flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', doc, '--expect', 'coverage');
  const result = evaluate(golden('plan-review-flawed'), [readJsonFile(path.join(workspace, 'runde-1', 'einstufung.json'))]);
  assert.ok(result.je[0].treffer.includes('ac-04-fehlt'), JSON.stringify(result.je[0]));
  assert.ok(result.je[0].treffer.includes('rueckwaerts-abhaengigkeit'), JSON.stringify(result.je[0]));
  assert.ok(result.je[0].treffer.includes('platzhalter'), JSON.stringify(result.je[0]));
});

test('baseline_ImplementationChecksOnly_FindMissingTasksRedSuiteAndSwallowedError', () => {
  const repo = buildRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-eval-impl-')), { flawed: true });
  const out = path.join(repo, '.forge', 'skript.json');
  const testlauf = path.join(repo, '.forge', 'testlauf.json');
  spawnSync(process.execPath, [path.join(ROOT, 'scripts/verify-run.js'), '--repo', repo, '--nur', 'test', '--out', testlauf], { encoding: 'utf8' });
  const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/implementation-checks.js'), '--plan', path.join(repo, PLAN), '--repo', repo,
    '--base', `forge-base/${SLUG}`, '--out', out, '--testlauf', testlauf], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const review = JSON.parse(fs.readFileSync(out, 'utf8'));
  const result = evaluateRun(golden('implementation-review-flawed'), { groups: review.findings.map((finding) => ({ location: finding.location, severity: finding.severity })) });
  for (const id of ['format-fehlt', 'laden-fehlt']) assert.ok(result.treffer.includes(id), `${id}: ${JSON.stringify(result)}`);
  const hint = review.findings.find((finding) => finding.location.startsWith('src/order-total.js') && finding.rationale.includes('Code-Hinweis'));
  assert.ok(hint, JSON.stringify(review.findings));
  assert.equal(hint.severity, 'yellow');
  assert.match(hint.rationale, /verschluckter Fehler/);
});

test('cli_ReviewsJsonlFiltersByReviewAndLastN', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-eval-cli-'));
  const file = path.join(dir, 'reviews.jsonl');
  const line = (review, keys) => JSON.stringify({ review, stellen: { runde1: keys.map((key) => ({ key, color: 'red', kategorien: ['widerspruch'] })) } });
  fs.writeFileSync(file, [line('plan-review', ['task 1']), line('spec-review', ['ac-1']), line('spec-review', ['ac-4', 'export'])].join('\n'));
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/eval-review.js'), '--golden', path.join(EVALS, 'spec-review-flawed.json'), '--lauf', file, '--letzte', '2'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^EVAL fall=spec-review-flawed laeufe=2 /);
  assert.match(result.stdout, /stabilitaet=0\.00/);
});
