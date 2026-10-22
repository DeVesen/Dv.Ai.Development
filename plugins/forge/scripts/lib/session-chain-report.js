'use strict';

// Berichtsdatei einer Etappe, geschrieben in der Etappen-Session: bericht.md mit vollem Bericht, Entscheidungen,
// Glossar-/ADR-Dateien und Testzahlen, daneben bericht.json für die Leit-Session, beide in der Ablage der Etappe.
// Jede übergebene Datei wird über readInput gelesen; ein Lesefehler nennt den Pfad, statt mit einem Stacktrace zu enden.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { toPosix } = require('./posix');
const { SessionChainError, checkedEtappe, slugOfArtifact } = require('./session-chain-store');
const { ablageDir, storeFiles } = require('./session-chain-ablage');
const { resultOf } = require('./session-chain-decide');

const REPORT_FILE = 'bericht.md';
const DATA_FILE = 'bericht.json';
const NONE = 'Keine.';
const VALUE_KEYS = ['spec', 'plan', 'worktree', 'branch'];
const JSON_FILE = /\.json$/i;

// Text einer übergebenen Datei; `label` nennt sie in der Meldung.
function readInput(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    throw new SessionChainError(`${label} nicht lesbar: ${toPosix(path.resolve(file))}`);
  }
}

function absolute(value) {
  return value ? toPosix(path.resolve(value)) : undefined;
}

function list(lines, render) {
  return lines.length > 0 ? lines.map(render) : [NONE];
}

function checkLines(input) {
  if (!input.pruefung) return [];
  return ['', '# Prüfung', `Prüfergebnis: ${input.pruefung}`, ...input.luecken.map((befehl) => `Umgebungslücke: ${befehl}`), ...input.acOhneTest.map((ac) => `Ohne beweisenden Test: ${ac}`)];
}

// Voller Bericht des Skills. Zeigt `bericht` auf Bericht-Daten (.json) eines Reviews, gilt der Bericht (.md) gleichen Namens daneben.
function reportText(bericht) {
  if (!bericht) return 'Kein Bericht des Skills.';
  const file = JSON_FILE.test(bericht) ? bericht.replace(JSON_FILE, '.md') : bericht;
  return readInput(file, 'Bericht').replace(/\r\n/g, '\n').trimEnd();
}

// `cwd`: Ordner im Repo. Rückgabe: Pfad von bericht.md. Erst lesen, dann schreiben: ein Lesefehler legt nichts ab.
function etappeReport(input, cwd) {
  const etappe = checkedEtappe(input.etappe);
  const slug = input.slug ?? slugOfArtifact({ spec: input.spec });
  const dir = input.spec ? path.dirname(path.resolve(input.spec)) : cwd;
  const text = reportText(input.bericht);
  const target = input.anhang.length > 0 ? storeFiles({ dir, slug, etappe, files: input.anhang }) : toPosix(ablageDir(dir, slug, etappe));
  const dateien = input.dateien.map(absolute);
  const report = [
    `# Bericht der Etappe ${etappe}`, text, '',
    '# Entscheidungen des Menschen', ...list(input.entscheidungen, (entry) => `- ${entry}`), '',
    '# Geänderte Glossar- und ADR-Dateien', ...list(dateien, (file) => `- \`${file}\``), '',
    '# Testzahlen', input.tests ?? NONE,
    ...checkLines(input),
  ].join('\n');
  const data = {
    etappe, slug, ergebnis: resultOf(text), entscheidungen: input.entscheidungen, dateien, tests: input.tests,
    pruefung: input.pruefung, luecken: input.luecken, acOhneTest: input.acOhneTest,
    ...Object.fromEntries(VALUE_KEYS.map((key) => [key, key === 'branch' ? input[key] : absolute(input[key])])),
  };
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, REPORT_FILE), `${report}\n`);
  fs.writeFileSync(path.join(target, DATA_FILE), `${JSON.stringify(data, null, 2)}\n`);
  return toPosix(path.join(target, REPORT_FILE));
}

// Bericht-Daten neben `bericht` und ihr Hash (SHA-1 des Dateitexts), an dem die Leit-Session ein schon verarbeitetes `final` erkennt.
function readData(bericht) {
  const file = path.join(path.dirname(path.resolve(bericht)), DATA_FILE);
  const raw = readInput(file, 'Bericht-Daten');
  try {
    return { data: JSON.parse(raw), hash: crypto.createHash('sha1').update(raw).digest('hex') };
  } catch {
    throw new SessionChainError(`Bericht-Daten kein JSON: ${toPosix(file)}`);
  }
}

module.exports = { etappeReport, readInput, readData, REPORT_FILE, DATA_FILE };
