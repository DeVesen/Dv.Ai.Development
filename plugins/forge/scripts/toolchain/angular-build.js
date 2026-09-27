#!/usr/bin/env node
'use strict';

// ng build mit gefilterter Ausgabe: volles Log in eine Datei, zurück nur Fehler und Zusammenfassung.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NAME = 'angular-build';
const USAGE = `Aufruf: node ${NAME}.js [--root <angular-projektordner>] [--log <datei>] [--timeout <sekunden>] [-- <weitere ng-build-Argumente>]\n`;
const TIMEOUT_SECONDS = 300;
const MAX_ERRORS = 50;
const MAX_WARNINGS = 20;
const TAIL_LINES = 10;
const NG_SCRIPT = path.join('node_modules', '@angular', 'cli', 'bin', 'ng.js');
const ANSI = /\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;
const ERROR_LINE = /(?:ERROR in |error\s+TS\d+:|✘\s*\[ERROR\]|^\s*✖|An unhandled exception occurred:)/i;
const WARNING_LINE = /(?:WARNING in |warning\s+TS\d+:|[▲⚠]\s*\[WARNING\])/i;
// esbuild nennt die Fundstelle in der ersten Zeile unter "[ERROR]": "src/app/x.ts:10:9:"
const LOCATION_LINE = /^(.+:\d+:\d+):$/;

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { root: process.cwd(), log: null, timeout: TIMEOUT_SECONDS, extra: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') {
      args.extra = argv.slice(index + 1);
      break;
    }
    const value = argv[index + 1];
    if (!['--root', '--log', '--timeout'].includes(flag) || value === undefined) throw new UsageError(USAGE);
    args[flag.slice(2)] = flag === '--timeout' ? Number(value) : value;
    index += 1;
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) throw new UsageError(USAGE);
  return args;
}

function findNg(root) {
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, NG_SCRIPT);
    if (fs.existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
}

function unique(lines, max) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))].slice(0, max);
}

function tail(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).slice(-TAIL_LINES);
}

function withLocation(lines, index) {
  const header = lines[index].trim();
  if (!/\[ERROR\]/i.test(header)) return header;
  const next = lines.slice(index + 1).find((line) => line.trim() !== '')?.trim() ?? '';
  const location = LOCATION_LINE.exec(next);
  return location ? `${location[1]}: ${header}` : header;
}

function parse(output, exitCode) {
  const lines = output.replace(ANSI, '').split(/\r?\n/);
  const errors = unique(lines.flatMap((line, index) => (ERROR_LINE.test(line) ? [withLocation(lines, index)] : [])), MAX_ERRORS);
  const warnings = unique(lines.filter((line) => WARNING_LINE.test(line)), MAX_WARNINGS);
  if (exitCode === 0) return { errors: [], warnings, summary: `Build erfolgreich, ${warnings.length} Warnungen.` };
  if (errors.length === 0) {
    return { errors: tail(lines), warnings, summary: `Build fehlgeschlagen (Exit ${exitCode}) ohne erkannte Fehlerzeile, Fehler = letzte Zeilen des Logs.` };
  }
  return { errors, warnings, summary: `${errors.length} Fehler, ${warnings.length} Warnungen.` };
}

function logFile(requested) {
  if (requested) return path.resolve(requested);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return path.join(os.tmpdir(), 'dv-forge-logs', `${NAME}-${stamp}.log`);
}

function run(args) {
  const root = path.resolve(args.root);
  if (!fs.existsSync(path.join(root, 'angular.json'))) throw new UsageError(`Kein Angular-Projekt (angular.json fehlt): ${root}\n`);
  const log = logFile(args.log);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const ng = findNg(root);
  if (!ng) {
    fs.writeFileSync(log, `Angular CLI nicht gefunden: ${NG_SCRIPT} ab ${root}\n`);
    return { ok: false, seconds: 0, log, errors: ['Angular CLI nicht gefunden. Im Projektordner npm install ausführen.'], warnings: [], summary: 'Nicht gestartet.' };
  }
  const commandLine = ['build', ...args.extra];
  fs.writeFileSync(log, `> ng ${commandLine.join(' ')}\n\n`);
  const fd = fs.openSync(log, 'a');
  const started = Date.now();
  // Ausgabe direkt in die Datei statt über eine Pipe: ein hängender Kindprozess kann den Lauf so nicht blockieren.
  // ng.js direkt mit node starten, damit unter Windows keine Shell für ng.cmd nötig ist.
  const result = spawnSync(process.execPath, [ng, ...commandLine], {
    cwd: root,
    stdio: ['ignore', fd, fd],
    timeout: args.timeout * 1000,
    windowsHide: true,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  fs.closeSync(fd);
  const seconds = Math.round((Date.now() - started) / 1000);
  if (result.error?.code === 'ETIMEDOUT' || result.signal) return { ok: false, seconds, log, errors: [`Abgebrochen nach ${args.timeout} s.`], warnings: [], summary: 'Zeitüberschreitung.' };
  const exitCode = result.status ?? 1;
  return { ok: exitCode === 0, exitCode, seconds, log, ...parse(fs.readFileSync(log, 'utf8'), exitCode) };
}

function render(report) {
  const status = report.ok ? 'OK' : `FEHLGESCHLAGEN${report.exitCode === undefined ? '' : ` (Exit ${report.exitCode})`}`;
  const lines = [`${NAME}: ${status} · ${report.seconds} s`, `Zusammenfassung: ${report.summary}`];
  if (report.errors.length > 0) lines.push(`Fehler (${report.errors.length}):`, ...report.errors.map((line) => `- ${line}`));
  if (report.warnings.length > 0) lines.push(`Warnungen (${report.warnings.length}):`, ...report.warnings.map((line) => `- ${line}`));
  lines.push(`Log: ${report.log}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const report = run(parseArgs(process.argv.slice(2)));
    process.stdout.write(render(report));
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(error.message);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, parse, render, findNg };
