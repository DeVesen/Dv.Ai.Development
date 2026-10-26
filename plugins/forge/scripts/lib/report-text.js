'use strict';

// Abschlussbericht eines Spec-, Plan-Reviews oder Followups in Klartext. Reine Funktion: Die Eingabe baut report-data.js.
// `openRed`: Zahl der offenen Hindernisse; ist sie größer 0, gilt der Bericht auch bei Status `sauber …` als nicht bereit
// (Followup: der Status zählt nur die gewählten Gruppen). `open[].hasProposal`: die Gruppe hat einen gesicherten
// Scout-Vorschlag; nur solche Gruppen erreicht `/dv-forge:review-followup <A> alle`.
// Der Bericht nennt keinen nächsten Schritt; die Session-Kette entscheidet über den Fortgang.

const READY = { 'spec-review': 'Bereit zum Planen', 'plan-review': 'Bereit zur Umsetzung', 'implementation-review': 'Bereit zum Abschließen' };
const DOCUMENT_IN = { 'spec-review': 'in der Spec', 'plan-review': 'im Plan' };
const NEXT_FOR = { 'spec-review': 'den Plan', 'plan-review': 'die Umsetzung' };
const VIEWPOINTS = ['', 'einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];
const ICON = { red: '🔴', yellow: '🟡', green: '🟢' };

function kindOf(input, hints) {
  if (input.status.startsWith('unvollständig')) return 'incomplete';
  if (input.status === 'Fragen offen') return 'questions';
  if (input.status.startsWith('nicht bereit') || input.openRed > 0) return 'blocked';
  return hints > 0 ? 'hints' : 'ready';
}

function resultLine(input, kind, hints) {
  const count = (number, one, many) => (number === 1 ? one : many);
  if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
  if (kind === 'questions') return `**Ergebnis:** ❓ ${count(input.questions.length, '1 Frage', `${input.questions.length} Fragen`)} offen`;
  if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${count(input.openRed, '1 Hindernis', `${input.openRed} Hindernisse`)} offen`;
  const open = hints > 0 ? ` · ${count(hints, '1 kleiner Hinweis', `${hints} kleine Hinweise`)} offen` : '';
  return `**Ergebnis:** ✅ ${READY[input.review]}${open}`;
}

function viewpointsPhrase(count) {
  return count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
}

function flowLine(input) {
  const rework = input.reworked ? 'eine Überarbeitung' : 'keine Überarbeitung';
  const verify = input.verified ? 'eine Nachprüfung' : 'keine Nachprüfung';
  if (input.followup) {
    const chosen = input.chosenCount === 1 ? '1 gewählter Vorschlag' : `${input.chosenCount} gewählte Vorschläge`;
    return `Ablauf: ${chosen} umgesetzt, ${verify}.`;
  }
  return `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, ${rework}, ${verify}.`;
}

function changeLines(change) {
  const mark = change.ok === true ? '✅' : '⚠️';
  const verdict = { true: 'bestätigt.', false: 'nicht erledigt.', null: 'nicht erfolgt.' }[String(change.ok)];
  return [
    `- ${mark} **${change.title}** · gefunden aus: ${change.angles}`,
    `  ${change.description}`,
    ...(change.change ? [`  Änderung: ${change.change}`] : []),
    ...(change.evidence ? [`  Beleg: ${change.evidence}`] : []),
    ...(change.choice ? [`  Gewählt: Vorschlag ${change.choice}`] : []),
    `  Nachprüfung: ${verdict}`,
  ];
}

function openLines(entry) {
  return [
    `- ${ICON[entry.color]} **${entry.title}** · aus: ${entry.angles}`,
    `  ${entry.description}`,
    ...(entry.recommendation ? [`  Vorschlag (empfohlen): ${entry.recommendation}`] : []),
  ];
}

function section(title, lines) {
  return lines.length > 0 ? [[`### ${title}`, ...lines]] : [];
}

// Zahl der offenen Gruppen einer Farbe, die einen Scout-Vorschlag haben; fehlt `hasProposal`, gilt: kein Vorschlag.
function proposedCount(open, color) {
  return open.filter((entry) => entry.color === color && entry.hasProposal).length;
}

// Ob ein Followup (`review-followup <A> alle`) etwas erreicht: nur offene Hindernisse bzw. Hinweise mit gesichertem Scout-Vorschlag.
// Fragen, ein Ausfall und ein bereiter Stand bieten keinen Followup an.
function offersFollowup(kind, open) {
  if (kind === 'blocked') return proposedCount(open, 'red') > 0;
  if (kind === 'hints') return proposedCount(open, 'yellow') > 0;
  return false;
}

// Art, Ergebnis-Zeile und Ablauf; `offersFollowup`: ein Followup erreicht offene Gruppen mit Scout-Vorschlag.
function summaryOf(input) {
  const hints = input.open.filter((entry) => entry.color === 'yellow').length;
  const kind = kindOf(input, hints);
  return { kind, resultLine: resultLine(input, kind, hints), flowLine: flowLine(input), offersFollowup: offersFollowup(kind, input.open) };
}

function renderReportText(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const summary = summaryOf(input);
  const heading = `## ${input.title} · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, summary.resultLine, summary.flowLine],
    ...section(`Was sich ${DOCUMENT_IN[input.review]} geändert hat`, input.changes.flatMap(changeLines)),
    ...section('Deine Entscheidungen', (input.followup ? [] : input.decisions).map((entry) => `- **${entry.title}:** ${entry.decision}`)),
    ...section('Offene Fragen', input.questions.map((line) => `- ${line}`)),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section(`Noch offen · kein Hindernis für ${NEXT_FOR[input.review]}`, hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderReportText, summaryOf, offersFollowup, resultLine, changeLines, openLines, section, viewpointsPhrase };
