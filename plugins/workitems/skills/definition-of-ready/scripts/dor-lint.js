'use strict';

// Mechanische Befunde an einem Artefakt: AC-Format, unscharfe Wörter, Platzhalter,
// Implementierungsdetails in ACs, fehlende Stichworte. Liefert Evidenz, kein Urteil.
// Aufruf: node dor-lint.js <artefakt-datei>   (Ausgabe: JSON, Exit 0; 2 bei Lesefehler)

const fs = require('node:fs');

const AC_LINE = /^\s*(?:[-*]\s*)?(?:\*\*)?AC-(\d+)(?:\*\*)?/;
const AC_FORM = /gegeben.*\bwenn\b.*\bdann\b/i;
const SCENARIO = /^\s*(?:Szenario|Scenario|Szenariogrundriss)\b/i;
const GHERKIN_PARTS = [
  ['Gegeben/Given', /^\s*(?:Gegeben|Given|Angenommen)\b/im],
  ['Wenn/When', /^\s*(?:Wenn|When)\b/im],
  ['Dann/Then', /^\s*(?:Dann|Then)\b/im],
];

const FUZZY_WORDS =
  /\b(funktioniert korrekt|korrekt funktionier\w*|ist möglich|sollten?|idealerweise|schnell\w*|benutzerfreundlich\w*|intuitiv\w*|performant\w*|zeitnah\w*)(?!\w)/gi;
