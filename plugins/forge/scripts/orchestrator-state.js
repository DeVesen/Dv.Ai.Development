#!/usr/bin/env node
'use strict';

// Zustand und Verzweigung der drei Stufen-Orchestratoren als Skript statt als Prosa.
//   start --state <ordner> --spec <S> [--plan <P>]  Start-Zustand (Toplevel, Branch, HEAD, Worktree, Vorbestand) und Kopien mit Hash
//   add   --state <ordner> (--spec <S> | --plan <P>) Artefakt nachtragen oder ersetzen (Plan nach plan-writing, Pfade nach start-work)
//   check --state <ordner> [--ort]                   Hashes prüfen; Exit 1 mit Diff bei Abweichung. --ort: Toplevel und Branch wie beim Start
//   next  --review <json> [--followup <json>]...     nächster Schritt aus den Bericht-Daten der eingebetteten Läufe
// Ausgabe: Zeilen `<NAME>=<Wert>`; bei einer Abweichung danach `=== DIFF ===`. Exit 2 bei falschem Aufruf.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAX_FOLLOWUPS = 2;
const STATE_FILE = 'orchestrator-state.json';
const USAGE = [
  'Aufruf: node orchestrator-state.js start --state <ordner> --spec <S> [--plan <P>]',
  '       node orchestrator-state.js add --state <ordner> (--spec <S> | --plan <P>)',
  '       node orchestrator-state.js check --state <ordner> [--ort]',
  '       node orchestrator-state.js next --review <json> [--followup <json>]...',
  '',
].join('\n');

class StateError extends Error {}

function git(cwd, args) {
  const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout ?? '').trim(), raw: result.stdout ?? '', err: (result.stderr ?? '').trim() };
}

