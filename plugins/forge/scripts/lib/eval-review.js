'use strict';

// Misst Review-Läufe gegen ein Golden-Set (evals/*.json): Recall der Pflicht-Befunde, Precision der gemeldeten Stellen,
// Belegquote der Zitate und Stabilität über mehrere Läufe. Ein Golden-Set misst Regression, nicht Wahrheit: Mit wenigen
// Fällen taugen die Zahlen zum Vergleich zweier Stände, nicht als harte Schwelle.

const { LOCATION_TYPES, fileLocationType, normalizeLocation } = require('../aggregate-findings');

const TYPES = [...LOCATION_TYPES, fileLocationType(null)];
const RANK = { green: 1, yellow: 2, red: 3 };

function keyOf(location) {
  return normalizeLocation(location, TYPES);
}

// Stellen eines Laufs aus einstufung.json (Spec/Plan), ergebnis.json (Implementierung) oder einer Messzeile aus reviews.jsonl.
function placesOfRun(run) {
  if (run.stellen?.runde1) return run.stellen.runde1.map((place) => ({ key: keyOf(place.key), color: place.color, kategorien: place.kategorien ?? [] }));
  return (run.groups ?? []).map((group) => ({
    key: keyOf(group.key ?? group.location ?? group.label),
    color: group.color ?? group.severity,
    kategorien: [...new Set((group.items ?? []).map((item) => item.finding?.category ?? item.category).filter(Boolean))],
  }));
}

function evidenceOf(run) {
  const belege = run.belege?.runde1 ?? run.belege ?? {};
  let belegt = 0;
  let unbelegt = 0;
  for (const counts of Object.values(belege)) {
    belegt += counts.belegt ?? 0;
    unbelegt += (counts.unbelegt ?? 0) + (counts['datei-fehlt'] ?? 0);
  }
  return belegt + unbelegt === 0 ? null : belegt / (belegt + unbelegt);
}

function matches(place, expected) {
  return expected.stellen.map(keyOf).includes(place.key)
    && RANK[place.color] >= RANK[expected.minFarbe ?? 'yellow']
    && (!expected.kategorien || expected.kategorien.some((category) => place.kategorien.includes(category)) || place.kategorien.length === 0);
}

function round(value) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function evaluateRun(golden, run) {
  const places = placesOfRun(run).filter((place) => place.color !== 'green');
  const required = golden.erwartet.filter((entry) => entry.pflicht);
  const hit = golden.erwartet.filter((entry) => places.some((place) => matches(place, entry))).map((entry) => entry.id);
  const allowed = new Set([...golden.erwartet.flatMap((entry) => entry.stellen), ...(golden.erlaubt ?? [])].map(keyOf));
  const extra = [...new Set(places.filter((place) => !allowed.has(place.key)).map((place) => place.key))];
  return {
    recall: required.length === 0 ? null : round(required.filter((entry) => hit.includes(entry.id)).length / required.length),
    precision: places.length === 0 ? null : round(places.filter((place) => allowed.has(place.key)).length / places.length),
    belegquote: round(evidenceOf(run)),
    treffer: hit,
    verfehlt: required.filter((entry) => !hit.includes(entry.id)).map((entry) => entry.id),
    zusatz: extra,
    stellen: [...new Set(places.map((place) => place.key))],
  };
}

function jaccard(a, b) {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  return [...a].filter((item) => b.includes(item)).length / union.size;
}

// Mittlere Jaccard-Ähnlichkeit der gemeldeten Stellen über alle Paare von Läufen; null bei nur einem Lauf.
function stability(results) {
  const pairs = [];
  for (let i = 0; i < results.length; i += 1) for (let j = i + 1; j < results.length; j += 1) pairs.push(jaccard(results[i].stellen, results[j].stellen));
  return pairs.length === 0 ? null : round(pairs.reduce((sum, value) => sum + value, 0) / pairs.length);
}

function mean(values) {
  const known = values.filter((value) => value !== null);
  return known.length === 0 ? null : round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

function evaluate(golden, runs) {
  const results = runs.map((run) => evaluateRun(golden, run));
  return {
    fall: golden.fall, laeufe: results.length,
    recall: mean(results.map((entry) => entry.recall)), precision: mean(results.map((entry) => entry.precision)),
    belegquote: mean(results.map((entry) => entry.belegquote)), stabilitaet: stability(results), je: results,
  };
}

function formatEvaluation(summary) {
  const value = (number) => (number === null ? '-' : number.toFixed(2));
  return [
    `EVAL fall=${summary.fall} laeufe=${summary.laeufe} recall=${value(summary.recall)} precision=${value(summary.precision)} belegquote=${value(summary.belegquote)} stabilitaet=${value(summary.stabilitaet)}`,
    ...summary.je.flatMap((run, index) => [
      ...run.verfehlt.map((id) => `VERFEHLT lauf=${index + 1} ${id}`),
      ...run.zusatz.map((key) => `ZUSATZ lauf=${index + 1} ${key}`),
    ]),
  ].join('\n');
}

module.exports = { evaluate, evaluateRun, formatEvaluation, placesOfRun, stability, keyOf };
