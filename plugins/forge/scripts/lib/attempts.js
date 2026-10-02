'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { FlowError } = require('./flow-error');

const FILE = 'versuche.json';
const SEQUENCES = {
  instanz: ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'],
  buendelung: ['KORRIGIEREN', 'AUSGEFALLEN'],
};

function isKind(kind) {
  return Object.hasOwn(SEQUENCES, kind);
}

// Ein beschädigter Zähler bricht kontrolliert ab: Er ist der einzige Schutz gegen endlose Nachforderungen.
function readAttempts(workspace) {
  const file = path.join(workspace, FILE);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
  }
}

// Nächster Schritt für eine Instanz ohne gültiges Ergebnis; der Zähler liegt im Arbeitsbereich und überdauert das Anhalten.
function nextAttempt(workspace, instance, kind = 'instanz') {
  const sequence = SEQUENCES[kind];
  const attempts = readAttempts(workspace);
  const id = `${kind}:${instance}`;
  const used = Math.min((attempts[id] ?? 0) + 1, sequence.length);
  fs.writeFileSync(path.join(workspace, FILE), `${JSON.stringify({ ...attempts, [id]: used })}\n`);
  return sequence[used - 1];
}

function failedInstances(workspace) {
  const failed = Object.entries(readAttempts(workspace))
    .filter(([id, used]) => SEQUENCES[id.split(':')[0]].length === used)
    .map(([id]) => id.slice(id.indexOf(':') + 1));
  return [...new Set(failed)];
}

module.exports = { readAttempts, isKind, nextAttempt, failedInstances };
