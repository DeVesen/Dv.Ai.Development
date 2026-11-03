'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyRun, basisRun, formatVerify, greenSince, isDocOnly, notStartable, overall } = require('../scripts/lib/verify-run');
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

function configRepo(testCommand) {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', `# X\n\n## dv-forge\n- Test: \`${testCommand}\`\n`, 'config');
  return repo;
}

function basisCli(repo, out) {
  return spawnSync(process.execPath, [SCRIPT, '--repo', repo, '--basis', out], { encoding: 'utf8' });
}

function tempOut(name = 'basis-lauf.json') {
  return path.join(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dv-forge-basis-')), name);
}

test('basisRun_FirstRunGreen_OneRunAndNotRed', () => {
  const result = basisRun({ repo: makeRepo(), config: { Test: OK } });
  assert.deepEqual(result.laeufe.map((run) => run.exit), [0]);
  assert.equal(result.beideRot, false);
});

test('basisRun_BothRunsRed_TwoRunsAndRed', () => {
  const result = basisRun({ repo: makeRepo(), config: { Test: FAIL } });
  assert.deepEqual(result.laeufe.map((run) => run.exit), [3, 3]);
  assert.equal(result.beideRot, true);
  assert.match(result.laeufe[1].ausgabe, /1 failing/);
});

test('basisRun_FlakyFirstRedThenGreen_NotRed', () => {
  // Arrange: Der Befehl scheitert beim ersten Aufruf und besteht beim zweiten (Zählerdatei im Repo).
  const repo = makeRepo();
  const flaky = `${NODE} -e "const fs=require('fs');const f='zaehler.txt';const n=fs.existsSync(f)?1:0;fs.writeFileSync(f,'x');process.exit(n===0?1:0)"`;

  // Act
  const result = basisRun({ repo, config: { Test: flaky } });

  // Assert
  assert.deepEqual(result.laeufe.map((run) => run.exit), [1, 0]);
  assert.equal(result.beideRot, false);
});

test('basisRun_NoTestConfigured_NoRunsAndNotRed', () => {
  assert.deepEqual(basisRun({ repo: makeRepo(), config: { Test: '' } }), { laeufe: [], beideRot: false });
});

test('basisRun_LongOutput_KeepsTheWholeOutputNotOnlyTheTail', () => {
  const long = `${NODE} -e "for (let i = 1; i <= 100; i++) console.log('zeile ' + i); process.exit(1)"`;
  const result = basisRun({ repo: makeRepo(), config: { Test: long } });
  assert.ok(result.laeufe[0].ausgabe.startsWith('zeile 1\n'));
  assert.ok(result.laeufe[0].ausgabe.includes('zeile 100'));
});

test('basisRun_SeveralTestCommands_StopsAtTheFirstRedOneAndKeepsBothOutputs', () => {
  const first = `${NODE} -e "console.log('eins')"`;
  const second = `${NODE} -e "console.log('zwei'); process.exit(2)"`;
  const third = `${NODE} -e "console.log('drei')"`;
  const result = basisRun({ repo: makeRepo(), config: { Test: `${first} ; ${second} ; ${third}` } });
  assert.equal(result.laeufe[0].exit, 2);
  assert.match(result.laeufe[0].ausgabe, /eins[\s\S]*zwei/);
  assert.equal(result.laeufe[0].ausgabe.includes('drei'), false);
});

test('verifyRun_RunsKeepOnlyTheTailNotTheFullOutput', () => {
  const result = verifyRun({ repo: makeRepo(), config: { Build: '', Test: OK, Lint: '' }, docker: noDocker });
  assert.equal('voll' in result.laeufe[0], false);
});

test('cli_BasisBothRed_PrintsRotJaAndWritesBothOutputsWithoutBasisRotFile', () => {
  // Arrange
  const repo = configRepo(FAIL);
  const out = tempOut();

  // Act
  const result = basisCli(repo, out);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'BASIS rot=ja\n');
  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual([data.beideRot, data.laeufe.map((run) => run.exit)], [true, [3, 3]]);
  assert.equal(fs.existsSync(path.join(path.dirname(out), 'basis-rot.md')), false);
});

