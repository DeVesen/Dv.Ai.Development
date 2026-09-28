'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'prepare.js');
const PLAN = '# Demo — Umsetzungsplan\n\n**Ziel:** Demo.\n\n---\n\n### Task 1: Eins\n\nText.\n';

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function values(result) {
  const entries = {};
  for (const line of result.stdout.trim().split('\n')) {
    const index = line.indexOf('=');
    const key = line.slice(0, index);
    entries[key] = entries[key] === undefined ? line.slice(index + 1) : [].concat(entries[key], line.slice(index + 1));
  }
  return entries;
}

function planRepo(plan = PLAN, withSpec = true) {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/plan.md', plan, 'plan');
  if (withSpec) commitFile(repo, 'docs/forge/demo/spec.md', '# Spec\n', 'spec');
  return repo;
}

test('planReview_SpecBesidePlan_ResolvedWithForwardSlashes', () => {
  const repo = planRepo();
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.ok(samePath(out.S, path.join(repo, 'docs/forge/demo/spec.md')));
  assert.ok(samePath(out.R, repo));
  assert.equal(out.N, '3');
  assert.doesNotMatch(result.stdout, /\\/);
});

test('planReview_SpecLineInHeader_WinsOverSpecBeside', () => {
  const repo = planRepo(PLAN.replace('**Ziel:** Demo.', '**Ziel:** Demo.\n**Spec:** `docs/specs/other.md`'));
  commitFile(repo, 'docs/specs/other.md', '# Other\n', 'other spec');
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md'));
  assert.ok(samePath(out.S, path.join(repo, 'docs/specs/other.md')));
});

test('planReview_ExplicitSpec_WinsOverHeader', () => {
  const repo = planRepo(PLAN.replace('**Ziel:** Demo.', '**Spec:** docs/forge/demo/spec.md'));
  commitFile(repo, 'explicit.md', '# E\n', 'explicit');
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md', 'explicit.md', '--rounds', '5'));
  assert.ok(samePath(out.S, path.join(repo, 'explicit.md')));
  assert.equal(out.N, '5');
});

test('planReview_NoSpec_AbortsWithCandidates', () => {
  const repo = planRepo(PLAN, false);
  commitFile(repo, 'docs/forge/demo/anforderung.md', '# A\n', 'candidate');
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Spec nicht gefunden\. Kandidaten: .*docs\/forge\/demo\/anforderung\.md/);
  assert.match(result.stderr, /Spec als zweites Argument angeben/);
});

test('planReview_HeaderSpecMissing_NamesItAndAborts', () => {
  const repo = planRepo(PLAN.replace('**Ziel:** Demo.', '**Spec:** gibt/es/nicht.md'));
  const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Spec aus dem Plan-Kopf nicht gefunden: gibt\/es\/nicht\.md/);
});

test('specReview_SpecAndSource_ExistenceChecked', () => {
  const repo = planRepo();
  const ok = values(run(repo, 'spec-review', '@docs/forge/demo/spec.md'));
  assert.ok(samePath(ok.S, path.join(repo, 'docs/forge/demo/spec.md')));
  assert.equal(ok.Q, undefined);
  const missing = run(repo, 'spec-review', 'docs/forge/demo/spec.md', 'fehlt.md');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Quelle nicht gefunden/);
});

test('implementation_ReturnsPlanSpecRootSlug', () => {
  const repo = planRepo();
  const out = values(run(repo, 'implementation', 'docs/forge/demo/plan.md'));
  assert.equal(out.slug, 'demo');
  assert.ok(samePath(out.P, path.join(repo, 'docs/forge/demo/plan.md')));
});

test('implementationReview_SecondArgumentIsSpec_NotIgnored', () => {
  const repo = planRepo();
  commitFile(repo, 'andere-spec.md', '# A\n', 'spec 2');
  git(repo, 'tag', 'forge-base/demo', 'HEAD~1');
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', 'andere-spec.md'));
  assert.ok(samePath(out.S, path.join(repo, 'andere-spec.md')));
  assert.equal(out.B, 'forge-base/demo');
  assert.ok(fs.existsSync(out.K));
  assert.equal(out.N, '0');
  const conflict = run(repo, 'implementation-review', 'docs/forge/demo/plan.md', 'andere-spec.md', '--spec', 'docs/forge/demo/spec.md');
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /Zwei verschiedene Specs/);
});

