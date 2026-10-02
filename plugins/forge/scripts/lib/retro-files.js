'use strict';

// Ablage von Snapshot und Entwurf je Session außerhalb des Projekts; die Session-Kennung steht im Dateinamen.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RetroError } = require('./transcript');

function retroDir() {
  return path.join(os.homedir(), '.dv-toolbelt', 'retro');
}

function safeId(session) {
  return String(session).replace(/[^\w.-]/g, '_');
}

function snapshotPath(session) {
  return path.join(retroDir(), `${safeId(session)}.snapshot.json`);
}

function draftPath(session) {
  return path.join(retroDir(), `${safeId(session)}.entwurf.md`);
}

function writeSnapshot(snapshot) {
  const file = snapshotPath(snapshot.session);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return file;
}

function parsedSnapshot(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new RetroError(`Snapshot unlesbar: ${file}: ${error.message}`);
  }
}

// `transcriptEntries` begrenzt den Korpus der Zitat-Prüfung auf das Protokoll vor der Retrospektive; ohne das Feld
// prüfte sie gegen nichts oder gegen den eigenen Entwurf.
function readSnapshot(session) {
  const file = snapshotPath(session);
  if (!fs.existsSync(file)) throw new RetroError(`Snapshot fehlt: ${file}. Zuerst session-facts.js --session ${session} --snapshot aufrufen.`);
  const snapshot = parsedSnapshot(file);
  if (!Number.isInteger(snapshot.transcriptEntries)) throw new RetroError(`Snapshot unlesbar: ${file}: transcriptEntries fehlt`);
  return snapshot;
}

module.exports = { retroDir, snapshotPath, draftPath, writeSnapshot, readSnapshot };
