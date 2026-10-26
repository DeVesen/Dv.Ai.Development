'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan, repoWithRemoteBranch } = require('./lib/git-repo');
const { VALID_SPEC } = require('./lib/spec-fixtures');
const { readState, writeState } = require('../scripts/lib/session-chain-store');
const { storeFiles } = require('../scripts/lib/session-chain-ablage');
const { etappeReport } = require('../scripts/lib/session-chain-report');
const { setState, haltText, holdAt, processFinal, closing, recordCommit } = require('../scripts/lib/session-chain-steps');

const EMPTY = { entscheidungen: [], dateien: [], anhang: [], luecken: [], acOhneTest: [] };

function scratch(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-sc-')), name);
  fs.writeFileSync(file, text);
  return file;
}

function yellow(key, title) {
  return { key, color: 'yellow', title };
}

// Spec-Review-Etappe mit Abschlussbericht und Bericht-Daten in der Ablage, wie ein Orchestrator sie ablegt.
function specReviewEtappe(repo, spec, result, open) {
  const abschluss = scratch('abschluss.md', `# Abschlussbericht\n**Ergebnis:** ${result}\n`);
  storeFiles({ dir: repo, slug: 'x', etappe: 'spec-review', files: [abschluss, scratch('bericht-review.json', JSON.stringify({ format: 2, open, green: [], changes: [] }))], fresh: true });
  return etappeReport({ ...EMPTY, etappe: 'spec-review', slug: 'x', bericht: abschluss }, repo);
}

test('processFinal_SpecReviewReadyWithThreeHints_HoldsAtSpecHaltepunktRecommendingPlanning', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen · 3 kleine Hinweise offen', [yellow('a', 'A'), yellow('b', 'B'), yellow('c', 'C')]);

  // Act
  const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'spec');
  assert.ok(result.text.includes('**Empfehlung:** Planning'));
  for (const title of ['A', 'B', 'C']) assert.ok(result.text.includes(`- 🟡 ${title} · spec-review`), title);
});

test('processFinal_SpecReviewWithoutCommitAndUncommittedSpec_HoldsAndNamesTheSpec', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);

  // Act
  const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit: 'none' }, repo);

  // Assert
  assert.equal(result.ergebnis, 'abweichung');
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes('- docs/forge/x/spec.md ist uncommittet'));
});

test('processFinal_SameFinalTwice_ProcessesItOnce', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);
  processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Act
  const again = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.deepEqual(again, { slug: 'x', ergebnis: 'ok', weiter: 'doppelt', haltepunkt: 'keiner', geprueft: [], text: '' });
  assert.equal(readState(repo, 'x').etappen.length, 1);
});

test('processFinal_SameSessionNewCommit_ProcessesAgain', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);
  processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit: 'none' }, repo);
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');

  // Act
  const again = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.equal(again.haltepunkt, 'spec');
  assert.equal(readState(repo, 'x').etappen.length, 2);
});

// Repo mit Spec in docs/forge/x (Slug x), noch ohne Commit: so liegt sie nach dem Whiteboarding einer Session-Kette.
function uncommittedSpec() {
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, VALID_SPEC);
  return { repo, spec };
}

test('processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill', () => {
  // Arrange
  const { repo, spec } = uncommittedSpec();
  fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec, dateien: [path.join(repo, 'CONTEXT.md')] }, repo);

  // Act
  const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit: 'none', basis: 'main' }, repo);

  // Assert
  assert.equal(result.weiter, 'grill');
  assert.ok(result.geprueft.includes('Whiteboarding ohne eigenen Commit'), result.geprueft.join('\n'));
  const state = readState(repo, 'x');
  assert.equal(state.basis, 'main');
  assert.equal(state.spec, spec.replace(/\\/g, '/'));
  assert.equal(state.dateien[0].etappe, 'whiteboarding');
});