test('implementationReview_CommitsAfterReportState_WarnsExceptReportItself', () => {
  const repo = planRepo();
  const stand = git(repo, 'rev-parse', '--short', commitFile(repo, 'src/a.ts', 'a\n', 'feat: a'));
  commitFile(repo, 'docs/forge/demo/umsetzung.md', `# Umsetzung\n\n## Stand\n- Stand: ${stand}\n- Gesamtlauf: keiner\n`, 'docs: report');
  const clean = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~2'));
  assert.equal(clean.WARN, undefined);
  commitFile(repo, 'src/b.ts', 'b\n', 'refactor: share helper');
  const late = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~3'));
  assert.match([].concat(late.WARN).join('\n'), /nach dem Umsetzungsbericht \(Stand .+\): .*refactor: share helper/);
});

test('implementationReview_ConfiguredTestCommand_IsListedRaw', () => {
  const repo = planRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Test: dv-forge: angular-test --root src/frontend\n', 'config');
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~1'));
  assert.equal(out.Test, 'dv-forge: angular-test --root src/frontend');
});

test('implementationReview_ContextFilesListed', () => {
  const repo = planRepo();
  commitFile(repo, 'a.md', 'a\n', 'a');
  const out = values(run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~1', '--context', 'a.md', '--context', 'README.md'));
  assert.equal(out.C.length, 2);
});

test('implementationReview_WorktreeConfiguredButWrongBranch_Aborts', () => {
  const repo = planRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Worktree: ja\n', 'config');
  const result = run(repo, 'implementation-review', 'docs/forge/demo/plan.md', '--base', 'HEAD~1');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Falscher Ort: erwartet Branch feature\/demo/);
});

