'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
const { toPosix } = require('../scripts/lib/posix');
const { writeState } = require('../scripts/lib/session-chain-store');
const { EntryError, analyseEntry } = require('../scripts/lib/session-chain-entry');

function useWorkitems(repo) {
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n- Workitem: AB#<nr>\n', 'docs: config');
}

test('analyseEntry_WithoutCodeword_StartsWhiteboardingAndAsksForBase', () => {
  // Arrange
  const repo = makeRepo();

  // Act
  const { fields } = analyseEntry([], repo);

  // Assert
  assert.deepEqual(fields, { einstieg: 'ohne', etappe: 'whiteboarding', zustand: 'neu', 'basis-vorschlag': 'main', 'frage-basis': 'ja' });
});

test('analyseEntry_EachCodeword_NamesItsFirstEtappe', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const etappen = [['grill', spec], ['spec-review', spec], ['planning', spec], ['plan-review', spec, plan], ['implementation', spec, plan], ['finish', repo]]
    .map((args) => analyseEntry(args, repo).fields.etappe);

  // Assert
  assert.deepEqual(etappen, ['grill', 'spec-review', 'planning', 'plan-review', 'go', 'abschluss']);
});

test('analyseEntry_PlanReview_NamesAbsoluteSpecPlanAndSlug', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();

  // Act
  const { fields } = analyseEntry(['plan-review', spec, plan], repo);

  // Assert
  assert.equal(fields.spec, toPosix(path.resolve(spec)));
  assert.equal(fields.plan, toPosix(path.resolve(plan)));
  assert.equal(fields.slug, 'x');
});

test('analyseEntry_PathMissing_ThrowsNamingThePath', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.throws(() => analyseEntry(['spec-review', 'docs/fehlt/spec.md'], repo), (error) => error instanceof EntryError && error.message === 'Pfad nicht gefunden: docs/fehlt/spec.md');
});

test('analyseEntry_UnknownCodeword_ThrowsNamingTheSixCodewords', () => {
  // Arrange
  const repo = makeRepo();

  // Act & Assert
  assert.throws(() => analyseEntry(['review', 'x.md'], repo), (error) => error instanceof EntryError
    && error.message === 'Unbekanntes Codewort: review. Gültige Codewörter: grill, spec-review, planning, plan-review, implementation, finish.');
});

test('analyseEntry_SpecWithWorkitemInHeader_TakesItWithoutQuestion', () => {
  // Arrange
  const repo = makeRepo();
  useWorkitems(repo);
  commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n\nStatus: bestätigt\nWorkitem: 311021\n', 'docs: spec');

  // Act
  const { fields } = analyseEntry(['spec-review', path.join(repo, 'docs/forge/x/spec.md')], repo);

  // Assert
  assert.equal(fields.wi, '311021');
  assert.equal(fields['frage-wi'], undefined);
});

test('analyseEntry_ProjectWithWorkitemsAndSpecWithout_AsksOnce', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  useWorkitems(repo);

  // Act
  const { fields } = analyseEntry(['planning', spec], repo);

  // Assert
  assert.equal(fields['frage-wi'], 'ja');
  assert.equal(fields.wi, undefined);
});

test('analyseEntry_ProjectWithoutWorkitems_NeitherAsksNorNamesOne', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const { fields } = analyseEntry(['planning', spec], repo);

  // Assert
  assert.equal(fields['frage-wi'], undefined);
  assert.equal(fields.wi, undefined);
});

test('analyseEntry_WorkitemFromCall_IsTaken', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  useWorkitems(repo);

  // Act
  const { fields } = analyseEntry(['planning', spec, '311021'], repo);

  // Assert
  assert.equal(fields.wi, '311021');
});

test('analyseEntry_StateWithBase_TakesBaseAndDoesNotAsk', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  writeState(repo, 'x', { basis: 'dev', offen: [] });

  // Act
  const { fields, state } = analyseEntry(['spec-review', spec], repo);

  // Assert
  assert.equal(fields.zustand, 'vorhanden');
  assert.equal(fields.basis, 'dev');
  assert.equal(fields['frage-basis'], undefined);
  assert.equal(state.basis, 'dev');
});

test('analyseEntry_StateWrittenInWorktreeAndNewSessionInMainCheckout_TakesTheState', () => {
  // Arrange
  const { repo, spec, plan } = repoWithPlan();
  const worktree = addWorktree(repo, 'feature/x');
  writeState(worktree, 'x', { basis: 'dev', entscheidungen: [{ etappe: 'spec-nacharbeit', text: 'nur CSV' }], offen: [{ farbe: 'yellow', titel: 'A', herkunft: 'spec-review' }] });

  // Act
  const { state } = analyseEntry(['implementation', spec, plan], repo);

  // Assert
  assert.equal(state.basis, 'dev');
  assert.equal(state.entscheidungen[0].text, 'nur CSV');
  assert.equal(state.offen.length, 1);
});

test('analyseEntry_FinishWithoutState_NeitherAsksForBaseNorNeedsState', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');

  // Act
  const { fields } = analyseEntry(['finish', worktree], repo);

  // Assert
  assert.equal(fields['frage-basis'], undefined);
  assert.equal(fields.zustand, 'neu');
  assert.equal(fields.slug, path.basename(worktree));
  assert.equal(fields.worktree, toPosix(path.resolve(worktree)));
});

test('analyseEntry_FinishWithState_TakesTheSlugOfTheState', () => {
  // Arrange
  const repo = makeRepo();
  const worktree = addWorktree(repo, 'feature/x');
  writeState(repo, 'x', { worktree: toPosix(worktree), basis: 'main' });

  // Act
  const { fields } = analyseEntry(['finish', worktree], repo);

  // Assert
  assert.equal(fields.slug, 'x');
  assert.equal(fields.zustand, 'vorhanden');
});

test('analyseEntry_TooManyArguments_ThrowsWithTheExpectedForm', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act & Assert
  assert.throws(() => analyseEntry(['grill', spec, '1', '2'], repo), /grill braucht: <spec> \[workitem-nr\]/);
});

test('analyseEntry_SpecAndPlanWithDifferentSlugs_ThrowsNamingBoth', () => {
  // Arrange
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: spec');
  commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n\n### Task 1: Eins\n', 'docs: plan');

  // Act & Assert
  assert.throws(() => analyseEntry(['plan-review', path.join(repo, 'docs/forge/x/spec.md'), path.join(repo, 'docs/forge/y/plan.md')], repo),
    (error) => error instanceof EntryError && error.message === 'Spec und Plan haben verschiedene Slugs (x / y); lege beide in denselben Ordner als spec.md und plan.md.');
});

test('analyseEntry_ProjectWithEmptyWorkitemSetting_NeitherAsksNorNamesOne', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n- Workitem:\n', 'docs: config');

  // Act
  const { fields } = analyseEntry(['planning', spec], repo);

  // Assert
  assert.equal(fields['frage-wi'], undefined);
  assert.equal(fields.wi, undefined);
});