test('processFinal_WhiteboardingWithOwnCommit_HoldsAsDeviation', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  const commit = git(repo, 'rev-parse', '--short', 'HEAD');
  const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec }, repo);

  // Act
  const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit, basis: 'main' }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes(`Whiteboarding meldet Commit ${commit}; in der Session-Kette committet nur die Leit-Session`), result.text);
  assert.ok(result.text.includes('docs/forge/x/spec.md ist schon committet; in der Session-Kette committet nur die Leit-Session'), result.text);
});

// AC-10: Das Review im Whiteboarding legt Abschlussbericht und Bericht-Daten in die Ablage `whiteboarding`; die Berichtsdatei der
// Etappe liegt im selben Ordner, also liest `processFinal` die offenen Punkte von dort in den Zustand.
test('processFinal_WhiteboardingWithTwoYellowAndOneGreen_KeepsAllThreeInState', () => {
  // Arrange
  const { repo, spec } = uncommittedSpec();
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
  const review = scratch('bericht-review.json', JSON.stringify({ format: 2, open: [yellow('a', 'A'), yellow('b', 'B')], green: [{ key: 'c', color: 'green', title: 'C' }], changes: [] }));
  storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });
  const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec, bericht: abschluss }, repo);

  // Act
  processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit: 'none', basis: 'main' }, repo);

  // Assert
  const offen = readState(repo, 'x').offen.map((point) => `${point.farbe} ${point.titel} ${point.herkunft}`);
  assert.deepEqual(offen, ['yellow A whiteboarding', 'yellow B whiteboarding', 'green C whiteboarding']);
});

test('processFinal_UmsetzungReadyButAcWithoutTest_IsShowstopperNamingTheAc', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');
  setState({ slug: 'x', basis: 'main' }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Abschließen\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'umsetzung', slug: 'x', bericht: abschluss, worktree, branch: 'feature/x', pruefung: 'gruen', acOhneTest: ['AC-05'] }, repo);

  // Act
  const result = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht, commit: git(worktree, 'rev-parse', 'HEAD') }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'showstopper');
  assert.ok(result.text.includes('- AC-05 hat keinen beweisenden Test'));
  assert.ok(result.text.includes('[Session](#local_u)'));
});

test('processFinal_UmsetzungIntegrationPointWithoutTestAsYellow_StartsAbschlussAndListsTheYellow', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');
  setState({ slug: 'x', basis: 'main' }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\n');
  storeFiles({ dir: repo, slug: 'x', etappe: 'umsetzung', files: [scratch('bericht-review.json', JSON.stringify({ format: 2, open: [yellow('i', 'Integrationspunkt ohne Test')] }))], fresh: true });
  const bericht = etappeReport({ ...EMPTY, etappe: 'umsetzung', slug: 'x', bericht: abschluss, worktree, branch: 'feature/x', pruefung: 'gruen' }, repo);

  // Act
  const result = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht, commit: git(worktree, 'rev-parse', 'HEAD') }, repo);

  // Assert
  assert.equal(result.weiter, 'abschluss');
  assert.deepEqual(readState(repo, 'x').offen.map((point) => point.titel), ['Integrationspunkt ohne Test']);
});

test('haltText_GoWithoutPlanReview_HasNoResultLine', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const state = setState({ slug: 'x', basis: 'main', spec, plan }, repo);

  // Act
  const text = haltText(state, 'go');

  // Assert
  assert.ok(!text.includes('**Ergebnis:**'));
  assert.ok(text.includes('**Empfehlung:** GO'));
  assert.ok(text.includes(`--base main`));
});

test('haltText_GoAfterBlockedPlanReview_RecommendsPlanNacharbeit', () => {
  // Arrange
  const state = { spec: 's', plan: 'p', basis: 'main', offen: [], etappen: [{ etappe: 'plan-review', ergebnis: '⛔ Noch nicht bereit · 1 Hindernis offen' }] };

  // Act
  const text = haltText(state, 'go');

  // Assert
  assert.ok(text.includes('**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen'));
  assert.ok(text.includes('**Empfehlung:** Plan-Nacharbeit'));
});

