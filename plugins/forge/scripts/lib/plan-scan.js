'use strict';

// Vorab-Scan des Plans, mechanisch: je Task eine Zeile, je Consumes-Eintrag der Abgleich mit den Produces der Tasks,
// je mehrfach genannter Datei eine MEHRFACH-Zeile. Offene Zeilen braucht der Controller für sein Urteil.

const SYMBOL = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/;
const BACKTICKED = /`([^`]+)`/g;

// Name des Symbols: der erste Bezeichner je Code-Span; ohne Code-Span der erste Bezeichner des Eintrags.
function symbolsOf(entry) {
  const spans = [...entry.matchAll(BACKTICKED)].map((match) => match[1]);
  const names = (spans.length > 0 ? spans : [entry]).map((text) => SYMBOL.exec(text)?.[0]).filter(Boolean);
  return [...new Set(names)];
}

function lastSegment(name) {
  return name.slice(name.lastIndexOf('.') + 1);
}

function producersOf(descriptions) {
  return descriptions.flatMap((description) => description.interfaces.Produces.flatMap((entry) => (
    symbolsOf(entry).map((name) => ({ task: description.number, name, entry }))
  )));
}

function consumeLine(description, entry, producers) {
  const names = symbolsOf(entry);
  const label = `Task ${description.number} Consumes ${entry}`;
  if (names.length === 0) return { open: true, text: `OFFEN ${label}: kein Symbol erkennbar` };
  const found = names.map((name) => {
    const matches = producers.filter((producer) => lastSegment(producer.name) === lastSegment(name));
    const earlier = matches.find((producer) => producer.task < description.number);
    return { name, earlier, later: matches.find((producer) => producer.task >= description.number) };
  });
  const missing = found.filter((hit) => !hit.earlier);
  if (missing.length === 0) {
    return { open: false, text: `ok ${label} <- ${found.map((hit) => `Task ${hit.earlier.task} Produces ${hit.name}`).join(', ')}` };
  }
  const reasons = missing.map((hit) => (hit.later ? `${hit.name} erst in Task ${hit.later.task}` : `${hit.name} ohne Produces in früherem Task`));
  return { open: true, text: `OFFEN ${label}: ${reasons.join(', ')}` };
}

function sharedLines(descriptions) {
  const byPath = new Map();
  for (const description of descriptions) {
    for (const file of description.files) {
      const numbers = byPath.get(file.path) ?? [];
      if (!numbers.includes(description.number)) numbers.push(description.number);
      byPath.set(file.path, numbers);
    }
  }
  return [...byPath.entries()]
    .filter(([, numbers]) => numbers.length > 1)
    .map(([file, numbers]) => ({ open: true, text: `MEHRFACH ${file}: ${numbers.map((n) => `Task ${n}`).join(', ')}` }));
}

function scanPlanLines(descriptions) {
  const producers = producersOf(descriptions);
  const tasks = descriptions.map((description) => ({
    open: false,
    text: `Task ${description.number}: ${description.title} | Dateien: ${description.files.map((file) => file.path).join(', ') || '-'}`,
  }));
  const consumes = descriptions.flatMap((description) => description.interfaces.Consumes.map((entry) => consumeLine(description, entry, producers)));
  return [...tasks, ...consumes, ...sharedLines(descriptions)];
}

// Datei: alle Zeilen. Ausgabe im Kontext: Anzahl, Pfad, eine Zeile je Task und nur die offenen Zeilen.
function summarize(lines, file) {
  const open = lines.filter((line) => line.open);
  const taskLines = lines.filter((line) => /^Task \d+: /.test(line.text)).map((line) => line.text.split(' | ')[0]);
  return [
    `Tasks: ${taskLines.length}`,
    `Scan-Datei: ${file}`,
    ...taskLines,
    open.length === 0 ? 'Offen: nichts' : `Offen: ${open.length}`,
    ...open.map((line) => line.text),
  ].join('\n');
}

function writeScan(descriptions, dir, writeFile) {
  const lines = scanPlanLines(descriptions);
  const file = writeFile(dir, 'vorab-scan.md', `${lines.map((line) => line.text).join('\n')}\n`);
  return summarize(lines, file);
}

module.exports = { scanPlanLines, summarize, symbolsOf, writeScan };
