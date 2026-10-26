'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { readState, writeState } = require('../scripts/lib/session-chain-store');
const { storeFiles } = require('../scripts/lib/session-chain-ablage');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-chain.js');

const LEIT = 'local_leit-1';

// `brief` braucht die Kennung der Leit-Session; die Tests geben immer dieselbe mit.
function chain(cwd, ...args) {
  const full = args[0] === 'brief' ? [...args, '--leit', LEIT] : args;
  return spawnSync(process.execPath, [SCRIPT, ...full], { cwd, encoding: 'utf8' });
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
  assert.ok(text.startsWith(`/dv-forge:plan-orchestrator "${spec.replace(/\\/g, '/')}" 311021`));
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

test('turn_InProgress_PrintsExactlyTheRunningLine', () => {
  // Arrange
  const repo = makeRepo();
  const turnEnd = scratch('turn.md', '[grill] STATUS=in-progress · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none\nLäuft.\n');

  // Act
  const result = chain(repo, 'turn', '--session', 'local_t', '--etappe', 'grill', '--turn-datei', turnEnd);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^AKTION=laeuft$/m);
  assert.equal(result.stdout.split('=== AUSGABE ===\n')[1], 'grill: läuft\n');
});

test('reviewStand_Cli_PrintsResultPointsQuestionAndAbschluss', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
  const review = path.join(path.dirname(abschluss), 'bericht-review.json');
  fs.writeFileSync(review, JSON.stringify({ format: 2, open: [{ key: 'y', color: 'yellow', title: 'Gelb' }], green: [], changes: [] }));
  storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });

  // Act
  const result = chain(repo, 'review-stand', '--spec', spec);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  for (const line of ['ERGEBNIS=✅ Bereit zum Planen', 'PUNKTE=1', 'FRAGE=ja']) assert.match(result.stdout, new RegExp(`^${line}$`, 'm'));
  assert.match(result.stdout, /^ABSCHLUSS=.+\/ablage\/whiteboarding\/abschluss\.md$/m);
});

// Spec-Review-Etappe mit Berichtsdatei über die CLI; Rückgabe: Commit und Pfad der Berichtsdatei.
function specReviewReport(repo) {
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  chain(repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', path.join(repo, 'docs/forge/x/spec.md'));
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
  const bericht = /^BERICHT=(.+)$/m.exec(chain(repo, 'etappe-report', '--etappe', 'spec-review', '--slug', 'x', '--inhalt', abschluss).stdout)[1];
  return { commit, bericht };
}

test('etappeReport_AndFinal_HoldAtSpecHaltepunktAfterSpecReview', () => {
  // Arrange
  const repo = makeRepo();
  const { commit, bericht } = specReviewReport(repo);

  // Act
  const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--etappenbericht', bericht, '--commit', commit);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  for (const line of ['SLUG=x', 'ERGEBNIS=ok', 'WEITER=halt', 'HALTEPUNKT=spec']) assert.match(result.stdout, new RegExp(`^${line}$`, 'm'));
  assert.ok(result.stdout.includes('=== AUSGABE ===\n# Spec-Haltepunkt'));
});

test('final_SameFinalTwice_PrintsDoppeltWithoutBlock', () => {
  // Arrange
  const repo = makeRepo();
  const { commit, bericht } = specReviewReport(repo);
  chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--etappenbericht', bericht, '--commit', commit);

  // Act
  const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--etappenbericht', bericht, '--commit', commit);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^WEITER=doppelt$/m);
  assert.ok(!result.stdout.includes('=== AUSGABE ==='));
});

const GO_ANSWER = { halt: 'go', antwort: 'go', zeit: '2026-10-24T00:00:00.000Z' };

test('commit_GoOnOtherBranch_ExitsNamingBothBranches', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', { basis: 'dev', spec, plan, freigabe: GO_ANSWER });
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
  writeState(repo, 'x', { basis: 'main', spec, plan, freigabe: GO_ANSWER });

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
  assert.ok(result.stdout.includes('## Fortsetzen\n/dv-forge:session-orchestrator planning "C:/r/spec.md"'));
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
  assert.ok(result.stdout.includes(`## Fortsetzen\n/dv-forge:session-orchestrator implementation "${specPath}" "${planPath}"`));
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

test('etappeReport_PruefungDatei_DockerCountsGreenAndContradictionFails', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const file = path.join(repo, 'pruefung.json');
  fs.writeFileSync(file, JSON.stringify({ ergebnis: 'docker' }));
  const args = ['etappe-report', '--etappe', 'umsetzung', '--slug', 'x', '--pruefung-datei', file];

  // Act
  const ok = chain(repo, ...args);
  const contradiction = chain(repo, ...args, '--pruefung', 'rot');

  // Assert
  assert.equal(ok.status, 0, ok.stderr);
  const data = JSON.parse(fs.readFileSync(/^BERICHT=(.+)$/m.exec(ok.stdout)[1].replace(/\.md$/, '.json'), 'utf8'));
  assert.equal(data.pruefung, 'gruen');
  assert.equal(contradiction.status, 2);
  assert.match(contradiction.stderr, /--pruefung rot widerspricht --pruefung-datei \(gruen\)/);
});

test('brief_SonnetEtappe_PrintsFixedModelId', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  chain(repo, 'set', '--slug', 'x', '--spec', spec, '--basis', 'main');

  // Act
  const result = chain(repo, 'brief', '--etappe', 'spec-review', '--slug', 'x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^MODELL=sonnet\nMODELL-ID=claude-sonnet-5-5\nTITEL=Spec-Review x\n/);
});

test('brief_WithoutLeit_ExitsWithUsage', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n')], { cwd: repo, encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^--leit fehlt/);
});

