'use strict';

// Abschlussbericht eines Spec-, Plan-Reviews oder Followups in Klartext. Reine Funktion: Die Eingabe baut report-data.js.

const READY = { 'spec-review': 'Bereit zum Planen', 'plan-review': 'Bereit zur Umsetzung' };
const DOCUMENT_IN = { 'spec-review': 'in der Spec', 'plan-review': 'im Plan' };
const NEXT_FOR = { 'spec-review': 'den Plan', 'plan-review': 'die Umsetzung' };
const VIEWPOINTS = ['', 'einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];
const ICON = { red: '🔴', yellow: '🟡' };

function kindOf(input, hints) {
  if (input.status.startsWith('unvollständig')) return 'incomplete';
  if (input.status === 'Fragen offen') return 'questions';
  if (input.status.startsWith('nicht bereit')) return 'blocked';
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

function flowLine(input) {
  const rework = input.reworked ? 'eine Überarbeitung' : 'keine Überarbeitung';
  const verify = input.verified ? 'eine Nachprüfung' : 'keine Nachprüfung';
  if (input.followup) {
    const chosen = input.chosenCount === 1 ? '1 gewählter Vorschlag' : `${input.chosenCount} gewählte Vorschläge`;
    return `Ablauf: ${chosen} umgesetzt, ${verify}.`;
  }
  const count = input.reviewerCount;
  const viewpoints = count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
  return `Ablauf: Prüfung aus ${viewpoints}, ${rework}, ${verify}.`;
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

function closingSteps(input) {
  const artifact = input.artifact;
  return input.review === 'spec-review'
    ? ['Spec committen.', ['In einer frischen Session den Plan schreiben:', `/dv-forge:plan-writing ${artifact}`]]
    : ['Spec und Plan committen (ich frage dich danach).', ['In einer frischen Session umsetzen:', `/dv-forge:implementation ${artifact}`]];
}

function questionSteps(input) {
  const rerun = `/dv-forge:${input.review} ${input.artifact}`;
  if (input.review === 'spec-review') return [['Die Fragen beantworten, indem du die Prüfung erneut startest:', rerun]];
  return [
    'Die Spec anpassen.',
    ...(input.spec ? [['Die Spec prüfen:', `/dv-forge:spec-review ${input.spec}`]] : []),
    ['Danach den Plan erneut prüfen:', rerun],
  ];
}

function steps(input, kind, hints) {
  const rerun = `/dv-forge:${input.review} ${input.artifact}`;
  const followup = `/dv-forge:review-followup ${input.artifact} alle`;
  if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
  if (kind === 'questions') return questionSteps(input);
  if (kind === 'blocked') {
    const count = input.openRed === 1 ? 'Das Hindernis' : `Die ${input.openRed} Hindernisse`;
    return [[`${count} einarbeiten lassen (oder das Dokument selbst anpassen):`, followup], ['Danach erneut prüfen:', rerun]];
  }
  if (kind === 'hints') {
    const count = hints === 1 ? 'Den Hinweis' : `Die ${hints} Hinweise`;
    return [[`${count} einarbeiten lassen (optional):`, followup], ...closingSteps(input)];
  }
  return closingSteps(input);
}

function stepLines(list) {
  return list.flatMap((step, index) => {
    const [text, command] = Array.isArray(step) ? step : [step, null];
    return [`${index + 1}. ${text}`, ...(command ? [`   \`${command}\``] : [])];
  });
}

function section(title, lines) {
  return lines.length > 0 ? [[`### ${title}`, ...lines]] : [];
}

function renderReportText(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const kind = kindOf(input, hintEntries.length);
  const heading = `## ${input.title} · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, resultLine(input, kind, hintEntries.length), flowLine(input)],
    ...section(`Was sich ${DOCUMENT_IN[input.review]} geändert hat`, input.changes.flatMap(changeLines)),
    ...section('Deine Entscheidungen', (input.followup ? [] : input.decisions).map((entry) => `- **${entry.title}:** ${entry.decision}`)),
    ...section('Offene Fragen', input.questions.map((line) => `- ${line}`)),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section(`Noch offen · kein Hindernis für ${NEXT_FOR[input.review]}`, hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ['### Wie es weitergeht', ...stepLines(steps(input, kind, hintEntries.length))],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderReportText };
