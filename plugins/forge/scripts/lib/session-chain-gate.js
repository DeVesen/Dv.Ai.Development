'use strict';

// Tore der Session-Kette als Skript statt als Prosa: Antwort am Haltepunkt festhalten, Start einer Etappe nur, wenn sie die
// erwartete ist, keine zweite Session derselben Kette ohne `--erneut`, und Spec und Plan unverändert seit ihrem Review.

const crypto = require('node:crypto');
const fs = require('node:fs');
const { SessionChainError } = require('./session-chain-store');

// Je Haltepunkt: erlaubte Antworten und die Etappe, die danach starten darf (`*` = jede, null = keine).
const ANSWERS = {
  spec: { planning: 'planning', 'spec-nacharbeit': 'spec-nacharbeit', stopp: null },
  go: { go: 'umsetzung', 'plan-nacharbeit': 'plan-nacharbeit', stopp: null },
  abweichung: { weiter: '*', stopp: null },
};
// Etappen, deren `final` den Stand festlegt, auf den sich ein Haltepunkt bezieht.
const REFERENCE = { spec: ['spec-review'], go: ['planning', 'plan-review', 'plan-nacharbeit'] };

function hashFile(file) {
  return file && fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
}

function artifactHashes(state) {
  return { spec: hashFile(state.spec), plan: hashFile(state.plan) };
}

// Meldung, wenn Spec oder Plan seit dem `final` der Bezugs-Etappe geändert sind; null ohne Bezug oder ohne Änderung.
function changedSinceReview(state, art) {
  const reference = [...(state.etappen ?? [])].reverse().find((entry) => REFERENCE[art]?.includes(entry.etappe) && entry.hashes);
  if (!reference) return null;
  const now = artifactHashes(state);
  const changed = ['spec', 'plan'].filter((key) => reference.hashes[key] && now[key] !== reference.hashes[key]);
  return changed.length === 0 ? null : `${changed.map((key) => (key === 'spec' ? 'Spec' : 'Plan')).join(' und ')} seit ${reference.etappe} geändert; erst erneut prüfen lassen`;
}

// Hält die Antwort des Menschen am offenen Haltepunkt fest und gibt ihn frei.
function answerHalt(state, antwort, now = new Date()) {
  const halt = state.halt;
  if (!halt) throw new SessionChainError('Kein Haltepunkt offen');
  const allowed = ANSWERS[halt];
  if (!allowed) throw new SessionChainError(`Haltepunkt ${halt} wird nicht beantwortet; er endet mit dem nächsten final der Etappe`);
  if (!Object.hasOwn(allowed, antwort)) throw new SessionChainError(`Antwort am Haltepunkt ${halt}: erlaubt ${Object.keys(allowed).join(', ')}; nicht ${antwort}`);
  if (antwort !== 'stopp') {
    const changed = changedSinceReview(state, halt);
    if (changed) throw new SessionChainError(changed);
  }
  const entry = { halt, antwort, zeit: now.toISOString() };
  return { ...state, halt: null, freigabe: entry, antworten: [...(state.antworten ?? []), entry] };
}

// Prüft den Start der Etappe und hält ihn fest. `erneut` erlaubt den Neustart einer Etappe ohne `final`.
function startEtappe(state, etappe, { erneut = false, now = new Date() } = {}) {
  if (state.halt) throw new SessionChainError(`Haltepunkt ${state.halt} offen: erst die Antwort mit \`answer\` festhalten`);
  if (state.gestartet && !(erneut && state.gestartet.etappe === etappe)) {
    throw new SessionChainError(`Etappe ${state.gestartet.etappe} läuft seit ${state.gestartet.zeit} ohne final; Neustart derselben Etappe nur mit --erneut`);
  }
  const target = state.freigabe ? ANSWERS[state.freigabe.halt]?.[state.freigabe.antwort] : state.naechste;
  if (state.freigabe && target === null) throw new SessionChainError(`Antwort ${state.freigabe.antwort} startet keine Etappe`);
  if (target && target !== '*' && target !== etappe && !(state.gestartet && erneut)) {
    throw new SessionChainError(`Als Nächstes startet ${target}, nicht ${etappe}`);
  }
  return { ...state, freigabe: null, gestartet: { etappe, zeit: now.toISOString() } };
}

// GO-Commit nur nach der Antwort `go` und mit Spec und Plan im Stand des Reviews.
function checkGo(state) {
  if (state.freigabe?.halt !== 'go' || state.freigabe.antwort !== 'go') throw new SessionChainError('GO-Commit nur nach `answer --antwort go`');
  const changed = changedSinceReview(state, 'go');
  if (changed) throw new SessionChainError(changed);
}

module.exports = { ANSWERS, artifactHashes, changedSinceReview, answerHalt, startEtappe, checkGo };
