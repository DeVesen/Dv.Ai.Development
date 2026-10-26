'use strict';

// Ablage einer Etappe unter <git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/: Berichte und Bericht-Daten der
// Orchestratoren und Reviews (`abschluss.md`, `bericht-review`, `bericht-followup-<n>`) und die Berichtsdatei der Etappe.
// Die Dateinamen stehen nur hier; wer die Ablage liest, nimmt sie von hier.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { SessionChainError, checkedEtappe, chainDir } = require('./session-chain-store');

const REVIEW_FILE = 'bericht-review.json';
// Abschlussbericht eines Orchestrators, etwa des Spec-Reviews im Whiteboarding.
const ABSCHLUSS_FILE = 'abschluss.md';
const FOLLOWUP_FILE = /^bericht-followup-(\d+)\.json$/;

function ablageDir(dir, slug, etappe) {
  return path.join(chainDir(dir, slug), 'ablage', checkedEtappe(etappe));
}

// Kopiert `files` in die Ablage der Etappe; `fresh` leert den Ordner vorher (ein neues Review beginnt die Ablage neu).
function storeFiles({ dir, slug, etappe, files, fresh = false }) {
  const missing = files.find((file) => !fs.existsSync(file));
  if (missing) throw new SessionChainError(`Datei fehlt: ${toPosix(missing)}`);
  const target = ablageDir(dir, slug, etappe);
  if (fresh) fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(file, path.join(target, path.basename(file)));
  return toPosix(target);
}

// Nummern der gespeicherten Followup-Runden, aufsteigend.
function followupNumbers(target) {
  if (!fs.existsSync(target)) return [];
  return fs.readdirSync(target).map((name) => FOLLOWUP_FILE.exec(name)).filter(Boolean).map((match) => Number(match[1])).sort((a, b) => a - b);
}

// Nächster freier Name `bericht-followup-<n>` in der Ablage einer Etappe.
function nextFollowupName(target) {
  const used = followupNumbers(target);
  return `bericht-followup-${used.length === 0 ? 1 : used[used.length - 1] + 1}`;
}

module.exports = { REVIEW_FILE, ABSCHLUSS_FILE, FOLLOWUP_FILE, ablageDir, storeFiles, followupNumbers, nextFollowupName };
