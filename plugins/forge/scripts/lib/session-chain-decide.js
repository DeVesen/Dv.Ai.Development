'use strict';

// Entscheidungen der Leit-Session als reine Funktionen: Ergebnis-Zeile lesen, Empfehlung am Haltepunkt, nächster Schritt
// nach dem `final` einer Etappe und Showstopper der Umsetzung.

const RESULT = /^\*\*Ergebnis:\*\*\s*(.+?)\s*$/m;
const VERDICTS = [['✅', 'bereit'], ['⛔', 'blockiert'], ['❓', 'fragen'], ['⚠️', 'unvollstaendig']];
const NEXT = {
  whiteboarding: { start: 'grill' },
  grill: { start: 'spec-review' },
  'spec-nacharbeit': { start: 'spec-review' },
  'spec-review': { halt: 'spec' },
  planning: { halt: 'go' },
  'plan-nacharbeit': { start: 'plan-review' },
  'plan-review': { halt: 'go' },
  umsetzung: { start: 'abschluss' },
  abschluss: { ende: true },
};
const CHOICES = {
  spec: { bereit: 'Planning', nacharbeit: 'Spec-Nacharbeit' },
  go: { bereit: 'GO', nacharbeit: 'Plan-Nacharbeit' },
};

// Text nach `**Ergebnis:**` (erste solche Zeile) oder null.
function resultOf(text) {
  return RESULT.exec(String(text ?? ''))?.[1] ?? null;
}

function verdictOf(result) {
  if (!result) return 'keins';
  return VERDICTS.find(([icon]) => result.startsWith(icon))?.[1] ?? 'keins';
}

// `art`: spec | go. Ohne Ergebnis-Zeile am GO-Haltepunkt (Einstieg `implementation` ohne Plan-Review) gilt GO.
// Liefert die Empfehlung und, nur bei Stopp, den Grund.
function recommendation(art, result) {
  const verdict = verdictOf(result);
  if (verdict === 'bereit' || (art === 'go' && result === null)) return { empfehlung: CHOICES[art].bereit, grund: null };
  if (verdict === 'blockiert' || verdict === 'fragen') return { empfehlung: CHOICES[art].nacharbeit, grund: null };
  return { empfehlung: 'Stopp', grund: result ? `Das Review ist ${result}.` : 'Das Review hat keine Ergebnis-Zeile geliefert.' };
}

// Gründe, aus denen die Umsetzung hält; leer = kein Showstopper. Ein Integrationspunkt ohne Test ist kein Grund.
function showstoppers({ result, pruefung, luecken = [], acOhneTest = [] }) {
  return [
    ...(verdictOf(result) === 'bereit' ? [] : [`Ergebnis ist nicht ✅: ${result ?? 'keine Ergebnis-Zeile'}`]),
    ...(pruefung === 'gruen' ? [] : [`Prüfergebnis ist nicht grün: ${pruefung ?? 'keine'}`]),
    ...luecken.map((befehl) => `Umgebungslücke: ${befehl} ist nicht lauffähig`),
    ...acOhneTest.map((ac) => `${ac} hat keinen beweisenden Test`),
  ];
}

// Nächster Schritt nach dem `final` der Etappe: { start } | { halt } | { ende }; Showstopper halten die Umsetzung.
function nextStep(etappe, report = {}) {
  if (etappe === 'umsetzung') {
    const gruende = showstoppers(report);
    if (gruende.length > 0) return { halt: 'showstopper', gruende };
  }
  return NEXT[etappe];
}

module.exports = { resultOf, verdictOf, recommendation, showstoppers, nextStep };