test('brief_LeitWithoutLocalPrefix_ExitsWithUsage', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'), '--leit', 'leit; rm'], { cwd: repo, encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^--leit erwartet die Kennung der Leit-Session \(local_…\), nicht leit; rm/);
});

test('brief_LeitWithUnderscoreAndDot_IsAccepted', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'), '--leit', 'local_a_b.c-1'], { cwd: repo, encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('- Leit-Session: local_a_b.c-1'));
});

test('brief_WithLeit_NamesItInTheBrief', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'));

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`- Leit-Session: ${LEIT}`));
});

test('brief_GrillWithOpenPointsInState_ListsThemInTheBrief', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'main', spec: spec.replace(/\\/g, '/'), naechste: 'grill', offen: [{ farbe: 'red', titel: 'Lücke', key: 'l', herkunft: 'whiteboarding' }] });

  // Act
  const result = chain(repo, 'brief', '--etappe', 'grill', '--slug', 'x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('## Offene Punkte aus früheren Etappen\nPrüf sie im Grill mit; sie gelten nicht als beantwortet.\n- 🔴 Lücke · whiteboarding'));
});

for (const [name, option] of [['FormerReportOption', FORMER_REPORT_OPTION], ['FormerAblageOption', FORMER_ABLAGE_OPTION], ['AnyOtherOption', '--gibtesnicht']]) {
  test(`cli_${name}_ExitsWithTwoAndSaysUnknownParameter`, () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', option, 'x', '--commit', 'none');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${option}\\n`));
  });
}

test('cli_OptionWithoutValue_ExitsWithTwoAndNamesTheOption', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const result = chain(repo, 'review-stand', '--spec');

  // Assert
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Wert fehlt: --spec\n/);
});

test('brief_NacharbeitWithoutQuelle_TakesTheLastReviewReportFromState', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'main', spec: spec.replace(/\\/g, '/'), etappen: [{ etappe: 'spec-review', bericht: 'C:/ablage/spec-review/bericht.md' }], halt: null, freigabe: { halt: 'spec', antwort: 'spec-nacharbeit', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const result = chain(repo, 'brief', '--etappe', 'spec-nacharbeit', '--slug', 'x');

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('Lies den Bericht der letzten Review-Etappe: C:/ablage/spec-review/bericht.md.'));
});

test('brief_NacharbeitWithoutQuelleAndWithoutReviewInState_ExitsOneNamingQuelle', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'main', spec: spec.replace(/\\/g, '/'), etappen: [], halt: null, freigabe: { halt: 'spec', antwort: 'spec-nacharbeit', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const result = chain(repo, 'brief', '--etappe', 'spec-nacharbeit', '--slug', 'x');

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /quelle fehlt/);
});
