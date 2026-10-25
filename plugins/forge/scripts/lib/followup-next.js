'use strict';

// Nächster Schritt eines Review-Followups als Zeilen. Reine Funktion: followup.js `next` liest den Ketten-Eintrag und ruft sie auf.
// Ausgabe: `NAECHSTER <text>` je Textzeile, `CODE <befehl>` je Zeile eines Code-Blocks, bei plan-review dazu `COMMIT-PRUEFUNG ja|nein`.
// Bei Spec und Plan steht der nächste Schritt im Bericht; nur die Commit-Prüfung des Plans kommt aus dem Skript.

const { worktreeLine, finishStepFor, pushLine } = require('./report-text');

const FINISH_PLAIN = ['Alles sauber. Arbeit abschließen mit:', '/dv-forge:finish-work'];
const RESULT_PREFIX = '**Ergebnis:** ';
const PLAN_READY = '✅ Bereit zur Umsetzung';
const READY_MARK = '✅';
const KEPT_NUMBERS = /^\d+(?:,\d+)*$/;
const WITHOUT_REVIEW = ['keine Änderung', 'blockiert'];

class NextStepError extends Error {}

function resultText(ergebnis) {
  const text = String(ergebnis ?? '').trim();
  return text.startsWith(RESULT_PREFIX) ? text.slice(RESULT_PREFIX.length) : text;
}

// Commit-Prüfung nach dem Plan-Review: nur bei `sauber …` und `✅ Bereit zur Umsetzung`; ein offenes Hindernis macht die Ergebnis-Zeile `⛔`.
function commitCheckOf({ status, ergebnis }) {
  return String(status ?? '').startsWith('sauber') && resultText(ergebnis).startsWith(PLAN_READY) ? 'ja' : 'nein';
}

function render(steps) {
  const lines = [];
  for (const step of steps) {
    if (typeof step === 'string') lines.push(`NAECHSTER ${step}`);
    else lines.push(...step.map((line, index) => (index === step.length - 1 ? `CODE ${line}` : `NAECHSTER ${line}`)));
  }
  return lines;
}

// Mit Ketten-Eintrag nennt der Abschluss-Schritt den Worktree; das gilt nur, wenn die Ergebnis-Zeile `✅` beginnt.
function finishStep(chain, ready) {
  return chain && ready ? finishStepFor(chain.worktree) : FINISH_PLAIN;
}

function implementationSteps({ status, offen, behalten, artefakt, chain, ready }) {
  const followup = `Noch nicht umgesetzt: /dv-forge:review-followup ${artefakt} alle.`;
  const rerun = `/dv-forge:implementation-review ${artefakt} erneut.`;
  const finishManual = chain && ready ? [finishStepFor(chain.worktree)] : [];
  if (/^sauber nach Nach-Review/.test(status)) return offen > 0 ? [followup, ...finishManual] : [finishStep(chain, ready)];
  if (status === 'offen nach Nach-Review') return KEPT_NUMBERS.test(behalten ?? '') ? [followup, ...finishManual] : [rerun];
  if (WITHOUT_REVIEW.includes(status)) return [rerun];
  const failed = /^unvollständig(?:[^:]*ausgefallen:\s*(.+))?/.exec(status);
  if (failed) return [`Ausgefallen: ${failed[1] ?? 'unbekannt'}. Den Skill in einer frischen Session erneut starten.`];
  throw new NextStepError(`Status unbekannt: ${status}`);
}

// `options`: original (`spec-review` | `plan-review` | `implementation-review`), status, offen (Zahl nicht gewählter Gruppen; ohne Angabe
// zählt `bleiben offen` im Status), behalten (`keine` | `unveraendert` | Nummern), ergebnis (Ergebnis-Zeile des Berichts),
// artefakt (Plan der Implementierung), chain (Ketten-Eintrag mit worktree und branch oder null).
function nextStepOf(options) {
  const { original, status } = options;
  if (!['spec-review', 'plan-review', 'implementation-review'].includes(original)) throw new NextStepError(`original unbekannt: ${original}`);
  if (!status) throw new NextStepError('status fehlt');
  if (original === 'spec-review') return [];
  if (original === 'plan-review') return [`COMMIT-PRUEFUNG ${commitCheckOf(options)}`];
  if (!options.artefakt) throw new NextStepError('artefakt fehlt');
  const chain = options.chain?.worktree && options.chain.branch ? options.chain : null;
  const offen = Number.isFinite(options.offen) ? options.offen : Number(status.includes('bleiben offen'));
  const steps = implementationSteps({ ...options, offen, chain, ready: resultText(options.ergebnis).startsWith(READY_MARK) });
  return render(chain ? [worktreeLine(chain.worktree), ...steps, pushLine(chain.branch)] : steps);
}

module.exports = { nextStepOf, commitCheckOf, NextStepError };
