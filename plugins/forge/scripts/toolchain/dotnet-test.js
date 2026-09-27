#!/usr/bin/env node
'use strict';

// dotnet test mit gefilterter Ausgabe: volles Log in eine Datei, zurück nur Fehler und Zusammenfassung.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NAME = 'dotnet-test';
const USAGE = `Aufruf: node ${NAME}.js [--path <sln|csproj|ordner>] [--log <datei>] [--timeout <sekunden>] [-- <weitere dotnet-test-Argumente, z. B. --filter>]\n`;
const TIMEOUT_SECONDS = 600;
const MAX_ERRORS = 50;
const TAIL_LINES = 10;
const ANSI = /\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;
const ERROR_LINE = /(?:\)|\s): error\s+[A-Z]+\d+:/i;
// VSTest: "  Failed Name [12 ms]", Microsoft.Testing.Platform: "failed Name (12ms)"
const FAILED_TEST = /^\s*failed\s+(\S.*?)\s+[[(]\s*<?\s*\d/i;
const ERROR_MESSAGE = /^\s*Error Message:\s*$/i;
const SUMMARY_LINE = /(?:Passed|Failed|Aborted)!\s*-\s*Failed:\s*\d+.*|^\s*Test summary:.*|^\s*Test run summary:.*/i;
const NO_MATCH = /No test matches the given testcase filter\b.*/i;
const ABORTED = /^\s*Test Run Aborted\./i;

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { path: process.cwd(), log: null, timeout: TIMEOUT_SECONDS, extra: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') {
      args.extra = argv.slice(index + 1);
      break;
    }
    const value = argv[index + 1];
    if (!['--path', '--log', '--timeout'].includes(flag) || value === undefined) throw new UsageError(USAGE);
    args[flag.slice(2)] = flag === '--timeout' ? Number(value) : value;
    index += 1;
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) throw new UsageError(USAGE);
  return args;
}

function unique(lines, max) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))].slice(0, max);
}

function tail(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).slice(-TAIL_LINES);
}

function messageAfter(lines, index) {
  for (let next = index + 1; next < Math.min(lines.length, index + 8); next += 1) {
    if (FAILED_TEST.test(lines[next])) return '';
    if (ERROR_MESSAGE.test(lines[next])) return lines.slice(next + 1).find((line) => line.trim() !== '')?.trim() ?? '';
  }
  return '';
}

function failedTests(lines) {
  const found = new Map();
  lines.forEach((line, index) => {
    const match = FAILED_TEST.exec(line);
    if (match && !found.has(match[1])) found.set(match[1], messageAfter(lines, index));
  });
  return [...found.entries()].slice(0, MAX_ERRORS).map(([name, message]) => (message ? `${name}: ${message}` : name));
}

function parse(output, exitCode) {
  const lines = output.replace(ANSI, '').split(/\r?\n/);
  const summary = lines.filter((line) => SUMMARY_LINE.test(line)).map((line) => line.trim()).join(' | ');
  const failed = failedTests(lines);
  if (failed.length > 0) return { errors: failed, warnings: [], summary: summary || `${failed.length} Tests fehlgeschlagen.` };
  const buildErrors = unique(lines.filter((line) => ERROR_LINE.test(line)), MAX_ERRORS);
  if (buildErrors.length > 0) return { errors: buildErrors, warnings: [], summary: `Build im Testlauf fehlgeschlagen: ${buildErrors.length} Fehler.` };
  const noMatch = lines.find((line) => NO_MATCH.test(line));
  if (noMatch) return { errors: [noMatch.trim()], warnings: [], summary: 'Kein Test passt zum Filter.' };
  if (lines.some((line) => ABORTED.test(line))) return { errors: ['Test Run Aborted.'], warnings: [], summary: 'Testlauf abgebrochen, Details im Log.' };
  if (exitCode !== 0) return { errors: tail(lines), warnings: [], summary: summary || `Testlauf fehlgeschlagen (Exit ${exitCode}), Fehler = letzte Zeilen des Logs.` };
  return { errors: [], warnings: [], summary: summary || 'Alle Tests bestanden.' };
}

function logFile(requested) {
  if (requested) return path.resolve(requested);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return path.join(os.tmpdir(), 'dv-forge-logs', `${NAME}-${stamp}.log`);
}

function run(args) {
  const target = path.resolve(args.path);
  if (!fs.existsSync(target)) throw new UsageError(`Pfad nicht gefunden: ${target}\n`);
  const cwd = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const log = logFile(args.log);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const commandLine = ['test', target, ...args.extra];
  fs.writeFileSync(log, `> dotnet ${commandLine.join(' ')}\n\n`);
  const fd = fs.openSync(log, 'a');
  const started = Date.now();
  // Ausgabe direkt in die Datei statt über eine Pipe: ein hängender Kindprozess kann den Lauf so nicht blockieren.
  const result = spawnSync('dotnet', commandLine, {
    cwd,
    stdio: ['ignore', fd, fd],
    timeout: args.timeout * 1000,
    windowsHide: true,
    env: { ...process.env, DOTNET_CLI_UI_LANGUAGE: 'en', VSLANG: '1033', DOTNET_NOLOGO: '1', NO_COLOR: '1' },
  });
  fs.closeSync(fd);
  const seconds = Math.round((Date.now() - started) / 1000);
  if (result.error?.code === 'ENOENT') return { ok: false, seconds, log, errors: ['dotnet nicht gefunden. Ist das .NET SDK installiert und im PATH?'], warnings: [], summary: 'Nicht gestartet.' };
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

module.exports = { parseArgs, parse, render };
