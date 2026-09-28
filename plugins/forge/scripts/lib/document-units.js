'use strict';

const { normalizeLocation } = require('../aggregate-findings');

// Stellen eines Dokuments: Kopfzeile, Abschnitt, benannte Einheit (AC, Schritt, Soll-Vorgabe) oder Task.
const HEAD_KEY = 'Kopf';
const HEADER_LINE = /^\*{0,2}(Status|Art|Workitem|Basis):\*{0,2}/;
const HEADER_LOCATION = /^(?:Kopfzeile\s+)?`?(Status|Art|Workitem|Basis)`?:?$/i;
const SECTION = /^## +(.+?)\s*$/;
const TASK = /^### +Task +(\d+):/;
const NAMED_ITEM = /^(?:[-*]|\d+\.) +\*\*(.+?)\*\*/;
const NUMBERING = /^\d+(?:\.\d+)*\.?\s+/;
const W_ENTRY = /^- \*\*W · (.+?)\*\*/;
const R_QUESTION = /^- \*\*R\d+ · (.+?)\*\* — frage an den menschen — (.*)$/;
const EDGE_BEFORE = '(?<![\\p{L}\\p{N}_-])';
const EDGE_AFTER = '(?![\\p{L}\\p{N}_-])';
const PATTERN_KEY = new RegExp(`${EDGE_BEFORE}(AC-\\d+|Task \\d+)${EDGE_AFTER}`, 'iu');

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapse(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function lines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function newUnit(key, section, kind) {
  return { key, canon: normalizeLocation(key), section, kind, lines: [] };
}

function sectionUnit(line) {
  const key = SECTION.exec(line)[1].replace(NUMBERING, '');
  const unit = newUnit(key, key, /Entscheidungen$/.test(key) ? 'decisions' : 'section');
  unit.lines.push(line);
  return unit;
}

function lineUnit(line, section, current) {
  const header = section.key === HEAD_KEY ? HEADER_LINE.exec(line) : null;
  if (header) return { unit: newUnit(header[1], HEAD_KEY, 'header'), next: section };
  const task = TASK.exec(line);
  if (task) return { unit: newUnit(`Task ${task[1]}`, `Task ${task[1]}`, 'task') };
  if (section.kind === 'decisions' || current.kind === 'task') return { target: current };
  const item = NAMED_ITEM.exec(line);
  if (item) return { unit: newUnit(item[1].replace(/:$/, '').trim(), section.key, 'item') };
  const continues = current.kind === 'item' && (line.trim() === '' || /^\s/.test(line));
  return { target: continues ? current : section };
}

function parseUnits(text) {
  let section = newUnit(HEAD_KEY, HEAD_KEY, 'section');
  let current = section;
  const units = [section];
  for (const line of lines(text)) {
    if (SECTION.test(line)) {
      section = sectionUnit(line);
      current = section;
      units.push(section);
      continue;
    }
    const { unit, next, target } = lineUnit(line, section, current);
    if (unit) {
      unit.lines.push(line);
      units.push(unit);
      current = next ?? unit;
    } else {
      target.lines.push(line);
      current = target;
    }
  }
  const sectionUnits = new Map(units.filter((unit) => unit.kind !== 'item' && unit.kind !== 'header').map((unit) => [unit.canon, unit]));
  return { units, sectionUnits };
}

function unitText(unit) {
  return unit.lines.map(collapse).filter(Boolean).join('\n');
}

function keyPattern(key, flags) {
  return new RegExp(`${EDGE_BEFORE}${escapeRegExp(key)}${EDGE_AFTER}`, flags);
}

function earliestKey(location, model) {
  let best = null;
  const consider = (key, index) => {
    if (index === -1) return;
    if (!best || index < best.index || (index === best.index && key.length > best.key.length)) best = { key, index };
  };
  for (const unit of model.units) if (unit.kind !== 'header') consider(unit.key, location.search(keyPattern(unit.key, 'iu')));
  const pattern = PATTERN_KEY.exec(location);
  if (pattern) consider(pattern[1], pattern.index);
  return best;
}

function knownUnit(key, model) {
  const canon = normalizeLocation(key);
  return model.units.find((unit) => unit.canon === canon) ?? { key, canon, kind: 'external', section: null };
}

function unitOfQuote(quote, model) {
  const parts = String(quote).split(' ↔ ').map(collapse).filter(Boolean);
  for (const part of parts) {
    const unit = model.units.find((candidate) => collapse(candidate.lines.join(' ')).includes(part));
    if (unit) return unit.kind === 'task' ? unit : model.sectionUnits.get(normalizeLocation(unit.section));
  }
  return null;
}

// Stelle eines Findings: die erste im Feld Stelle genannte Einheit, sonst der Abschnitt seines Zitats.
function resolveUnit(finding, model) {
  const location = collapse(finding.location ?? '');
  const header = HEADER_LOCATION.exec(location);
  if (header) return { key: header[1], canon: normalizeLocation(header[1]), kind: 'header', section: HEAD_KEY };
  const hit = earliestKey(location, model);
  if (hit) return knownUnit(hit.key, model);
  return unitOfQuote(finding.quote ?? '', model) ?? { key: location, canon: normalizeLocation(location), kind: 'external', section: null };
}

function numberedLines(text) {
  return lines(text).map((line, index) => ({ line, index }));
}

function wEntries(text) {
  return numberedLines(text)
    .map(({ line, index }) => ({ match: W_ENTRY.exec(line), line, index }))
    .filter(({ match }) => match)
    .map(({ match, line, index }) => ({ title: match[1], line, index }));
}

// Offen ist ein R-Eintrag „frage an den menschen", bis ein späterer W-Eintrag seine Stelle im Titel nennt.
function openQuestions(text) {
  const entries = wEntries(text);
  return numberedLines(text)
    .map(({ line, index }) => ({ match: R_QUESTION.exec(line), index }))
    .filter(({ match }) => match)
    .map(({ match, index }) => ({ key: match[1], canon: normalizeLocation(match[1]), question: match[2], index }))
    .filter((question) => !entries.some((entry) => entry.index > question.index && keyPattern(question.key, 'u').test(entry.title)));
}

function quoteFromW(quote, text) {
  const wanted = collapse(quote);
  return wanted !== '' && wEntries(text).some((entry) => collapse(entry.line).includes(wanted));
}

function comparableUnits(text) {
  const map = new Map();
  for (const unit of parseUnits(text).units) {
    if (unit.kind !== 'decisions' && unit.kind !== 'header') map.set(unit.canon, { key: unit.key, text: unitText(unit) });
  }
  return map;
}

// Geänderte Bereiche: Stellen, deren Text sich zwischen vorher und nachher unterscheidet; Entscheidungen zählen nicht.
function changedUnits(before, after) {
  const old = comparableUnits(before);
  const now = comparableUnits(after);
  const keys = [...now.keys(), ...[...old.keys()].filter((key) => !now.has(key))];
  return keys
    .filter((key) => old.get(key)?.text !== now.get(key)?.text)
    .map((key) => ({ key: (now.get(key) ?? old.get(key)).key, canon: key }));
}

module.exports = { parseUnits, resolveUnit, wEntries, openQuestions, quoteFromW, changedUnits, collapse };
