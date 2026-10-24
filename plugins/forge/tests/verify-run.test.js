'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyRun, formatVerify, greenSince, isDocOnly } = require('../scripts/lib/verify-run');
const { makeRepo, commitFile, git } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'verify-run.js');
const NODE = JSON.stringify(process.execPath);
const OK = `${NODE} -e "process.exit(0)"`;
const FAIL = `${NODE} -e "console.log('1 failing'); process.exit(3)"`;
const DOCKER_FAIL = `${NODE} -e "console.log('Could not find a valid Docker environment'); process.exit(1)"`;
const noDocker = () => false;

test('verifyRun_AllGreen_GruenWithHeadAndRuns', () => {
  const repo = makeRepo();
  const result = verifyRun({ repo, config: { Build: OK, Test: `${OK} ; ${OK}`, Lint: '' }, docker: noDocker });
  assert.equal(result.ergebnis, 'gruen');
  assert.equal(result.head, git(repo, 'rev-parse', 'HEAD'));
  assert.deepEqual(result.laeufe.map((run) => `${run.schluessel}:${run.exit}`), ['Build:0', 'Test:0', 'Test:0']);
  assert.deepEqual(result.uebersprungen, [{ schluessel: 'Lint', grund: 'nicht konfiguriert' }]);
});

test('verifyRun_RedBuild_StopsBeforeTest', () => {
  const repo = makeRepo();
  const result = verifyRun({ repo, config: { Build: FAIL, Test: OK, Lint: OK }, docker: noDocker });
  assert.equal(result.ergebnis, 'rot');
  assert.deepEqual(result.laeufe.map((run) => run.schluessel), ['Build']);
  assert.match(result.laeufe[0].ausgabe, /1 failing/);
});

test('verifyRun_NothingConfigured_Keine', () => {
  assert.equal(verifyRun({ repo: makeRepo(), config: { Build: '', Test: '', Lint: '' }, docker: noDocker }).ergebnis, 'keine');
});

test('verifyRun_TestRedOnlyForMissingDocker_DockerAndLintStillRuns', () => {
  const repo = makeRepo();
  const result = verifyRun({ repo, config: { Build: OK, Test: DOCKER_FAIL, Lint: OK }, docker: noDocker });
  assert.equal(result.ergebnis, 'docker');
  assert.deepEqual(result.laeufe.map((run) => run.schluessel), ['Build', 'Test', 'Lint']);
});

test('verifyRun_DockerMarkerButDockerAvailable_Rot', () => {
  const repo = makeRepo();
  assert.equal(verifyRun({ repo, config: { Build: '', Test: DOCKER_FAIL, Lint: '' }, docker: () => true }).ergebnis, 'rot');
});

test('verifyRun_DirtyTree_ListsOpenFiles', () => {
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'neu.txt'), 'x');
  assert.deepEqual(verifyRun({ repo, config: { Build: OK, Test: '', Lint: '' }, docker: noDocker }).offen, ['?? neu.txt']);
});

test('greenSince_GreenRunThenOnlyDocs_SkipsTest', () => {
  const repo = makeRepo();
  const green = git(repo, 'rev-parse', '--short', 'HEAD');
  commitFile(repo, 'docs/notiz.md', 'x', 'docs');
  const report = path.join(repo, 'umsetzung.md');
  fs.writeFileSync(report, `## Stand\n- Stand: ${green}\n- Gesamtlauf: ${green} grün (12 Tests)\n`);
  assert.equal(greenSince(repo, report), green);
  const result = verifyRun({ repo, config: { Build: '', Test: FAIL, Lint: '' }, report, docker: noDocker });
  assert.equal(result.ergebnis, 'keine');
  assert.match(result.uebersprungen.find((entry) => entry.schluessel === 'Test').grund, /Gesamtlauf grün/);
});

test('greenSince_CodeOrSkillChangedOrNoGreenRun_RunsTest', () => {
  const repo = makeRepo();
  const green = git(repo, 'rev-parse', '--short', 'HEAD');
  const report = path.join(repo, 'umsetzung.md');
  fs.writeFileSync(report, `- Gesamtlauf: ${green} grün (1 Test)\n`);
  commitFile(repo, 'skills/x/SKILL.md', 'x', 'skill');
  assert.equal(greenSince(repo, report), null);
  fs.writeFileSync(report, '- Gesamtlauf: keiner\n');
  assert.equal(greenSince(repo, report), null);
  assert.equal(greenSince(repo, path.join(repo, 'fehlt.md')), null);
});

test('isDocOnly_MarkdownOutsideBehaviourDirs', () => {
  assert.equal(isDocOnly('docs/a.md'), true);
  assert.equal(isDocOnly('plugins/forge/skills/a/SKILL.md'), false);
  assert.equal(isDocOnly('agents/x.md'), false);
  assert.equal(isDocOnly('src/a.js'), false);
});

test('formatVerify_RedRun_ShowsOutputTail', () => {
  const text = formatVerify({ head: 'abcdef1234567890', ergebnis: 'rot', offen: [], uebersprungen: [],
    laeufe: [{ schluessel: 'Test', exit: 3, dauerMs: 1200, befehl: 'npm test', ausgabe: '1 failing', docker: false }] }, '/w/p.json');
  assert.equal(text, 'PRUEFUNG ergebnis=rot head=abcdef123456 offen=0 datei=/w/p.json\nLAUF Test exit=3 dauer=1s: npm test\n=== AUSGABE Test ===\n1 failing');
});

test('cli_ReadsConfigFromClaudeMdAndWritesFile', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', `# X\n\n## dv-forge\n- Test: \`${FAIL}\`\n`, 'config');
  const out = path.join(repo, '.forge', 'pruefung.json');
  const result = spawnSync(process.execPath, [SCRIPT, '--repo', repo, '--out', out, '--nur', 'test'], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /^PRUEFUNG ergebnis=rot /);
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).laeufe[0].exit, 3);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--nur', 'x'], { encoding: 'utf8' }).status, 2);
});
