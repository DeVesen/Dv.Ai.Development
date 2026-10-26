'use strict';

// Offene 🟡 und 🟢 einer Etappe (aus dem Whiteboarding auch 🔴) aus ihren Bericht-Daten (bericht-review.json, dann bericht-followup-<n>.json) und ihre
// Führung über alle Etappen. Die Regel steht in orchestrator-report.js (mergeOpenKeepUnchanged): Ein Punkt ist erst erledigt,
// wenn eine spätere Runde ihn als Änderung mit `ok: true` meldet. Dateinamen der Ablage kommen aus session-chain-ablage.js.

const path = require('node:path');
const { mergeOpenKeepUnchanged, readPart, keyOf } = require('./orchestrator-report');
const { REVIEW_FILE, followupNumbers, followupName } = require('./session-chain-ablage');
const { SessionChainError } = require('./session-chain-store');
const { ReportFormatError } = require('./report-format');
const { toPosix } = require('./posix');

const ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
const RANK = { red: -1, yellow: 0, green: 1 };
// 🔴 führt die Kette nur aus dem Review im Whiteboarding: Danach entscheidet der Mensch selbst, ob er trotz 🔴 abschließt.
const RED_FROM = ['whiteboarding'];

// Eine fehlende Datei fällt still weg (readPart liefert null); kaputte Bericht-Daten werfen, damit kein offener Punkt unbemerkt verschwindet.
function readChecked(file) {
  try {
    return readPart(file);
  } catch (error) {
    if (error instanceof ReportFormatError) throw new SessionChainError(error.message, { cause: error });
    throw new SessionChainError(`Bericht-Daten nicht lesbar: ${toPosix(file)}`, { cause: error });
  }
}

// Teile in Reihenfolge: Review, dann Followups nach Nummer.
function readParts(ablage) {
  const names = [REVIEW_FILE, ...followupNumbers(ablage).map((number) => `${followupName(number)}.json`)];
  return names.map((name) => readChecked(path.join(ablage, name))).filter(Boolean);
}

// `parts`: Bericht-Daten in Reihenfolge; `herkunft`: Etappe der Punkte.
function openPoints(parts, herkunft) {
  const colors = RED_FROM.includes(herkunft) ? ['red', 'yellow', 'green'] : ['yellow', 'green'];
  return mergeOpenKeepUnchanged(parts).filter((entry) => colors.includes(entry?.color))
    .map((entry, index) => ({ farbe: entry.color, titel: entry.title, key: keyOf(entry, index, 'punkt'), herkunft }))
    .sort((a, b) => RANK[a.farbe] - RANK[b.farbe]);
}

// Plan-Review und Spec-Review sind neue Prüfungen desselben Dokuments: Sie lösen die Punkte des Plan-Entwurfs (planning)
// bzw. des Reviews im Whiteboarding ab.
const SUPERSEDES = { 'plan-review': ['planning'], 'spec-review': ['whiteboarding'] };

// Die Punkte einer Etappe ersetzen die ihres früheren Laufs und die der Etappen, die sie ablöst; Punkte anderer Etappen bleiben stehen.
function mergePoints(existing, herkunft, points) {
  const replaced = [herkunft, ...(SUPERSEDES[herkunft] ?? [])];
  return [...(existing ?? []).filter((point) => !replaced.includes(point.herkunft)), ...points];
}

function pointLine(point) {
  return `- ${ICON[point.farbe]} ${point.titel} · ${point.herkunft}`;
}

module.exports = { ICON, readParts, openPoints, mergePoints, pointLine };
