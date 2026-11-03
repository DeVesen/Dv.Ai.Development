'use strict';

// Stand des Spec-Reviews im Whiteboarding einer Session-Kette: Ergebnis-Zeile, Zahl der offenen Punkte aller Farben und ob die
// Abschlussfrage kommt. Gelesen wird die Ablage `whiteboarding`, in die der Spec-Review-Orchestrator mit `--whiteboarding` schreibt.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { SessionChainError, slugOfArtifact } = require('./session-chain-store');
const { REVIEW_FILE, ABSCHLUSS_FILE, ablageDir } = require('./session-chain-ablage');
const { readParts } = require('./session-chain-points');
const { mergeOpenKeepUnchanged } = require('./orchestrator-report');
const { resultOf } = require('./session-chain-decide');

// Der Orchestrator schreibt den Abschlussbericht nach seinen Followup-Runden, also nach der letzten Spec-Änderung des Laufs.
// Ist er älter als die Spec, ist er der Stand eines früheren Reviews: Das neue Review ist gescheitert.
function staleReason(abschluss, spec) {
  return fs.statSync(abschluss).mtimeMs < fs.statSync(spec).mtimeMs ? ' (Abschlussbericht älter als die Spec)' : null;
}

// `spec`: Pfad der Spec. `frage` ist false nur bei ✅ ohne jeden offenen Punkt.
function reviewStand(spec) {
  if (!fs.existsSync(spec)) throw new SessionChainError(`Spec fehlt: ${toPosix(spec)}`);
  const ablage = ablageDir(path.dirname(path.resolve(spec)), slugOfArtifact({ spec }), 'whiteboarding');
  const abschluss = path.join(ablage, ABSCHLUSS_FILE);
  if (!fs.existsSync(path.join(ablage, REVIEW_FILE)) || !fs.existsSync(abschluss)) throw new SessionChainError(`Kein Spec-Review in der Ablage: ${toPosix(ablage)}`);
  const stale = staleReason(abschluss, spec);
  if (stale) throw new SessionChainError(`Kein Spec-Review in der Ablage: ${toPosix(ablage)}${stale}`);
  const ergebnis = resultOf(fs.readFileSync(abschluss, 'utf8'));
  const punkte = mergeOpenKeepUnchanged(readParts(ablage)).length;
  return { ergebnis, punkte, frage: !(ergebnis?.startsWith('✅') && punkte === 0), abschluss: toPosix(abschluss) };
}

module.exports = { reviewStand };
