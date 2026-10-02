'use strict';

// Klartext für den Menschen: keine Kürzel der Dokumente, nicht leer, höchstens 400 Zeichen.

const MAX_LENGTH = 400;
const SHORTHAND = /\bAC-\d+|\bTask \d+|\bR\d+\b|\bF · |\bW · /;

function plainProblem(text) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (value === '') return 'leer';
  const hit = SHORTHAND.exec(value);
  if (hit) return `Kürzel ${hit[0].trim()}`;
  return value.length > MAX_LENGTH ? `länger als ${MAX_LENGTH} Zeichen (${value.length})` : null;
}

module.exports = { plainProblem };
