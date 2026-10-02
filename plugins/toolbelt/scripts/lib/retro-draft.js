'use strict';

// Liest den Entwurf eines Erfahrungsberichts und prüft ihn gegen das Berichtsformat.

const { sameServer } = require('../mcp-usage');
const { escapeRegExp } = require('./regexp');

const SECTIONS = ['Positiv', 'Reibung', 'Sparpotenzial', 'Neue Ideen', 'Kleinigkeiten'];
const HEAD_FIELDS = ['**Lauf:**', '**Ergebnis:**', '**Relevanz:**'];
const FIELDS = {
  Reibung: ['Situation', 'Kosten', 'Ursache', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
  Sparpotenzial: ['Situation', 'Ersparnis', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
};
const AMOUNT = { Reibung: 'Kosten', Sparpotenzial: 'Ersparnis' };
const ART = '(Plugin|Skill|Agent|CLAUDE\\.md|Hook|Skript|MCP)';
const NAMED_TARGET = new RegExp(`^${ART} · \`([^\`]+)\``);
const NEW_TARGET = new RegExp(`^${ART} · neu: (.+?)\\s*(?:[·(]|$)`);
const OPEN_TARGET = /^Ziel offen\b/;
const LEGACY_NEW_NAME = 'neu:';
const FINDING = /^\d+\.\s+\*\*(.+?)\*\*/;
const FIELD = /^\s+\*([^*]+):\*\s?(.*)$/;
const PROJECT_FIELD = /^\s*\*Im Projekt:\*/;
const RELEVANCE_LINE = /^- `?([^:`]+)`?:\s*(.*)$/;
const QUOTE = /„([^“”]+)[“”]|"([^"]+)"/g;

function parseDraft(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const firstSection = lines.findIndex((line) => /^## /.test(line));
  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) sections.set(current = heading[1], []);
    else if (current) sections.get(current).push(line);
  }
  return {
    lines,
    title: lines.find((line) => /^# /.test(line)) ?? null,
    head: lines.slice(0, firstSection === -1 ? lines.length : firstSection),
    sections,
  };
}

function findingsOf(sectionLines = []) {
  const findings = [];
  for (const line of sectionLines) {
    const start = line.match(FINDING);
    if (start) findings.push({ title: start[1].replace(/\.$/, ''), fields: new Map() });
    const field = line.match(FIELD);
    if (field && findings.length > 0) findings[findings.length - 1].fields.set(field[1].trim(), field[2].trim());
  }
  return findings;
}

// Zeilen `- <mcp>: <wert>` direkt unter **Relevanz:**; Leerzeilen davor zählen nicht.
function relevanceLines(lines) {
  const start = lines.findIndex((line) => line.startsWith('**Relevanz:**'));
  if (start === -1) return [];
  const found = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(RELEVANCE_LINE);
    if (match) found.push({ mcp: match[1].trim(), value: match[2].trim() });
    else if (line.trim() !== '' || found.length > 0) break;
  }
  return found;
}

// Die einzige Grammatik der Ziel-Zeile. Die Alt-Form „<Art> · `neu:` …“ lässt die Prüfung nicht mehr zu: null wie freier Text.
function parseTarget(text) {
  const value = String(text ?? '').trim();
  if (OPEN_TARGET.test(value)) return { art: '', name: '', isNew: false, open: true };
  const fresh = value.match(NEW_TARGET);
  if (fresh) return { art: fresh[1], name: fresh[2].trim(), isNew: true, open: false };
  const named = value.match(NAMED_TARGET);
  if (!named || named[2] === LEGACY_NEW_NAME) return null;
  return { art: named[1], name: named[2], isNew: false, open: false };
}

function findingViolations(section, number, finding) {
  const where = `${section} ${number} „${finding.title}“`;
  const found = FIELDS[section].filter((field) => !finding.fields.has(field)).map((field) => `${where}: Pflichtfeld fehlt: *${field}:*`);
  const target = finding.fields.get('Ziel');
  if (target !== undefined && !parseTarget(target)) {
    found.push(`${where}: Ziel-Zeile folgt keiner der Formen „<Art> · \`<Name>\`“, „<Art> · neu: <Arbeitsname>“, „Ziel offen“`);
  }
  const amount = finding.fields.get(AMOUNT[section]);
  if (amount !== undefined && !/\d/.test(amount) && !/· Eindruck\s*$/.test(amount)) {
    found.push(`${where}: *${AMOUNT[section]}:* ohne Zahl und ohne „· Eindruck“`);
  }
  return found;
}

function structureViolations(draft) {
  const found = [];
  if (!draft.title || !/^# Erfahrungsbericht\b/.test(draft.title)) found.push('Pflichtfeld fehlt: Titel „# Erfahrungsbericht …“');
  found.push(...HEAD_FIELDS.filter((field) => !draft.head.some((line) => line.startsWith(field))).map((field) => `Pflichtfeld fehlt: ${field}`));
  found.push(...SECTIONS.filter((section) => !draft.sections.has(section)).map((section) => `Pflichtabschnitt fehlt: ## ${section}`));
  return found;
}

function relevanceViolations(draft, expected) {
  const named = relevanceLines(draft.head).map((line) => line.mcp);
  return expected.filter((name) => !named.some((line) => sameServer(line, name) || sameServer(name, line)))
    .map((name) => `Relevanz-Zeile fehlt für erwartetes MCP: ${name}`);
}

function projectNameViolations(lines, projectFiles) {
  return lines.flatMap((line, index) => {
    if (PROJECT_FIELD.test(line)) return [];
    return projectFiles.filter((name) => new RegExp(`(?<![\\w.-])${escapeRegExp(name)}(?![\\w-])`).test(line))
      .map((name) => `Projekt-Dateiname außerhalb von *Im Projekt:*: ${name} (Zeile ${index + 1})`);
  });
}

function normalized(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// Zitate in „…“ oder "…" unter *Im Projekt:*; Code in Backticks ist kein Zitat.
function quoteViolations(lines, corpus) {
  const text = normalized(corpus);
  return lines.flatMap((line, index) => {
    if (!PROJECT_FIELD.test(line)) return [];
    return [...line.replace(/`[^`]*`/g, '').matchAll(QUOTE)].map((match) => normalized(match[1] ?? match[2]))
      .filter((quote) => !text.includes(quote))
      .map((quote) => `Zitat steht nicht im Protokoll: „${quote}“ (Zeile ${index + 1})`);
  });
}

// Alle Verstöße einzeln; `corpus` ist der Text des Protokolls, gegen den die Zitate geprüft werden.
function violations(text, { expected = [], projectFiles = [] }, corpus) {
  const draft = parseDraft(text);
  const findings = Object.keys(FIELDS).flatMap((section) => findingsOf(draft.sections.get(section))
    .flatMap((finding, index) => findingViolations(section, index + 1, finding)));
  return [
    ...structureViolations(draft),
    ...findings,
    ...relevanceViolations(draft, expected),
    ...projectNameViolations(draft.lines, projectFiles),
    ...quoteViolations(draft.lines, corpus),
  ];
}

function newTargets(text) {
  const draft = parseDraft(text);
  return Object.keys(FIELDS).flatMap((section) => findingsOf(draft.sections.get(section)).flatMap((finding) => {
    const target = parseTarget(finding.fields.get('Ziel'));
    return target?.isNew ? [{ art: target.art, name: target.name, finding: finding.title }] : [];
  }));
}

module.exports = { SECTIONS, parseDraft, findingsOf, relevanceLines, parseTarget, violations, newTargets };
