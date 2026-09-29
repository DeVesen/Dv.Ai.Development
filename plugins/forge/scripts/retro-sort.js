#!/usr/bin/env node
'use strict';

// Sortiert die Befunde aller Erfahrungsberichte nach Ziel vor und zählt die MCP-Relevanz, als Vorlage für die Wunschliste.

const fs = require('node:fs');
const path = require('node:path');
const { parseDraft, findingsOf, relevanceLines, parseTarget } = require('./lib/retro-draft');

const USAGE = 'Aufruf: node retro-sort.js [--dir <berichtsordner>]\n';
const REPORT_FILE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const REPORT_TITLE = /^# Erfahrungsbericht\b/;
const TARGET_SECTIONS = ['Reibung', 'Sparpotenzial'];
const VALUES = [['gebraucht', /^gebraucht/i], ['hätte genützt', /^hätte genützt/i], ['verzichtbar', /^verzichtbar/i]];
const RAW_TARGET_MAX = 40;
const OPEN_KEY = 'Ziel offen';
const LEGACY_TARGET = /^([^·]+?) · `neu:` (?:[^·]+?· )?(.+?)\s*(?:\(|$)/;
const RAW_TARGET = /^([^·]+?)\s+·\s+(.*)$/;

// Berichte sind datierte Dateien mit dem Titel „# Erfahrungsbericht"; Wunschliste und andere Dokumente zählen nicht.
function reportsIn(dir) {
  return fs.readdirSync(dir).filter((name) => REPORT_FILE.test(name)).sort()
    .map((name) => ({ name, text: fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n') }))
    .filter(({ text }) => REPORT_TITLE.test(text.trimStart()));
}

// Die ältere Form „<Art> · `neu:` <Art> · <Name>" lässt die Prüfung nicht mehr zu; alte Berichte fallen trotzdem in die Gruppe des neu:-Ziels.
function legacyTarget(value) {
  const match = value.match(LEGACY_TARGET);
  return match ? { art: match[1].trim(), name: match[2].trim(), isNew: true, open: false } : null;
}

// Ziel-Zeilen außerhalb der Grammatik gruppieren nach Art und dem Anfang des Rests; ohne Art gelten sie als offen.
function rawKey(value) {
  const match = value.match(RAW_TARGET);
  return match ? `${match[1]} · ${match[2].trim().slice(0, RAW_TARGET_MAX)}` : OPEN_KEY;
}

// Gruppenschlüssel „<Art> · <Name>" oder „<Art> · neu: <Name>"; die Grammatik kommt aus `parseTarget` in lib/retro-draft.js.
function targetKey(target) {
  const value = (target ?? '').trim();
  const parsed = parseTarget(value) ?? legacyTarget(value);
  if (!parsed) return rawKey(value);
  if (parsed.open) return OPEN_KEY;
  return parsed.isNew ? `${parsed.art} · neu: ${parsed.name}` : `${parsed.art} · ${parsed.name}`;
}

function classify(value) {
  return VALUES.find(([, pattern]) => pattern.test(value))?.[0] ?? 'sonstig';
}

// Je Befund unter Reibung und Sparpotenzial ein Gruppenschlüssel und seine Zeile.
function findingLines(reports) {
  return reports.flatMap(({ name, text }) => {
    const draft = parseDraft(text);
    return TARGET_SECTIONS.flatMap((section) => findingsOf(draft.sections.get(section))
      .map((finding) => ({ key: targetKey(finding.fields.get('Ziel')), line: `- ${finding.title} · ${section} · ${name}` })));
  });
}

function relevanceRows(reports) {
  return reports.flatMap(({ text }) => relevanceLines(parseDraft(text).lines));
}

function withoutRelevanceOf(reports) {
  return reports.filter(({ text }) => relevanceLines(parseDraft(text).lines).length === 0).map(({ name }) => name);
}

function groupBy(items) {
  return items.reduce((groups, { key, line }) => groups.set(key, [...(groups.get(key) ?? []), line]), new Map());
}

function countRelevance(rows) {
  return rows.reduce((counts, { mcp, value }) => {
    const row = counts.get(mcp) ?? { gebraucht: 0, 'hätte genützt': 0, verzichtbar: 0, sonstig: 0 };
    row[classify(value)] += 1;
    return counts.set(mcp, row);
  }, new Map());
}

function collect(reports) {
  return {
    groups: groupBy(findingLines(reports)),
    relevance: countRelevance(relevanceRows(reports)),
    withoutRelevance: withoutRelevanceOf(reports),
  };
}

function render(reports, { groups, relevance, withoutRelevance }) {
  const findings = [...groups.values()].reduce((sum, list) => sum + list.length, 0);
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const rows = [...relevance.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mcp, row]) => `| ${mcp} | ${row.gebraucht} | ${row['hätte genützt']} | ${row.verzichtbar} | ${row.sonstig} |`);
  return [
    `# Vorsortierung: ${reports.length} Berichte, ${findings} Befunde`,
    '',
    ...sorted.flatMap(([key, list]) => [`## ${key} (${list.length})`, ...list, '']),
    '## MCP-Relevanz',
    '',
    '| MCP | gebraucht | hätte genützt | verzichtbar | sonstig |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `Ohne Relevanz-Zeile: ${withoutRelevance.join(', ') || 'keiner'}`,
    '',
  ].join('\n');
}

function sort(dir) {
  if (!fs.existsSync(dir)) return `Keine Berichte: Ordner ${dir} fehlt.\n`;
  const reports = reportsIn(dir);
  if (reports.length === 0) return `Keine Berichte in ${dir}.\n`;
  return render(reports, collect(reports));
}

function main() {
  const args = process.argv.slice(2);
  const valid = args.length === 0 || (args.length === 2 && args[0] === '--dir');
  if (!valid) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  process.stdout.write(sort(path.resolve(args[1] ?? path.join('docs', 'wishes'))));
}

if (require.main === module) main();

module.exports = { targetKey, sort };