const PLACEHOLDERS = /\b(TBD|TODO|TBC|FIXME|XXX)\b|\?\?\?/g;
const OPEN_POINTS = /\b(ungeklärt|noch zu klären|noch unklar)(?!\w)/gi;
const IMPLEMENTATION = [
  ['Dateipfad', /[\w.-]+[\\/][\w.\\/-]+\.\w{1,5}\b/],
  ['Dateiendung', /\b\w+\.(?:cs|ts|js|json|sql|yml|yaml|xml|csproj)\b/i],
  ['Code in Backticks', /`[^`]+`/],
  ['Klassenname', /\b[A-Z]\w*(?:Service|Controller|Repository|Handler|Manager|Factory|Provider)\b/],
  ['Endpunkt', /\/api\/|\bEndpunkt\b|\bendpoint\b/i],
];

const KEYWORDS = [
  ['Scope', /\bscope\b|\bumfang\b/i],
  ['Nicht-Ziele', /nicht[- ]ziel/i],
  ['Quelle', /source_links|source_prd|\bquelle/i],
  ['Ansprechpartner', /ansprechpartner/i],
  ['Abhängigkeiten', /abhängigkeit/i],
  ['Risiken', /risik/i],
  ['Tests', /\btest/i],
];

function finding(regel, zeile, text, hinweis) {
  return { regel, zeile, text: text.trim(), hinweis };
}

function acNumbers(lines) {
  return lines.flatMap((text, index) => {
    const match = AC_LINE.exec(text);
    return match ? [{ zeile: index + 1, text, nummer: match[1] }] : [];
  });
}

function lintAcLines(acs) {
  const found = [];
  acs.forEach(({ zeile, text, nummer }) => {
    if (!/^\d{2}$/.test(nummer)) found.push(finding('ac-id-format', zeile, text, 'AC-ID ist nicht zweistellig'));
    if (!AC_FORM.test(text)) found.push(finding('ac-form', zeile, text, 'Gegeben/wenn/dann fehlt oder steht in falscher Reihenfolge'));
  });
  const deviation = acs.findIndex(({ nummer }, index) => Number(nummer) !== index + 1);
  if (deviation !== -1) {
    const { zeile, text, nummer } = acs[deviation];
    found.push(
      finding('ac-id-folge', zeile, text, `AC-IDs nicht lückenlos ab AC-01: erwartet AC-${String(deviation + 1).padStart(2, '0')}, gefunden AC-${nummer}`),
    );
  }
  return found;
}

const AC_HEADING = /^\s*#{1,6}\s*akzeptanzkriterien\b/i;
const ANY_HEADING = /^\s*#{1,6}\s/;
const LIST_ITEM = /^\s*(?:[-*]|\d+\.)\s+\S/;

// Aufzählungspunkte unter einer Überschrift "Akzeptanzkriterien", auch ohne AC-Kennung.
function acSectionItems(lines) {
  const items = [];
  let inSection = false;
  lines.forEach((text, index) => {
    if (AC_HEADING.test(text)) inSection = true;
    else if (ANY_HEADING.test(text)) inSection = false;
    else if (inSection && LIST_ITEM.test(text) && !AC_LINE.test(text)) items.push({ zeile: index + 1, text });
  });
  return items;
}

function lintSectionItems(items) {
  return items
    .filter(({ text }) => !AC_FORM.test(text) && !GHERKIN_PARTS.some(([, pattern]) => pattern.test(text)))
    .map(({ zeile, text }) => finding('ac-form', zeile, text, 'Weder AC-xx mit Gegeben/wenn/dann noch Gherkin'));
}

function scenarioBlocks(lines) {
  const starts = lines.flatMap((text, index) => (SCENARIO.test(text) ? [index] : []));
  return starts.map((start, i) => {
    const limit = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const heading = lines.findIndex((text, index) => index > start && index < limit && /^\s*#/.test(text));
    const end = heading === -1 ? limit : heading;
    return { zeile: start + 1, lines: lines.slice(start, end).map((text, offset) => ({ zeile: start + offset + 1, text })) };
  });
}

function lintScenarios(blocks) {
  return blocks.flatMap((block) => {
    const blockText = block.lines.map((line) => line.text).join('\n');
    const missing = GHERKIN_PARTS.filter(([, pattern]) => !pattern.test(blockText)).map(([name]) => name);
    return missing.length > 0
      ? [finding('gherkin-unvollstaendig', block.zeile, block.lines[0].text, `Szenario ohne ${missing.join(', ')}`)]
      : [];
  });
}

function matchesPerLine(lines, pattern, regel, hinweis) {
  return lines.flatMap(({ zeile, text }) => {
    const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
    return matches.map((match) => finding(regel, zeile, match[0], hinweis(match[0])));
  });
}

function lintImplementation(lines) {
  return IMPLEMENTATION.flatMap(([name, pattern]) =>
    lines.flatMap(({ zeile, text }) => {
      const match = pattern.exec(text);
      return match ? [finding('implementierungsdetail', zeile, match[0], `${name} im Akzeptanzkriterium: WAS statt WIE`)] : [];
    }),
  );
}

function lintKeywords(lines, hasAcs) {
  const results = KEYWORDS.map(([name, pattern]) => {
    const index = lines.findIndex((line) => pattern.test(line));
    return { name, gefunden: index !== -1, zeile: index === -1 ? null : index + 1 };
  });
  const heading = lines.findIndex((line) => AC_HEADING.test(line));
  results.push({ name: 'Akzeptanzkriterien', gefunden: hasAcs, zeile: heading === -1 ? null : heading + 1 });
  return results;
}

function sortFindings(findings) {
  return findings.sort(
    (a, b) => (a.zeile ?? Infinity) - (b.zeile ?? Infinity) || a.regel.localeCompare(b.regel) || a.text.localeCompare(b.text),
  );
}

function lint(text) {
  const allLines = text.split(/\r?\n/);
  const acs = acNumbers(allLines);
  const scenarios = scenarioBlocks(allLines);
  const sectionItems = acSectionItems(allLines);
  const criteriaByLine = new Map(
    [
      ...acs.map(({ zeile, text: lineText }) => ({ zeile, text: lineText })),
      ...scenarios.flatMap((block) => block.lines),
      ...sectionItems,
    ].map((line) => [line.zeile, line]),
  );
  const criteriaLines = [...criteriaByLine.values()];
  const lineObjects = allLines.map((lineText, index) => ({ zeile: index + 1, text: lineText }));
  const hasAcs = criteriaLines.length > 0 || allLines.some((lineText) => AC_HEADING.test(lineText));
  const stichworte = lintKeywords(allLines, hasAcs);
  const findings = [
    ...lintAcLines(acs),
    ...lintSectionItems(sectionItems),
    ...lintScenarios(scenarios),
    ...matchesPerLine(criteriaLines, FUZZY_WORDS, 'unscharfes-wort', (word) => `„${word}“ ist ohne Maß nicht prüfbar`),
    ...matchesPerLine(lineObjects, PLACEHOLDERS, 'platzhalter', (word) => `Platzhalter „${word}“ im Text`),
    ...matchesPerLine(lineObjects, OPEN_POINTS, 'offener-punkt', (word) => `„${word}“: offener Punkt im Artefakt, prüfen ob kritisch`),
    ...lintImplementation(criteriaLines),
    ...stichworte
      .filter((entry) => !entry.gefunden)
      .map((entry) => finding('stichwort-fehlt', null, entry.name, `Stichwort „${entry.name}“ kommt nicht vor (reine Textsuche, kein Urteil)`)),
  ];
  return {
    statistik: {
      zeilen: allLines.length,
      acZeilen: acs.length,
      acAbschnittPunkte: sectionItems.length,
      gherkinSzenarien: scenarios.length,
      wikilinks: (text.match(/\[\[[^\]\n]+\]\]/g) || []).length,
    },
    stichworte,
    befunde: sortFindings(findings),
  };
}

function main(argv) {
  const file = argv[0];
  if (!file) {
    process.stderr.write('FEHLER: Aufruf: node dor-lint.js <artefakt-datei>\n');
    return 2;
  }
  try {
    const result = { datei: file, ...lint(fs.readFileSync(file, 'utf8')) };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`FEHLER: ${error.message}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { lint, main };