test('cli_BadArguments_ExitWithTwo', () => {
  const repo = planRepo();
  assert.equal(run(repo, 'unbekannt', 'x').status, 2);
  assert.equal(run(repo, 'plan-review').status, 2);
  assert.equal(run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--base', 'x').status, 2);
  assert.equal(run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--rounds', 'drei').status, 2);
});

test('specReview_ProfilesFound_WritesIndexAndWarnsOnDuplicates', () => {
  const repo = planRepo();
  commitFile(repo, 'docs/glossary/domain-terms.md', '# Fachbegriffe\n\nKunde heißt Auftraggeber.\n', 'glossary');
  commitFile(repo, 'docs/application/orders/domain-terms.md', '# Begriffe Bestellung\n\nAnders.\n', 'profile');
  const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md');
  assert.equal(result.status, 0, result.stderr);
  const out = values(result);
  assert.equal(out.profile, 'ja');
  const index = fs.readFileSync(out.PI, 'utf8');
  assert.match(index, /- docs\/glossary\/domain-terms\.md — Fachbegriffe — Kunde heißt Auftraggeber\./);
  assert.match(index, /- docs\/application\/orders\/domain-terms\.md — Begriffe Bestellung — Anders\./);
  assert.match(out.WARN, /gleichnamige Profile an mehreren Orten: .*docs\/application\/orders\/domain-terms\.md.*docs\/glossary\/domain-terms\.md/);
  assert.ok(samePath(out.W, path.join(repo, '.forge', 'spec-review', 'demo')));
});

test('specReview_OneProfileFilePerFolder_NoDuplicateWarning', () => {
  const repo = planRepo();
  commitFile(repo, 'docs/application/feature/wizard/feature.md', '# Wizard\n\nx\n', 'feature a');
  commitFile(repo, 'docs/application/feature/dashboard/feature.md', '# Dashboard\n\ny\n', 'feature b');
  commitFile(repo, 'docs/application/module/api/module.md', '# API\n\nz\n', 'module a');
  commitFile(repo, 'docs/application/module/web/module.md', '# Web\n\nw\n', 'module b');
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md'));
  assert.equal(out.profile, 'ja');
  assert.equal(out.WARN, undefined);
});

test('specReview_NoProfiles_ProfileInactiveWithoutIndexLine', () => {
  const repo = planRepo();
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md'));
  assert.equal(out.profile, 'nein');
  assert.equal(out.PI, undefined);
});

test('planReview_CreatesWorkspace', () => {
  const repo = planRepo();
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md'));
  assert.ok(samePath(out.W, path.join(repo, '.forge', 'plan-review', 'demo')));
});

test('specReview_FreeSpec_NoProfilesEvenIfPresent', () => {
  const repo = makeRepo();
  commitFile(repo, 'docs/forge/demo/spec.md', '# Spec\n\nStatus: bestätigt am 2026-09-26\nArt: frei\n', 'spec');
  commitFile(repo, 'docs/glossary/terms.md', '# G\n\nx\n', 'glossary');
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md'));
  assert.equal(out.art, 'frei');
  assert.equal(out.profile, 'nein');
  assert.equal(out.PI, undefined);
});

test('reviews_WithoutOnly_ListAllReviewersAsActive', () => {
  const repo = planRepo();
  assert.equal(values(run(repo, 'plan-review', 'docs/forge/demo/plan.md')).aktiv, 'coverage,feasibility,architecture,risks,buildability');
  assert.equal(values(run(repo, 'spec-review', 'docs/forge/demo/spec.md')).aktiv, 'completeness,consistency,feasibility,clarity');
  commitFile(repo, 'docs/glossary/terms.md', '# G\n\nx\n', 'glossary');
  assert.equal(values(run(repo, 'spec-review', 'docs/forge/demo/spec.md')).aktiv, 'completeness,consistency,feasibility,clarity,profiles');
});

test('planReview_Only_KeepsCanonicalOrderOfChosenReviewers', () => {
  const repo = planRepo();
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--only', 'buildability,coverage'));
  assert.equal(out.aktiv, 'coverage,buildability');
});

test('specReview_OnlyProfilesWithoutProfiles_DropsItWithWarning', () => {
  const repo = planRepo();
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--only', 'clarity,profiles'));
  assert.equal(out.aktiv, 'clarity');
  assert.match([].concat(out.WARN).join('\n'), /profiles nicht aktiv/);
});

test('reviews_OnlyUnknownOrEmpty_ExitWithTwoWithoutWorkspace', () => {
  const repo = planRepo();
  const unknown = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--only', 'coverage,clarity');
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /clarity/);
  assert.equal(run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--only', ',').status, 2);
  assert.equal(run(repo, 'implementation', 'docs/forge/demo/plan.md', '--only', 'coverage').status, 2);
  assert.ok(!fs.existsSync(path.join(repo, '.forge', 'plan-review', 'demo')));
});


test('planReview_ConfiguredCommands_AreListedRaw', () => {
  const repo = planRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n- Test: dv-forge: angular-test --root src/frontend\n', 'config');
  const out = values(run(repo, 'plan-review', 'docs/forge/demo/plan.md'));
  assert.equal(out.Test, 'dv-forge: angular-test --root src/frontend');
  assert.equal(out.Build, '');
  assert.equal(out.Lint, '');
});

test('specReview_ProfilesFound_NamesExcerptPathInWorkspaceWithoutCreatingIt', () => {
  const repo = planRepo();
  commitFile(repo, 'docs/glossary/terms.md', '# G\n\nx\n', 'glossary');
  const out = values(run(repo, 'spec-review', 'docs/forge/demo/spec.md'));
  assert.ok(samePath(path.dirname(out.PA), out.W));
  assert.equal(path.basename(out.PA), 'profil-auszug.md');
  assert.ok(!fs.existsSync(out.PA));
  const none = planRepo();
  assert.equal(values(run(none, 'spec-review', 'docs/forge/demo/spec.md')).PA, undefined);
});
