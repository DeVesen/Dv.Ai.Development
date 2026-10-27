'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HarnessError, gitRootOf, currentBranch, checkInput, dateOf, slugOf, folderNameFor, createPackage } = require('../scripts/lib/harness-package');
const { makeRepo, git, samePath } = require('./lib/git-repo');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-package-'));
}

test('gitRootOf_NotYetExistingFileInRepo_RepoRoot', () => {
  const repo = makeRepo();

  assert.ok(samePath(gitRootOf(path.join(repo, 'neu', 'datei.md')), repo));
});

test('gitRootOf_FolderOutsideAnyRepo_Null', () => {
  assert.equal(gitRootOf(tempDir()), null);
});

test('currentBranch_FreshRepo_InitialBranch', () => {
  const repo = makeRepo();
  git(repo, 'switch', '--quiet', '-c', 'feat/x');

  assert.equal(currentBranch(repo), 'feat/x');
});

test('checkInput_NeitherTargetNorFeedback_AbortsWithOneSentence', () => {
  assert.throws(() => checkInput({}), (error) => error instanceof HarnessError && error.message === 'Abbruch: Weder Ziel noch Rückmeldung angegeben.');
});

test('checkInput_FeedbackFileMissingEmptyOrUnreadable_AbortsNamingTheCause', () => {
  const dir = tempDir();
  const empty = path.join(dir, 'leer.md');
  fs.writeFileSync(empty, '  \n');
  const missing = path.join(dir, 'fehlt.md');

  assert.throws(() => checkInput({ rueckmeldung: missing }), { message: `Abbruch: Die Rückmeldedatei ${missing} fehlt.` });
  assert.throws(() => checkInput({ rueckmeldung: empty }), { message: `Abbruch: Die Rückmeldedatei ${empty} ist leer.` });
  assert.throws(() => checkInput({ rueckmeldung: dir }), { message: `Abbruch: Die Rückmeldedatei ${dir} ist nicht lesbar.` });
});

test('checkInput_TargetOrInlineTextOrReadableFeedback_Passes', () => {
  const file = path.join(tempDir(), 'retro.md');
  fs.writeFileSync(file, 'Skill x hakte.\n');

  assert.doesNotThrow(() => checkInput({ ziele: ['plugins/x'] }));
  assert.doesNotThrow(() => checkInput({ text: true }));
  assert.doesNotThrow(() => checkInput({ rueckmeldung: file }));
});

test('dateOf_LocalDate_YearMonthDay', () => {
  assert.equal(dateOf(new Date(2026, 9, 7, 23, 59)), '2026-10-07');
});

test('slugOf_PathsAndNames_LastPartLowercaseJoinedByDash', () => {
  assert.equal(slugOf(['plugins/toolbelt/']), 'toolbelt');
  assert.equal(slugOf(['Plan Writing', 'agents\\pruefer.md']), 'plan-writing-pruefer');
  assert.equal(slugOf(['///', '']), '');
});

test('folderNameFor_FreeOrTaken_BaseThenSuffixTwoThree', () => {
  const taken = new Set(['ziel-2026-10-27', 'ziel-2026-10-27-2']);

  assert.equal(folderNameFor('frei', '2026-10-27', (name) => taken.has(name)), 'frei-2026-10-27');
  assert.equal(folderNameFor('ziel', '2026-10-27', (name) => taken.has(name)), 'ziel-2026-10-27-3');
});

test('createPackage_ExistingPackage_NewFolderWithSuffixAndOldOneUnchanged', () => {
  const repo = tempDir();
  const old = path.join(repo, '.harness', 'forge-2026-10-27');
  fs.mkdirSync(old, { recursive: true });
  fs.writeFileSync(path.join(old, 'BEFUNDE.md'), 'alt\n');

  const folder = createPackage(repo, ['forge'], '2026-10-27');

  assert.equal(folder, path.join(repo, '.harness', 'forge-2026-10-27-2'));
  assert.equal(fs.readFileSync(path.join(folder, '.gitignore'), 'utf8'), '*\n');
  assert.deepEqual(fs.readdirSync(old), ['BEFUNDE.md']);
  assert.equal(fs.readFileSync(path.join(old, 'BEFUNDE.md'), 'utf8'), 'alt\n');
});

test('createPackage_SeveralTargets_OneFolderNamedAfterAll', () => {
  const folder = createPackage(tempDir(), ['plugins/forge', 'plugins/toolbelt'], '2026-10-27');

  assert.equal(path.basename(folder), 'forge-toolbelt-2026-10-27');
});

test('createPackage_PackageFolderInRepo_IgnoredByGit', () => {
  const repo = makeRepo();

  const folder = createPackage(repo, ['ziel'], '2026-10-27');
  fs.writeFileSync(path.join(folder, 'BEFUNDE.md'), 'x\n');

  assert.equal(git(repo, 'status', '--porcelain'), '');
});

test('createPackage_BadDateOrNoName_Throws', () => {
  assert.throws(() => createPackage(tempDir(), ['x'], '27.10.2026'), HarnessError);
  assert.throws(() => createPackage(tempDir(), ['/'], '2026-10-27'), { message: 'Kein Zielname für den Paketordner angegeben.' });
});
