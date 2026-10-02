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

function splitLines(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

// Zeilenweiser Vergleich über die längste gemeinsame Teilfolge; bei Gleichstand gilt die Löschung vor der Einfügung.
function lineDiff(before, after) {
  const table = Array.from({ length: before.length + 1 }, () => new Array(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push({ kind: ' ', text: before[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ kind: '-', text: before[i] });
      i += 1;
    } else {
      ops.push({ kind: '+', text: after[j] });
      j += 1;
    }
  }
  for (; i < before.length; i += 1) ops.push({ kind: '-', text: before[i] });
  for (; j < after.length; j += 1) ops.push({ kind: '+', text: after[j] });
  return ops;
}

// Bereiche der Operationen, die ein Hunk zeigt: jede Änderung mit `context` Zeilen davor und danach, überlappende Bereiche verschmolzen.
function hunkRanges(ops, context) {
  const ranges = [];
  ops.forEach((op, index) => {
    if (op.kind === ' ') return;
    const from = Math.max(0, index - context);
    const to = Math.min(ops.length - 1, index + context);
    const last = ranges.at(-1);
    if (last && from <= last.to + 1) last.to = Math.max(last.to, to);
    else ranges.push({ from, to });
  });
  return ranges;
}

function hunkLines(ops, { from, to }) {
  const before = ops.slice(0, from);
  const inside = ops.slice(from, to + 1);
  const oldStart = before.filter((op) => op.kind !== '+').length + 1;
  const newStart = before.filter((op) => op.kind !== '-').length + 1;
  const oldCount = inside.filter((op) => op.kind !== '+').length;
  const newCount = inside.filter((op) => op.kind !== '-').length;
  return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...inside.map((op) => `${op.kind}${op.text}`)];
}

function unifiedDiff(oldText, newText, oldName, newName, context = 3) {
  const ops = lineDiff(splitLines(oldText), splitLines(newText));
  const ranges = hunkRanges(ops, context);
  if (ranges.length === 0) return '';
  return `${[`--- ${oldName}`, `+++ ${newName}`, ...ranges.flatMap((range) => hunkLines(ops, range))].join('\n')}\n`;
}

module.exports = { GuardError, readText, charCount, stampOf, backupPathOf, makeBackup, unifiedDiff };
