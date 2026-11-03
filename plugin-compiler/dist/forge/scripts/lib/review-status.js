'use strict';

// Die eine Statuszeile, mit der ein Review-Skill endet: Ergebnis, ob ein Followup folgt, Datei des Berichts in der Ablage.
// Die Etappen-Statuszeile `[etappe] STATUS=…` steht daneben und zählt nicht mit.

const { toPosix } = require('./posix');

const PREFIX = 'Review abgeschlossen: ';
const RESULT_PREFIX = '**Ergebnis:** ';
const STATUS_LINE = /^Review abgeschlossen: (.+) · FOLLOWUP (ja|nein) · Bericht: (.+?)\s*$/;

// `resultLine`: Ergebnis-Zeile des Berichts (mit oder ohne `**Ergebnis:** `); `report`: Pfad der Berichtsdatei (.md) in der Ablage.
function reviewStatusLine({ resultLine, followup, report }) {
  const result = resultLine.startsWith(RESULT_PREFIX) ? resultLine.slice(RESULT_PREFIX.length) : resultLine;
  return `${PREFIX}${result} · FOLLOWUP ${followup ? 'ja' : 'nein'} · Bericht: ${toPosix(report)}`;
}

function parseReviewStatusLine(line) {
  const match = STATUS_LINE.exec(String(line ?? ''));
  return match ? { ergebnis: match[1], followup: match[2] === 'ja', bericht: match[3] } : null;
}

module.exports = { reviewStatusLine, parseReviewStatusLine };
