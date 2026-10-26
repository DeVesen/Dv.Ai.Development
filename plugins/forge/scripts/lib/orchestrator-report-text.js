'use strict';

// Der eine Abschlussbericht eines Orchestrators in drei Abschnitten. Reine Funktion: Die Eingabe baut orchestrator-report.js
// (Endstand) zusammen mit den Faktenzeilen des Orchestrators (`facts.lines`). Der Bericht nennt keinen nächsten Schritt;
// die Session-Kette entscheidet über den Fortgang.

const { changeLines, openLines } = require('./report-text');

const CHANGED_IN = { spec: 'in der Spec', plan: 'im Plan', implementation: 'im Code' };
const NOTHING_CHANGED = 'Keine Änderung.';
const NOTHING_OPEN = 'Nichts weiter offen.';
// Grund, aus dem die Followup-Runden trotz offenem 🔴 endeten; dieselbe Entscheidung wie `ABBRUCH=` von `orchestrator-state.js next`.
const ABORT_TEXT = {
  maximum: (it) => `Abbruch: Maximum von ${it.max} Iterationen erreicht, ${it.openRed} × 🔴 offen.`,
  stillstand: (it) => `Abbruch: Stillstand, dieselbe 🔴-Stelle bleibt nach zwei aufeinanderfolgenden Runden offen (${it.stillstand.join(', ')}).`,
};

function iterationLines(report) {
  const it = report.iterations;
  if (!it) return [];
  return [`Iterationen: ${it.rounds} von ${it.max}`, ...(it.abbruch ? [ABORT_TEXT[it.abbruch](it)] : [])];
}

// Nur im Implementierungs-Lauf: ACs, die am Ende ohne beweisenden Test sind; die Session-Kette liest die Zeile als Showstopper.
function acLines(report) {
  return (report.acOhneTest ?? []).length > 0 ? [`AC ohne beweisenden Test: ${report.acOhneTest.join(', ')}`] : [];
}

function labelled(label, lines) {
  return lines.length > 0 ? [`**${label}:**`, ...lines] : [];
}

function closingLines(report, facts) {
  return [
    report.resultLine,
    ...report.flowLines,
    ...iterationLines(report),
    ...acLines(report),
    ...labelled('Geprüft', report.checked),
    ...labelled('Gefunden', report.found),
    ...labelled('Hinweise zum Ablauf', report.notes.map((note) => `- ${note}`)),
    ...facts.lines,
  ];
}

function changedLines(report) {
  const lines = [
    ...report.changes.flatMap(changeLines),
    ...labelled('Deine Entscheidungen', report.decisions.map((entry) => `- **${entry.title}:** ${entry.decision}`)),
  ];
  return lines.length > 0 ? lines : [NOTHING_CHANGED];
}

// 🔴, 🟡 und ❓ zuerst, dann alle 🟢 (je Stelle einmal). Ein 🟢 ändert das Ergebnis nicht.
function openSection(report) {
  const lines = [
    ...report.open.filter((entry) => entry.color === 'red').flatMap(openLines),
    ...report.open.filter((entry) => entry.color === 'yellow').flatMap(openLines),
    ...report.questions.map((line) => `- ❓ ${line}`),
    ...(report.green ?? []).flatMap(openLines),
  ];
  return lines.length > 0 ? lines : [NOTHING_OPEN];
}

function renderOrchestratorReport(report, facts) {
  return [
    ['# Abschlussbericht', ...closingLines(report, facts)],
    [`# Was sich ${CHANGED_IN[report.art]} geändert hat`, ...changedLines(report)],
    ['# Was ist noch offen', ...openSection(report)],
  ].map((block) => block.join('\n')).join('\n\n');
}

// Bericht eines Laufs, der vor dem Review endete (`--abbruch`): dieselben drei Abschnitte, ohne Review-Daten.
function renderAbortReport(art, reason, facts) {
  return [
    ['# Abschlussbericht', `**Ergebnis:** ⚠️ Abgebrochen vor dem Review: ${reason}`, ...facts.lines],
    [`# Was sich ${CHANGED_IN[art]} geändert hat`, NOTHING_CHANGED],
    ['# Was ist noch offen', `- ${reason}`],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderOrchestratorReport, renderAbortReport, NOTHING_OPEN, NOTHING_CHANGED };
