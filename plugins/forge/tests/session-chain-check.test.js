'use strict';

const { VALID_SPEC } = require('./lib/spec-fixtures');

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { git, commitFile, makeRepo, addWorktree, repoWithPlan, repoWithRemoteBranch } = require('./lib/git-repo');
const { checkFinal } = require('../scripts/lib/session-chain-check');

test('checkFinal_SpecReviewCommitWithOnlyTheSpec_IsChecked', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');

  // Act
  const result = checkFinal('spec-review', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md') });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.deepEqual(result.geprueft, [`Commit ${commit}: docs/forge/x/spec.md`, 'docs/forge/x/spec.md ist committet']);
});

test('checkFinal_SpecReviewWithoutCommitAndUncommittedSpec_NamesTheSpec', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(spec, '# Spec\n');

  // Act
  const result = checkFinal('spec-review', repo, { commit: 'none', spec });

  // Assert
  assert.deepEqual(result.abweichungen, ['docs/forge/x/spec.md ist uncommittet']);
});

test('checkFinal_CommitWithForeignFile_NamesTheFile', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  fs.writeFileSync(path.join(repo, 'fremd.txt'), 'x\n');
  fs.appendFileSync(plan, 'mehr\n');
  git(repo, 'add', 'fremd.txt', 'docs/forge/x/plan.md');
  git(repo, 'commit', '--quiet', '-m', 'docs: plan');
  const commit = git(repo, 'rev-parse', 'HEAD');

  // Act
  const result = checkFinal('plan-review', repo, { commit, spec, plan });

  // Assert
  assert.deepEqual(result.abweichungen, [`Commit ${commit} enthält fremd.txt außerhalb der erwarteten Dateien`]);
});

test('checkFinal_CommitDoesNotExist_IsDeviation', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const result = checkFinal('planning', repo, { commit: 'deadbeef', spec, plan });

  // Assert
  assert.deepEqual(result.abweichungen, ['Commit deadbeef existiert nicht']);
});

test('checkFinal_GrillCommitWithGlossary_AllowsReportedGlossaryFile', () => {
  // Arrange
  const repo = makeRepo();
  fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
  const commit = commitFile(repo, 'docs/forge/x/spec.md', VALID_SPEC, 'docs: spec');

  // Act
  const result = checkFinal('grill', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md'), dateien: [path.join(repo, 'CONTEXT.md')] });

  // Assert
  assert.deepEqual(result.abweichungen, []);
});

test('checkFinal_UmsetzungBranchWithCommitsAndWorktree_IsChecked', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');

  // Act
  const result = checkFinal('umsetzung', repo, { commit: git(worktree, 'rev-parse', 'HEAD'), branch: 'feature/x', basis: 'main', worktree });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.ok(result.geprueft.includes('Branch feature/x: 1 Commits seit main'));
});

test('checkFinal_UmsetzungBranchWithoutCommits_IsDeviation', () => {
  // Arrange
  const repo = makeRepo();
  git(repo, 'branch', 'feature/x');

  // Act
  const result = checkFinal('umsetzung', repo, { commit: 'none', branch: 'feature/x', basis: 'main' });

  // Assert
  assert.deepEqual(result.abweichungen, ['Branch feature/x hat keine Commits seit main']);
});

test('checkFinal_AbschlussPushedAndWorktreeRemoved_IsChecked', () => {
  // Arrange
  const repo = repoWithRemoteBranch();
  git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  const removed = path.join(os.tmpdir(), 'dv-forge-entfernt-gibt-es-nicht');

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree: removed });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.equal(result.geprueft.length, 3);
});

test('checkFinal_AbschlussWithoutUpstream_IsDeviation', () => {
  // Arrange
  const repo = repoWithRemoteBranch();

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x' });

  // Assert
  assert.deepEqual(result.abweichungen, ['Branch feature/x hat keinen Upstream']);
});

test('checkFinal_AbschlussAheadOfUpstreamAndWorktreeLeft_NamesBoth', () => {
  // Arrange
  const repo = repoWithRemoteBranch();
  git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  const worktree = addWorktree(repo, 'feature/y');
  git(repo, 'switch', '--quiet', 'feature/x');
  commitFile(repo, 'src/b.js', 'b\n', 'feat: b');

  // Act
  const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree });

  // Assert
  assert.equal(result.abweichungen.length, 2);
  assert.match(result.abweichungen[0], /hat 1 Commits Vorsprung vor origin\/feature\/x/);
  assert.match(result.abweichungen[1], /besteht noch$/);
});

test('checkFinal_SpecOutsideTheRepository_IsDeviationWithGitMessageInsteadOfChecked', () => {
  // Arrange
  const repo = makeRepo();
  const spec = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-outside-')), 'spec.md');
  fs.writeFileSync(spec, '# Spec\n');

  // Act
  const result = checkFinal('spec-review', repo, { commit: 'none', spec });

  // Assert
  assert.deepEqual(result.geprueft, []);
  assert.equal(result.abweichungen.length, 1);
  assert.match(result.abweichungen[0], /^.*spec\.md konnte nicht geprüft werden: git status --porcelain -- .*outside repository/s);
});

test('checkFinal_PlanningWithoutPlan_IsDeviationNamingTheMissingOption', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const result = checkFinal('planning', repo, { commit: 'none', spec });

  // Assert
  assert.deepEqual(result.abweichungen, ['Planning meldet keinen Plan (--plan fehlt)']);
});

test('checkFinal_PlanningWithPlan_HasNoDeviation', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const result = checkFinal('planning', repo, { commit: 'none', spec, plan });

  // Assert
  assert.deepEqual(result.abweichungen, []);
});

