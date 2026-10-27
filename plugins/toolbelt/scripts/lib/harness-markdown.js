'use strict';

// Lesehilfen für die Paketdateien von harness-refactoring: Abschnitte nach Überschrift, Felder der Form **Name:** Wert, Listenzeilen.

function linesOf(text) {
  return text.replace(/\r\n/g, '\n').split('\n');
}

function levelOf(line) {
  const match = /^(#+) /.exec(line);
  return match ? match[1].length : 0;
}

// Zeilen unter der Überschrift bis zur nächsten Überschrift derselben oder einer höheren Ebene.
function body(lines, start) {
  const level = levelOf(lines[start]);
  const end = lines.findIndex((line, index) => index > start && levelOf(line) > 0 && levelOf(line) <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

// Zeilen eines Abschnitts; null, wenn die Überschrift fehlt.
function section(text, heading) {
  const lines = linesOf(text);
  const start = lines.findIndex((line) => line.trim() === heading);
  return start === -1 ? null : body(lines, start);
}

// Alle Abschnitte, deren Überschrift auf das Muster passt, in Reihenfolge, mit dem Treffer des Musters.
function sectionsMatching(text, pattern) {
  const lines = linesOf(text);
  return lines.flatMap((line, index) => {
    const match = pattern.exec(line.trim());
    return match ? [{ match, lines: body(lines, index) }] : [];
  });
}

function field(lines, name) {
  const prefix = `**${name}:** `;
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  return line === undefined ? null : line.slice(prefix.length).trim();
}

function items(lines) {
  return (lines ?? []).filter((line) => line.startsWith('- '));
}

function missingHeadings(text, headings) {
  return headings.filter((heading) => section(text, heading) === null);
}

module.exports = { linesOf, section, sectionsMatching, field, items, missingHeadings };