test('cli_BasisGreen_PrintsRotNeinAndWritesBasisRotKeine', () => {
  // Arrange
  const repo = configRepo(OK);
  const out = tempOut();

  // Act
  const result = basisCli(repo, out);

  // Assert
  assert.equal(result.stdout, 'BASIS rot=nein\n');
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).laeufe.map((run) => run.exit), [0]);
  assert.equal(fs.readFileSync(path.join(path.dirname(out), 'basis-rot.md'), 'utf8'), 'keine\n');
});

test('cli_BasisWithOtherSelectionOptions_ExitTwo', () => {
  const repo = makeRepo();
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--repo', repo, '--basis', tempOut(), '--nur', 'test'], { encoding: 'utf8' }).status, 2);
});

const MISSING = 'dv-forge-gibt-es-nicht';

test('verifyRun_CommandNotFound_UmgebungNotRotAndStops', () => {
  const repo = makeRepo();
  const result = verifyRun({ repo, config: { Build: `${MISSING} --path x.sln`, Test: OK, Lint: '' }, docker: noDocker });
  assert.equal(result.ergebnis, 'umgebung');
  assert.deepEqual(result.laeufe.map((run) => `${run.schluessel}:${run.umgebung}`), ['Build:true']);
});

test('notStartable_ExitOrMessageOfMissingCommand_TrueOtherwiseFalse', () => {
  const command = `${MISSING} --path x.sln`;
  assert.equal(notStartable(command, 127, ''), true);
  assert.equal(notStartable(command, 9009, ''), true);
  assert.equal(notStartable(command, 1, `'${MISSING}' is not recognized as an internal or external command,`), true);
  assert.equal(notStartable(command, 1, `Der Befehl "${MISSING}" ist entweder falsch geschrieben oder\nkonnte nicht gefunden werden.`), true);
  assert.equal(notStartable(command, 1, `"${MISSING}" wird nicht als interner oder externer Befehl erkannt.`), true);
  assert.equal(notStartable(command, 1, `/bin/sh: 1: ${MISSING}: not found`), true);
  assert.equal(notStartable(command, 1, `bash: ${MISSING}: command not found`), true);
  assert.equal(notStartable(command, 1, '1 failing\nbash: jest: command not found'), false);
  assert.equal(notStartable(command, 0, `'${MISSING}' is not recognized`), false);
});

test('overall_RedAndNotStartable_RotWins', () => {
  const runs = [{ schluessel: 'Build', exit: 1, umgebung: true }, { schluessel: 'Test', exit: 3, umgebung: false }];
  assert.equal(overall(runs, noDocker), 'rot');
  assert.equal(overall(runs.slice(0, 1), noDocker), 'umgebung');
});

test('formatVerify_NotStartable_NamesCommand', () => {
  const text = formatVerify({ head: 'abcdef1234567890', ergebnis: 'umgebung', offen: [], uebersprungen: [],
    laeufe: [{ schluessel: 'Build', exit: 1, dauerMs: 10, befehl: 'dv-dotnet-build --path a.sln', ausgabe: 'x', docker: false, umgebung: true }] });
  assert.equal(text, 'PRUEFUNG ergebnis=umgebung head=abcdef123456 offen=0\nLAUF Build exit=1 dauer=0s umgebung: dv-dotnet-build --path a.sln\nUMGEBUNG Befehl dv-dotnet-build nicht startbar\n=== AUSGABE Build ===\nx');
});

test('cli_CommandNotFound_PrintsUmgebungAndExitsZero', () => {
  const repo = configRepo(MISSING);
  const result = spawnSync(process.execPath, [SCRIPT, '--repo', repo, '--nur', 'test'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^PRUEFUNG ergebnis=umgebung /);
  assert.match(result.stdout, new RegExp(`^UMGEBUNG Befehl ${MISSING} nicht startbar$`, 'm'));
});
