'use strict';

// Ablage einer Etappe unter <git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/: Berichte und Bericht-Daten der
// Orchestratoren und Reviews (`abschluss.md`, `bericht-review`, `bericht-followup-<n>`) und die Berichtsdatei der Etappe.
// Die Dateinamen stehen nur hier; wer die Ablage liest, nimmt sie von hier.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { writeJson, writeText } = require('./flow-files');
const { SessionChainError, checkedEtappe, chainDir } = require('./session-chain-store');

const REVIEW_NAME = 'bericht-review';
const REVIEW_FILE = `${REVIEW_NAME}.json`;
// Abschlussbericht eines Orchestrators, etwa des Spec-Reviews im Whiteboarding.
const ABSCHLUSS_FILE = 'abschluss.md';
const FOLLOWUP_FILE = /^bericht-followup-(\d+)\.json$/;

function ablageDir(dir, slug, etappe) {
  return path.join(chainDir(dir, slug), 'ablage', checkedEtappe(etappe));
}

// Die eine Stelle, die die Ablage einer Etappe für einen neuen Lauf leert: Orchestrator (`orchestrator-state.js ablage`, vor dem Review)
// und prepare.js (neues Review) rufen sie auf; Daten eines früheren Laufs erreichen so keinen Orchestrator, auch wenn das Review scheitert.
function clearAblage(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

// Kopiert `files` in die Ablage der Etappe; `fresh` leert den Ordner vorher (ein neues Review beginnt die Ablage neu).
function storeFiles({ dir, slug, etappe, files, fresh = false }) {
  const missing = files.find((file) => !fs.existsSync(file));
  if (missing) throw new SessionChainError(`Datei fehlt: ${toPosix(missing)}`);
  const target = ablageDir(dir, slug, etappe);
  if (fresh) clearAblage(target);
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(file, path.join(target, path.basename(file)));
  return toPosix(target);
}

// Nummern der gespeicherten Followup-Runden, aufsteigend.
function followupNumbers(target) {
  if (!fs.existsSync(target)) return [];
  return fs.readdirSync(target).map((name) => FOLLOWUP_FILE.exec(name)).filter(Boolean).map((match) => Number(match[1])).sort((a, b) => a - b);
}

// Name der Bericht-Daten der Followup-Runde `number` (ohne Endung: `.json` Daten, `.md` Bericht).
function followupName(number) {
  return `bericht-followup-${number}`;
}

// Nächster freier Name `bericht-followup-<n>` in der Ablage einer Etappe.
function nextFollowupName(target) {
  const used = followupNumbers(target);
  return followupName(used.length === 0 ? 1 : used[used.length - 1] + 1);
}

// Legt Bericht (.md) und Bericht-Daten (.json) eines Reviews in `target` ab: Ein Review beginnt die Ablage seiner Etappe neu und
// schreibt `bericht-review`, ein Followup legt `bericht-followup-<n>` daneben. Rückgabe: die Pfade beider Dateien.
function storeReviewReport({ target, followup, data, text }) {
  if (!followup) clearAblage(target);
  const name = followup ? nextFollowupName(target) : REVIEW_NAME;
  const json = path.join(target, `${name}.json`);
  const md = path.join(target, `${name}.md`);
  writeJson(json, data);
  writeText(md, text);
  return { json: toPosix(json), md: toPosix(md) };
}

module.exports = { REVIEW_NAME, REVIEW_FILE, ABSCHLUSS_FILE, FOLLOWUP_FILE, ablageDir, clearAblage, storeFiles, storeReviewReport, followupNumbers, followupName, nextFollowupName };
