'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { repoWithPlan, git, addWorktree } = require('./lib/git-repo');
const { writeState } = require('../scripts/lib/session-chain-store');
const { ablageDir } = require('../scripts/lib/session-chain-ablage');
const { maxFollowups } = require('../scripts/lib/orchestrator-rules');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-state.js');

function run(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ostate-'));
}

function report(file, data) {
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

test('start_RecordsLocationAndPreexistingFiles', () => {
  const { repo, spec } = repoWithPlan();
  fs.writeFileSync(path.join(repo, 'offen.txt'), 'x');
  const result = run(repo, 'start', '--state', tmp(), '--spec', spec);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^TOPLEVEL=.+\nBRANCH=main\nHEAD=[0-9a-f]+\nWORKTREE=nein\nSPEC-IM-CHECKOUT=ja\nVORBESTAND=1\nVORBESTAND-DATEI=offen.txt\n$/);
});

test('start_DetachedHeadOrMissingSpec_ExitOne', () => {
  const { repo, spec } = repoWithPlan();
  assert.equal(run(repo, 'start', '--state', tmp(), '--spec', path.join(repo, 'fehlt.md')).status, 1);
  git(repo, 'checkout', '--quiet', '--detach');
  const detached = run(repo, 'start', '--state', tmp(), '--spec', spec);
  assert.equal(detached.status, 1);
  assert.match(detached.stderr, /detached HEAD/);
});

test('check_ChangedSpec_ExitOneWithDiff', () => {
  const { repo, spec, plan } = repoWithPlan();
  const state = tmp();
  run(repo, 'start', '--state', state, '--spec', spec);
  run(repo, 'add', '--state', state, '--plan', plan);
  assert.equal(run(repo, 'check', '--state', state).stdout, 'HASH-SPEC=ok\nHASH-PLAN=ok\n');
  fs.appendFileSync(spec, 'neue Zeile\n');
  const changed = run(repo, 'check', '--state', state);
  assert.equal(changed.status, 1);
  assert.match(changed.stdout, /^HASH-SPEC=abweichung\nHASH-PLAN=ok\n=== DIFF ===\n[\s\S]*\+neue Zeile/);
});

test('check_Ort_OtherBranchIsDeviation', () => {
  const { repo, spec } = repoWithPlan();
  const state = tmp();
  run(repo, 'start', '--state', state, '--spec', spec);
  git(repo, 'switch', '--quiet', '-c', 'anders');
  const result = run(repo, 'check', '--state', state, '--ort');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /ORT=abweichung .+ anders/);
});

test('start_InWorktree_ReportsWorktree', () => {
  const { repo, spec } = repoWithPlan();
  const tree = addWorktree(repo, 'feature/x');
  assert.match(run(tree, 'start', '--state', tmp(), '--spec', spec).stdout, /WORKTREE=ja\nSPEC-IM-CHECKOUT=nein/);
});

test('next_FollowupOfferedUnderCap_Followup', () => {
  const dir = tmp();
  const review = report(path.join(dir, 'br.json'), { status: 'nicht bereit', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true });
  assert.equal(run(dir, 'next', '--review', review).stdout, 'NEXT=followup\nRUNDE=1\nERGEBNIS=⛔ Nicht bereit\nBEREIT=nein\nRUNDEN=0\n');
});

test('next_MaximumFollowupsDone_WeiterEvenIfOffered', () => {
  const dir = tmp();
  const offered = { status: 'x', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true };
  const files = Array.from({ length: maxFollowups() + 1 }, (_, index) => report(path.join(dir, `bericht-${index}.json`), offered));
  const result = run(dir, 'next', '--review', files[0], ...files.slice(1).flatMap((file) => ['--followup', file]));
  assert.match(result.stdout, /^NEXT=weiter\n/);
  assert.match(result.stdout, new RegExp(`RUNDEN=${maxFollowups()}`));
});

test('next_IncompleteOrMissingReport_Ende', () => {
  const dir = tmp();
  const incomplete = report(path.join(dir, 'br.json'), { status: 'unvollständig, ausgefallen: x', resultLine: '**Ergebnis:** ⚠️ Unvollständig', offersFollowup: true });
  assert.match(run(dir, 'next', '--review', incomplete).stdout, /^NEXT=ende\nGRUND=unvollstaendig/);
  assert.match(run(dir, 'next', '--review', path.join(dir, 'fehlt.json')).stdout, /^NEXT=ende\nGRUND=kein-bericht/);
});

