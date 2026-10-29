'use strict';

// Build, Test und Lint aus den Projekt-Einstellungen als Skript: Exit-Code statt Selbstauskunft, gebunden an HEAD.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KEYS = ['Build', 'Test', 'Lint'];
const TAIL_LINES = 40;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const FULL_RUN = /^-?\s*Gesamtlauf:\s*(\S+)\s+grün\b/m;
// Rot nur, weil Docker fehlt: Testcontainers und Docker-Client melden das mit diesen Texten.
const DOCKER_MARKER = /Testcontainers|Could not find a valid Docker environment|Cannot connect to the Docker daemon|docker(?:\.sock)?:? (?:not found|is not running|daemon)|DockerException/i;
// Befehl nicht startbar: Exit-Code der Shell (POSIX 127, cmd 9009) oder ihre Meldung zum ersten Wort des Befehls.
// Node startet cmd mit `/d /s /c`, dann meldet cmd Exit 1 und nur die Meldung bleibt (englisch oder deutsch, auch über zwei Zeilen).
const NOT_FOUND_EXITS = [127, 9009];
const NOT_FOUND_TEXT = /is not recognized as an internal or external command|wird nicht als interner oder externer Befehl|konnte nicht gefunden werden|command not found|: not found/;
// Verhalten statt Doku: Markdown unter diesen Ordnern steuert Skills und Agents.
const BEHAVIOUR_DIRS = /(?:^|\/)(?:skills|agents|shared|\.claude)\//;

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim() };
}

function tail(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').trimEnd().split('\n').slice(-TAIL_LINES).join('\n');
}

function commandsOf(value) {
  return String(value ?? '').split(' ; ').map((part) => part.trim()).filter(Boolean);
}

function firstWord(command) {
  const match = /^\s*(?:"([^"]+)"|(\S+))/.exec(command);
  return match ? (match[1] ?? match[2]) : '';
}

