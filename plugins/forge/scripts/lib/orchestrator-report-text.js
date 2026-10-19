'use strict';

// Der eine Abschlussbericht eines Orchestrators in vier Abschnitten. Reine Funktion: Die Eingabe baut orchestrator-report.js
// (Endstand) zusammen mit den Angaben des Orchestrators (`facts`: Pfade, Commit-Stand, Prüfergebnis, Faktenzeilen).
// „Wie es weitergeht“ bietet keinen Review-Followup an: Die Followup-Runden hat der Orchestrator schon gelaufen.

const { changeLines, openLines, stepLines, withWorkitem, worktreeLine, finishStepFor, pushLine, questionSteps, withoutProposalSentence, DOCUMENT_TEXTS } = require('./report-text');

const CHANGED_IN = { spec: 'in der Spec', plan: 'im Plan', implementation: 'im Code' };
const NOTHING_CHANGED = 'Keine Änderung.';
const NOTHING_OPEN = 'Nichts weiter offen.';
const IMPLEMENTATION_SELF = { selfFix: 'Selbst beheben, dann erneut prüfen:', selfFixOptional: 'Bei Bedarf selbst beheben (optional).' };

function labelled(label, lines) {
  return lines.length > 0 ? [`**${label}:**`, ...lines] : [];
}

function closingLines(report, facts) {
  return [
    report.resultLine,
    ...report.flowLines,
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

// 🔴, 🟡 und ❓ zuerst, dann alle 🟢 (je Stelle einmal). Ein 🟢 ändert weder Ergebnis noch nächste Schritte.
function openSection(report) {
  const lines = [
    ...report.open.filter((entry) => entry.color === 'red').flatMap(openLines),
    ...report.open.filter((entry) => entry.color === 'yellow').flatMap(openLines),
    ...report.questions.map((line) => `- ❓ ${line}`),
    ...(report.green ?? []).flatMap(openLines),
  ];
  return lines.length > 0 ? lines : [NOTHING_OPEN];
}

// Satz „… keinen Lösungsvorschlag.“ vor dem eigenen Schritt, wenn offene Einträge der Farbe keinen Scout-Vorschlag haben; sonst leer.
// Einträge mit Vorschlag bekommen keinen Schritt: Die Followup-Runden hat der Orchestrator schon gelaufen.
function withoutProposal(report, color, kind) {
  const count = report.open.filter((entry) => entry.color === color && !entry.hasProposal).length;
  return count > 0 ? `${withoutProposalSentence({ count, others: false, kind })} ` : '';
}

// Schritte aus offenen Hindernissen und Hinweisen; ohne Followup-Angebot: Hindernisse behebt der Mensch selbst, Hinweise optional.
// `next` schließt bei ✅ ab.
function reviewSteps(report, rerun, texts, next) {
  if (report.kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
  if (report.kind === 'blocked') return [[`${withoutProposal(report, 'red', 'hindrance')}${texts.selfFix}`, rerun]];
  if (report.kind === 'hints') return [`${withoutProposal(report, 'yellow', 'hint')}${texts.selfFixOptional}`, ...next];
  return next;
}

function documentSteps(report, facts, plan) {
  const artifact = plan ? facts.plan : facts.spec;
  const rerun = `/dv-forge:${report.review} ${artifact}`;
  const next = plan
    ? [['Implementieren (erst nach 1; sonst fehlen Plan und Spec im Worktree):', withWorkitem(`/dv-forge:implementation-orchestrator ${facts.plan} ${facts.spec}`, facts.wi)]]
    : [['Plan (frische Session):', withWorkitem(`/dv-forge:plan-orchestrator ${facts.spec}`, facts.wi)]];
  const ready = plan ? '✅ Bereit zur Umsetzung' : '✅ Bereit zum Planen';
  const notYet = `${plan ? 'Implementieren' : 'Planen'} erst nach ${ready}.`;
  const rest = report.kind === 'questions'
    ? [...questionSteps({ review: report.review, artifact, spec: plan ? facts.spec : null }), notYet]
    : reviewSteps(report, rerun, DOCUMENT_TEXTS, next);
  const commit = plan ? `Spec und Plan committen. Stand: ${facts.stand ?? 'unbekannt'}.` : `Spec committen. Ergebnis: ${facts.commit ?? 'unbekannt'}.`;
  const blocked = ['blocked', 'incomplete'].includes(report.kind) ? [notYet] : [];
  return [commit, ...rest, ...blocked];
}

function implementationSteps(report, facts) {
  const rerun = `/dv-forge:implementation-review ${facts.plan} ${facts.spec}`;
  const finish = [finishStepFor(facts.worktree)];
  if (['ready', 'hints'].includes(report.kind) && facts.check !== 'gruen') return [['Build, Test oder Lint nicht grün: selbst beheben, dann erneut prüfen:', rerun]];
  return reviewSteps(report, rerun, IMPLEMENTATION_SELF, finish);
}

function nextLines(report, facts) {
  if (report.art !== 'implementation') return stepLines(documentSteps(report, facts, report.art === 'plan'));
  return [
    worktreeLine(facts.worktree),
    ...stepLines(implementationSteps(report, facts)),
    pushLine(facts.branch),
  ];
}

function renderOrchestratorReport(report, facts) {
  return [
    ['# Abschlussbericht', ...closingLines(report, facts)],
    [`# Was sich ${CHANGED_IN[report.art]} geändert hat`, ...changedLines(report)],
    ['# Was ist noch offen', ...openSection(report)],
    ['# Wie es weitergeht', ...nextLines(report, facts)],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderOrchestratorReport, NOTHING_OPEN, NOTHING_CHANGED };
