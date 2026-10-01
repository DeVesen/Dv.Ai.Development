#!/usr/bin/env node
'use strict';

// dotnet format --verify-no-changes mit gefilterter Ausgabe: volles Log in eine Datei, zurück nur Befunde.
// Prüft Formatierung, Code-Stil und Analyzer-Regeln aus .editorconfig, ändert keine Datei.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const NAME = 'dotnet-lint';
const USAGE = `Aufruf: node ${NAME}.js [--path <sln|csproj|ordner>] [--show errors|warnings|all] [--log <datei>] [--timeout <sekunden>] [-- <weitere dotnet-format-Argumente, z. B. --severity warn>]\n`;
const TIMEOUT_SECONDS = 300;
const MAX_ERRORS = 50;
const MAX_WARNINGS = 100;
const SHOW = ['errors', 'warnings', 'all'];
const TAIL_LINES = 10;
const ANSI = /\x1B(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1B]*(?:\x07|\x1B\\))/g;
// Formatierungsbefunde haben Codes ohne Ziffern, z. B. WHITESPACE oder FINALNEWLINE.
const ERROR_LINE = /(?:\)|\s): error\s+[A-Z]+\d*:/i;
const WARNING_LINE = /(?:\)|\s): warning\s+[A-Z]+\d*:/i;
const FORMAT_EXIT = 2;

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { path: process.cwd(), show: 'errors', log: null, timeout: TIMEOUT_SECONDS, extra: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') {
      args.extra = argv.slice(index + 1);
      break;
    }
    const value = argv[index + 1];
    if (!['--path', '--show', '--log', '--timeout'].includes(flag) || value === undefined) throw new UsageError(USAGE);
    args[flag.slice(2)] = flag === '--timeout' ? Number(value) : value;
    index += 1;
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0 || !SHOW.includes(args.show)) throw new UsageError(USAGE);
  return args;
}

function unique(lines, max) {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))].slice(0, max);
}

function tail(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).slice(-TAIL_LINES);
}

function parse(output, exitCode) {
  const lines = output.replace(ANSI, '').split(/\r?\n/);
  const errors = unique(lines.filter((line) => ERROR_LINE.test(line)), MAX_ERRORS);
  const warnings = unique(lines.filter((line) => WARNING_LINE.test(line)), Infinity);
  if (exitCode === 0) return { errors, warnings, summary: 'Keine Befunde.' };
  if (errors.length === 0 && warnings.length === 0) {
    const reason = exitCode === FORMAT_EXIT ? 'Dateien brauchen Formatierung, aber keine Befundzeile erkannt' : `dotnet format fehlgeschlagen (Exit ${exitCode})`;
    return { errors: tail(lines), warnings, summary: `${reason}, Fehler = letzte Zeilen des Logs.` };
  }
  return { errors, warnings, summary: `${errors.length} Fehler, ${warnings.length} Warnungen. Beheben mit: dotnet format <pfad>` };
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
  const commandLine = ['format', target, '--verify-no-changes', ...args.extra];
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

module.exports = { parseArgs, parse, render };