test('checkFinal_GrillSpecWithAcGap_HoldsChain', () => {
  // Arrange
  const repo = makeRepo();
  const commit = commitFile(repo, 'docs/forge/x/spec.md', VALID_SPEC.replace('**AC-02**', '**AC-03**'), 'docs: spec');

  // Act
  const result = checkFinal('grill', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md') });

  // Assert
  assert.deepEqual(result.abweichungen, ['Spec-Format docs/forge/x/spec.md: ac-luecke · AC-03: An Position 2 steht AC-03; AC-IDs laufen lückenlos ab AC-01.']);
});

test('checkFinal_CommitFromOtherBranch_IsDeviation', () => {
  // Arrange
  const repo = makeRepo();
  git(repo, 'switch', '--quiet', '-c', 'seite');
  const commit = commitFile(repo, 'docs/forge/x/spec.md', VALID_SPEC, 'docs: spec');
  git(repo, 'switch', '--quiet', 'main');

  // Act
  const result = checkFinal('spec-review', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md') });

  // Assert
  assert.deepEqual(result.abweichungen.slice(0, 1), [`Commit ${commit} liegt nicht auf HEAD`]);
});

function specCopyFixture(afterText, beforeText = VALID_SPEC) {
  const repo = makeRepo();
  const spec = path.join(repo, 'docs/forge/x/spec.md');
  const copy = path.join(repo, 'spec-vor-grill.md');
  fs.mkdirSync(path.dirname(spec), { recursive: true });
  fs.writeFileSync(copy, beforeText);
  const commit = commitFile(repo, 'docs/forge/x/spec.md', afterText, 'docs: grill spec x');
  return { repo, spec, copy, commit };
}

test('checkFinal_GrillSpecEqualToCopyWithNoChangeReport_IsChecked', () => {
  // Arrange
  const { repo, spec, copy, commit } = specCopyFixture(VALID_SPEC);
  const bericht = path.join(repo, 'bericht.md');
  fs.writeFileSync(bericht, '# Bericht der Etappe grill\nKeine Änderung.\n');

  // Act
  const result = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: [], bericht });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.ok(result.geprueft.includes('Spec gegen grill-Start docs/forge/x/spec.md: W-Einträge, AC-Folge und Kopf unverändert'));
});

test('checkFinal_GrillChangedSpecDespiteNoChangeReport_IsDeviation', () => {
  // Arrange
  const { repo, spec, copy, commit } = specCopyFixture(`${VALID_SPEC}\n`);
  const bericht = path.join(repo, 'bericht.md');
  fs.writeFileSync(bericht, 'Keine Änderung.\n');

  // Act
  const result = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: [], bericht });

  // Assert
  assert.deepEqual(result.abweichungen, ['Spec docs/forge/x/spec.md seit grill-Start: Bericht sagt „Keine Änderung.“, die Spec ist aber geändert']);
});

test('checkFinal_GrillRenumbersAc_IsDeviation', () => {
  // Arrange
  const renumbered = VALID_SPEC.replace('**AC-01**', '**AC-03**');
  const { repo, spec, copy, commit } = specCopyFixture(renumbered);

  // Act
  const result = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: [] });

  // Assert
  assert.ok(result.abweichungen.includes('Spec docs/forge/x/spec.md seit grill-Start: AC verschwunden: AC-01'), result.abweichungen.join('\n'));
});

test('checkFinal_GrillChangesHeadLine_IsDeviation', () => {
  // Arrange
  const { repo, spec, copy, commit } = specCopyFixture(VALID_SPEC.replace('Art: frei', 'Art: verankert'));

  // Act
  const result = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: [] });

  // Assert
  assert.ok(result.abweichungen.includes('Spec docs/forge/x/spec.md seit grill-Start: Kopf geändert: Art'), result.abweichungen.join('\n'));
});

test('checkFinal_GrillDecisionCountDiffers_IsDeviation', () => {
  // Arrange
  const added = `${VALID_SPEC.trimEnd()}\n- **W · Trenner** · Aussage — Semikolon.\n`;
  const { repo, spec, copy, commit } = specCopyFixture(added);

  // Act
  const none = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: [] });
  const one = checkFinal('grill', repo, { commit, spec, specKopie: copy, entscheidungen: ['Trenner'] });

  // Assert
  assert.deepEqual(none.abweichungen, ['Spec docs/forge/x/spec.md seit grill-Start: 1 neue W-Einträge, aber 0 Entscheidungen gemeldet']);
  assert.deepEqual(one.abweichungen, []);
});

test('checkFinal_SpecNacharbeitAddsDecisionWithoutReport_IsNoDeviation', () => {
  // Arrange: Die Zahl der Entscheidungen prüft nur der Grill.
  const added = `${VALID_SPEC.trimEnd()}\n- **W · Trenner** · Aussage — Semikolon.\n`;
  const { repo, spec, copy, commit } = specCopyFixture(added);

  // Act
  const result = checkFinal('spec-nacharbeit', repo, { commit, spec, specKopie: copy, entscheidungen: [] });

  // Assert
  assert.deepEqual(result.abweichungen, []);
});

test('checkFinal_GrillWithoutCopy_SkipsTheComparison', () => {
  // Arrange
  const { repo, spec, commit } = specCopyFixture(VALID_SPEC.replace('CSV.', 'XML.'));

  // Act
  const result = checkFinal('grill', repo, { commit, spec, entscheidungen: [] });

  // Assert
  assert.deepEqual(result.abweichungen, []);
  assert.equal(result.geprueft.some((line) => line.startsWith('Spec gegen')), false);
});
