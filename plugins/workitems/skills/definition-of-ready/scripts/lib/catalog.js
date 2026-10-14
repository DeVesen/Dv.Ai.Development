'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CATALOG = path.join(__dirname, '..', '..', 'references', 'definition-of-ready.md');

const START_MARKER = 'Kriterien für ein Backlog Item';
const END_MARKER = 'Anwendung';
const INTRO_PREFIX = 'Ein Backlog Item ist';

const BLOCKS = [
  { key: 'PF', prefix: 'Produkt und Fachlichkeit' },
  { key: 'UX', prefix: 'UX / Design' },
  { key: 'LM', prefix: 'Lösung und Machbarkeit' },
  { key: 'PN', prefix: 'Planung und Nachvollziehbarkeit' },
];

const DUPLICATE_CONTAINMENT = 0.85;
const DUPLICATE_MIN_TOKENS = 5;

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

function containment(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const token of small) {
    if (large.has(token)) shared += 1;
  }
  return shared / small.size;
}

function findDuplicates(criteria) {
  const tokens = criteria.map((criterion) => tokenize(criterion.text));
  const pairs = [];
  for (let i = 0; i < criteria.length; i += 1) {
    for (let j = i + 1; j < criteria.length; j += 1) {
      const smallest = Math.min(tokens[i].size, tokens[j].size);
      if (smallest >= DUPLICATE_MIN_TOKENS && containment(tokens[i], tokens[j]) >= DUPLICATE_CONTAINMENT) {
        pairs.push({ a: criteria[i].id, b: criteria[j].id });
      }
    }
  }
  return pairs;
}

function catalogLines(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const start = lines.indexOf(START_MARKER);
  if (start === -1) throw new Error(`Katalog: Marker "${START_MARKER}" nicht gefunden`);
  const end = lines.indexOf(END_MARKER, start);
  if (end === -1) throw new Error(`Katalog: Marker "${END_MARKER}" nicht gefunden`);
  return lines.slice(start + 1, end).filter((line) => line !== '' && !line.startsWith(INTRO_PREFIX));
}

function flagsFor(block, blockHeader, text) {
  const onlyWithoutUi = /^Bei Items ohne UI-Anteil/.test(text);
  const alwaysChecked = block.key === 'UX' && /^Data Flow/.test(text);
  const uiBlock = /nur bei/i.test(blockHeader) && /UI/.test(blockHeader);
  return {
    uiOnly: uiBlock && !onlyWithoutUi && !alwaysChecked,
    onlyWithoutUi,
    alwaysChecked,
  };
}

function parseCatalog(text) {
  const criteria = [];
  let block = null;
  let blockHeader = '';
  let counter = 0;
  for (const line of catalogLines(text)) {
    if (line.startsWith('* ')) {
      if (!block) throw new Error(`Katalog: Kriterium vor dem ersten Block: ${line}`);
      counter += 1;
      const criterionText = line.slice(2).trim();
      criteria.push({
        id: `${block.key}-${String(counter).padStart(2, '0')}`,
        block: block.key,
        blockTitle: blockHeader,
        text: criterionText,
        ...flagsFor(block, blockHeader, criterionText),
        duplicateOf: null,
      });
      continue;
    }
    block = BLOCKS.find((candidate) => line.startsWith(candidate.prefix));
    if (!block) throw new Error(`Katalog: unbekannter Block "${line}"`);
    blockHeader = line;
    counter = 0;
  }
  if (criteria.length === 0) throw new Error('Katalog: keine Kriterien gefunden');
  const duplicates = findDuplicates(criteria);
  for (const pair of duplicates) {
    criteria.find((criterion) => criterion.id === pair.b).duplicateOf = pair.a;
  }
  return { criteria, duplicates };
}

function loadCatalog(catalogPath = DEFAULT_CATALOG) {
  return parseCatalog(fs.readFileSync(catalogPath, 'utf8'));
}

module.exports = { DEFAULT_CATALOG, parseCatalog, loadCatalog };
