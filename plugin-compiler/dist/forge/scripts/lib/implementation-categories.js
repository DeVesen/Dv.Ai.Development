'use strict';

// Kategorien der fünf Implementierungs-Reviewer und ihre Farben. Wie im Spec- und Plan-Review (rules.js) nennt der Reviewer nur die
// Kategorie, die Farbe vergibt der Code. Je Prüfauftrag-Regel der Agents gibt es genau eine Kategorie.

const IMPLEMENTATION_CATEGORIES = {
  acceptance: {
    'ac-verfehlt': 'red', 'ac-unbelegt': 'red', 'ac-ohne-test': 'yellow', anmerkung: 'green',
  },
  'plan-fidelity': {
    'plan-fehlt': 'red', 'plan-abweichung-bricht': 'red', 'plan-abweichung': 'yellow', anmerkung: 'green',
  },
  design: {
    'design-regelbruch': 'red', duplikat: 'red', verantwortung: 'yellow', lesbarkeit: 'yellow', 'muster-bruch': 'yellow', dateigroesse: 'yellow', anmerkung: 'green',
  },
  tests: {
    'test-rot': 'red', 'suite-nicht-ausfuehrbar': 'red', 'test-ohne-assertion': 'red', 'testlauf-rauschen': 'yellow', 'test-schwach': 'yellow',
    'test-randfall-fehlt': 'yellow', 'test-flaky': 'green', anmerkung: 'green',
  },
  risks: {
    'fehler-verschluckt': 'red', 'risiko-sicherheit': 'red', 'randfall-falsch': 'red', 'annahme-datenverlust': 'red',
    'fehler-ohne-kontext': 'yellow', 'randfall-schwach': 'yellow', 'annahme-schnittstelle': 'yellow', anmerkung: 'green',
  },
};

function hasCategories(reviewer) {
  return Object.hasOwn(IMPLEMENTATION_CATEGORIES, reviewer);
}

// Farbe der Kategorie bei diesem Reviewer oder null, wenn der Reviewer keine Kategorien hat oder sie nicht kennt.
function categoryColor(reviewer, category) {
  return hasCategories(reviewer) && Object.hasOwn(IMPLEMENTATION_CATEGORIES[reviewer], category) ? IMPLEMENTATION_CATEGORIES[reviewer][category] : null;
}

module.exports = { IMPLEMENTATION_CATEGORIES, hasCategories, categoryColor };
