'use strict';

// Grobe Spracherkennung für Skill-Texte: zählt häufige deutsche gegen häufige englische Funktionswörter.

const GERMAN = ['der', 'die', 'das', 'und', 'nicht', 'wenn', 'mit', 'ein', 'eine', 'für', 'von', 'zu', 'ist', 'nur', 'nach', 'vor', 'du', 'den', 'dem'];
const ENGLISH = ['the', 'and', 'not', 'when', 'with', 'for', 'of', 'to', 'is', 'only', 'after', 'before', 'you', 'this', 'that'];

function wordsOf(text) {
  return text.toLowerCase().match(/[a-zäöüß]+/g) ?? [];
}

function occurrences(text, list) {
  const known = new Set(list);
  return wordsOf(text).filter((word) => known.has(word)).length;
}

function isMostlyGerman(text) {
  return occurrences(text, GERMAN) > 2 * occurrences(text, ENGLISH);
}

module.exports = { isMostlyGerman };
