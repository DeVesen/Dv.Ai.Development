'use strict';

// Was der Assistent im laufenden Zug geschrieben hat: alle Texte seit der letzten Eingabe des Menschen.

const { readEntries, humanEvents } = require('./transcript');

function lastInputNumber(entries) {
  const inputs = humanEvents(entries).filter((event) => event.kind === 'Eingabe');
  return inputs.length > 0 ? inputs[inputs.length - 1].entryNo : 0;
}

function textBlocks(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) ? content.filter((part) => part.type === 'text').map((part) => part.text) : [];
}

// `lastMessage` ist die letzte Nachricht aus dem Hook-Input; sie steht womöglich noch nicht im Protokoll.
function turnText(transcriptFile, lastMessage) {
  const entries = readEntries(transcriptFile);
  const since = lastInputNumber(entries);
  const texts = entries
    .filter((entry) => entry.type === 'assistant' && !entry.isSidechain && entry.entryNo > since)
    .flatMap(textBlocks);
  return [...texts, lastMessage ?? ''].join('\n');
}

module.exports = { turnText };
