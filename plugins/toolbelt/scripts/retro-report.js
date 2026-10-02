#!/usr/bin/env node
'use strict';

// Gibt das Berichtsformat aus oder erzeugt aus Entwurf und Snapshot einer Session den Erfahrungsbericht unter docs/wishes/.

const fs = require('node:fs');
const path = require('node:path');
const { RetroError, readEntries } = require('./lib/transcript');
const { corpusOf } = require('./lib/retro-corpus');
const { draftPath, readSnapshot, snapshotPath } = require('./lib/retro-files');
const { violations } = require('./lib/retro-draft');
const { compose } = require('./lib/retro-compose');
const { summaryLines } = require('./lib/retro-summary');
const { secretViolations, withFileNameSource, relativeToProject } = require('./lib/retro-secrets');
const { subagentFiles } = require('./lib/session-files');

const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');
const REPORT_DIR = path.join('docs', 'wishes');
const TOPIC = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const USAGE = 'Aufruf: node retro-report.js --format\n'
  + '       node retro-report.js --session <id> --topic <thema> [--cwd <projektordner>]\n'
  + '  <thema>: Kleinbuchstaben a-z, Ziffern und Bindestriche, ohne Bindestrich am Anfang oder Ende\n';
const FLAGS = { '--session': 'session', '--topic': 'topic', '--cwd': 'cwd' };

class UsageError extends Error {}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--format') return { format: true };
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = FLAGS[args[index]];
    if (!key || args[index + 1] === undefined) throw new UsageError(`Unbekannte oder unvollständige Angabe: ${args[index]}`);
    options[key] = args[index + 1];
  }
  if (!options.session) throw new UsageError('--session fehlt');
  if (options.topic === undefined) throw new UsageError('--topic fehlt');
  if (!TOPIC.test(options.topic)) throw new UsageError(`Ungültiges Thema: „${options.topic}“`);
  return options;
}

function localDate(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function freeName(dir, base) {
  for (let number = 1; ; number += 1) {
    const file = path.join(dir, `${base}${number === 1 ? '' : `-${number}`}.md`);
    if (!fs.existsSync(file)) return file;
  }
}

function writeReport(dir, base, text) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const file = freeName(dir, base);
    fs.writeFileSync(file, text, { flag: 'wx' });
    return file;
  } catch (error) {
    throw new RetroError(`Berichtsordner nicht schreibbar: ${dir}: ${error.message}`);
  }
}

// Zitate dürfen aus der Hauptsession und aus den Protokollen ihrer Subagents stammen; den Ordner der Subagents
// kennt nur `subagentFiles` in lib/session-files.js. Fehlt das Protokoll, nennt der Fehler den Pfad statt jedes Zitat abzulehnen.
// Die Hauptsession zählt nur bis zum Stand des Snapshots: Danach schreibt die laufende Retrospektive ihren Entwurf,
// und dessen `Write` enthielte jedes erfundene Zitat wörtlich.
function corpus(snapshot) {
  if (!snapshot.transcript || !fs.existsSync(snapshot.transcript)) {
    throw new RetroError(`Protokoll fehlt: ${snapshot.transcript || '(kein Pfad im Snapshot)'}; ohne Protokoll lassen sich die Zitate nicht prüfen, keine Berichtsdatei geschrieben`);
  }
  const main = readEntries(snapshot.transcript).filter((entry) => entry.entryNo <= snapshot.transcriptEntries);
  const agents = subagentFiles(snapshot.transcript).map((file) => readEntries(file));
  return [main, ...agents].map(corpusOf).join('\n');
}

function failOnViolations(found, hint = []) {
  if (found.length === 0) return;
  throw new RetroError([`Prüfung: ${found.length} Verstöße, keine Berichtsdatei geschrieben`, ...found.map((item) => `- ${item}`), ...hint].join('\n'));
}