test('holdAt_GoOnStateWithOldSpecHalt_OverwritesHaltAndShowsGo', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  writeState(repo, 'x', { halt: 'spec', basis: 'main', spec, plan, offen: [] });

  // Act
  const text = holdAt('x', 'go', repo);

  // Assert
  assert.ok(text.startsWith('# GO-Haltepunkt'));
  assert.equal(readState(repo, 'x').halt, 'go');
});

test('closing_StoppAfterHoldAtGoWithoutFinal_NamesImplementationResume', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  setState({ slug: 'x', basis: 'main', spec, plan }, repo);
  holdAt('x', 'go', repo);

  // Act
  const text = closing('x', true, repo);

  // Assert
  const [specPath, planPath] = [spec, plan].map((file) => path.resolve(file).replace(/\\/g, '/'));
  assert.ok(text.includes(`## Fortsetzen\n/dv-forge:session-orchestrator implementation ${specPath} ${planPath}`));
});

test('closing_StoppAtSpecHaltepunkt_NamesResumeCodewordAndMarksState', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { halt: 'spec', spec: 'C:/r/spec.md', etappen: [], offen: [] });

  // Act
  const text = closing('x', true, repo);

  // Assert
  assert.ok(text.includes('## Fortsetzen\n/dv-forge:session-orchestrator planning C:/r/spec.md'));
  assert.equal(readState(repo, 'x').gestoppt, true);
});

test('recordCommit_LeitSessionCommit_AppearsUnderCheckedInTheFinalReport', () => {
  // Arrange
  const repo = makeRepo();
  writeState(repo, 'x', { etappen: [], offen: [] });

  // Act
  recordCommit('x', { hash: 'abc1234', dateien: ['docs/forge/x/plan.md'] }, 'go', repo);

  // Assert
  const text = closing('x', false, repo);
  assert.ok(text.slice(text.indexOf('## Geprüft'), text.indexOf('## Gemeldet')).includes('- leit-session: Commit abc1234: docs/forge/x/plan.md'));
});

test('processFinal_PlanningWithPlanOfOtherSlug_HoldsNamingBothSlugs', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n\n### Task 1: Eins\n', 'docs: plan y');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss, plan: path.join(repo, 'docs/forge/y/plan.md') }, repo);

  // Act
  const result = processFinal({ etappe: 'planning', session: 'local_p', bericht, commit: 'none' }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes('hat den Slug y, die Kette den Slug x'));
});

test('processFinal_PlanningWithoutPlan_HoldsAsDeviationWithoutGoText', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss }, repo);

  // Act
  const result = processFinal({ etappe: 'planning', session: 'local_p', bericht, commit: 'none' }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes('- Planning meldet keinen Plan (--plan fehlt)'));
  assert.doesNotMatch(result.text, /undefined|GO-Haltepunkt/);
});

test('processFinal_PlanningWithPlanAndSameSlug_HoldsAtGoWithCall', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss, plan }, repo);

  // Act
  const result = processFinal({ etappe: 'planning', session: 'local_p', bericht, commit: 'none' }, repo);

  // Assert
  const [specPath, planPath] = [spec, plan].map((file) => path.resolve(file).replace(/\\/g, '/'));
  assert.equal(result.haltepunkt, 'go');
  assert.ok(result.text.includes(`**Aufruf:** /dv-forge:implementation-orchestrator ${planPath} ${specPath} --base main`));
});

test('processFinal_SameSessionSameCommitNewReportData_ProcessesAgain', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  const commit = commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');
  setState({ slug: 'x', basis: 'main' }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Abschließen\n');
  const report = { ...EMPTY, etappe: 'umsetzung', slug: 'x', bericht: abschluss, worktree, branch: 'feature/x', pruefung: 'gruen' };
  const first = etappeReport({ ...report, acOhneTest: ['AC-05'] }, repo);
  const stopped = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht: first, commit }, repo);
  const second = etappeReport(report, repo);

  // Act
  const again = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht: second, commit }, repo);

  // Assert
  assert.equal(stopped.haltepunkt, 'showstopper');
  assert.equal(again.weiter, 'abschluss');
  assert.equal(readState(repo, 'x').etappen.length, 2);
});

