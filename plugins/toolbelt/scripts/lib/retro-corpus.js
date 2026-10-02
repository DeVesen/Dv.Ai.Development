'use strict';

// Der Text eines Protokolls, gegen den die Zitate eines Entwurfs geprüft werden.

// Alle Texte eines Werts als Rohtext, ohne JSON-Maskierung von Anführungszeichen, Zeilenumbrüchen und Backslashes.
function stringsOf(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsOf);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
  return [];
}

// Wie `textOf`, liest aber auch Tool-Eingaben und verschachtelte Tool-Ergebnisse.
function plainText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (part?.type === 'tool_use') return stringsOf(part.input).join('\n');
    if (part?.type === 'tool_result') return plainText(part.content);
    return part?.text ?? '';
  }).join('\n');
}

// Zitate dürfen aus Nachrichten, Tool-Eingaben, Harness-Anhängen (Hook-Texte, eingeblendete Anweisungen) und system-Einträgen stammen.
function entryText(entry) {
  if (entry.attachment) return stringsOf(entry.attachment).join('\n');
  if (entry.type === 'system') return stringsOf(entry.content).join('\n');
  return plainText(entry.message?.content);
}

// Der ganze Text eines Protokolls, gegen den die Zitate eines Entwurfs geprüft werden.
function corpusOf(entries) {
  return entries.map(entryText).filter(Boolean).join('\n');
}

module.exports = { corpusOf };
