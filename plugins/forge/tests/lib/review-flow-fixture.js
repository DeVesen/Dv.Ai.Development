'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'review-flow.js');

const SPEC = [
  '# Demo-Spec',
  '',
  'Status: bestätigt am 2026-01-01',
  'Art: verankert',
  'Basis: abc1234',
  '',
  '## Was, wie, wo, warum',
  'Ein Demo-Dokument für den Review-Ablauf.',
  '',
  '## Soll-Vorgaben',
  '- **Deckel:** Höchstens zwei Runden.',
  '- **Schreibweise:** Begriffe wie im Glossar.',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, wenn B, dann C.',
  '- **AC-04** Gegeben D, wenn E, dann F.',
  '- **AC-07** Gegeben G, wenn H, dann I.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden, keine dritte.',
  '',
].join('\n');

function finding(overrides = {}) {
  return { location: 'AC-01', quote: 'Gegeben A, wenn B, dann C.', category: 'detail', consequence: 'Folge', rationale: 'Grund', ...overrides };
}

function tempDir(prefix = 'dv-forge-flow-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Arbeitsbereich mit Spec-Datei; `spec` ersetzt den Standardtext.
function setup(spec = SPEC) {
  const workspace = tempDir();
  const doc = path.join(tempDir('dv-forge-doc-'), 'spec.md');
  fs.writeFileSync(doc, spec);
  return { workspace, doc };
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}

function writeReviewer(env, name, findings, round = 'runde-1') {
  writeJsonFile(path.join(env.workspace, round, `${name}.json`), { reviewer: name, summary: 's', findings });
}

function flow(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function rate(env, expect, extra = []) {
  return flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', expect, ...extra);
}

function readJsonFile(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function editDoc(env, from, to) {
  fs.writeFileSync(env.doc, fs.readFileSync(env.doc, 'utf8').replace(from, to));
}

// Einträge unter Entscheidungen, direkt vor dem W-Eintrag der Beispiel-Spec.
function addEntries(env, ...entries) {
  editDoc(env, '- **W · Deckel**', [...entries, '- **W · Deckel**'].join('\n'));
}

// Runde 1 mit einem Reviewer `consistency` einstufen und die Eingabe der Nacharbeit schreiben.
function runUntilRework(env, findings, review = 'spec-review') {
  writeReviewer(env, 'consistency', findings);
  flow('rate', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--expect', 'consistency');
  flow('rework-input', '--review', review, '--dir', env.workspace, '--doc', env.doc);
}

module.exports = {
  SCRIPT, SPEC, finding, tempDir, setup, writeJsonFile, writeReviewer, flow, rate, readJsonFile, editDoc, addEntries, runUntilRework,
};
