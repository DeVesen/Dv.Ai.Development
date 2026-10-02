'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'review-flow.js');
const FINDING = '- [risks · red] Zitat: „x“ · Konsequenz: k · Begründung: b';
const AGGREGATE = [
  'STATUS clean=false red=1 yellow=1 green=1 failed=-', '=== REPORT ===', 'Tabelle', '=== REWORK ===',
  '### 🔴 src/a.js (risks)', FINDING, '', '### 🟡 src/b.js (design)', FINDING, '', '### 🟢 src/c.js (tests)', FINDING, '',
].join('\n');
const SCOUT = [
  '## Scout-Vorschläge', '',
  '### 🔴 src/a.js', 'Titel: Fehler wird verschluckt', 'Beschreibung: Ein Fehler beim Speichern bleibt unbemerkt.', 'Empfehlung: Den Fehler melden, weil Nutzer sonst Datenverlust nicht sehen.',
  '1. Fehler melden.', '**Bevorzugt: 1** — klar.', '',
  '### 🟡 src/b.js', 'Titel: Doppelte Rundung', 'Beschreibung: Die Rundung steht an zwei Stellen.', 'Empfehlung: Die Rundung bündeln, weil Änderungen sonst doppelt nötig sind.',
  '1. Bündeln.', '**Bevorzugt: 1** — einfach.', '',
].join('\n');

function check(scout, review = 'implementation-review') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-impl-scout-'));
  fs.writeFileSync(path.join(dir, 'aggregate.md'), AGGREGATE);
  if (scout !== null) fs.writeFileSync(path.join(dir, 'scout.md'), scout);
  const args = review ? ['--review', review] : [];
  return spawnSync(process.execPath, [SCRIPT, 'scout-check', ...args, '--dir', dir], { encoding: 'utf8' }).stdout;
}

test('scoutCheck_ImplementationReviewCompleteScoutWithoutGreenGroup_Ok', () => {
  assert.equal(check(SCOUT), 'SCOUT ok\n');
});

test('scoutCheck_ImplementationReviewMissingRedOrYellowGroup_Invalid', () => {
  const withoutYellow = SCOUT.slice(0, SCOUT.indexOf('### 🟡'));
  assert.equal(check(withoutYellow), 'SCOUT ungültig: 🟡 src/b.js: Gruppe fehlt\n');
});

test('scoutCheck_ImplementationReviewMissingFileOrFields_Invalid', () => {
  assert.equal(check(null), 'SCOUT ungültig: Ergebnisdatei fehlt\n');
  assert.equal(check(SCOUT.replace('Titel: Fehler wird verschluckt\n', '')), 'SCOUT ungültig: 🔴 src/a.js: Titel fehlt\n');
  assert.equal(check(SCOUT.replace(/Empfehlung: Den Fehler[^\n]*\n/, '')), 'SCOUT ungültig: 🔴 src/a.js: Empfehlung fehlt\n');
});

test('scoutCheck_ImplementationReviewShorthandOrOverlength_Invalid', () => {
  assert.equal(check(SCOUT.replace('Ein Fehler beim Speichern bleibt unbemerkt.', 'Siehe AC-03 dazu.')), 'SCOUT ungültig: 🔴 src/a.js: Beschreibung: Kürzel AC-03\n');
  assert.equal(check(SCOUT.replace('Fehler wird verschluckt', 'Fehler')), 'SCOUT ungültig: 🔴 src/a.js: Titel hat 1 Wörter statt 2 bis 6\n');
});

test('scoutCheck_OtherRoleWithoutScoutInput_FailsLikeBefore', () => {
  assert.match(check(SCOUT, null), /Datei fehlt|SCOUT/);
});