function hashOf(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readStateFile(dir) {
  const file = path.join(dir, STATE_FILE);
  if (!fs.existsSync(file)) throw new StateError(`Kein Zustand in ${dir}; erst start`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeStateFile(dir, state) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
}

function location(cwd) {
  const dirs = git(cwd, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']).out.split('\n');
  return {
    toplevel: git(cwd, ['rev-parse', '--show-toplevel']).out,
    branch: git(cwd, ['branch', '--show-current']).out,
    head: git(cwd, ['rev-parse', '--short', 'HEAD']).out,
    worktree: dirs.length === 2 && dirs[0] !== dirs[1],
  };
}

// Kopie und Hash eines Artefakts; die Kopie dient dem Diff bei einer Abweichung.
function snapshot(dir, key, file) {
  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) throw new StateError(`${key === 'spec' ? 'Spec' : 'Plan'} fehlt: ${file}`);
  const copy = path.join(dir, `${key}-kopie${path.extname(absolute) || '.md'}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(absolute, copy);
  return { pfad: absolute, hash: hashOf(absolute), kopie: copy };
}

function start(values) {
  const dir = path.resolve(values.state);
  const here = location(process.cwd());
  if (!here.branch) throw new StateError('Kein Branch ausgecheckt (detached HEAD)');
  const artifacts = { spec: snapshot(dir, 'spec', values.spec) };
  if (values.plan) artifacts.plan = snapshot(dir, 'plan', values.plan);
  const specTop = git(path.dirname(artifacts.spec.pfad), ['rev-parse', '--show-toplevel']).out;
  // Roh, nicht getrimmt: Die erste Zeile ` M datei` verlöre sonst ihr führendes Leerzeichen und `slice(3)` einen Buchstaben des Pfads.
  const before = git(process.cwd(), ['status', '--porcelain']).raw.split('\n').filter(Boolean);
  writeStateFile(dir, { start: here, artefakte: artifacts, vorbestand: before });
  return [
    `TOPLEVEL=${here.toplevel}`, `BRANCH=${here.branch}`, `HEAD=${here.head}`, `WORKTREE=${here.worktree ? 'ja' : 'nein'}`,
    `SPEC-IM-CHECKOUT=${specTop === here.toplevel ? 'ja' : 'nein'}`, `VORBESTAND=${before.length}`,
    ...before.map((line) => `VORBESTAND-DATEI=${line.slice(3)}`),
  ].join('\n');
}

function add(values) {
  const dir = path.resolve(values.state);
  const state = readStateFile(dir);
  const key = values.spec ? 'spec' : 'plan';
  if (!values.spec && !values.plan) throw new StateError('add braucht --spec oder --plan');
  state.artefakte[key] = snapshot(dir, key, values[key]);
  writeStateFile(dir, state);
  return `${key.toUpperCase()}=${state.artefakte[key].pfad}`;
}

// Toplevel und Branch jetzt gegen den Start; `same` ist falsch bei einem anderen Checkout oder Branch.
function placeOf(state, cwd) {
  const here = location(cwd);
  return { here, same: here.toplevel === state.start.toplevel && here.branch === state.start.branch };
}

function check(values) {
  const state = readStateFile(path.resolve(values.state));
  const lines = [];
  const diffs = [];
  for (const [key, artifact] of Object.entries(state.artefakte)) {
    const same = fs.existsSync(artifact.pfad) && hashOf(artifact.pfad) === artifact.hash;
    lines.push(`HASH-${key.toUpperCase()}=${same ? 'ok' : 'abweichung'}`);
    if (!same) diffs.push(git(process.cwd(), ['diff', '--no-index', '--', artifact.kopie, artifact.pfad]).out || `${artifact.pfad} fehlt`);
  }
  if (values.ort === true) {
    const place = placeOf(state, process.cwd());
    lines.push(`ORT=${place.same ? 'ok' : `abweichung ${place.here.toplevel} ${place.here.branch || '(kein Branch)'}`}`);
    if (!place.same) diffs.push(`Start: ${state.start.toplevel} ${state.start.branch}`);
  }
  const output = diffs.length > 0 ? [...lines, '=== DIFF ===', ...diffs].join('\n') : lines.join('\n');
  return { output, failed: diffs.length > 0 };
}

function readReport(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const RESULT_PREFIX = /^\*\*Ergebnis:\*\*\s*/;

// Nächster Schritt aus dem letzten eingebetteten Lauf: `followup` (mit Rundennummer), `weiter` oder `ende` mit Grund.
// `BEREIT=ja`, wenn die Ergebnis-Zeile mit ✅ beginnt; der Orchestrator entscheidet daraus nur noch, was `weiter` heißt.
function next(values) {
  const followups = values.followup ?? [];
  if (followups.length > MAX_FOLLOWUPS) throw new StateError(`--followup höchstens ${MAX_FOLLOWUPS} Mal`);
  const last = followups.at(-1) ?? values.review;
  const report = readReport(last);
  if (!report) return ['NEXT=ende', 'GRUND=kein-bericht', `BERICHT=${last}`].join('\n');
  const result = String(report.resultLine ?? '').replace(RESULT_PREFIX, '');
  const status = String(report.status ?? '');
  const lines = [`ERGEBNIS=${result || '-'}`, `BEREIT=${result.startsWith('✅') ? 'ja' : 'nein'}`, `RUNDEN=${followups.length}`];
  if (result.startsWith('⚠️') || status.startsWith('unvollständig')) return ['NEXT=ende', 'GRUND=unvollstaendig', ...lines].join('\n');
  if (report.offersFollowup && followups.length < MAX_FOLLOWUPS) return [`NEXT=followup`, `RUNDE=${followups.length + 1}`, ...lines].join('\n');
  return ['NEXT=weiter', ...lines].join('\n');
}

const OPTIONS = { '--state': 'state', '--spec': 'spec', '--plan': 'plan', '--review': 'review' };

function parse(args) {
  const values = { followup: [] };
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (name === '--ort') { values.ort = true; continue; }
    if (name === '--followup' && args[index + 1] !== undefined) { values.followup.push(args[index += 1]); continue; }
    if (!OPTIONS[name] || args[index + 1] === undefined) return null;
    values[OPTIONS[name]] = args[index += 1];
  }
  return values;
}

const COMMANDS = {
  start: { needs: ['state', 'spec'], run: start },
  add: { needs: ['state'], run: add },
  check: { needs: ['state'], run: (values) => check(values) },
  next: { needs: ['review'], run: next },
};

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const values = parse(rest);
  const entry = COMMANDS[command];
  if (!entry || !values || !entry.needs.every((key) => values[key])) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    const result = entry.run(values);
    if (typeof result === 'string') process.stdout.write(`${result}\n`);
    else {
      process.stdout.write(`${result.output}\n`);
      process.exit(result.failed ? 1 : 0);
    }
  } catch (error) {
    if (!(error instanceof StateError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { next, check, start, add, placeOf, readStateFile, location, StateError };
