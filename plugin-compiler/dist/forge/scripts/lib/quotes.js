'use strict';

// Prüft, ob das Zitat eines Findings wörtlich im geprüften Dokument (oder der mitgegebenen Spec) steht.
// Nur der Spec-Review deckelt ein unbelegtes Zitat; Plan- und Implementierungs-Reviewer zitieren auch Code, dort wird nur gezählt.
// Mehrere Zitate trennt ` ↔ `, Auslassungen `…`; jedes Teilstück muss vorkommen. `Quelle: …` zitiert eine Zusatzquelle
// und bleibt ungeprüft. Markdown-Auszeichnung und Anführungszeichen zählen nicht, Leerraum wird zusammengefasst.

const SOURCE_PREFIX = /^\s*Quelle:/;
const FRAGMENT_SPLIT = /\s*(?:↔|…|\.\.\.)\s*/;
const MIN_FRAGMENT = 4;

function normalize(text) {
  return String(text)
    .replace(/\*\*|__|`/g, '')
    .replace(/[„“”"«»‚‘’']/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function fragments(quote) {
  return String(quote).split(FRAGMENT_SPLIT).map(normalize).filter((part) => part.length >= MIN_FRAGMENT);
}

// 'quelle' | 'belegt' | 'unbelegt'; `sources` sind die Volltexte, gegen die geprüft wird.
function quoteStatus(quote, sources) {
  if (SOURCE_PREFIX.test(String(quote))) return 'quelle';
  const parts = fragments(quote);
  if (parts.length === 0) return 'unbelegt';
  const haystacks = sources.filter(Boolean).map(normalize);
  return parts.every((part) => haystacks.some((text) => text.includes(part))) ? 'belegt' : 'unbelegt';
}

// Zähler je Reviewer aus bewerteten Items mit `quote`-Status; Skript-Befunde zählen nicht.
function quoteCounts(items) {
  const counts = {};
  for (const item of items.filter((entry) => entry.quote)) {
    const entry = counts[item.reviewer] ?? { belegt: 0, unbelegt: 0, quelle: 0 };
    entry[item.quote] += 1;
    counts[item.reviewer] = entry;
  }
  return counts;
}

module.exports = { quoteStatus, quoteCounts, normalize };