function namesWord(line, word) {
  return line.split(/["'\s:]+/).includes(word);
}

// Die Shell konnte das erste Wort des Befehls nicht starten. Meldungen zu anderen Wörtern zählen nicht: Dann lief der Befehl.
function notStartable(command, exit, output) {
  if (exit === 0) return false;
  if (NOT_FOUND_EXITS.includes(exit)) return true;
  const word = firstWord(command);
  const lines = String(output ?? '').replace(/\r\n/g, '\n').split('\n');
  return lines.some((line, index) => NOT_FOUND_TEXT.test(line) && (namesWord(line, word) || namesWord(lines[index - 1] ?? '', word)));
}

function runCommand(command, repo, timeout) {
  const started = Date.now();
  const result = spawnSync(command, { cwd: repo, shell: true, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const exit = result.error?.code === 'ETIMEDOUT' ? 124 : result.status ?? 1;
  return { befehl: command, exit, dauerMs: Date.now() - started, ausgabe: tail(output), voll: output, docker: DOCKER_MARKER.test(output), umgebung: notStartable(command, exit, output) };
}

function isDocOnly(file) {
  return file.endsWith('.md') && !BEHAVIOUR_DIRS.test(file);
}

// Commit des letzten grünen Gesamtlaufs, wenn seither nur Doku geändert wurde; sonst null.
function greenSince(repo, report) {
  if (!report || !fs.existsSync(report)) return null;
  const match = FULL_RUN.exec(fs.readFileSync(report, 'utf8'));
  if (!match) return null;
  const commit = match[1];
  if (!git(repo, ['merge-base', '--is-ancestor', commit, 'HEAD']).ok) return null;
  const changed = git(repo, ['diff', '--name-only', commit, 'HEAD']).out.split('\n').filter(Boolean);
  return changed.every(isDocOnly) ? commit : null;
}

function dockerAvailable() {
  return spawnSync('docker', ['info'], { encoding: 'utf8', timeout: 20000 }).status === 0;
}

// Ergebnis über alle Läufe: rot schlägt alles; liegt jeder rote Lauf an einem nicht startbaren Befehl, heißt es `umgebung`;
// ein roter Test, der nur an fehlendem Docker liegt, heißt `docker`.
function overall(runs, docker) {
  const red = runs.filter((run) => run.exit !== 0);
  if (runs.length === 0) return 'keine';
  if (red.length === 0) return 'gruen';
  if (red.every((run) => run.umgebung)) return 'umgebung';
  const onlyDocker = red.every((run) => run.schluessel === 'Test' && run.docker) && !docker();
  return onlyDocker ? 'docker' : 'rot';
}

// `config`: { Build, Test, Lint } (Werte aus forge-config.js). Bricht beim ersten roten Lauf ab.
function verifyRun({ repo, config, only = KEYS, report = null, timeout = DEFAULT_TIMEOUT_MS, docker = dockerAvailable }) {
  const runs = [];
  const skipped = [];
  const since = only.includes('Test') ? greenSince(repo, report) : null;
  for (const key of KEYS.filter((name) => only.includes(name))) {
    if (key === 'Test' && since) {
      skipped.push({ schluessel: key, grund: `Gesamtlauf grün auf ${since}, seither nur Doku` });
      continue;
    }
    const commands = commandsOf(config[key]);
    if (commands.length === 0) skipped.push({ schluessel: key, grund: 'nicht konfiguriert' });
    let red = false;
    for (const command of commands) {
      const { voll: _full, ...executed } = runCommand(command, repo, timeout);
      const run = { schluessel: key, ...executed };
      runs.push(run);
      if (run.exit !== 0) { red = true; break; }
    }
    if (red && !(key === 'Test' && runs.at(-1).docker)) break;
  }
  const offen = git(repo, ['status', '--porcelain']).out.split('\n').filter(Boolean);
  return { head: git(repo, ['rev-parse', 'HEAD']).out, ergebnis: overall(runs, docker), laeufe: runs, uebersprungen: skipped, offen };
}

// Ein Lauf der Test-Befehle: Exit-Code des ersten roten Befehls (sonst 0) und die vollständige Ausgabe aller gelaufenen Befehle.
function testRun(commands, repo, timeout) {
  const executed = [];
  for (const command of commands) {
    const run = runCommand(command, repo, timeout);
    executed.push(run);
    if (run.exit !== 0) break;
  }
  return { exit: executed.find((run) => run.exit !== 0)?.exit ?? 0, ausgabe: executed.map((run) => run.voll).join('') };
}

// Basis-Lauf vor Task 1: `Test` höchstens zweimal, der zweite Lauf nur, wenn der erste rot ist. `beideRot`: erst dann gibt es Tests,
// die auf dem unveränderten Stand rot sind. Ohne konfigurierten Test: keine Läufe.
function basisRun({ repo, config, timeout = DEFAULT_TIMEOUT_MS }) {
  const commands = commandsOf(config.Test);
  const laeufe = [];
  while (commands.length > 0 && laeufe.length < 2) {
    laeufe.push(testRun(commands, repo, timeout));
    if (laeufe.at(-1).exit === 0) break;
  }
  return { laeufe, beideRot: laeufe.length === 2 && laeufe.every((run) => run.exit !== 0) };
}

function formatBasis(result) {
  return `BASIS rot=${result.beideRot ? 'ja' : 'nein'}`;
}

function formatVerify(result, out) {
  const head = `PRUEFUNG ergebnis=${result.ergebnis} head=${result.head.slice(0, 12)} offen=${result.offen.length}${out ? ` datei=${out}` : ''}`;
  const runs = result.laeufe.map((run) => `LAUF ${run.schluessel} exit=${run.exit} dauer=${Math.round(run.dauerMs / 1000)}s${run.docker ? ' docker' : ''}${run.umgebung ? ' umgebung' : ''}: ${run.befehl}`);
  const missing = result.laeufe.filter((run) => run.umgebung).map((run) => `UMGEBUNG Befehl ${firstWord(run.befehl)} nicht startbar`);
  const skipped = result.uebersprungen.map((entry) => `UEBERSPRUNGEN ${entry.schluessel}: ${entry.grund}`);
  const red = result.laeufe.filter((run) => run.exit !== 0).map((run) => `=== AUSGABE ${run.schluessel} ===\n${run.ausgabe}`);
  return [head, ...runs, ...missing, ...skipped, ...red].join('\n');
}

function writeResult(file, result) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
}

module.exports = { KEYS, verifyRun, basisRun, formatBasis, formatVerify, writeResult, greenSince, isDocOnly, overall, notStartable };
