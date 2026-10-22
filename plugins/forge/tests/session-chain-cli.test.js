'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { readState, writeState } = require('../scripts/lib/session-chain-store');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-chain.js');

function chain(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function scratch(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-cli-')), name);
  fs.writeFileSync(file, text);
  return file;
}

test('entry_UnknownCodeword_ExitsWithTheSixValidCodewords', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'entry', 'review', 'x.md');

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'Unbekanntes Codewort: review. Gültige Codewörter: grill, spec-review, planning, plan-review, implementation, finish.');
  assert.equal(result.stdout, '');
});

test('entry_MissingSpec_ExitsNamingThePath', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'entry', 'grill', 'docs/fehlt.md');

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'Pfad nicht gefunden: docs/fehlt.md');
});

test('entry_SlugWithState_PrintsBaseWithoutQuestionAndTheAdoptedState', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'dev', offen: [{ farbe: 'yellow', titel: 'A', herkunft: 'spec-review' }, { farbe: 'yellow', titel: 'B', herkunft: 'spec-review' }] });

  // Act
  const result = chain(repo, 'entry', 'planning', spec);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^basis=dev$/m);
  assert.doesNotMatch(result.stdout, /frage-basis/);
  const block = result.stdout.slice(result.stdout.indexOf('=== ZUSTAND ==='));
  for (const part of ['**Basis-Branch:** dev', '- 🟡 A · spec-review', '- 🟡 B · spec-review']) assert.ok(block.includes(part), part);
});

test('brief_SlugWithStateDecisionsAndWorkitem_PrintsModelTitleBackgroundAndBrief', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'dev', wi: '311021', spec: spec.replace(/\\/g, '/'), entscheidungen: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] });

  // Act
  const result = chain(repo, 'brief', '--etappe', 'planning', '--slug', 'x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^MODELL=opus\nTITEL=Planning x\n=== HINTERGRUND ===\n/);
  const text = result.stdout.slice(result.stdout.indexOf('=== BRIEF ===\n') + '=== BRIEF ===\n'.length);
  assert.ok(text.startsWith(`/dv-forge:plan-orchestrator ${spec.replace(/\\/g, '/')} 311021`));
  assert.ok(text.includes('- spec-nacharbeit: 500 statt 404, keine Backend-Änderung'));
});

test('brief_EtappeWithoutSpecInState_ExitsNamingTheValue', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { basis: 'dev' });

  // Act
  const result = chain(repo, 'brief', '--etappe', 'planning', '--slug', 'x');

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'Etappe planning: spec fehlt');
});

test('brief_MissingKontext_ExitsWithMessage', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', path.join(repo, 'fehlt.md'));

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr.trim(), /^Kontext nicht lesbar: .+\/fehlt\.md$/);
});

test('set_WithoutBase_WritesStateWithoutBase', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  const result = chain(repo, 'set', '--slug', 'wt-x', '--worktree', worktree);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readState(repo, 'wt-x').basis, undefined);
});

test('turn_ThreeTurnEndsWithoutStatus_PrintsHintOnlyAtTheThird', () => {
  // Arrange
  const repo = makeRepo();
  const turnEnd = scratch('turn.md', 'Zwischenstand ohne Status\n');

  // Act
  const results = [1, 2, 3].map(() => chain(repo, 'turn', '--session', 'local_t', '--etappe', 'spec-review', '--turn-datei', turnEnd));

  // Assert
  assert.deepEqual(results.map((result) => /^AKTION=(\S+)$/m.exec(result.stdout)[1]), ['schweigen', 'schweigen', 'hinweis']);
  assert.ok(!results[1].stdout.includes('=== AUSGABE ==='));
  assert.ok(results[2].stdout.includes('spec-review: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · [Session](#local_t)'));
});

test('turn_FinalStatusLineWithShellCharactersInText_PrintsActionAndFields', () => {
  // Arrange
  const repo = makeRepo();
  const turnEnd = scratch('turn.md', '[grill] STATUS=final · ROT=0 · GELB=1 · COMMIT=none · BERICHT=C:/b.md\nFertig mit "Zitat", $(echo x) und `code`.\n');

  // Act
  const result = chain(repo, 'turn', '--session', 'local_t', '--etappe', 'grill', '--turn-datei', turnEnd);

  // Assert
  assert.ok(result.stdout.startsWith('AKTION=final\nETAPPE=grill\nSTATUS=final\nROT=0\nGELB=1\nCOMMIT=none\nBERICHT=C:/b.md'));
});

