'use strict';

// Abschlussbericht des Implementierungs-Reviews in Klartext. Reine Funktion: Die Eingabe baut implementation-report.js.
// `open[].hasProposal`: die Gruppe hat einen gesicherten Scout-Vorschlag; fehlt das Feld, gilt die Gruppe wie in report-text.js als ohne Vorschlag.
// Der Bericht nennt keinen nächsten Schritt; die Session-Kette entscheidet über den Fortgang.
// `openRed`: Zahl der offenen Hindernisse; der Bericht nimmt das Maximum aus ihr und den gelisteten 🔴-Einträgen.

const { openLines, section, viewpointsPhrase } = require('./report-text');

function plural(count, one, many) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function kindOf(input, counts) {
  if (input.failedLabels.length > 0) return 'incomplete';
  if (counts.openRed > 0) return 'blocked';
  return counts.hints > 0 ? 'hints' : 'ready';
}

function resultLine(input, kind, counts) {
  const hints = counts.hints;
  if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
  if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${plural(counts.openRed, 'Hindernis', 'Hindernisse')} offen`;
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

function countsOf(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  return { openRed: Math.max(input.openRed, hindrances.length), listedRed: hindrances.length, hints: input.open.filter((entry) => entry.color === 'yellow').length };
}

// Art, Ergebnis-Zeile, Ablauf, Prüfumfang und Befund für den Bericht und die Bericht-Daten.
function summaryOf(input) {
  const counts = countsOf(input);
  const kind = kindOf(input, counts);
  return {
    kind, resultLine: resultLine(input, kind, counts), flowLine: `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, keine Überarbeitung.`,
    checked: checkedLines(input), found: input.reviewerLines.map(foundLine),
  };
}

function renderImplementationReport(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const summary = summaryOf(input);
  const heading = `## Implementierungs-Review · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, summary.resultLine, summary.flowLine],
    ['### Was geprüft wurde', ...summary.checked],
    ...section('Gefunden', summary.found),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section('Noch offen · kein Hindernis für das Abschließen', hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderImplementationReport, summaryOf };
