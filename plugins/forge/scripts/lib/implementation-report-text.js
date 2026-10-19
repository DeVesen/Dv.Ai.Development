'use strict';

// Abschlussbericht des Implementierungs-Reviews in Klartext. Reine Funktion: Die Eingabe baut implementation-report.js.
// `open[].hasProposal`: die Gruppe hat einen gesicherten Scout-Vorschlag; nur solche Gruppen erreicht
// `/dv-forge:review-followup <P> alle`. Fehlt das Feld, gilt die Gruppe wie in report-text.js als ohne Vorschlag.
// `withoutNext`: eingebetteter Lauf; der Aufrufer schreibt „Wie es weitergeht“ selbst, der Bericht endet davor.
// `openRed`: Zahl der offenen Hindernisse; der Bericht nimmt das Maximum aus ihr und den gelisteten 🔴-Einträgen.

const { openLines, section, stepLines, viewpointsPhrase, proposedCount, blockedSteps, hintSteps, worktreeLine, finishStepFor, pushLine } = require('./report-text');

const FINISH = ['Arbeit abschließen:', '/dv-forge:finish-work'];

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

function rerunCommand(input) {
  return `/dv-forge:implementation-review ${input.plan}`;
}

// Mit Ketten-Eintrag (`input.chain`: worktree, branch) nennt der Schritt den Worktree.
function finishStep(chain) {
  return chain ? finishStepFor(chain.worktree) : FINISH;
}

// Die Schritte erfassen nur gelistete Hindernisse; ohne gelistete gilt die gemeldete Zahl.
function steps(input, kind, counts) {
  const rerun = rerunCommand(input);
  const followup = `/dv-forge:review-followup ${input.plan} alle`;
  const finish = finishStep(input.chain);
  if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
  if (kind === 'blocked') {
    const openRed = counts.listedRed > 0 ? counts.listedRed : counts.openRed;
    return blockedSteps({ openRed, proposed: proposedCount(input.open, 'red'), followup, rerun, orSelf: 'oder selbst beheben', selfFix: 'Selbst beheben, dann erneut prüfen:' });
  }
  if (kind === 'hints') {
    return hintSteps({ hints: counts.hints, proposed: proposedCount(input.open, 'yellow'), followup, selfFix: 'Bei Bedarf selbst beheben (optional).', closing: [finish] });
  }
  return [finish];
}

// Mit Ketten-Eintrag stehen die Worktree-Zeile davor und die Push-Zeile danach, wie im Bericht des Orchestrators.
function nextBlock(input, kind, counts) {
  const { chain } = input;
  return [
    '### Wie es weitergeht',
    ...(chain ? [worktreeLine(chain.worktree)] : []),
    ...stepLines(steps(input, kind, counts)),
    ...(chain ? [pushLine(chain.branch)] : []),
  ];
}

function countsOf(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  return { openRed: Math.max(input.openRed, hindrances.length), listedRed: hindrances.length, hints: input.open.filter((entry) => entry.color === 'yellow').length };
}

// Art, Ergebnis-Zeile, Ablauf, Prüfumfang und Befund für den eingebetteten Lauf; `offersFollowup`: die Schritte nennen `/dv-forge:review-followup`.
function summaryOf(input) {
  const counts = countsOf(input);
  const kind = kindOf(input, counts);
  const list = steps(input, kind, counts);
  return {
    kind, resultLine: resultLine(input, kind, counts), flowLine: `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, keine Überarbeitung.`,
    checked: checkedLines(input), found: input.reviewerLines.map(foundLine), offersFollowup: JSON.stringify(list).includes('/dv-forge:review-followup '),
  };
}

function renderImplementationReport(input) {
  const hindrances = input.open.filter((entry) => entry.color === 'red');
  const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
  const counts = countsOf(input);
  const kind = kindOf(input, counts);
  const summary = summaryOf(input);
  const heading = `## Implementierungs-Review · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
  return [
    [heading, summary.resultLine, summary.flowLine],
    ['### Was geprüft wurde', ...summary.checked],
    ...section('Gefunden', summary.found),
    ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
    ...section('Noch offen · kein Hindernis für das Abschließen', hintEntries.flatMap(openLines)),
    ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ...(input.withoutNext ? [] : [nextBlock(input, kind, counts)]),
  ].map((block) => block.join('\n')).join('\n\n');
}

module.exports = { renderImplementationReport, summaryOf };
