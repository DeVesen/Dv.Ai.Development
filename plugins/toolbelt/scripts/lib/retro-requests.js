'use strict';

// Modell-Anfragen eines Protokolls und die Größe ihres Kontexts.

const { tokensOf } = require('./transcript');

function contextOf(usage = {}) {
  const { input, cached } = tokensOf(usage);
  return input + cached;
}

// Eine Modell-Anfrage je requestId; ihre Teile stehen als mehrere assistant-Einträge im Protokoll.
function requestsOf(entries) {
  const seen = new Set();
  return entries.flatMap((entry) => {
    if (entry.type !== 'assistant' || !entry.message) return [];
    const id = entry.requestId ?? entry.uuid ?? `eintrag-${entry.entryNo}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ entryNo: entry.entryNo, time: entry.timestamp ?? null, usage: entry.message.usage ?? {} }];
  });
}

module.exports = { contextOf, requestsOf };