test('processFinal_AbschlussPushedAndWorktreeRemoved_EndsTheChainWithOriginOfChecksAndPoints', () => {
  // Arrange
  const repo = repoWithRemoteBranch();
  git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  const removed = path.join(os.tmpdir(), 'dv-forge-entfernt-gibt-es-nicht');
  writeState(repo, 'x', { etappen: [], offen: [{ farbe: 'yellow', titel: 'Hinweis', key: 'k', herkunft: 'umsetzung' }], basis: 'main' });
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Abgeschlossen\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'abschluss', slug: 'x', bericht: abschluss, branch: 'feature/x', worktree: removed, tests: '12/12' }, repo);

  // Act
  const result = processFinal({ etappe: 'abschluss', session: 'local_a', bericht, commit: 'none' }, repo);

  // Assert
  assert.equal(result.weiter, 'ende');
  assert.equal(result.ergebnis, 'ok');
  const [, checked, rest] = result.text.split(/## Geprüft\n|## Gemeldet\n/);
  assert.ok(result.text.startsWith('# Schlussbericht der Session-Kette x'));
  assert.ok(checked.includes('- abschluss: Branch feature/x hat Upstream origin/feature/x'));
  assert.ok(rest.includes('- abschluss: Ergebnis ✅ Abgeschlossen'));
  assert.ok(rest.includes('- abschluss: Testzahlen 12/12'));
  assert.ok(result.text.includes('- 🟡 Hinweis · umsetzung'));
});

test('processFinal_SpecReviewWithoutResultLine_HoldsAsDeviation', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\nkeine Ergebnis-Zeile\n');
  storeFiles({ dir: repo, slug: 'x', etappe: 'spec-review', files: [abschluss], fresh: true });
  const bericht = etappeReport({ ...EMPTY, etappe: 'spec-review', slug: 'x', bericht: abschluss }, repo);

  // Act
  const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes('- Spec-Review meldet keine Ergebnis-Zeile'));
  assert.ok(result.text.includes('Bei „weiter“: Haltepunkt spec'));
});

test('processFinal_DeviationBeforeGrill_NamesGrillAfterWeiter', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: spec x');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
  const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', slug: 'x', bericht: abschluss, spec }, repo);

  // Act: Whiteboarding meldet einen Commit, obwohl in der Kette nur die Leit-Session committet → Abweichung.
  const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit, basis: 'main' }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'abweichung');
  assert.ok(result.text.includes('Bei „weiter“: Start der Etappe grill.'));
  assert.equal(readState(repo, 'x').naechste, 'grill');
});

test('processFinal_SpecReviewWithRedAndAbort_ListsRedPointAndAbortAtHalt', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen\nIterationen: 8 von 8\nAbbruch: Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.\n');
  storeFiles({ dir: repo, slug: 'x', etappe: 'spec-review', files: [abschluss, scratch('bericht-review.json', JSON.stringify({ format: 2, open: [{ key: 'ac-04', color: 'red', title: 'Grenzwert festlegen' }], green: [], changes: [] }))], fresh: true });
  const bericht = etappeReport({ ...EMPTY, etappe: 'spec-review', slug: 'x', bericht: abschluss }, repo);

  // Act
  const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.equal(result.haltepunkt, 'spec');
  assert.ok(result.text.includes('**Abbruch:** Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.'));
  assert.ok(result.text.includes('- 🔴 Grenzwert festlegen · spec-review'));
  assert.ok(result.text.includes('**Empfehlung:** Spec-Nacharbeit'));
});

test('processFinal_SpecReviewWithAbort_ReturnsAbortForTheEventList', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  setState({ slug: 'x', basis: 'main', spec }, repo);
  const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen\nIterationen: 8 von 8\nAbbruch: Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.\n');
  storeFiles({ dir: repo, slug: 'x', etappe: 'spec-review', files: [abschluss], fresh: true });
  const bericht = etappeReport({ ...EMPTY, etappe: 'spec-review', slug: 'x', bericht: abschluss }, repo);

  // Act
  const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

  // Assert
  assert.equal(result.abbruch, 'Maximum von 8 Iterationen erreicht, 1 × 🔴 offen.');
});