function checkedDraft(options, snapshot) {
  const draft = draftPath(options.session);
  if (!fs.existsSync(draft)) throw new RetroError(`Entwurf fehlt: ${draft}`);
  const text = fs.readFileSync(draft, 'utf8');
  failOnViolations(violations(text, snapshot, corpus(snapshot)));
  return { draft, text };
}

// Der fertige Bericht wird committet: Ein Geheimnis aus Befehlen, Eingaben oder Fehlertexten verhindert die Berichtsdatei.
// Zahlen und MCP-Nutzung stammen aus dem Snapshot; steht es dort, hilft nur, es im Snapshot zu ersetzen.
function checkedReport(text, session) {
  failOnViolations(secretViolations(text), [`Geheimnis im Entwurf entfernen; steht es unter Zahlen oder MCP-Nutzung, im Snapshot ${snapshotPath(session)} ersetzen und neu aufrufen`]);
  return text;
}

// Der Bericht steht schon; scheitert das Löschen (etwa eine gesperrte Datei unter Windows), bleibt er gültig und die
// Warnung nennt, was von Hand zu löschen ist, damit ein neuer Aufruf keinen zweiten Bericht schreibt.
function removeLeftovers(files) {
  return files.flatMap((file) => {
    try {
      fs.rmSync(file, { force: true });
      return [];
    } catch (error) {
      return [`Warnung: ${file} nicht gelöscht (${error.message}); vor einem neuen Aufruf von Hand löschen, sonst entsteht ein zweiter Bericht.`];
    }
  });
}

// Ohne --cwd kommt der Projektordner aus dem Protokoll. Fehlt er hier, stammt das Protokoll von woanders; ein Bericht
// dort legte einen ganzen Ordnerbaum an beliebiger Stelle an.
function projectRoot(options, snapshot) {
  if (options.cwd) return path.resolve(options.cwd);
  const cwd = path.resolve(snapshot.cwd || process.cwd());
  if (!fs.existsSync(cwd)) {
    throw new RetroError(`Projektordner fehlt: ${cwd}; das Protokoll stammt aus einem anderen Projekt oder einer anderen Maschine, mit --cwd <projektordner> angeben`);
  }
  return cwd;
}

// Schreibt den Bericht erst, wenn Snapshot und Entwurf da sind, der Entwurf keinen Verstoß hat, der Projektordner existiert
// und der fertige Bericht kein Geheimnis enthält; danach sind beide gelöscht.
function build(options) {
  const snapshot = readSnapshot(options.session);
  const { draft, text } = checkedDraft(options, snapshot);
  const date = localDate();
  const cwd = projectRoot(options, snapshot);
  const shown = { ...snapshot, numbers: relativeToProject(snapshot.numbers, snapshot.cwd), mcp: withFileNameSource(snapshot.mcp) };
  const report = checkedReport(compose(text, shown, date), options.session);
  const file = writeReport(path.join(cwd, REPORT_DIR), `${date}-${options.topic}`, report);
  const warnings = removeLeftovers([draft, snapshotPath(options.session)]);
  return { file, cwd, text, snapshot, warnings };
}

function parsedOrExit(args) {
  try {
    return parseArgs(args);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`${error.message}\n${USAGE}`);
    return process.exit(2);
  }
}

// Der Bericht ist schon geschrieben; scheitert die Kurzfassung, bleiben Pfad und Prüfergebnis die Rückmeldung.
function summaryOrFallback(result) {
  try {
    return summaryLines(result);
  } catch (error) {
    return [`Bericht: ${result.file}`, 'Prüfung: 0 Verstöße', `Warnung: Kurzfassung nicht verfügbar: ${error.message}`];
  }
}

function main() {
  const options = parsedOrExit(process.argv.slice(2));
  if (options.format) {
    process.stdout.write(fs.readFileSync(REPORT_FORMAT, 'utf8'));
    return;
  }
  try {
    const result = build(options);
    process.stdout.write(`${summaryOrFallback(result).join('\n')}\n`);
    for (const warning of result.warnings) process.stderr.write(`${warning}\n`);
  } catch (error) {
    if (!(error instanceof RetroError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, localDate, removeLeftovers, build };