test('store_FromWorktreeWithFresh_StoresInTheSharedAblage', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/x');
  const report = scratch('abschluss.md', '# Abschlussbericht\n');

  // Act
  const result = chain(worktree, 'store', '--etappe', 'umsetzung', '--plan', path.join(worktree, 'docs/forge/x/plan.md'), '--neu', '--datei', report);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(ablageDir(repo, 'x', 'umsetzung'), 'abschluss.md')));
});

// Spec-Review-Etappe mit Berichtsdatei über die CLI; Rückgabe: Commit und Pfad der Berichtsdatei.
function specReviewReport(repo) {
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  chain(repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', path.join(repo, 'docs/forge/x/spec.md'));
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
  const bericht = /^BERICHT=(.+)$/m.exec(chain(repo, 'etappe-report', '--etappe', 'spec-review', '--slug', 'x', '--bericht', abschluss).stdout)[1];
  return { commit, bericht };
}

test('etappeReport_AndFinal_HoldAtSpecHaltepunktAfterSpecReview', () => {
  // Arrange
  const repo = makeRepo();
  const { commit, bericht } = specReviewReport(repo);

  // Act
  const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  for (const line of ['SLUG=x', 'ERGEBNIS=ok', 'WEITER=halt', 'HALTEPUNKT=spec']) assert.match(result.stdout, new RegExp(`^${line}$`, 'm'));
  assert.ok(result.stdout.includes('=== AUSGABE ===\n# Spec-Haltepunkt'));
});

test('final_SameFinalTwice_PrintsDoppeltWithoutBlock', () => {
  // Arrange
  const repo = makeRepo();
  const { commit, bericht } = specReviewReport(repo);
  chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

  // Act
  const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^WEITER=doppelt$/m);
  assert.ok(!result.stdout.includes('=== AUSGABE ==='));
});

test('commit_GoOnOtherBranch_ExitsNamingBothBranches', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', { basis: 'dev', spec, plan });
  git(repo, 'switch', '--quiet', '-c', 'feature/x');

  // Act
  const result = chain(repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x');

  // Assert
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'Aktueller Branch feature/x ist nicht der Basis-Branch dev; die Umsetzung startet nicht.');
});

test('commit_GoWithUncommittedPlan_CommitsPlanRecordsItAndPrintsTheCall', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  fs.appendFileSync(plan, 'mehr\n');
  writeState(repo, 'x', { basis: 'main', spec, plan });

  // Act
  const result = chain(repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^COMMIT=\S+ docs\/forge\/x\/plan\.md$/m);
  assert.match(result.stdout, /^AUFRUF=\/dv-forge:implementation-orchestrator .+ --base main$/m);
  assert.equal(readState(repo, 'x').commits[0].anlass, 'go');
});

test('halt_GoFromState_PrintsTheGoHaltepunkt', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', { basis: 'main', spec, plan, offen: [] });

  // Act
  const result = chain(repo, 'halt', '--slug', 'x', '--art', 'go');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.startsWith('=== AUSGABE ===\n# GO-Haltepunkt'));
});

test('schluss_Stopp_PrintsFinalReportWithResumeCodeword', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { halt: 'spec', spec: 'C:/r/spec.md', etappen: [], offen: [] });

  // Act
  const result = chain(repo, 'schluss', '--slug', 'x', '--stopp');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('## Fortsetzen\n/dv-forge:session-orchestrator planning C:/r/spec.md'));
});

test('schluss_StoppAfterHaltGoWithoutFinal_NamesImplementationResume', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  chain(repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', spec, '--plan', plan);
  chain(repo, 'halt', '--slug', 'x', '--art', 'go');

  // Act
  const result = chain(repo, 'schluss', '--slug', 'x', '--stopp');

  // Assert
  const [specPath, planPath] = [spec, plan].map((file) => path.resolve(file).replace(/\\/g, '/'));
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`## Fortsetzen\n/dv-forge:session-orchestrator implementation ${specPath} ${planPath}`));
});

test('run_UnknownOption_ExitsWithUsage', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'final', '--foo', 'x');

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf: node session-chain\.js entry/);
});
