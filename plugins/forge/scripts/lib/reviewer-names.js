'use strict';

// Blickwinkel der Reviewer in Klartext, je Ablauf; gleiche Kurznamen kommen in mehreren Abläufen vor.

const LABELS = {
  'spec-review': {
    completeness: 'Vollständigkeit', consistency: 'Widerspruchsfreiheit', feasibility: 'Machbarkeit', clarity: 'Klarheit', profiles: 'Fachbegriffe',
  },
  'plan-review': {
    coverage: 'Abdeckung der Spec', feasibility: 'Reihenfolge und Machbarkeit', architecture: 'Architektur', risks: 'Risiken', buildability: 'Umsetzbarkeit',
  },
  'implementation-review': {
    acceptance: 'Abnahmekriterien', 'plan-fidelity': 'Treue zum Plan', design: 'Aufbau', tests: 'Tests', risks: 'Risiken',
  },
};
const SCRIPT_REVIEWER = /^skript(?::|$)/;
const SCRIPT_LABEL = 'Skript-Prüfung';

function isKnownReviewer(review, name) {
  return SCRIPT_REVIEWER.test(name) || Object.hasOwn(LABELS[review] ?? {}, name);
}

function reviewerLabel(review, name) {
  if (SCRIPT_REVIEWER.test(name)) return SCRIPT_LABEL;
  return Object.hasOwn(LABELS[review] ?? {}, name) ? LABELS[review][name] : name;
}

module.exports = { reviewerLabel, isKnownReviewer };
