'use strict';

// Pflichttext im Chat: Anker aus einer Textdatei ableiten und am Zugende prüfen.

const HEADING = /^#{2,3} /;
const QUESTION = /^(?:\*\*)?Frage \d/;
const MIN_SHARE = 0.6;
const MAX_NAMED = 3;
const MAX_ATTEMPTS = 2;

function squash(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function filledLines(text) {
  return String(text).split('\n').map(squash).filter((line) => line !== '');
}

function anchorsOf(text) {
  return filledLines(text).filter((line) => HEADING.test(line) || QUESTION.test(line));
}

function mustShowOf(text, file) {
  return { file, anchors: anchorsOf(text), lines: filledLines(text).length, text, attempts: 0 };
}

function checkShown(mustShow, shown) {
  const flat = squash(String(shown));
  return {
    missing: mustShow.anchors.filter((anchor) => !flat.includes(anchor)),
    tooShort: filledLines(shown).length < mustShow.lines * MIN_SHARE,
  };
}

function blockReason(mustShow, check) {
  const gap = check.missing.length > 0 ? `Es fehlt: ${check.missing.slice(0, MAX_NAMED).join(' | ')}` : 'Der Text ist zu kurz';
  return `dv-forge: Gib den folgenden Text unverändert im Chat aus. ${gap}. `
    + `Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.\n\n${mustShow.text}`;
}

// `mustShow: null` im Ergebnis heißt: Pflichttext aus dem Marker löschen.
function decideTurnEnd(mustShow, shown) {
  const check = checkShown(mustShow, shown);
  const complete = check.missing.length === 0 && !check.tooShort;
  // Fehlende Zähler (beschädigter Marker) zählen ab 0, damit die Sperre sicher endet.
  const attempts = mustShow.attempts ?? 0;
  if (complete || attempts >= MAX_ATTEMPTS) return { reason: null, mustShow: null };
  return { reason: blockReason(mustShow, check), mustShow: { ...mustShow, attempts: attempts + 1 } };
}

module.exports = { anchorsOf, mustShowOf, decideTurnEnd };
