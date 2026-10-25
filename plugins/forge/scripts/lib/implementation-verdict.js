'use strict';

// Urteil eines Berichts von implementation-task-reviewer, implementation-re-reviewer oder implementation-final-reviewer.
// Reine Funktion auf dem Markdown-Text: zählt die Farben der Findings und liest die Urteilszeile, damit der Controller nach dem Skript handelt
// und nicht nach seiner Lesart. Ein positives Urteil neben einem 🔴 (oder bei der Übergabe neben einem `beheben`-Punkt) wird korrigiert.

const VERDICT_LINE = /^\*\*(Task|Fix-Runde|Übergabe):\*\*\s*(.+?)\s*$/mu;
const SECTION = /^### (.+?)\s*$/;
const ITEM = /^\s*[-*]\s*(🔴|🟡|🟢)/u;
const FIX_BEHEBEN = /\s—\s*beheben(?:\s—|\s*$)/u;
const COLOR_OF = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
// Abschnitte mit Farbzeilen: Findings bei allen Berichten, dazu die Neuen Schäden des Re-Reviewers. Außerhalb des Scopes zählt nie mit.
const COUNTED = ['Findings', 'Neue Schäden im Fix-Diff'];

function sectionsOf(text) {
  const sections = new Map();
  let current = null;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const heading = SECTION.exec(line);
    if (heading) {
      current = [];
      sections.set(heading[1], current);
    } else if (current) {
      current.push(line);
    }
  }
  return sections;
}

function countColors(sections) {
  const counts = { red: 0, yellow: 0, green: 0 };
  for (const name of COUNTED) {
    for (const line of sections.get(name) ?? []) {
      const icon = ITEM.exec(line)?.[1];
      if (icon) counts[COLOR_OF[icon]] += 1;
    }
  }
  return counts;
}

// Wert der Urteilszeile in der Schreibweise des Skripts; null, wenn die Zeile den Wert nicht nennt.
function valueOf(kind, text) {
  if (kind === 'Task') return /^(freigegeben|nachbessern)\b/.exec(text)?.[1] ?? null;
  if (kind === 'Fix-Runde') {
    if (/^alle behoben, keine neuen 🔴/u.test(text)) return 'sauber';
    return /^offen\b/.test(text) ? 'offen' : null;
  }
  const given = /^(ja|mit Korrekturen|nein)\b/.exec(text)?.[1];
  return given === 'mit Korrekturen' ? 'mit-korrekturen' : given ?? null;
}

const POSITIVE_FALLBACK = { freigegeben: 'nachbessern', sauber: 'nachbessern', ja: 'mit-korrekturen' };

// Ergebnis: { problem } ohne lesbare Urteilszeile, sonst { value, note, red, yellow, green, fix? }; `fix`: Zahl der `beheben`-Punkte (nur Übergabe).
function verdictOf(text) {
  const match = VERDICT_LINE.exec(String(text));
  if (!match) return { problem: 'Urteilszeile fehlt (**Task:**, **Fix-Runde:** oder **Übergabe:**)' };
  const [, kind, line] = match;
  const given = valueOf(kind, line);
  if (!given) return { problem: `Urteil nicht lesbar: ${line}` };
  const sections = sectionsOf(text);
  const counts = countColors(sections);
  const fix = kind === 'Übergabe' ? (sections.get('Zurückgestellt') ?? []).filter((entry) => FIX_BEHEBEN.test(entry)).length : 0;
  const reasons = [...(counts.red > 0 ? ['🔴 vorhanden'] : []), ...(fix > 0 ? ['beheben-Punkte vorhanden'] : [])];
  const corrected = Object.hasOwn(POSITIVE_FALLBACK, given) && reasons.length > 0;
  return {
    value: corrected ? POSITIVE_FALLBACK[given] : given, note: corrected ? `(korrigiert: ${reasons.join(', ')})` : null,
    red: counts.red, yellow: counts.yellow, green: counts.green, ...(kind === 'Übergabe' ? { fix } : {}),
  };
}

// Eine Zeile: `URTEIL <wert> [(korrigiert: …)] ROT=<n> GELB=<n> [BEHEBEN=<n>]`.
function verdictLine(result) {
  return ['URTEIL', result.value, ...(result.note ? [result.note] : []), `ROT=${result.red}`, `GELB=${result.yellow}`, ...(result.fix === undefined ? [] : [`BEHEBEN=${result.fix}`])].join(' ');
}

module.exports = { verdictOf, verdictLine };
