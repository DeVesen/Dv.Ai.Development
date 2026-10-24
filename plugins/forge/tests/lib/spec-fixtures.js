'use strict';

// Kleinste Spec, die spec-lint.js ohne Befund besteht.
const VALID_SPEC = [
  '# Export', '', 'Status: bestätigt am 2026-10-01', 'Art: frei', 'Basis: abc1234', '',
  '## Was, wie, wo, warum', 'Kunden exportieren. · Aussage', '',
  '## Theoretisches Verhalten nach Umsetzung', 'Eine Datei entsteht. · Aussage', '',
  '## Soll-Vorgaben', '- Spalten Name, Ort. · Aussage', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben drei Kunden, wenn der Anwender exportiert, dann hat die Datei drei Zeilen. · Aussage',
  '- **AC-02** Gegeben kein Kunde, wenn der Anwender exportiert, dann hat die Datei nur die Kopfzeile. · Aussage', '',
  '## Entscheidungen', '- **W · Format** · Aussage — CSV.', '',
].join('\n');

module.exports = { VALID_SPEC };
