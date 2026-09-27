#!/usr/bin/env node
'use strict';

// ng test mit gefilterter Ausgabe: volles Log in eine Datei, zurück nur fehlgeschlagene Tests und Zusammenfassung.
// Erkennt den Test-Runner (Karma, Jest, Vitest) aus der angular.json.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NAME = 'angular-test';
const USAGE = `Aufruf: node ${NAME}.js [--root <angular-projektordner>] [--log <datei>] [--timeout <sekunden>] [-- <weitere ng-test-Argumente, z. B. --include>]\n`;
const TIMEOUT_SECONDS = 600;
const MAX_ERRORS = 50;
const TAIL_LINES = 10;
const NG_SCRIPT = path.join('node_modules', '@angular', 'cli', 'bin', 'ng.js');
const ANSI = /\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;
const ERROR_LINE = /(?:ERROR in |error\s+TS\d+:|✘\s*\[ERROR\]|An unhandled exception occurred:)/i;
const FAILED_TEST = {
  // Karma: "✗ sollte x" oder "Chrome Headless 120 (Linux) AppComponent should create FAILED"
  karma: /^\s*(?:FAILED|✗|✕)\s+(.+)|^(?!\s*Executed\b)(.+?)\s+FAILED\s*$/i,
  // Jest: "● AppComponent › should create"
  jest: /^\s*●\s+(?!Console\s*$)(.+)/,
  // Vitest: "× src/app/x.spec.ts > AppComponent > should create 5ms"
  vitest: /^\s*[×✗]\s+(.+)/,
};
// "Chrome Headless 141.0.0.0 (Linux 0.0.0) " vor dem Testnamen
const BROWSER_PREFIX = /^[A-Za-z][\w ]*?\d[\d.]*\s+\([^)]*\)\s+/;
const SUMMARY = {
  karma: /Executed\s+\d+\s+of\s+\d+.*/i,
  jest: /^\s*Tests:\s+.+/i,
  vitest: /^\s*(?:Test Files|Tests)\s+.+/,
};

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

function runnerOf(root) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'angular.json'), 'utf8'));
    for (const project of Object.values(config.projects ?? {})) {
      const test = project.architect?.test ?? project.targets?.test;
      const builder = String(test?.builder ?? '');
      if (/jest/i.test(builder)) return 'jest';
      // @angular/build:unit-test (ab v20) nutzt Vitest, außer runner ist karma.
      if (/unit-test/i.test(builder)) return /karma/i.test(String(test.options?.runner ?? '')) ? 'karma' : 'vitest';
    }
  } catch {
    // unlesbare angular.json: Standard-Runner
  }
  return 'karma';
}

// Karma und Vitest schreiben die Fehlermeldung eingerückt in die Zeile nach dem Testnamen.
function messageAfter(lines, index, runner) {
  const next = lines.slice(index + 1, index + 3).find((line) => line.trim() !== '');
  if (!next || !/^\s/.test(next) || FAILED_TEST[runner].test(next)) return '';
  return next.trim().replace(/^→\s*/, '');
}

function parse(output, exitCode, runner) {
  const lines = output.replace(ANSI, '').split(/\r?\n/);
  const failed = unique(lines.flatMap((line, index) => {
    const match = FAILED_TEST[runner].exec(line);
    if (!match) return [];
    const name = (match[1] ?? match[2]).replace(BROWSER_PREFIX, '').replace(/\s+\d+\s*ms$/, '');
    const message = runner === 'jest' ? '' : messageAfter(lines, index, runner);
    return [message ? `${name}: ${message}` : name];
  }), MAX_ERRORS);
  const summary = lines.filter((line) => SUMMARY[runner].test(line)).map((line) => line.trim());
  // Karma schreibt die Fortschrittszeile mehrfach; die letzte zählt. Vitest hat zwei Zeilen (Test Files, Tests).
  const summaryText = [...new Set(summary)].slice(runner === 'karma' ? -1 : -2).join(' | ');
  if (failed.length > 0) return { errors: failed, warnings: [], summary: summaryText || `${failed.length} Tests fehlgeschlagen.` };
  const compileErrors = unique(lines.filter((line) => ERROR_LINE.test(line)), MAX_ERRORS);
  if (compileErrors.length > 0) return { errors: compileErrors, warnings: [], summary: `Kompilieren im Testlauf fehlgeschlagen: ${compileErrors.length} Fehler.` };
  if (exitCode !== 0) return { errors: tail(lines), warnings: [], summary: summaryText || `Testlauf fehlgeschlagen (Exit ${exitCode}), Fehler = letzte Zeilen des Logs.` };
  return { errors: [], warnings: [], summary: summaryText || 'Alle Tests bestanden.' };
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
  const runner = runnerOf(root);
  const commandLine = ['test', ...(runner === 'jest' ? [] : ['--watch=false']), ...args.extra];
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
  return { ok: exitCode === 0, exitCode, seconds, log, ...parse(fs.readFileSync(log, 'utf8'), exitCode, runner) };
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

module.exports = { parseArgs, parse, render, findNg, runnerOf };
