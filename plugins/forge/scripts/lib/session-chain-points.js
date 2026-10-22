'use strict';

// Offene 🟡 und 🟢 einer Etappe aus ihren Bericht-Daten (bericht-review.json, dann bericht-followup-<n>.json) und ihre
// Führung über alle Etappen. Die Regel steht in orchestrator-report.js (mergeOpenKeepUnchanged): Ein Punkt ist erst erledigt,
// wenn eine spätere Runde ihn als Änderung mit `ok: true` meldet. Dateinamen der Ablage kommen aus session-chain-ablage.js.

const path = require('node:path');
const { mergeOpenKeepUnchanged, readPart, keyOf } = require('./orchestrator-report');
const { REVIEW_FILE, followupNumbers } = require('./session-chain-ablage');

const ICON = { yellow: '🟡', green: '🟢' };
const RANK = { yellow: 0, green: 1 };

// Ein fehlender oder unlesbarer Teil fällt weg; die Liste der Leit-Session darf am Lesen nicht scheitern.
function readSafely(file) {
  try {
    return readPart(file);
  } catch {
    return null;
  }
}

// Teile in Reihenfolge: Review, dann Followups nach Nummer.
function readParts(ablage) {
  const names = [REVIEW_FILE, ...followupNumbers(ablage).map((number) => `bericht-followup-${number}.json`)];
  return names.map((name) => readSafely(path.join(ablage, name))).filter(Boolean);
}

// `parts`: Bericht-Daten in Reihenfolge; `herkunft`: Etappe der Punkte.
function openPoints(parts, herkunft) {
  return mergeOpenKeepUnchanged(parts).filter((entry) => Object.hasOwn(ICON, entry?.color))
    .map((entry, index) => ({ farbe: entry.color, titel: entry.title, key: keyOf(entry, index, 'punkt'), herkunft }))
    .sort((a, b) => RANK[a.farbe] - RANK[b.farbe]);
}

// Die Punkte einer Etappe ersetzen die ihres früheren Laufs; Punkte anderer Etappen bleiben unverändert stehen.
function mergePoints(existing, herkunft, points) {
  return [...(existing ?? []).filter((point) => point.herkunft !== herkunft), ...points];
}

function pointLine(point) {
  return `- ${ICON[point.farbe]} ${point.titel} · ${point.herkunft}`;
}

module.exports = { ICON, readParts, openPoints, mergePoints, pointLine };
