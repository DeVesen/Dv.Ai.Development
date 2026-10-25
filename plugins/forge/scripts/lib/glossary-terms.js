'use strict';

// Glossar-Konformität einer Spec: Das eigene Glossar nach skills/domain-modeling/references/context-format.md ist eine Tabelle
// `| Begriff | Bedeutung | Nicht verwenden |`; die Spalte „Nicht verwenden“ nennt die verworfenen Synonyme kommagetrennt und ist damit maschinenlesbar.
// Jedes verworfene Synonym in der Spec außerhalb von W-Einträgen und Code ist ein Kandidat (🟡); ein Mensch oder Review bewertet ihn.

const fs = require('node:fs');
const path = require('node:path');

const CELL_SPLIT = /(?<!\\)\|/;
const SEPARATOR_ROW = /^\|?\s*:?-{3,}/;
const NO_SYNONYM = new Set(['-', '—', '–', 'keine', 'keiner', 'keins', 'n/a']);
const MIN_LENGTH = 3;
const FENCE = /^\s*(?:```|~~~)/;
const SECTION = /^## (.+?)\s*$/;
const W_ENTRY = /^- \*\*W · /;
const AC_ENTRY = /^- \*\*(AC-\d+)\*\*/;
const NAMED_ENTRY = /^- \*\*(.+?)\*\*/;
// Beugungsendungen, die ein verworfenes Substantiv trotzdem treffen soll (Kunde → Kunden).
const SUFFIX = '(?:e|en|er|n|s|es)?';
const LETTER_OR_DIGIT = '[\\p{L}\\p{N}]';

function cellsOf(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(CELL_SPLIT).map((cell) => cell.trim());
}

function cleaned(text) {
  return text.replace(/\([^)]*\)/g, '').replace(/[*`„“"'»«]/g, '').trim();
}

function synonymsOf(cell) {
  return cell.split(/[,;]/).map(cleaned).filter((entry) => entry.length >= MIN_LENGTH && !NO_SYNONYM.has(entry.toLowerCase()));
}

// Verworfene Synonyme eines Glossars: [{ synonym, term }]. Eine Tabelle zählt nur mit den Spalten „Begriff“ und „Nicht verwenden“.
function parseGlossary(text) {
  const found = [];
  let columns = null;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim().startsWith('|')) {
      columns = null;
      continue;
    }
    const cells = cellsOf(line);
    const names = cells.map((cell) => cell.toLowerCase());
    if (columns === null) {
      const term = names.indexOf('begriff');
      const banned = names.indexOf('nicht verwenden');
      columns = term !== -1 && banned !== -1 ? { term, banned } : false;
    } else if (columns && !SEPARATOR_ROW.test(line.trim()) && cells[columns.term] !== undefined) {
      const term = cleaned(cells[columns.term]);
      for (const synonym of synonymsOf(cells[columns.banned] ?? '')) found.push({ synonym, term });
    }
  }
  return found;
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir, { recursive: true }).map(String).filter((entry) => entry.toLowerCase().endsWith('.md')).map((entry) => path.join(dir, entry));
}

// Glossar-Dateien zu einem Pfad: eine Datei, oder alle Markdown-Dateien eines Ordners.
function glossaryFiles(target) {
  if (!fs.existsSync(target)) return [];
  return fs.statSync(target).isDirectory() ? markdownFiles(target) : [target];
}

// Quellen im Repo: `CONTEXT.md` im Root, die Bereichs-Glossare der `CONTEXT-MAP.md` und der Ordner der Einstellung `Glossar`.
function glossarySources(root, glossaryDir) {
  const map = path.join(root, 'CONTEXT-MAP.md');
  const mapped = fs.existsSync(map) ? [...fs.readFileSync(map, 'utf8').matchAll(/`([^`]+\.md)`/g)].map((match) => path.resolve(root, match[1])) : [];
  return [...new Set([path.join(root, 'CONTEXT.md'), ...mapped, path.resolve(root, glossaryDir)])];
}

// Verworfene Synonyme aller Glossar-Dateien; ein Synonym, das anderswo kanonischer Begriff ist, entfällt.
function discardedTerms(files) {
  const found = files.flatMap((file) => parseGlossary(fs.readFileSync(file, 'utf8')));
  const canonical = new Set(found.map((entry) => entry.term.toLowerCase()));
  const seen = new Set();
  return found.filter((entry) => {
    const key = `${entry.synonym.toLowerCase()}|${entry.term.toLowerCase()}`;
    if (canonical.has(entry.synonym.toLowerCase()) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pattern(synonym) {
  const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?<!${LETTER_OR_DIGIT})${escaped}${SUFFIX}(?!${LETTER_OR_DIGIT})`, 'iu');
}

// Stelle einer Zeile: AC-Nummer, fett gesetzter Name eines Eintrags oder der Abschnitt; Folgezeilen erben die Stelle des Eintrags.
function spotsOf(specText) {
  let section = null;
  let entry = null;
  let fenced = false;
  const rows = [];
  for (const line of String(specText).replace(/\r\n/g, '\n').split('\n')) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = fenced ? null : SECTION.exec(line);
    if (heading) {
      section = heading[1];
      entry = null;
    } else if (section !== null && !fenced && line.trim() !== '' && !FENCE.test(line)) {
      const named = AC_ENTRY.exec(line)?.[1] ?? NAMED_ENTRY.exec(line)?.[1]?.replace(/:$/, '');
      if (named) entry = named;
      rows.push({ text: line, spot: entry ?? section, decision: W_ENTRY.test(line) });
    } else if (line.trim() === '') {
      entry = null;
    }
  }
  return rows;
}

// Befunde im Format der Skript-Prüfungen (color `yellow`): [{ location, quote, category, consequence, rationale, color }].
function termFindings(specText, discarded, source = 'Glossar') {
  const matchers = discarded.map((entry) => ({ ...entry, regex: pattern(entry.synonym) }));
  const found = [];
  const seen = new Set();
  for (const row of spotsOf(specText).filter((entry) => !entry.decision)) {
    const text = row.text.replace(/`[^`]*`/g, ' ');
    for (const matcher of matchers.filter((candidate) => candidate.regex.test(text))) {
      const key = `${row.spot}|${matcher.synonym.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        location: row.spot, quote: row.text.trim(), category: 'detail', color: 'yellow',
        consequence: `Die Spec nennt „${matcher.synonym}“; das Glossar verwirft den Begriff zugunsten „${matcher.term}“.`,
        rationale: `Skript-Prüfung Glossar (${source}), Spalte „Nicht verwenden“`,
      });
    }
  }
  return found;
}

module.exports = { parseGlossary, glossaryFiles, glossarySources, discardedTerms, termFindings };
