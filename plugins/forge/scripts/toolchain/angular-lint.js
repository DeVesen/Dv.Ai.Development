#!/usr/bin/env node
'use strict';

// ng lint (ESLint) mit gefilterter Ausgabe: volles Log in eine Datei, zurück nur Befunde mit Datei, Zeile und Regel.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NAME = 'angular-lint';
const USAGE = `Aufruf: node ${NAME}.js [--root <angular-projektordner>] [--show errors|warnings|all] [--log <datei>] [--timeout <sekunden>] [-- <weitere ng-lint-Argumente>]\n`;
const TIMEOUT_SECONDS = 300;
const MAX_ERRORS = 50;
const MAX_WARNINGS = 100;
const SHOW = ['errors', 'warnings', 'all'];
const TAIL_LINES = 10;
const NG_SCRIPT = path.join('node_modules', '@angular', 'cli', 'bin', 'ng.js');
const ANSI = /\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;
const ERROR_SEVERITY = 2;

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { root: process.cwd(), show: 'errors', log: null, timeout: TIMEOUT_SECONDS, extra: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') {
      args.extra = argv.slice(index + 1);
      break;
    }
    const value = argv[index + 1];
    if (!['--root', '--show', '--log', '--timeout'].includes(flag) || value === undefined) throw new UsageError(USAGE);
    args[flag.slice(2)] = flag === '--timeout' ? Number(value) : value;
    index += 1;
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0 || !SHOW.includes(args.show)) throw new UsageError(USAGE);
  return args;
}

function findNg(root) {
  for (let dir = root; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, NG_SCRIPT);
    if (fs.existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
}

function tail(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).slice(-TAIL_LINES);
}

function hasLintTarget(root) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'angular.json'), 'utf8'));
    return Object.values(config.projects ?? {}).some((project) => project.architect?.lint ?? project.targets?.lint);
  } catch {
    return false;
  }
}

// ng lint --format=json schreibt je Projekt eine JSON-Zeile, dazwischen Fortschrittsmeldungen.
function eslintResults(lines) {
  return lines.filter((line) => line.trim().startsWith('[')).flatMap((line) => {
    try {
      const parsed = JSON.parse(line.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
}

function parse(output, exitCode, root = process.cwd()) {
  const lines = output.replace(ANSI, '').split(/\r?\n/);
  const findings = { errors: [], warnings: [] };
  for (const file of eslintResults(lines)) {
    const relative = path.relative(root, String(file.filePath ?? '')).replace(/\\/g, '/');
    for (const message of file.messages ?? []) {
      const text = `${relative}:${message.line ?? 0} ${message.ruleId ?? 'parser'}: ${message.message ?? ''}`;
      findings[message.severity === ERROR_SEVERITY ? 'errors' : 'warnings'].push(text);
    }
  }
  const counts = `${findings.errors.length} Fehler, ${findings.warnings.length} Warnungen.`;
  const errors = findings.errors.slice(0, MAX_ERRORS);
  const { warnings } = findings;
  if (exitCode !== 0 && errors.length === 0) {
    return { errors: tail(lines), warnings, summary: `ng lint fehlgeschlagen (Exit ${exitCode}) ohne erkannten Befund, Fehler = letzte Zeilen des Logs.` };
  }
  return { errors, warnings, summary: exitCode === 0 && errors.length === 0 && warnings.length === 0 ? 'Keine Befunde.' : counts };
}

function logFile(requested) {
  if (requested) return path.resolve(requested);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return path.join(os.tmpdir(), 'dv-forge-logs', `${NAME}-${stamp}.log`);
}

function run(args) {
  const root = path.resolve(args.root);
  if (!fs.existsSync(path.join(root, 'angular.json'))) throw new UsageError(`Kein Angular-Projekt (angular.json fehlt): ${root}\n`);
  if (!hasLintTarget(root)) throw new UsageError(`Kein lint-Target in der angular.json. Einrichten mit: ng add @angular-eslint/schematics\n`);
  const log = logFile(args.log);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const ng = findNg(root);
  if (!ng) {
    fs.writeFileSync(log, `Angular CLI nicht gefunden: ${NG_SCRIPT} ab ${root}\n`);
    return { ok: false, seconds: 0, log, errors: ['Angular CLI nicht gefunden. Im Projektordner npm install ausführen.'], warnings: [], summary: 'Nicht gestartet.' };
  }
  const commandLine = ['lint', '--format=json', ...args.extra];
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
  return { ok: exitCode === 0, exitCode, seconds, log, ...parse(fs.readFileSync(log, 'utf8'), exitCode, root) };
}

function listed(title, items, max) {
  if (items.length === 0) return [];
  const rest = items.length - max;
  return [`${title} (${items.length}):`, ...items.slice(0, max).map((line) => `- ${line}`), ...(rest > 0 ? [`- … und ${rest} weitere, siehe Log`] : [])];
}

// show: errors = nur Fehler (Normalbetrieb), warnings = nur Warnungen (z. B. für ein Review), all = beides.
function render(report, show = 'errors') {
  const status = report.ok ? 'OK' : `FEHLGESCHLAGEN${report.exitCode === undefined ? '' : ` (Exit ${report.exitCode})`}`;
  const lines = [`${NAME}: ${status} · ${report.seconds} s`, `Zusammenfassung: ${report.summary}`];
  if (show !== 'warnings') lines.push(...listed('Fehler', report.errors, MAX_ERRORS));
  if (show !== 'errors') lines.push(...listed('Warnungen', report.warnings, MAX_WARNINGS));
  if (show === 'errors' && report.warnings.length > 0) lines.push(`Warnungen: ${report.warnings.length}, anzeigen mit --show warnings`);
  if (show === 'warnings' && report.errors.length > 0) lines.push(`Fehler: ${report.errors.length}, anzeigen mit --show errors`);
  lines.push(`Log: ${report.log}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = run(args);
    process.stdout.write(render(report, args.show));
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(error.message);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { parseArgs, parse, render, findNg };
