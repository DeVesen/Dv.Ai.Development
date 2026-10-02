'use strict';

// Abschlussbericht des Implementierungs-Reviews in Klartext. Reine Funktion: Die Eingabe baut implementation-report.js.
// `open[].hasProposal`: die Gruppe hat einen gesicherten Scout-Vorschlag; nur solche Gruppen erreicht
// `/dv-forge:review-followup <P> alle`. Fehlt das Feld, gilt die Gruppe als mit Vorschlag (gültiger Scout).

const { openLines, section, stepLines, viewpointsPhrase } = require('./report-text');

const FINISH = ['Arbeit abschließen:', '/dv-forge:finish-work'];

function plural(count, one, many) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function kindOf(input, hints) {
  if (input.failedLabels.length > 0) return 'incomplete';
  if (input.openRed > 0) return 'blocked';
  return hints > 0 ? 'hints' : 'ready';
}

function resultLine(input, kind, hints) {
  if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
  if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${plural(input.openRed, 'Hindernis', 'Hindernisse')} offen`;
  const open = hints > 0 ? ` · ${hints === 1 ? '1 kleiner Hinweis' : `${hints} kleine Hinweise`} offen` : '';
  return `**Ergebnis:** ✅ Bereit zum Abschließen${open}`;
}

function checkedLines(input) {
  return [
    `- Bereich: \`${input.range}\``,
    `- ${plural(input.fileCount, 'geänderte Datei', 'geänderte Dateien')}, davon ${plural(input.testCount, 'Test', 'Tests')}`,
    `- Blickwinkel: ${input.reviewerLines.map((line) => line.name).join(', ')}`,
  ];
}

function foundLine(line) {
  if (line.failed) return `- ${line.name}: ausgefallen`;
  return `- ${line.name}: ${plural(line.red, 'Hindernis', 'Hindernisse')}, ${plural(line.yellow, 'Hinweis', 'Hinweise')}`;
}

function followupCommand(input) {
  return `/dv-forge:review-followup ${input.plan} alle`;
}

function rerunCommand(input) {
  return `/dv-forge:implementation-review ${input.plan}`;
}

// `alle` erreicht nur Hindernisse mit Vorschlag; die übrigen behebt der Mensch selbst.
function blockedSteps(input, proposed) {
  const rerun = rerunCommand(input);
  const rest = Math.max(0, input.openRed - proposed);
  if (rest === 0) {
    const count = input.openRed === 1 ? 'Das Hindernis' : `Die ${input.openRed} Hindernisse`;
    return [[`${count} einarbeiten lassen (oder selbst beheben):`, followupCommand(input)], ['Danach erneut prüfen:', rerun]];
  }
  const selfFix = 'Selbst beheben, dann erneut prüfen:';
  if (proposed === 0) {
    const count = rest === 1 ? 'Das Hindernis hat' : `Die ${rest} Hindernisse haben`;
    return [[`${count} keinen Lösungsvorschlag. ${selfFix}`, rerun]];
  }
  const count = proposed === 1 ? 'Das Hindernis' : `Die ${proposed} Hindernisse`;
  const others = rest === 1 ? 'Das übrige Hindernis hat' : `Die ${rest} übrigen Hindernisse haben`;
  return [[`${count} mit Lösungsvorschlag einarbeiten lassen:`, followupCommand(input)], [`${others} keinen Lösungsvorschlag. ${selfFix}`, rerun]];
}

function hintSteps(input, hints, proposed) {
  const rest = hints - proposed;
  const list = [];
  if (proposed > 0) {
    const count = proposed === 1 ? 'Den Hinweis' : `Die ${proposed} Hinweise`;
    list.push([`${count}${rest > 0 ? ' mit Lösungsvorschlag' : ''} einarbeiten lassen (optional):`, followupCommand(input)]);
  }
  if (rest > 0) {
    const others = proposed > 0 ? ['Der übrige Hinweis hat', `Die ${rest} übrigen Hinweise haben`] : ['Der Hinweis hat', `Die ${rest} Hinweise haben`];
    list.push(`${rest === 1 ? others[0] : others[1]} keinen Lösungsvorschlag. Bei Bedarf selbst beheben (optional).`);
  }
  return [...list, FINISH];
}

function steps(input, kind, open) {
  const proposed = (color) => open.filter((entry) => entry.color === color && entry.hasProposal !== false).length;
  if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerunCommand(input)]];
  if (kind === 'blocked') return blockedSteps(input, proposed('red'));
  if (kind === 'hints') return hintSteps(input, open.filter((entry) => entry.color === 'yellow').length, proposed('yellow'));
  return [FINISH];
}

function renderImplementationReport(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const kind = kindOf(input, hintEntries.length);
  const heading = `## Implementierungs-Review · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, resultLine(input, kind, hintEntries.length), `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, keine Überarbeitung.`],
    ['### Was geprüft wurde', ...checkedLines(input)],
    ...section('Gefunden', input.reviewerLines.map(foundLine)),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section('Noch offen · kein Hindernis für das Abschließen', hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ['### Wie es weitergeht', ...stepLines(steps(input, kind, input.open))],
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderImplementationReport };
