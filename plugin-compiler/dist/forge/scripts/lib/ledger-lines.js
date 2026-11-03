'use strict';

const { spawnSync } = require('node:child_process');

// Zeilenformen des Ledgers nach skills/implementation/references/ledger.md; check und next lesen dieselbe Zerlegung.
const HEAD = /^# Ledger — Plan: .+$/;
const FORMS = [
  { kind: 'vorab-scan', pattern: /^Vorab-Scan: .+$/ },
  { kind: 'basis-rot', pattern: /^Basis rot: .+$/ },
  { kind: 'urteil', pattern: /^Urteil: .+$/ },
  { kind: 'bedenken', pattern: /^Task (\d+): Bedenken: .+$/ },
  { kind: 'zurueckgestellt', pattern: /^Task (\d+): zurückgestellt: .+$/ },
  { kind: 'fixrunde', pattern: /^Task (\d+): Fix-Runde (\d+)\/5 \(.+\)$/ },
  { kind: 'geparkt', pattern: /^Task (\d+): geparkt — .+$/ },
  { kind: 'fertig', pattern: /^Task (\d+): fertig \(.+\)$/ },
  { kind: 'gesamtlauf', pattern: /^Gesamtlauf: .+$/ },
  { kind: 'final', pattern: /^Final: (?:sauber|Fix-Welle \(.+\))$/ },
];
const RANGE = /(?<![0-9a-f])([0-9a-f]{4,40})\.\.([0-9a-f]{4,40})(?![0-9a-f])/g;
const MAX_ROUND = 5;

// Zeilen des Ledgers mit Nummer, Art und, bei Task-Zeilen, Task- und Rundennummer; Leerzeilen entfallen, Unbekanntes hat kind null.
// Die Kopfzeile gilt nur als erste Zeile.
function parseLedger(lines) {
  return lines.map((text, index) => ({ text: text.trim(), number: index + 1 })).filter((line) => line.text !== '').map((line) => {
    if (line.number === 1 && HEAD.test(line.text)) return { ...line, kind: 'kopf', task: null, round: null };
    for (const form of FORMS) {
      const match = form.pattern.exec(line.text);
      if (match) return { ...line, kind: form.kind, task: match[1] ? Number(match[1]) : null, round: form.kind === 'fixrunde' ? Number(match[2]) : null };
    }
    return { ...line, kind: null, task: null, round: null };
  });
}

function problem(line, reason) {
  return { line: line.number, reason };
}

function headProblems(parsed) {
  return parsed[0]?.kind === 'kopf' ? [] : [{ line: 1, reason: 'erste Zeile ist nicht „# Ledger — Plan: …“' }];
}

function formProblems(parsed) {
  return parsed.filter((line) => line.kind === null).map((line) => problem(line, `unbekannte Zeilenform: ${line.text.slice(0, 60)}`));
}

function orderProblems(parsed) {
  let highest = 0;
  const found = [];
  for (const line of parsed.filter((entry) => entry.task !== null)) {
    if (line.task < highest) found.push(problem(line, `Task-Nummern nicht aufsteigend: Task ${line.task} nach Task ${highest}`));
    highest = Math.max(highest, line.task);
  }
  return found;
}

function roundProblems(parsed) {
  const last = new Map();
  const found = [];
  for (const line of parsed.filter((entry) => entry.kind === 'fixrunde')) {
    if (line.round < 1 || line.round > MAX_ROUND) {
      found.push(problem(line, `Fix-Runde ${line.round}/5 außerhalb von 1 bis 5`));
    } else if (line.round !== (last.get(line.task) ?? 0) + 1) {
      found.push(problem(line, `Fix-Runde ${line.round}/5 nicht fortlaufend (erwartet ${(last.get(line.task) ?? 0) + 1})`));
    } else {
      last.set(line.task, line.round);
    }
  }
  return found;
}

function doneProblems(parsed) {
  const done = new Set();
  const found = [];
  for (const line of parsed.filter((entry) => entry.kind === 'fertig')) {
    if (done.has(line.task)) found.push(problem(line, `Task ${line.task} ist zweimal fertig`));
    done.add(line.task);
  }
  return found;
}

function knowsCommit(repo, hash) {
  return spawnSync('git', ['-C', repo, 'rev-parse', '--verify', '--quiet', `${hash}^{commit}`], { encoding: 'utf8' }).status === 0;
}

function rangeProblems(parsed, repo) {
  if (!repo) return [];
  const found = [];
  for (const line of parsed.filter((entry) => entry.kind !== null)) {
    for (const [range, from, to] of line.text.matchAll(RANGE)) {
      if (!knowsCommit(repo, from) || !knowsCommit(repo, to)) found.push(problem(line, `Commit-Bereich unbekannt: ${range}`));
    }
  }
  return found;
}

function count(parsed, kind) {
  return parsed.filter((line) => line.kind === kind).length;
}

// Kennzahlen des Ledgers; `total` ist die Zahl der Tasks im Plan oder null.
function metrics(parsed, total = null) {
  return {
    fertig: new Set(parsed.filter((line) => line.kind === 'fertig').map((line) => line.task)).size,
    gesamt: total,
    fixrunden: count(parsed, 'fixrunde'),
    urteile: count(parsed, 'urteil'),
    geparkt: count(parsed, 'geparkt'),
    zurueckgestellt: count(parsed, 'zurueckgestellt'),
  };
}

// Fehler des Ledgers, nach Zeile sortiert: [{ line, reason }].
function checkLedger(lines, options = {}) {
  const parsed = parseLedger(lines);
  const all = [...headProblems(parsed), ...formProblems(parsed), ...orderProblems(parsed), ...roundProblems(parsed), ...doneProblems(parsed), ...rangeProblems(parsed, options.repo)];
  return { parsed, problems: all.sort((a, b) => a.line - b.line) };
}

function nextStep(parsed, taskNumbers) {
  if (parsed.some((line) => line.kind === 'final')) return 'abschluss';
  const done = new Set(parsed.filter((line) => line.kind === 'fertig').map((line) => line.task));
  const open = taskNumbers.find((number) => !done.has(number));
  if (open === undefined) return 'final';
  const own = parsed.filter((line) => line.task === open);
  if (own.some((line) => line.kind === 'fixrunde' && line.round >= MAX_ROUND)) return `urteil ${open}`;
  const latest = own.at(-1);
  return latest?.kind === 'fixrunde' ? `fixrunde ${open} ${latest.round + 1}` : `task ${open}`;
}

module.exports = { parseLedger, checkLedger, metrics, nextStep };
