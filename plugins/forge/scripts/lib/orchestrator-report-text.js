'use strict';

// Der eine Abschlussbericht eines Orchestrators in vier Abschnitten. Reine Funktion: Die Eingabe baut orchestrator-report.js
// (Endstand) zusammen mit den Angaben des Orchestrators (`facts`: Pfade, Commit-Stand, Prüfergebnis, Faktenzeilen).

const { changeLines, openLines, stepLines, proposedCount, blockedSteps, hintSteps, questionSteps, DOCUMENT_TEXTS } = require('./report-text');

const CHANGED_IN = { spec: 'in der Spec', plan: 'im Plan', implementation: 'im Code' };
const NOTHING_CHANGED = 'Keine Änderung.';
const NOTHING_OPEN = 'Nichts weiter offen.';
const IMPLEMENTATION_SELF = { orSelf: 'oder selbst beheben', selfFix: 'Selbst beheben, dann erneut prüfen:', selfFixOptional: 'Bei Bedarf selbst beheben (optional).' };

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

function openSection(report) {
  const lines = [
    ...report.open.filter((entry) => entry.color === 'red').flatMap(openLines),
    ...report.open.filter((entry) => entry.color === 'yellow').flatMap(openLines),
    ...report.questions.map((line) => `- ❓ ${line}`),
  ];
  return lines.length > 0 ? lines : [NOTHING_OPEN];
}

function withWorkitem(command, facts) {
  return facts.wi ? `${command} ${facts.wi}` : command;
}

// Schritte aus offenen Hindernissen und Hinweisen, wie im Bericht des Reviews; `next` schließt bei ✅ ab.
function reviewSteps(report, commands, texts, next) {
  const hints = report.open.filter((entry) => entry.color === 'yellow').length;
  if (report.kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', commands.rerun]];
  if (report.kind === 'blocked') {
    const listed = report.open.filter((entry) => entry.color === 'red').length;
    return blockedSteps({ openRed: listed > 0 ? listed : report.openRed, proposed: proposedCount(report.open, 'red'), followup: commands.followup, rerun: commands.rerun, orSelf: texts.orSelf, selfFix: texts.selfFix });
  }
  if (report.kind === 'hints') return hintSteps({ hints, proposed: proposedCount(report.open, 'yellow'), followup: commands.followup, selfFix: texts.selfFixOptional, closing: next });
  return next;
}

function namesFollowup(steps, followup) {
  return JSON.stringify(steps).includes(followup);
}

function documentSteps(report, facts, plan) {
  const artifact = plan ? facts.plan : facts.spec;
  const commands = { rerun: `/dv-forge:${report.review} ${artifact}`, followup: `/dv-forge:review-followup ${artifact} alle` };
  const next = plan
    ? [['Implementieren (erst nach 1; sonst fehlen Plan und Spec im Worktree):', withWorkitem(`/dv-forge:implementation-orchestrator ${facts.plan} ${facts.spec}`, facts)]]
    : [['Plan (frische Session):', withWorkitem(`/dv-forge:plan-orchestrator ${facts.spec}`, facts)]];
  const ready = plan ? '✅ Bereit zur Umsetzung' : '✅ Bereit zum Planen';
  const notYet = `${plan ? 'Implementieren' : 'Planen'} erst nach ${ready}.`;
  const rest = report.kind === 'questions'
    ? [...questionSteps({ review: report.review, artifact, spec: plan ? facts.spec : null }), notYet]
    : reviewSteps(report, commands, DOCUMENT_TEXTS, next);
  const again = namesFollowup(rest, commands.followup) ? ' Nach dem Followup erneut committen.' : '';
  const commit = plan ? `Spec und Plan committen. Stand: ${facts.stand ?? 'unbekannt'}.${again}` : `Spec committen. Ergebnis: ${facts.commit ?? 'unbekannt'}.${again}`;
  const blocked = ['blocked', 'incomplete'].includes(report.kind) ? [notYet] : [];
  return [commit, ...rest, ...blocked];
}

function implementationSteps(report, facts) {
  const commands = { rerun: `/dv-forge:implementation-review ${facts.plan} ${facts.spec}`, followup: `/dv-forge:review-followup ${facts.plan} alle --spec ${facts.spec}` };
  const finish = [[`Arbeit abschließen (nur manuell, in ${facts.worktree}):`, '/dv-forge:finish-work']];
  if (['ready', 'hints'].includes(report.kind) && facts.check !== 'gruen') return [['Build, Test oder Lint nicht grün: selbst beheben, dann erneut prüfen:', commands.rerun]];
  return reviewSteps(report, commands, IMPLEMENTATION_SELF, finish);
}

function nextLines(report, facts) {
  if (report.art !== 'implementation') return stepLines(documentSteps(report, facts, report.art === 'plan'));
  return [
    `Worktree bleibt: ${facts.worktree}`,
    ...stepLines(implementationSteps(report, facts)),
    `Nicht gepusht: \`git push -u origin ${facts.branch}\``,
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
