'use strict';

// Offene 🟡 und 🟢 einer Etappe aus ihren Bericht-Daten (bericht-review.json, dann bericht-followup-<n>.json) und ihre
// Führung über alle Etappen. Die Regel steht in orchestrator-report.js (mergeOpenKeepUnchanged): Ein Punkt ist erst erledigt,
// wenn eine spätere Runde ihn als Änderung mit `ok: true` meldet. Dateinamen der Ablage kommen aus session-chain-ablage.js.

const path = require('node:path');
const { mergeOpenKeepUnchanged, readPart, keyOf } = require('./orchestrator-report');
const { REVIEW_FILE, followupNumbers } = require('./session-chain-ablage');
const { SessionChainError } = require('./session-chain-store');
const { toPosix } = require('./posix');

const ICON = { yellow: '🟡', green: '🟢' };
const RANK = { yellow: 0, green: 1 };

// Eine fehlende Datei fällt still weg (readPart liefert null); kaputte Bericht-Daten werfen, damit kein offener Punkt unbemerkt verschwindet.
function readChecked(file) {
  try {
    return readPart(file);
  } catch (error) {
    throw new SessionChainError(`Bericht-Daten nicht lesbar: ${toPosix(file)}`, { cause: error });
  }
}

// Teile in Reihenfolge: Review, dann Followups nach Nummer.
function readParts(ablage) {
  const names = [REVIEW_FILE, ...followupNumbers(ablage).map((number) => `bericht-followup-${number}.json`)];
  return names.map((name) => readChecked(path.join(ablage, name))).filter(Boolean);
}

// `parts`: Bericht-Daten in Reihenfolge; `herkunft`: Etappe der Punkte.
function openPoints(parts, herkunft) {
  return mergeOpenKeepUnchanged(parts).filter((entry) => Object.hasOwn(ICON, entry?.color))
    .map((entry, index) => ({ farbe: entry.color, titel: entry.title, key: keyOf(entry, index, 'punkt'), herkunft }))
    .sort((a, b) => RANK[a.farbe] - RANK[b.farbe]);
}

// Das Plan-Review ist eine neue Prüfung desselben Plans: Es löst die Punkte ab, die der Plan-Entwurf (planning) selbst gemeldet hat.
const SUPERSEDES = { 'plan-review': ['planning'] };

// Die Punkte einer Etappe ersetzen die ihres früheren Laufs und die der Etappen, die sie ablöst; Punkte anderer Etappen bleiben stehen.
function mergePoints(existing, herkunft, points) {
  const replaced = [herkunft, ...(SUPERSEDES[herkunft] ?? [])];
  return [...(existing ?? []).filter((point) => !replaced.includes(point.herkunft)), ...points];
}

function pointLine(point) {
  return `- ${ICON[point.farbe]} ${point.titel} · ${point.herkunft}`;
}

module.exports = { ICON, readParts, openPoints, mergePoints, pointLine };
