'use strict';

// Bausteine für das Prüfen einer CLAUDE.md: Zeichenzahl, Backup, Diff und Hash-Vergleich geschützter Blöcke.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

class GuardError extends Error {}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new GuardError(`Datei nicht lesbar: ${file}: ${error.message}`);
  }
}

function charCount(text) {
  return [...text].length;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

// Lokale Zeit als JJJJMMTT-HHMMSS, damit der Name eines Backups sortierbar bleibt.
function stampOf(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// Ohne Ziel liegt das Backup im temporären Ordner des Systems; ein vorhandener Ordner als Ziel bekommt denselben Namen.
function backupPathOf(file, target, now = new Date()) {
  const name = `${path.basename(file)}.${stampOf(now)}.bak`;
  if (!target) return path.join(os.tmpdir(), name);
  const isFolder = fs.existsSync(target) && fs.statSync(target).isDirectory();
  return isFolder ? path.join(target, name) : target;
}

function makeBackup(file, target, now = new Date()) {
  if (!fs.existsSync(file)) throw new GuardError(`Datei nicht gefunden: ${file}`);
  const destination = backupPathOf(file, target, now);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
  return destination;
}

module.exports = { GuardError, readText, charCount, stampOf, backupPathOf, makeBackup };