test('next_Ready_WeiterBereitJa', () => {
  const dir = tmp();
  const ready = report(path.join(dir, 'br.json'), { status: 'sauber', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', offersFollowup: false });
  assert.equal(run(dir, 'next', '--review', ready).stdout, 'NEXT=weiter\nERGEBNIS=✅ Bereit zum Abschließen\nBEREIT=ja\nRUNDEN=0\n');
});

test('cli_BadCall_ExitTwo', () => {
  assert.equal(run(tmp(), 'start', '--state', 'x').status, 2);
  assert.equal(run(tmp(), 'bogus').status, 2);
  assert.equal(run(tmp(), 'ablage').status, 2);
});

test('start_ModifiedTrackedFileAsFirstStatusLine_KeepsItsFullPath', () => {
  const { repo, spec } = repoWithPlan();
  fs.appendFileSync(spec, 'Vorbestand\n');
  const result = run(repo, 'start', '--state', tmp(), '--spec', spec);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^VORBESTAND-DATEI=docs\/forge\/x\/spec\.md$/m);
});

// Erwartete Ausgabe von `ablage` für die Etappe `etappe` des Slugs `x`: Daten des Reviews, je eine Zeile je mögliche Followup-Runde
// (Maximum aus der Regeldatei), Abschlussbericht. Die Pfade stehen ab dem Ordner `session-chain/`: Der Temp-Ordner, in dem der
// Ordner der Kette liegt, kann kurz oder lang geschrieben sein.
function ablageLines(etappe) {
  const folder = `x/ablage/${etappe}`;
  const rounds = Array.from({ length: maxFollowups() }, (_, index) => `BERICHT-FOLLOWUP-${index + 1}=${folder}/bericht-followup-${index + 1}.json`);
  return [`BERICHT-REVIEW=${folder}/bericht-review.json`, ...rounds, `ABSCHLUSS=${folder}/abschluss.md`, ''].join('\n');
}

function fromChains(text) {
  return text.replace(/^([A-Z0-9-]+)=.*?\/dv-forge\/session-chain\//gm, '$1=');
}

test('ablage_SpecWithoutChainState_NamesTheFilesOfTheSpecReviewEtappe', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const result = run(repo, 'ablage', '--art', 'spec', '--spec', spec);

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fromChains(result.stdout), ablageLines('spec-review'));
  assert.ok(result.stdout.startsWith(`BERICHT-REVIEW=${ablageDir(repo, 'x', 'spec-review').replace(/\\/g, '/')}/`), result.stdout);
});

test('ablage_SpecWithWhiteboardingSwitch_NamesTheFilesOfTheWhiteboardingEtappe', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const result = run(repo, 'ablage', '--art', 'spec', '--spec', spec, '--whiteboarding');

  // Assert
  assert.equal(fromChains(result.stdout), ablageLines('whiteboarding'));
});

test('ablage_PlanWithRunningEtappeOfTheChain_NamesTheFilesOfThatEtappe', () => {
  // Arrange
  const { repo, plan } = repoWithPlan();
  writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

  // Act
  const result = run(repo, 'ablage', '--art', 'plan', '--plan', plan);

  // Assert
  assert.equal(fromChains(result.stdout), ablageLines('planning'));
});

test('ablage_ImplementationFromWorktree_NamesTheFilesInTheSharedAblage', () => {
  // Arrange
  const { repo } = repoWithPlan();
  const tree = addWorktree(repo, 'feature/x');

  // Act
  const result = run(tree, 'ablage', '--art', 'implementation', '--plan', path.join(tree, 'docs/forge/x/plan.md'));

  // Assert
  assert.equal(fromChains(result.stdout), ablageLines('umsetzung'));
});

test('ablage_ArtWithoutItsArtifactOrUnknownArt_ExitsWithOne', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();

  // Act
  const noPlan = run(repo, 'ablage', '--art', 'plan', '--spec', spec);
  const unknown = run(repo, 'ablage', '--art', 'review', '--spec', spec);

  // Assert
  assert.equal(noPlan.status, 1);
  assert.match(noPlan.stderr, /--art plan braucht --plan/);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /--art erlaubt: spec, plan, implementation/);
});

test('ablage_ArtifactOutsideAGitRepo_ExitsWithOne', () => {
  // Arrange
  const dir = tmp();
  const spec = path.join(dir, 'spec.md');
  fs.writeFileSync(spec, '# Spec\n');

  // Act
  const result = run(dir, 'ablage', '--art', 'spec', '--spec', spec);

  // Assert
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Kein Git-Repo/);
});

test('ablage_AblageHoldsFilesOfAnEarlierRun_EmptiesItBeforeTheReviewCanFail', () => {
  // Arrange
  const { repo, spec } = repoWithPlan();
  const target = ablageDir(repo, 'x', 'spec-review');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, 'bericht-review.json'), JSON.stringify({ status: 'sauber', resultLine: '**Ergebnis:** ✅ Bereit zum Planen', offersFollowup: false }));
  fs.writeFileSync(path.join(target, 'abschluss.md'), '# alt\n');

  // Act
  const result = run(repo, 'ablage', '--art', 'spec', '--spec', spec);
  const next = run(repo, 'next', '--review', result.stdout.split('\n')[0].replace('BERICHT-REVIEW=', ''));

  // Assert
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(target), false);
  assert.match(next.stdout, /^NEXT=ende\nGRUND=kein-bericht/);
});
