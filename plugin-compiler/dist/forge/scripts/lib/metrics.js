'use strict';

// Rohdaten für Messungen: je Review-Lauf eine Zeile in <git-common-dir>/dv-forge/metrics/reviews.jsonl, gemeinsam für den
// Haupt-Checkout und alle Worktrees. Die Auswertung liegt bewusst nicht hier (toolbelt); dv-forge liefert nur die Zahlen.
// Schreiben ist best effort: Eine fehlende Messzeile darf keinen Review-Lauf scheitern lassen.

const fs = require('node:fs');
const path = require('node:path');
const { storeDir } = require('./chain');

const FORMAT = 1;

function metricsFile(dir, name) {
  const root = storeDir(dir, 'metrics');
  return root ? path.join(root, `${name}.jsonl`) : null;
}

function appendMetric(dir, name, record, now = new Date()) {
  try {
    const file = metricsFile(dir, name);
    if (!file) return null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ format: FORMAT, zeit: now.toISOString(), ...record })}\n`);
    return file;
  } catch {
    return null;
  }
}

function colorCounts(groups = [], field = 'color') {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const group of groups) if (Object.hasOwn(counts, group[field])) counts[group[field]] += 1;
  return counts;
}

// Stellen eines Laufs, kompakt genug für die Messzeile; eval-review.js vergleicht sie mit einem Golden-Set.
function placesOf(groups = []) {
  return groups.map((group) => ({ key: group.key, color: group.color, kategorien: [...new Set((group.items ?? []).map((item) => item.finding?.category ?? item.category))] }));
}

function readJsonOr(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Nachforderungen und Neustarts aus versuche.json des Arbeitsbereichs, je Art summiert.
function attemptCounts(workspace) {
  const attempts = readJsonOr(path.join(workspace, 'versuche.json'), {});
  const counts = {};
  for (const [id, used] of Object.entries(attempts)) {
    const kind = id.split(':')[0];
    counts[kind] = (counts[kind] ?? 0) + Number(used);
  }
  return counts;
}

// Kennzahlen eines Spec- oder Plan-Reviews aus den Daten, die flow-report.js ohnehin sammelt.
function flowReviewRecord(options, data, status) {
  return {
    review: options.review,
    artefakt: options.artifact ?? options.doc,
    quelle: options.source,
    status,
    runde1: colorCounts(data.one?.groups),
    verworfen: data.one?.dropped?.length ?? 0,
    runde2: data.two ? { ...colorCounts(data.two.groups), offenRot: data.two.openRed } : null,
    nacharbeit: data.reworked,
    fragen: data.questions.length,
    ausgefallen: data.failed,
    versuche: attemptCounts(options.workspace),
    belege: { runde1: data.one?.belege ?? {}, runde2: data.two?.belege ?? {} },
    stellen: { runde1: placesOf(data.one?.groups), runde2: data.two ? placesOf(data.two.groups) : null },
  };
}

// Kennzahlen eines Implementierungs-Reviews aus ergebnis.json der letzten Runde.
function implementationReviewRecord(options, result, status) {
  return {
    review: 'implementation-review',
    artefakt: options.planArg ?? options.plan,
    bereich: options.range,
    status,
    farben: colorCounts(result.groups, 'severity'),
    ausgefallen: result.failed ?? [],
    versuche: attemptCounts(options.workspace),
    belege: result.belege ?? {},
    stellen: { runde1: result.groups.map((group) => ({ key: group.location, color: group.severity, reviewer: [...new Set(group.reviewers)] })), runde2: null },
  };
}

module.exports = { appendMetric, metricsFile, flowReviewRecord, implementationReviewRecord, colorCounts };
